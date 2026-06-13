/**
 * Ekran „Osiągnięcia" — odznaki za kamienie milowe + serie (streaki).
 * Grywalizacja: motywuje do regularności i progresu.
 */
import React, { useMemo } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { Text, Card } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useTheme, Spacing, Radius } from '@/theme';
import {
  getWorkoutBriefs,
  getTotalPRCount,
  getTimeOfDayFlags,
  getOverallStats,
} from '@/db/repo-stats';
import {
  computeAchievements,
  achievementScore,
  currentDayStreak,
  longestDayStreak,
  activeWeeks,
  avgWorkoutsPerWeek,
  type Achievement,
} from '@/lib/achievements';

const TIER_COLOR: Record<Achievement['tier'], string> = {
  'brąz': '#CD7F32',
  'srebro': '#9BA3AF',
  'złoto': '#F5C518',
  'platyna': '#5BC8E6',
};

export default function AchievementsScreen() {
  const { c } = useTheme();

  const data = useMemo(() => {
    const briefs = getWorkoutBriefs();
    const stats = getOverallStats();
    const flags = getTimeOfDayFlags();
    const longest = longestDayStreak(briefs);
    const list = computeAchievements({
      totalWorkouts: stats.totalWorkouts,
      totalVolumeKg: stats.totalVolume,
      totalSets: stats.totalSets,
      totalPRs: getTotalPRCount(),
      longestStreak: longest,
      activeWeeks: activeWeeks(briefs),
      earlyBird: flags.earlyBird,
      nightOwl: flags.nightOwl,
    });
    return {
      list,
      score: achievementScore(list),
      currentStreak: currentDayStreak(briefs),
      longest,
      avgPerWeek: avgWorkoutsPerWeek(briefs),
    };
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: 'Osiągnięcia' }} />
      <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing.xxl }}>
        {/* Pasek serii + statystyki regularności */}
        <View style={styles.statRow}>
          <StreakTile icon="flame" value={String(data.currentStreak)} label="seria (dni)" color={c.primary} />
          <StreakTile icon="trophy" value={String(data.longest)} label="rekord serii" color={TIER_COLOR['złoto']} />
          <StreakTile icon="repeat" value={data.avgPerWeek.toFixed(1)} label="śr. / tydzień" color={c.success} />
        </View>

        {/* Postęp odznak */}
        <Card style={{ marginTop: Spacing.lg }}>
          <View style={styles.scoreHead}>
            <Icon name="medal" size={22} color={TIER_COLOR['złoto']} />
            <Text variant="heading" weight="800">
              {data.score.unlocked} / {data.score.total} odznak
            </Text>
          </View>
          <ProgressBar value={data.score.total ? data.score.unlocked / data.score.total : 0} color={TIER_COLOR['złoto']} />
        </Card>

        {/* Lista odznak */}
        <View style={{ marginTop: Spacing.lg, gap: Spacing.sm }}>
          {data.list.map((a) => (
            <AchievementRow key={a.id} a={a} />
          ))}
        </View>
      </ScrollView>
    </>
  );
}

function AchievementRow({ a }: { a: Achievement }) {
  const { c } = useTheme();
  const tierColor = TIER_COLOR[a.tier];
  return (
    <Card padded={false} style={{ opacity: a.unlocked ? 1 : 0.62 }}>
      <View style={styles.row}>
        <View style={[styles.badge, { backgroundColor: a.unlocked ? tierColor + '22' : c.surfaceAlt, borderColor: a.unlocked ? tierColor : c.border }]}>
          <Icon name={a.icon as never} size={24} color={a.unlocked ? tierColor : c.textMuted} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.titleLine}>
            <Text variant="body" weight="700">
              {a.title}
            </Text>
            {a.unlocked ? <Icon name="checkmark-circle" size={16} color={c.success} /> : null}
          </View>
          <Text variant="caption" color={c.textSecondary}>
            {a.description}
          </Text>
          {!a.unlocked && a.progress > 0 && a.progressLabel !== 'Niezdobyte' ? (
            <View style={{ marginTop: 6 }}>
              <ProgressBar value={a.progress} color={tierColor} thin />
              <Text variant="caption" color={c.textMuted} style={{ marginTop: 2 }}>
                {a.progressLabel}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

function StreakTile({ icon, value, label, color }: { icon: string; value: string; label: string; color: string }) {
  const { c } = useTheme();
  return (
    <Card style={{ flex: 1, alignItems: 'center', paddingVertical: Spacing.lg }}>
      <Icon name={icon as never} size={22} color={color} />
      <Text variant="title" weight="800" style={{ marginTop: 4 }}>
        {value}
      </Text>
      <Text variant="caption" color={c.textSecondary} center>
        {label}
      </Text>
    </Card>
  );
}

function ProgressBar({ value, color, thin }: { value: number; color: string; thin?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ height: thin ? 4 : 8, borderRadius: Radius.pill, backgroundColor: c.surfaceAlt, overflow: 'hidden', marginTop: thin ? 0 : Spacing.sm }}>
      <View style={{ width: `${Math.round(value * 100)}%`, height: '100%', backgroundColor: color, borderRadius: Radius.pill }} />
    </View>
  );
}

const styles = StyleSheet.create({
  statRow: { flexDirection: 'row', gap: Spacing.sm },
  scoreHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  badge: { width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
