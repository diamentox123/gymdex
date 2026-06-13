/**
 * Ekran „Rekordy" — hub wszystkich rekordów życiowych (PR) per ćwiczenie.
 * Najlepszy szacowany 1RM + najcięższa seria. Filtrowanie po partii.
 */
import React, { useMemo, useState, useCallback } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { Text, Card, EmptyState, Chip } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useTheme, Spacing, Radius } from '@/theme';
import { getAllRecords, type ExerciseRecord } from '@/db/repo-workouts';
import { formatWeight } from '@/lib/format';
import { useSettings } from '@/store/settings';

export default function RecordsScreen() {
  const { c } = useTheme();
  const router = useRouter();
  const unit = useSettings((s) => s.settings?.unit ?? 'kg');
  const [records, setRecords] = useState<ExerciseRecord[]>([]);
  const [filter, setFilter] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setRecords(getAllRecords());
    }, [])
  );

  const parts = useMemo(() => {
    const set = new Set(records.map((r) => r.bodyPart));
    return [...set].sort();
  }, [records]);

  const filtered = useMemo(
    () => (filter ? records.filter((r) => r.bodyPart === filter) : records),
    [records, filter]
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Rekordy' }} />
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        {records.length === 0 ? (
          <EmptyState
            icon={<Icon name="ribbon-outline" size={42} color={c.textMuted} />}
            title="Brak rekordów"
            subtitle="Ukończ trening z ciężarem, aby zacząć bić rekordy życiowe."
          />
        ) : (
          <>
            {parts.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={{ gap: Spacing.xs, paddingHorizontal: Spacing.lg }}>
                <Chip label="Wszystko" active={filter == null} onPress={() => setFilter(null)} />
                {parts.map((p) => (
                  <Chip key={p} label={cap(p)} active={filter === p} onPress={() => setFilter(p)} />
                ))}
              </ScrollView>
            ) : null}
            <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.sm }}>
              {filtered.map((r) => (
                <Pressable key={r.exerciseId} onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: r.exerciseId } })}>
                  <Card padded={false}>
                    <View style={styles.row}>
                      <View style={[styles.medal, { backgroundColor: c.pr + '22' }]}>
                        <Icon name="trophy" size={22} color={c.pr} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text variant="body" weight="700" numberOfLines={1}>
                          {r.exerciseName}
                        </Text>
                        <Text variant="caption" color={c.textSecondary}>
                          {cap(r.bodyPart)}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text variant="heading" weight="800" color={c.pr}>
                          {formatWeight(r.best1RM, unit as never)}
                        </Text>
                        <Text variant="caption" color={c.textMuted}>
                          szac. 1RM
                        </Text>
                      </View>
                    </View>
                    {r.maxWeight > 0 ? (
                      <View style={styles.footer}>
                        <Icon name="barbell-outline" size={14} color={c.textSecondary} />
                        <Text variant="caption" color={c.textSecondary}>
                          Najcięższa: {formatWeight(r.maxWeight, unit as never)}
                          {r.maxWeightReps ? ` × ${r.maxWeightReps}` : ''}
                        </Text>
                      </View>
                    ) : null}
                  </Card>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}
      </View>
    </>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  filterBar: { maxHeight: 48, paddingVertical: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  medal: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
});
