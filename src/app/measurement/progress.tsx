/**
 * Ekran „Pomiary ciała" — trend masy ciała i obwodów w czasie + delty.
 * Wspiera cele redukcji/budowy (wykres mówi więcej niż lista liczb).
 */
import React, { useMemo, useState, useCallback } from 'react';
import { ScrollView, View } from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import dayjs from 'dayjs';
import { Text, Card, EmptyState, Button, Chip } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useTheme, Spacing } from '@/theme';
import { LineProgressChart } from '@/components/Charts';
import { getBodyMeasurements } from '@/db/repo-stats';
import { displayWeight } from '@/lib/calc';
import { formatWeight, trimNumber } from '@/lib/format';
import { useSettings } from '@/store/settings';
import type { BodyMeasurementRow } from '@/db/schema';

type Metric = { key: keyof BodyMeasurementRow; label: string; isWeight?: boolean; unit?: string };

const METRICS: Metric[] = [
  { key: 'bodyweight', label: 'Masa ciała', isWeight: true },
  { key: 'waist', label: 'Talia', unit: 'cm' },
  { key: 'chest', label: 'Klatka', unit: 'cm' },
  { key: 'arm', label: 'Ramię', unit: 'cm' },
  { key: 'thigh', label: 'Udo', unit: 'cm' },
  { key: 'hips', label: 'Biodra', unit: 'cm' },
  { key: 'bodyFat', label: 'Tłuszcz', unit: '%' },
];

export default function MeasurementProgress() {
  const { c } = useTheme();
  const router = useRouter();
  const unit = useSettings((s) => s.settings?.unit ?? 'kg');
  const [rows, setRows] = useState<BodyMeasurementRow[]>([]);
  const [metric, setMetric] = useState<Metric>(METRICS[0]);

  useFocusEffect(
    useCallback(() => {
      setRows(getBodyMeasurements());
    }, [])
  );

  // Metryki, które mają jakiekolwiek dane (do filtra).
  const available = useMemo(
    () => METRICS.filter((m) => rows.some((r) => r[m.key] != null)),
    [rows]
  );

  // Punkty wykresu dla wybranej metryki (rosnąco po dacie).
  const series = useMemo(() => {
    const pts = rows
      .filter((r) => r[metric.key] != null)
      .map((r) => ({ date: r.date, value: r[metric.key] as number }))
      .sort((a, b) => a.date - b.date);
    return pts;
  }, [rows, metric]);

  const chartData = useMemo(
    () =>
      series.map((p) => ({
        value: metric.isWeight ? Math.round(displayWeight(p.value, unit as never) * 10) / 10 : p.value,
        label: dayjs(p.date).format('DD.MM'),
      })),
    [series, metric, unit]
  );

  const delta = useMemo(() => {
    if (series.length < 2) return null;
    const first = series[0].value;
    const last = series[series.length - 1].value;
    return { abs: last - first, first, last };
  }, [series]);

  const fmt = (v: number) =>
    metric.isWeight ? formatWeight(v, unit as never) : `${trimNumber(v)} ${metric.unit ?? ''}`.trim();

  if (rows.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: 'Pomiary ciała' }} />
        <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center' }}>
          <EmptyState
            icon={<Icon name="body-outline" size={42} color={c.textMuted} />}
            title="Brak pomiarów"
            subtitle="Dodaj masę ciała i obwody, aby śledzić trend."
          />
          <Button
            title="Dodaj pomiar"
            variant="secondary"
            size="sm"
            onPress={() => router.push('/measurement/new')}
            fullWidth={false}
            style={{ alignSelf: 'center', marginTop: Spacing.md }}
          />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Pomiary ciała' }} />
      <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing.xxl }}>
        {/* Wybór metryki */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.xs, paddingBottom: Spacing.md }}>
          {available.map((m) => (
            <Chip key={String(m.key)} label={m.label} active={m.key === metric.key} onPress={() => setMetric(m)} />
          ))}
        </ScrollView>

        {/* Delta */}
        {delta ? (
          <Card style={{ alignItems: 'center', marginBottom: Spacing.lg }}>
            <Text variant="caption" color={c.textSecondary}>
              {metric.label} — zmiana
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 4 }}>
              <Icon
                name={delta.abs > 0 ? 'arrow-up' : delta.abs < 0 ? 'arrow-down' : 'remove'}
                size={20}
                color={delta.abs === 0 ? c.textMuted : c.primary}
              />
              <Text variant="display" weight="800" color={c.primary}>
                {delta.abs > 0 ? '+' : ''}
                {fmt(delta.abs)}
              </Text>
            </View>
            <Text variant="caption" color={c.textMuted}>
              {fmt(delta.first)} → {fmt(delta.last)}
            </Text>
          </Card>
        ) : null}

        {/* Wykres */}
        <Card>
          <LineProgressChart data={chartData} suffix={metric.isWeight ? ` ${unit}` : metric.unit ? ` ${metric.unit}` : ''} />
        </Card>

        <Button
          title="Dodaj pomiar"
          variant="secondary"
          icon={<Icon name="add" size={18} color={c.text} />}
          onPress={() => router.push('/measurement/new')}
          style={{ marginTop: Spacing.lg }}
        />
      </ScrollView>
    </>
  );
}
