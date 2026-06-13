/**
 * Ekran aktywnego treningu — serce aplikacji.
 * Nagłówek z czasem trwania + wolumenem + liczbą serii, lista ćwiczeń
 * (ExerciseCard), dodawanie ćwiczeń, auto rest timer po ukończeniu serii,
 * zakończenie z podsumowaniem i nowymi rekordami.
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, ScrollView, Pressable, StyleSheet, Alert, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';

import { Text, Button } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useTheme, Spacing, Radius } from '@/theme';
import { ExerciseCard } from '@/components/workout/ExerciseCard';
import { RestTimerBar } from '@/components/workout/RestTimerBar';
import { WorkoutSummary } from '@/components/workout/WorkoutSummary';
import { useWorkout } from '@/store/workout';
import { useSettings } from '@/store/settings';
import { liveTotals, buildWorkoutInput, hasCompletedSets } from '@/lib/workout-session';
import { saveCompletedWorkout, type NewPR } from '@/db/repo-workouts';
import { formatDuration, formatVolume, formatSetsCount } from '@/lib/format';
import { hapticSuccess, hapticTick } from '@/lib/haptics';
import { scheduleRestDone, ensureNotificationPermission } from '@/lib/notifications';
import { pendingPicked, clearPicked } from '@/lib/picker-bridge';

export default function ActiveWorkout() {
  useKeepAwake();
  const { c } = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ routineId?: string; mode?: string }>();

  const active = useWorkout((s) => s.active);
  const name = useWorkout((s) => s.name);
  const startedAt = useWorkout((s) => s.startedAt);
  const routineId = useWorkout((s) => s.routineId);
  const exercises = useWorkout((s) => s.exercises);
  const startEmpty = useWorkout((s) => s.startEmpty);
  const startFromRoutine = useWorkout((s) => s.startFromRoutine);
  const cancel = useWorkout((s) => s.cancel);
  const setName = useWorkout((s) => s.setName);
  const addExercise = useWorkout((s) => s.addExercise);
  const startRest = useWorkout((s) => s.startRest);
  const toggleSetDone = useWorkout((s) => s.toggleSetDone);

  const autoStartRest = useSettings((s) => s.settings?.restAutoStart ?? true);
  const unit = useSettings((s) => s.settings?.unit ?? 'kg');

  const [now, setNow] = useState(Date.now());
  const [summary, setSummary] = useState<{ prs: NewPR[]; durationSec: number } | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  // Czy ekran zainicjalizował już sesję — i czy właśnie ją zamykamy.
  // Bez tego effect inicjalizujący (który widzi active === false po
  // cancel()) natychmiast tworzyłby NOWY pusty trening, przez co odrzucenie
  // nigdy nie usuwało stanu „masz niezakończony trening".
  const initedRef = useRef(false);
  const closingRef = useRef(false);

  // Inicjalizacja sesji przy wejściu (jeśli nie ma aktywnej) — dokładnie raz.
  useEffect(() => {
    if (initedRef.current || closingRef.current) return;
    initedRef.current = true;
    if (active) return; // wracamy do trwającego treningu — nie nadpisuj
    if (params.routineId) startFromRoutine(String(params.routineId));
    else startEmpty();
    // celowo bez `active` w zależnościach — start ma się wykonać raz na wejście
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tykanie zegara treningu.
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  // Odbiór wybranych ćwiczeń z pickera (most przez moduł).
  useFocusEffect(
    useCallback(() => {
      const picked = pendingPicked();
      if (picked.length) {
        picked.forEach((id) => addExercise(id));
        clearPicked();
      }
    }, [addExercise])
  );

  const totals = liveTotals(exercises, unit as never);
  const elapsed = startedAt ? Math.floor((now - startedAt) / 1000) : 0;

  // Ukończenie serii → auto rest + haptyka + powiadomienie.
  const onToggleDone = useCallback(
    (exId: string, setId: string) => {
      const completedExId = toggleSetDone(exId, setId);
      if (completedExId) {
        hapticTick();
        const ex = useWorkout.getState().exercises.find((e) => e.id === exId);
        const rest = ex?.restSeconds ?? 120;
        if (autoStartRest && rest > 0) {
          startRest(rest, completedExId);
          scheduleRestDone(rest);
        }
      }
    },
    [toggleSetDone, autoStartRest, startRest]
  );

  const openPicker = () => router.push('/exercise/picker');

  const finishWorkout = () => {
    if (!hasCompletedSets(exercises)) {
      // Pusty trening (bez ćwiczeń) nie da się „zaznaczyć serii" — zaproponuj
      // od razu odrzucenie, żeby użytkownik nie utknął.
      if (exercises.length === 0) {
        Alert.alert('Pusty trening', 'Nie dodano żadnego ćwiczenia. Odrzucić ten trening?', [
          { text: 'Anuluj', style: 'cancel' },
          {
            text: 'Odrzuć',
            style: 'destructive',
            onPress: () => {
              closingRef.current = true;
              cancel();
              router.back();
            },
          },
        ]);
        return;
      }
      Alert.alert('Brak ukończonych serii', 'Zaznacz przynajmniej jedną serię jako wykonaną (✓), aby zapisać trening.');
      return;
    }
    const finishedAt = Date.now();
    const input = buildWorkoutInput(name, startedAt ?? finishedAt, finishedAt, routineId, exercises, unit as never);
    const { workoutId, newPRs } = saveCompletedWorkout(input);
    hapticSuccess();
    setSavedId(workoutId);
    setSummary({ prs: newPRs, durationSec: Math.round((finishedAt - (startedAt ?? finishedAt)) / 1000) });
  };

  const confirmCancel = () => {
    Alert.alert('Odrzucić trening?', 'Niezapisane serie zostaną utracone.', [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Odrzuć',
        style: 'destructive',
        onPress: () => {
          closingRef.current = true;
          cancel();
          router.back();
        },
      },
    ]);
  };

  const closeSummary = () => {
    closingRef.current = true;
    setSummary(null);
    cancel();
    router.back();
  };

  // Przechwyć wyjście z ekranu (gest wstecz, sprzętowy przycisk Androida,
  // programowy back). Jeśli to nasze świadome zamknięcie (closingRef) —
  // przepuść. W przeciwnym razie zapytaj: odrzucić czy zostawić w tle.
  useEffect(() => {
    const sub = navigation.addListener('beforeRemove', (e) => {
      if (closingRef.current) return; // zapis / odrzucenie / zamknięcie podsumowania
      e.preventDefault();
      Alert.alert('Opuścić trening?', 'Trening jest w toku. Co chcesz zrobić?', [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Zostaw w tle',
          onPress: () => {
            closingRef.current = true;
            navigation.dispatch(e.data.action); // wyjdź, ale zachowaj aktywną sesję
          },
        },
        {
          text: 'Odrzuć trening',
          style: 'destructive',
          onPress: () => {
            closingRef.current = true;
            cancel();
            navigation.dispatch(e.data.action);
          },
        },
      ]);
    });
    return sub;
  }, [navigation, cancel]);

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      {/* Górny pasek */}
      <View style={styles.topBar}>
        <Pressable onPress={confirmCancel} hitSlop={8} style={styles.iconBtn}>
          <Icon name="close" size={26} color={c.textSecondary} />
        </Pressable>
        <View style={styles.timerWrap}>
          <Icon name="time-outline" size={16} color={c.primary} />
          <Text variant="heading" weight="800" color={c.text}>
            {formatDuration(elapsed)}
          </Text>
        </View>
        <Pressable onPress={finishWorkout} style={[styles.finishBtn, { backgroundColor: c.primary }]} hitSlop={8}>
          <Text variant="label" weight="800" color={c.onPrimary}>
            Zakończ
          </Text>
        </Pressable>
      </View>

      {/* Nazwa treningu */}
      <View style={styles.nameRow}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Nazwa treningu"
          placeholderTextColor={c.textMuted}
          style={[styles.nameInput, { color: c.text }]}
        />
      </View>

      {/* Statystyki na żywo */}
      <View style={[styles.stats, { borderColor: c.border }]}>
        <Stat label="Serie" value={`${totals.completedSets}/${totals.totalSets}`} />
        <Stat label="Wolumen" value={formatVolume(totals.volume, useSettings.getState().unit())} />
        <Stat label="Ćwiczenia" value={String(exercises.length)} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 220 }}
        keyboardShouldPersistTaps="handled"
      >
        {exercises.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="barbell-outline" size={48} color={c.textMuted} />
            <Text variant="body" color={c.textSecondary} center style={{ marginTop: Spacing.md }}>
              Dodaj pierwsze ćwiczenie, aby rozpocząć.
            </Text>
          </View>
        ) : (
          exercises.map((ex) => (
            <ExerciseCardWrapper key={ex.id} exId={ex.id} onToggleDone={onToggleDone} />
          ))
        )}

        <Button
          title="Dodaj ćwiczenie"
          variant="secondary"
          icon={<Icon name="add" size={20} color={c.text} />}
          onPress={openPicker}
          style={{ marginTop: Spacing.sm }}
        />

        <Pressable onPress={confirmCancel} style={{ marginTop: Spacing.lg, alignItems: 'center' }}>
          <Text variant="label" color={c.danger} weight="700">
            Odrzuć trening
          </Text>
        </Pressable>
      </ScrollView>

      <RestTimerBar />

      {summary ? (
        <WorkoutSummary
          name={name}
          durationSec={summary.durationSec}
          volume={totals.volume}
          sets={totals.completedSets}
          prs={summary.prs}
          workoutId={savedId}
          onClose={closeSummary}
        />
      ) : null}
    </View>
  );
}

/** Owija ExerciseCard, podpinając właściwy onToggleDone z auto-rest. */
function ExerciseCardWrapper({
  exId,
  onToggleDone,
}: {
  exId: string;
  onToggleDone: (exId: string, setId: string) => void;
}) {
  const ex = useWorkout((s) => s.exercises.find((e) => e.id === exId));
  const exercises = useWorkout((s) => s.exercises);
  if (!ex) return null;
  const idx = exercises.findIndex((e) => e.id === exId);
  const prev = idx > 0 ? exercises[idx - 1] : null;
  const isSuperset = ex.supersetGroup != null && prev?.supersetGroup === ex.supersetGroup;
  return <ExerciseCard ex={ex} isSuperset={isSuperset} onToggleDone={onToggleDone} />;
}

function Stat({ label, value }: { label: string; value: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text variant="caption" color={c.textMuted}>
        {label}
      </Text>
      <Text variant="heading" weight="800">
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  iconBtn: { padding: Spacing.xs },
  timerWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  finishBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
  },
  nameRow: { paddingHorizontal: Spacing.lg },
  nameInput: {
    fontSize: 22,
    fontWeight: '800',
    paddingVertical: Spacing.xs,
  },
  stats: {
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxl },
});
