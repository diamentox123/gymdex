/**
 * Podgląd ukończonego treningu: lista ćwiczeń i serii, statystyki,
 * usuwanie i „powtórz" (rozpocznij nowy trening na bazie tego).
 */
import React, { useMemo } from 'react';
import { ScrollView, View, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import dayjs from 'dayjs';
import 'dayjs/locale/pl';
import { Text, Card, Button, Divider } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useTheme, Spacing } from '@/theme';
import { getWorkoutFull, deleteWorkout } from '@/db/repo-workouts';
import { getExercise } from '@/db/repo-exercises';
import { saveRoutine } from '@/db/repo-routines';
import { totalVolume } from '@/lib/calc';
import { formatWorkoutLength, formatVolume, formatSetsCount, formatWeight } from '@/lib/format';
import { useSettings } from '@/store/settings';
import { useWorkout } from '@/store/workout';
import { hapticSuccess } from '@/lib/haptics';
import type { SetType } from '@/lib/types';

dayjs.locale('pl');

const SET_TYPE_SHORT: Record<SetType, string> = { normal: '', warmup: 'R', drop: 'D', failure: 'F' };

export default function WorkoutDetail() {
  const { c } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const unit = useSettings((s) => s.settings?.unit ?? 'kg');
  const startEmpty = useWorkout((s) => s.startEmpty);
  const addExercise = useWorkout((s) => s.addExercise);

  const full = useMemo(() => (id ? getWorkoutFull(String(id)) : null), [id]);

  if (!full) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center' }}>
        <Text variant="body" center color={c.textSecondary}>
          Nie znaleziono treningu.
        </Text>
      </View>
    );
  }

  const allSets = full.exercises.flatMap((e) => e.sets).filter((s) => s.isCompleted);
  const volume = totalVolume(
    allSets.map((s) => ({ weight: s.weight, reps: s.reps, type: s.setType as never, isCompleted: true }))
  );
  const workingSets = allSets.filter((s) => s.setType !== 'warmup').length;

  const onDelete = () => {
    Alert.alert('Usunąć trening?', 'Tej operacji nie można cofnąć.', [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Usuń',
        style: 'destructive',
        onPress: () => {
          deleteWorkout(String(id));
          router.back();
        },
      },
    ]);
  };

  const onRepeat = () => {
    startEmpty();
    full.exercises.forEach((e) => addExercise(e.exerciseId));
    router.replace('/workout/active');
  };

  const onSaveAsRoutine = () => {
    saveRoutine({
      name: full.name,
      exercises: full.exercises.map((e) => ({
        exerciseId: e.exerciseId,
        restSeconds: e.restSeconds,
        supersetGroup: e.supersetGroup,
        sets: e.sets
          .filter((s) => s.setType !== 'warmup')
          .map((s) => ({
            targetReps: s.reps,
            targetWeight: s.weight,
            setType: s.setType as SetType,
          })),
      })),
    });
    hapticSuccess();
    Alert.alert('Zapisano rutynę', `„${full.name}" jest teraz dostępna jako rutyna na ekranie Trening.`);
  };

  return (
    <>
      <Stack.Screen options={{ title: full.name }} />
      <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: Spacing.lg }}>
        <Text variant="caption" color={c.textSecondary}>
          {dayjs(full.startedAt).format('dddd, D MMMM YYYY · HH:mm')}
        </Text>

        <View style={[styles.stats, { borderColor: c.border }]}>
          <Stat label="Czas" value={formatWorkoutLength(full.durationSec ?? 0)} />
          <Stat label="Wolumen" value={formatVolume(volume, unit as never)} />
          <Stat label="Serie" value={String(workingSets)} />
        </View>

        {full.notes ? (
          <Card style={{ marginBottom: Spacing.md }}>
            <Text variant="label" color={c.textSecondary} weight="700" style={{ marginBottom: 4 }}>
              NOTATKA
            </Text>
            <Text variant="body">{full.notes}</Text>
          </Card>
        ) : null}

        {full.exercises.map((ex) => {
          const def = getExercise(ex.exerciseId);
          return (
            <Card key={ex.id} style={{ marginBottom: Spacing.md }}>
              <Text variant="heading" color={c.primary} numberOfLines={2}>
                {def?.name ?? ex.exerciseId}
              </Text>
              <Divider style={{ marginVertical: Spacing.sm }} />
              {ex.sets.map((s, i) => (
                <View key={s.id} style={styles.setRow}>
                  <Text variant="label" color={c.textSecondary} style={{ width: 28 }}>
                    {SET_TYPE_SHORT[s.setType as SetType] || i + 1}
                  </Text>
                  <Text variant="body" weight="600" style={{ flex: 1 }}>
                    {formatSetLine(s.weight, s.reps, s.durationSec, s.distanceM, unit as never)}
                  </Text>
                  {s.isPR ? <Icon name="ribbon" size={16} color={c.pr} /> : null}
                </View>
              ))}
            </Card>
          );
        })}

        <Button
          title="Powtórz trening"
          icon={<Icon name="refresh" size={20} color={c.onPrimary} />}
          onPress={onRepeat}
          style={{ marginTop: Spacing.md }}
        />
        <Button
          title="Zapisz jako rutynę"
          variant="secondary"
          icon={<Icon name="bookmark-outline" size={18} color={c.text} />}
          onPress={onSaveAsRoutine}
          style={{ marginTop: Spacing.sm }}
        />
        <Button title="Usuń trening" variant="ghost" onPress={onDelete} style={{ marginTop: Spacing.sm }} />
      </ScrollView>
    </>
  );
}

function formatSetLine(
  weight: number | null,
  reps: number | null,
  duration: number | null,
  distance: number | null,
  unit: 'kg' | 'lb'
): string {
  const parts: string[] = [];
  if (weight != null && weight > 0) parts.push(formatWeight(weight, unit));
  if (reps != null) parts.push(`${reps} powt.`);
  if (duration != null && duration > 0) parts.push(`${duration}s`);
  if (distance != null && distance > 0) parts.push(`${distance}m`);
  return parts.join(' · ') || '—';
}

function Stat({ label, value }: { label: string; value: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text variant="caption" color={c.textMuted}>
        {label}
      </Text>
      <Text variant="heading" weight="800" center>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: {
    flexDirection: 'row',
    paddingVertical: Spacing.lg,
    marginVertical: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
});
