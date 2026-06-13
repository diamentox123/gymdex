/**
 * Wrappery na react-native-gifted-charts spięte z motywem. Izolują ekrany
 * od szczegółów API biblioteki i zapewniają spójny wygląd.
 */
import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import { Text } from '@/components/ui';
import { useTheme, Spacing } from '@/theme';

export interface ChartPoint {
  value: number;
  label?: string;
}

/** Wykres liniowy postępu (np. est-1RM w czasie). */
export function LineProgressChart({
  data,
  suffix = '',
}: {
  data: ChartPoint[];
  suffix?: string;
}) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();

  if (data.length < 2) {
    return (
      <Text variant="caption" color={c.textMuted} center style={{ paddingVertical: Spacing.xl }}>
        Za mało danych na wykres — wykonaj ćwiczenie w kilku treningach.
      </Text>
    );
  }

  const chartWidth = width - Spacing.lg * 2 - Spacing.lg * 2;
  const spacing = Math.max(24, chartWidth / (data.length - 1));

  return (
    <View style={{ paddingVertical: Spacing.md }}>
      <LineChart
        data={data.map((d) => ({ value: d.value, label: d.label }))}
        color={c.primary}
        thickness={3}
        startFillColor={c.primary}
        endFillColor={c.bg}
        areaChart
        startOpacity={0.25}
        endOpacity={0.02}
        dataPointsColor={c.primary}
        dataPointsRadius={4}
        hideRules
        yAxisColor="transparent"
        xAxisColor={c.border}
        yAxisTextStyle={{ color: c.textMuted, fontSize: 10 }}
        xAxisLabelTextStyle={{ color: c.textMuted, fontSize: 9 }}
        spacing={spacing}
        initialSpacing={Spacing.md}
        endSpacing={Spacing.md}
        adjustToWidth
        width={chartWidth}
        noOfSections={4}
        yAxisLabelSuffix={suffix}
        height={160}
        curved
      />
    </View>
  );
}

/** Wykres słupkowy (np. wolumen wg partii). */
export function SimpleBarChart({
  data,
  color,
}: {
  data: ChartPoint[];
  color?: string;
}) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();

  if (data.length === 0) {
    return (
      <Text variant="caption" color={c.textMuted} center style={{ paddingVertical: Spacing.xl }}>
        Brak danych.
      </Text>
    );
  }

  const chartWidth = width - Spacing.lg * 2 - Spacing.lg * 2;
  const barWidth = Math.max(16, Math.min(40, chartWidth / data.length - 14));

  return (
    <View style={{ paddingVertical: Spacing.md }}>
      <BarChart
        data={data.map((d) => ({ value: d.value, label: d.label, frontColor: color ?? c.primary }))}
        barWidth={barWidth}
        spacing={14}
        roundedTop
        hideRules
        yAxisColor="transparent"
        xAxisColor={c.border}
        yAxisTextStyle={{ color: c.textMuted, fontSize: 10 }}
        xAxisLabelTextStyle={{ color: c.textMuted, fontSize: 9 }}
        noOfSections={4}
        height={160}
        width={chartWidth}
      />
    </View>
  );
}
