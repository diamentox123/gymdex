/**
 * Podsumowanie po zakończeniu treningu: czas, wolumen, serie i nowe
 * rekordy życiowe. Daje też skrót do zapisania treningu jako rutyny.
 */
import React, { useEffect } from 'react';
import { View, Modal, ScrollView, StyleSheet } from 'react-native';
import { Text, Button, Divider } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useTheme, Spacing, Radius } from '@/theme';
import { formatWorkoutLength, formatVolume, formatWeight } from '@/lib/format';
import { useSettings } from '@/store/settings';
import { getExercise } from '@/db/repo-exercises';
import { hapticSuccess, hapticTick } from '@/lib/haptics';
import type { NewPR } from '@/db/repo-workouts';

const PR_LABEL: Record<NewPR['type'], string> = {
  '1rm': 'Rekord 1RM',
  maxWeight: 'Rekordowy ciężar',
  maxVolume: 'Rekordowy wolumen',
};

export function WorkoutSummary({
  name,
  durationSec,
  volume,
  sets,
  exerciseCount,
  prevVolume,
  prs,
  workoutId,
  onClose,
}: {
  name: string;
  durationSec: number;
  volume: number;
  sets: number;
  exerciseCount?: number;
  prevVolume?: number | null;
  prs: NewPR[];
  workoutId: string | null;
  onClose: () => void;
}) {
  const { c } = useTheme();
  const unit = useSettings((s) => s.settings?.unit ?? 'kg');
  const hasPRs = prs.length > 0;
  const volumeDelta =
    prevVolume != null && prevVolume > 0 && volume > 0
      ? Math.round(((volume - prevVolume) / prevVolume) * 100)
      : null;

  // Celebracja: mocniejsza haptyka gdy padły rekordy.
  useEffect(() => {
    if (hasPRs) {
      hapticSuccess();
      const t1 = setTimeout(() => hapticTick(), 160);
      const t2 = setTimeout(() => hapticTick(), 300);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
    hapticSuccess();
  }, [hasPRs]);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={[styles.trophy, { backgroundColor: hasPRs ? c.pr + '22' : c.successMuted }]}>
            <Icon name={hasPRs ? 'ribbon' : 'trophy'} size={36} color={hasPRs ? c.pr : c.success} />
          </View>
          <Text variant="title" weight="800" center>
            {hasPRs ? `Nowy rekord! 🎉` : 'Trening zapisany!'}
          </Text>
          <Text variant="body" color={c.textSecondary} center style={{ marginTop: 4 }}>
            {name}
          </Text>

          <View style={[styles.stats, { borderColor: c.border }]}>
            <Stat label="Czas" value={formatWorkoutLength(durationSec)} />
            <Stat label="Wolumen" value={formatVolume(volume, unit as never)} />
            <Stat label="Serie" value={String(sets)} />
            {exerciseCount != null ? <Stat label="Ćwiczenia" value={String(exerciseCount)} /> : null}
          </View>

          {volumeDelta != null ? (
            <View style={[styles.deltaRow, { backgroundColor: (volumeDelta >= 0 ? c.success : c.danger) + '18' }]}>
              <Icon
                name={volumeDelta > 0 ? 'trending-up' : volumeDelta < 0 ? 'trending-down' : 'remove'}
                size={18}
                color={volumeDelta >= 0 ? c.success : c.danger}
              />
              <Text variant="body" weight="700" color={volumeDelta >= 0 ? c.success : c.danger}>
                {volumeDelta > 0 ? '+' : ''}
                {volumeDelta}% wolumenu vs poprzedni trening
              </Text>
            </View>
          ) : null}

          {prs.length > 0 ? (
            <>
              <View style={styles.prHeader}>
                <Icon name="ribbon" size={18} color={c.pr} />
                <Text variant="heading" color={c.pr} weight="800">
                  Nowe rekordy ({prs.length})
                </Text>
              </View>
              <ScrollView style={{ maxHeight: 200 }}>
                {prs.map((pr, i) => {
                  const ex = getExercise(pr.exerciseId);
                  return (
                    <View key={i}>
                      <View style={styles.prRow}>
                        <View style={{ flex: 1 }}>
                          <Text variant="body" weight="700" numberOfLines={1}>
                            {ex?.name ?? pr.exerciseId}
                          </Text>
                          <Text variant="caption" color={c.textSecondary}>
                            {PR_LABEL[pr.type]}
                          </Text>
                        </View>
                        <Text variant="body" weight="800" color={c.pr}>
                          {pr.type === '1rm'
                            ? `${formatWeight(pr.value, unit as never)}`
                            : `${formatWeight(pr.weight ?? pr.value, unit as never)} × ${pr.reps ?? ''}`}
                        </Text>
                      </View>
                      {i < prs.length - 1 ? <Divider /> : null}
                    </View>
                  );
                })}
              </ScrollView>
            </>
          ) : (
            <Text variant="body" color={c.textSecondary} center style={{ marginVertical: Spacing.lg }}>
              Solidna robota. Tak trzymaj! 💪
            </Text>
          )}

          <Button title="Gotowe" onPress={onClose} style={{ marginTop: Spacing.lg }} />
        </View>
      </View>
    </Modal>
  );
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
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxl + Spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  trophy: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  stats: {
    flexDirection: 'row',
    paddingVertical: Spacing.lg,
    marginVertical: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.lg,
  },
  prHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
});
