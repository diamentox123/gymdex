/**
 * Zakładka „Statystyki" — przegląd: zbiorcze liczby (Wrapped), wolumen
 * w czasie, wolumen wg partii oraz Strength Score (siła względna).
 */
import React, { useState, useCallback } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import dayjs from 'dayjs';
import { Text, Card, EmptyState, Button } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useTheme, Spacing } from '@/theme';
import { LineProgressChart, SimpleBarChart } from '@/components/Charts';
import {
  getOverallStats,
  getVolumeOverTime,
  getVolumeByBodyPart,
  getBest1RM,
  getLatestBodyweight,
  type OverallStats,
} from '@/db/repo-stats';
import { scoreLift, overallStrengthScore, SCORED_LIFTS, type LiftScore } from '@/lib/strength-score';
import { formatVolume, formatWorkoutLength, formatSetsCount } from '@/lib/format';
import { displayWeight } from '@/lib/calc';
import { useSettings } from '@/store/settings';

export default function StatsTab() {
  const { c } = useTheme();
  const router = useRouter();
  const unit = useSettings((s) => s.settings?.unit ?? 'kg');

  const [stats, setStats] = useState<OverallStats | null>(null);
  const [volPoints, setVolPoints] = useState<{ date: number; volume: number }[]>([]);
  const [byPart, setByPart] = useState<{ bodyPart: string; volume: number }[]>([]);
  const [lifts, setLifts] = useState<LiftScore[]>([]);
  const [bodyweight, setBodyweight] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      setStats(getOverallStats());
      setVolPoints(getVolumeOverTime());
      setByPart(getVolumeByBodyPart());
      const bw = getLatestBodyweight();
      setBodyweight(bw);
      if (bw) {
        const scored = SCORED_LIFTS.map((l) => scoreLift(l.id, getBest1RM(l.id), bw)).filter(
          (x): x is LiftScore => x != null
        );
        setLifts(scored);
      } else {
        setLifts([]);
      }
    }, [])
  );

  if (!stats || stats.totalWorkouts === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center' }}>
        <EmptyState
          icon={<Icon name="stats-chart-outline" size={42} color={c.textMuted} />}
          title="Brak danych"
          subtitle="Zakończ pierwszy trening, aby zobaczyć statystyki i postępy."
        />
      </View>
    );
  }

  const overall = overallStrengthScore(lifts);
  const volChart = volPoints.map((p) => ({
    value: Math.round(displayWeight(p.volume, unit as never)),
    label: dayjs(p.date).format('DD.MM'),
  }));
  const partChart = byPart.slice(0, 8).map((p) => ({
    value: Math.round(displayWeight(p.volume, unit as never)),
    label: shortPart(p.bodyPart),
  }));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing.xxl }}>
      {/* Wrapped — kafelki */}
      <View style={styles.grid}>
        <Tile icon="flame" value={String(stats.totalWorkouts)} label="treningów" />
        <Tile icon="barbell" value={formatVolume(stats.totalVolume, unit as never)} label="całk. wolumen" />
        <Tile icon="layers" value={String(stats.totalSets)} label="serii" />
        <Tile icon="time" value={formatWorkoutLength(stats.totalDurationSec)} label="łącznie czasu" />
      </View>

      {/* Strength Score */}
      <Text variant="heading" weight="800" style={styles.sectionTitle}>
        Strength Score
      </Text>
      {bodyweight == null ? (
        <Card>
          <Text variant="body" color={c.textSecondary}>
            Dodaj swoją masę ciała, aby obliczyć siłę względną.
          </Text>
          <Button
            title="Dodaj pomiar"
            variant="secondary"
            size="sm"
            onPress={() => router.push('/measurement/new')}
            style={{ marginTop: Spacing.md }}
          />
        </Card>
      ) : lifts.length === 0 ? (
        <Card>
          <Text variant="body" color={c.textSecondary}>
            Wykonaj główne boje (przysiad, wyciskanie, martwy ciąg, OHP, podciąganie), aby zobaczyć wynik.
          </Text>
        </Card>
      ) : (
        <Card>
          {overall ? (
            <View style={styles.scoreHead}>
              <Text variant="display" weight="800" color={c.primary}>
                {overall.score}
              </Text>
              <View>
                <Text variant="caption" color={c.textSecondary}>
                  Poziom ogólny
                </Text>
                <Text variant="heading" weight="800">
                  {overall.level}
                </Text>
              </View>
            </View>
          ) : null}
          <View style={{ marginTop: Spacing.md, gap: Spacing.md }}>
            {lifts.map((l) => {
              const label = SCORED_LIFTS.find((s) => s.id === l.exerciseId)?.label ?? l.exerciseId;
              return (
                <View key={l.exerciseId}>
                  <View style={styles.liftRow}>
                    <Text variant="label" weight="600">
                      {label}
                    </Text>
                    <Text variant="caption" color={c.textSecondary}>
                      {l.level} · {l.ratio.toFixed(2)}×
                    </Text>
                  </View>
                  <View style={[styles.bar, { backgroundColor: c.surfaceAlt }]}>
                    <View style={[styles.barFill, { backgroundColor: c.primary, width: `${l.percent}%` }]} />
                  </View>
                </View>
              );
            })}
          </View>
        </Card>
      )}

      {/* Wolumen w czasie */}
      <Text variant="heading" weight="800" style={styles.sectionTitle}>
        Wolumen w czasie
      </Text>
      <Card>
        <LineProgressChart data={volChart} suffix={` ${unit}`} />
      </Card>

      {/* Wolumen wg partii */}
      <Text variant="heading" weight="800" style={styles.sectionTitle}>
        Wolumen wg partii
      </Text>
      <Card>
        <SimpleBarChart data={partChart} />
      </Card>
    </ScrollView>
  );
}

function Tile({ icon, value, label }: { icon: React.ComponentProps<typeof Icon>['name']; value: string; label: string }) {
  const { c } = useTheme();
  return (
    <Card style={styles.tile}>
      <Icon name={icon} size={22} color={c.primary} />
      <Text variant="heading" weight="800" style={{ marginTop: Spacing.sm }} numberOfLines={1}>
        {value}
      </Text>
      <Text variant="caption" color={c.textSecondary}>
        {label}
      </Text>
    </Card>
  );
}

function shortPart(p: string): string {
  const map: Record<string, string> = {
    'całe ciało': 'całe',
    przedramiona: 'przedr.',
    pośladki: 'pośl.',
  };
  return map[p] ?? p;
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  tile: { width: '47%', flexGrow: 1 },
  sectionTitle: { marginTop: Spacing.xl, marginBottom: Spacing.md },
  scoreHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  liftRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  bar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
});
