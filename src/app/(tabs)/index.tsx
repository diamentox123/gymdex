/**
 * Zakładka „Trening" — ekran startowy. Szybki start pustego treningu oraz
 * lista rutyn (szablonów), z których można rozpocząć sesję.
 */
import React, { useState, useCallback } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Text, Button, Card, EmptyState } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useTheme, Spacing, Radius } from '@/theme';
import { useWorkout } from '@/store/workout';
import { getAllRoutines, routineExerciseCount, deleteRoutine } from '@/db/repo-routines';
import type { RoutineRow } from '@/db/schema';
import { Alert } from 'react-native';

export default function TrainingTab() {
  const { c } = useTheme();
  const router = useRouter();
  const active = useWorkout((s) => s.active);
  const [routines, setRoutines] = useState<RoutineRow[]>([]);

  const reload = useCallback(() => setRoutines(getAllRoutines()), []);
  useFocusEffect(useCallback(() => reload(), [reload]));

  const startEmpty = () => router.push('/workout/active');
  const resumeWorkout = () => router.push('/workout/active');
  const startRoutine = (id: string) => router.push({ pathname: '/workout/active', params: { routineId: id } });

  const onDeleteRoutine = (r: RoutineRow) => {
    Alert.alert('Usunąć rutynę?', `„${r.name}" zostanie usunięta.`, [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: () => { deleteRoutine(r.id); reload(); } },
    ]);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing.xxl }}
    >
      {/* Wznów aktywny trening, jeśli jest */}
      {active ? (
        <Card style={{ borderColor: c.primary, marginBottom: Spacing.lg }}>
          <Text variant="caption" color={c.primary} weight="700">
            TRWA TRENING
          </Text>
          <Text variant="heading" style={{ marginTop: 4 }}>
            Masz niezakończony trening
          </Text>
          <Button title="Wróć do treningu" onPress={resumeWorkout} style={{ marginTop: Spacing.md }} />
        </Card>
      ) : null}

      <Button
        title="Rozpocznij pusty trening"
        icon={<Icon name="play" size={20} color={c.onPrimary} />}
        size="lg"
        onPress={startEmpty}
      />

      <View style={styles.sectionHead}>
        <Text variant="heading" weight="800">
          Rutyny
        </Text>
        <Pressable onPress={() => router.push('/routine/edit')} hitSlop={8} style={styles.addBtn}>
          <Icon name="add" size={18} color={c.primary} />
          <Text variant="label" color={c.primary} weight="700">
            Nowa
          </Text>
        </Pressable>
      </View>

      {routines.length === 0 ? (
        <EmptyState
          icon={<Icon name="clipboard-outline" size={42} color={c.textMuted} />}
          title="Brak rutyn"
          subtitle="Utwórz rutynę (szablon), aby szybko rozpocząć powtarzalny trening."
        />
      ) : (
        routines.map((r) => (
          <Pressable key={r.id} onPress={() => startRoutine(r.id)}>
            <Card style={{ marginBottom: Spacing.md }}>
              <View style={styles.routineRow}>
                <View style={{ flex: 1 }}>
                  <Text variant="heading" numberOfLines={1}>
                    {r.name}
                  </Text>
                  <Text variant="caption" color={c.textSecondary} style={{ marginTop: 2 }}>
                    {formatExerciseCount(routineExerciseCount(r.id))}
                  </Text>
                </View>
                <Pressable
                  onPress={() => router.push({ pathname: '/routine/edit', params: { id: r.id } })}
                  hitSlop={8}
                  style={styles.smallBtn}
                >
                  <Icon name="create-outline" size={18} color={c.textSecondary} />
                </Pressable>
                <Pressable onPress={() => onDeleteRoutine(r)} hitSlop={8} style={styles.smallBtn}>
                  <Icon name="trash-outline" size={18} color={c.danger} />
                </Pressable>
              </View>
              <Button
                title="Rozpocznij"
                variant="secondary"
                size="sm"
                onPress={() => startRoutine(r.id)}
                style={{ marginTop: Spacing.md }}
              />
            </Card>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

function formatExerciseCount(n: number): string {
  if (n === 1) return '1 ćwiczenie';
  const lastDigit = n % 10;
  const lastTwo = n % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14)) return `${n} ćwiczenia`;
  return `${n} ćwiczeń`;
}

const styles = StyleSheet.create({
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  routineRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  smallBtn: { padding: Spacing.xs },
});
