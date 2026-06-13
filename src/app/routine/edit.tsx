/**
 * Edytor rutyny (szablonu). Tworzenie nowej lub edycja istniejącej:
 * nazwa, ćwiczenia, docelowe serie (powt./ciężar) i czas odpoczynku.
 */
import React, { useState, useCallback, useEffect } from 'react';
import { View, ScrollView, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button, Card, Divider } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useTheme, Spacing, Radius } from '@/theme';
import { getExercise } from '@/db/repo-exercises';
import { getRoutineFull, saveRoutine } from '@/db/repo-routines';
import { pendingPicked, clearPicked } from '@/lib/picker-bridge';
import { newId } from '@/lib/id';
import { useSettings } from '@/store/settings';
import { displayWeight, toKg } from '@/lib/calc';
import { trimNumber } from '@/lib/format';
import type { SetType } from '@/lib/types';

interface DraftSet {
  id: string;
  targetReps: string;
  targetWeight: string;
  setType: SetType;
}
interface DraftExercise {
  id: string;
  exerciseId: string;
  name: string;
  restSeconds: number;
  sets: DraftSet[];
}

export default function RoutineEditor() {
  const { c } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = Boolean(id);
  const unit = useSettings((s) => s.settings?.unit ?? 'kg');

  const [name, setName] = useState('');
  const [exercises, setExercises] = useState<DraftExercise[]>([]);

  // Wczytaj istniejącą rutynę do edycji.
  useEffect(() => {
    if (!id) return;
    const r = getRoutineFull(String(id));
    if (!r) return;
    setName(r.name);
    setExercises(
      r.exercises.map((re) => {
        const def = getExercise(re.exerciseId);
        return {
          id: re.id,
          exerciseId: re.exerciseId,
          name: def?.name ?? re.exerciseId,
          restSeconds: re.restSeconds,
          sets: re.sets.map((s) => ({
            id: s.id,
            targetReps: s.targetReps != null ? String(s.targetReps) : '',
            // cele w DB w kg → jednostka użytkownika do edycji
            targetWeight: s.targetWeight != null ? trimNumber(displayWeight(s.targetWeight, unit as never)) : '',
            setType: s.setType as SetType,
          })),
        };
      })
    );
  }, [id]);

  // Odbierz ćwiczenia z pickera.
  useFocusEffect(
    useCallback(() => {
      const picked = pendingPicked();
      if (picked.length) {
        const added: DraftExercise[] = [];
        for (const exId of picked) {
          const def = getExercise(exId);
          if (!def) continue;
          added.push({
            id: newId('dre'),
            exerciseId: exId,
            name: def.name,
            restSeconds: 120,
            sets: [{ id: newId('drs'), targetReps: '', targetWeight: '', setType: 'normal' }],
          });
        }
        if (added.length) setExercises((prev) => [...prev, ...added]);
        clearPicked();
      }
    }, [])
  );

  const addSet = (exId: string) => {
    setExercises((prev) =>
      prev.map((e) =>
        e.id === exId
          ? { ...e, sets: [...e.sets, { id: newId('drs'), targetReps: '', targetWeight: '', setType: 'normal' }] }
          : e
      )
    );
  };
  const removeSet = (exId: string, setId: string) => {
    setExercises((prev) =>
      prev.map((e) => (e.id === exId ? { ...e, sets: e.sets.filter((s) => s.id !== setId) } : e))
    );
  };
  const updateSet = (exId: string, setId: string, patch: Partial<DraftSet>) => {
    setExercises((prev) =>
      prev.map((e) =>
        e.id === exId ? { ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) } : e
      )
    );
  };
  const removeExercise = (exId: string) => setExercises((prev) => prev.filter((e) => e.id !== exId));
  const setRest = (exId: string, sec: number) =>
    setExercises((prev) => prev.map((e) => (e.id === exId ? { ...e, restSeconds: Math.max(0, sec) } : e)));

  const save = () => {
    if (!name.trim()) {
      Alert.alert('Podaj nazwę', 'Rutyna musi mieć nazwę.');
      return;
    }
    if (exercises.length === 0) {
      Alert.alert('Brak ćwiczeń', 'Dodaj przynajmniej jedno ćwiczenie.');
      return;
    }
    saveRoutine({
      id: editing ? String(id) : undefined,
      name,
      exercises: exercises.map((e) => ({
        exerciseId: e.exerciseId,
        restSeconds: e.restSeconds,
        supersetGroup: null,
        sets: e.sets.map((s) => ({
          targetReps: s.targetReps ? parseInt(s.targetReps, 10) : null,
          // wpisane w jednostce użytkownika → kg do zapisu
          targetWeight: s.targetWeight ? toKg(parseFloat(s.targetWeight.replace(',', '.')), unit as never) : null,
          setType: s.setType,
        })),
      })),
    });
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ title: editing ? 'Edytuj rutynę' : 'Nowa rutyna' }} />
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Nazwa rutyny (np. Push A)"
            placeholderTextColor={c.textMuted}
            style={[styles.nameInput, { color: c.text, backgroundColor: c.inputBg, borderColor: c.border }]}
          />

          {exercises.map((ex) => (
            <Card key={ex.id} style={{ marginTop: Spacing.lg }}>
              <View style={styles.exHead}>
                <Text variant="heading" color={c.primary} style={{ flex: 1 }} numberOfLines={2}>
                  {ex.name}
                </Text>
                <Pressable onPress={() => removeExercise(ex.id)} hitSlop={8}>
                  <Icon name="trash-outline" size={18} color={c.danger} />
                </Pressable>
              </View>

              {/* Rest */}
              <View style={styles.restRow}>
                <Text variant="label" color={c.textSecondary}>
                  Odpoczynek:
                </Text>
                <Pressable onPress={() => setRest(ex.id, ex.restSeconds - 15)} style={[styles.restBtn, { backgroundColor: c.surfaceAlt }]}>
                  <Text variant="label" weight="800">−</Text>
                </Pressable>
                <Text variant="body" weight="700">
                  {ex.restSeconds}s
                </Text>
                <Pressable onPress={() => setRest(ex.id, ex.restSeconds + 15)} style={[styles.restBtn, { backgroundColor: c.surfaceAlt }]}>
                  <Text variant="label" weight="800">+</Text>
                </Pressable>
              </View>

              <Divider style={{ marginVertical: Spacing.sm }} />

              {/* Nagłówki */}
              <View style={styles.setHead}>
                <Text variant="caption" color={c.textMuted} style={{ width: 28 }}>#</Text>
                <Text variant="caption" color={c.textMuted} style={{ flex: 1, textAlign: 'center' }}>Cel {unit}</Text>
                <Text variant="caption" color={c.textMuted} style={{ flex: 1, textAlign: 'center' }}>Cel powt.</Text>
                <View style={{ width: 28 }} />
              </View>

              {ex.sets.map((s, i) => (
                <View key={s.id} style={styles.setRow}>
                  <Text variant="label" weight="700" color={c.textSecondary} style={{ width: 28, textAlign: 'center' }}>
                    {i + 1}
                  </Text>
                  <TextInput
                    value={s.targetWeight}
                    onChangeText={(t) => updateSet(ex.id, s.id, { targetWeight: t.replace(/[^0-9.,]/g, '') })}
                    placeholder="—"
                    placeholderTextColor={c.textMuted}
                    keyboardType="decimal-pad"
                    style={[styles.setInput, { color: c.text, backgroundColor: c.inputBg, borderColor: c.border }]}
                  />
                  <TextInput
                    value={s.targetReps}
                    onChangeText={(t) => updateSet(ex.id, s.id, { targetReps: t.replace(/[^0-9]/g, '') })}
                    placeholder="—"
                    placeholderTextColor={c.textMuted}
                    keyboardType="number-pad"
                    style={[styles.setInput, { color: c.text, backgroundColor: c.inputBg, borderColor: c.border }]}
                  />
                  <Pressable onPress={() => removeSet(ex.id, s.id)} hitSlop={6} style={{ width: 28, alignItems: 'center' }}>
                    <Icon name="remove-circle-outline" size={18} color={c.textMuted} />
                  </Pressable>
                </View>
              ))}

              <Pressable onPress={() => addSet(ex.id)} style={[styles.addSet, { backgroundColor: c.surfaceAlt }]}>
                <Icon name="add" size={16} color={c.text} />
                <Text variant="label" weight="700">Dodaj serię</Text>
              </Pressable>
            </Card>
          ))}

          <Button
            title="Dodaj ćwiczenie"
            variant="secondary"
            icon={<Icon name="add" size={20} color={c.text} />}
            onPress={() => router.push('/exercise/picker')}
            style={{ marginTop: Spacing.lg }}
          />
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: c.surface, borderColor: c.border, paddingBottom: insets.bottom + Spacing.md }]}>
          <Button title="Zapisz rutynę" onPress={save} icon={<Icon name="checkmark" size={20} color={c.onPrimary} />} />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  nameInput: {
    fontSize: 18,
    fontWeight: '700',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  exHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  restRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  restBtn: { width: 32, height: 32, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  setHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  setInput: {
    flex: 1,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 15,
    fontWeight: '700',
  },
  addSet: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    marginTop: Spacing.sm,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
