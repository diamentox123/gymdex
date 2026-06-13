/**
 * Zakładka „Historia" — lista ukończonych treningów z podsumowaniem.
 * Tap → szczegóły treningu (podgląd/usuń/duplikuj).
 */
import React, { useState, useCallback } from 'react';
import { View, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import dayjs from 'dayjs';
import 'dayjs/locale/pl';
import { Text, Card, EmptyState } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useTheme, Spacing } from '@/theme';
import { getWorkoutHistory, getWorkoutFull } from '@/db/repo-workouts';
import { totalVolume } from '@/lib/calc';
import { formatWorkoutLength, formatVolume, formatSetsCount } from '@/lib/format';
import { useSettings } from '@/store/settings';
import type { WorkoutRow } from '@/db/schema';

dayjs.locale('pl');

interface HistoryItem {
  workout: WorkoutRow;
  volume: number;
  sets: number;
  exerciseCount: number;
  prCount: number;
}

export default function HistoryTab() {
  const { c } = useTheme();
  const router = useRouter();
  const unit = useSettings((s) => s.settings?.unit ?? 'kg');
  const [items, setItems] = useState<HistoryItem[]>([]);

  const reload = useCallback(() => {
    const history = getWorkoutHistory();
    const enriched: HistoryItem[] = history.map((w) => {
      const full = getWorkoutFull(w.id);
      const allSets = full ? full.exercises.flatMap((e) => e.sets) : [];
      const completed = allSets.filter((s) => s.isCompleted);
      const vol = totalVolume(
        completed.map((s) => ({ weight: s.weight, reps: s.reps, type: s.setType as never, isCompleted: true }))
      );
      return {
        workout: w,
        volume: vol,
        sets: completed.filter((s) => s.setType !== 'warmup').length,
        exerciseCount: full?.exercises.length ?? 0,
        prCount: completed.filter((s) => s.isPR).length,
      };
    });
    setItems(enriched);
  }, []);

  useFocusEffect(useCallback(() => reload(), [reload]));

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <FlatList
        data={items}
        keyExtractor={(it) => it.workout.id}
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing.xxl }}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push({ pathname: '/workout/[id]', params: { id: item.workout.id } })}>
            <Card style={{ marginBottom: Spacing.md }}>
              <View style={styles.row}>
                <Text variant="heading" weight="700" style={{ flex: 1 }} numberOfLines={1}>
                  {item.workout.name}
                </Text>
                {item.prCount > 0 ? (
                  <View style={[styles.prBadge, { backgroundColor: c.successMuted }]}>
                    <Icon name="ribbon" size={13} color={c.pr} />
                    <Text variant="caption" color={c.pr} weight="700">
                      {item.prCount} PR
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text variant="caption" color={c.textSecondary} style={{ marginTop: 2 }}>
                {dayjs(item.workout.startedAt).format('dddd, D MMMM YYYY · HH:mm')}
              </Text>

              <View style={styles.stats}>
                <MiniStat icon="time-outline" text={formatWorkoutLength(item.workout.durationSec ?? 0)} />
                <MiniStat icon="barbell-outline" text={formatVolume(item.volume, unit as never)} />
                <MiniStat icon="layers-outline" text={formatSetsCount(item.sets)} />
              </View>
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState
            icon={<Icon name="time-outline" size={42} color={c.textMuted} />}
            title="Brak treningów"
            subtitle="Twoje ukończone treningi pojawią się tutaj."
          />
        }
      />
    </View>
  );
}

function MiniStat({ icon, text }: { icon: React.ComponentProps<typeof Icon>['name']; text: string }) {
  const { c } = useTheme();
  return (
    <View style={styles.miniStat}>
      <Icon name={icon} size={14} color={c.textSecondary} />
      <Text variant="caption" color={c.textSecondary}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
  },
  stats: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.md },
  miniStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
