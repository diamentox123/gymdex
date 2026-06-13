/**
 * Heatmapa aktywności treningowej (à la GitHub contributions): kolumny =
 * tygodnie, wiersze = dni (pon→niedz). Im więcej treningów danego dnia, tym
 * intensywniejszy kolor. Czysto wizualny przegląd regularności.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui';
import { useTheme, Spacing, Radius } from '@/theme';
import type { HeatmapDay } from '@/lib/achievements';

const DAY_LABELS = ['Pn', '', 'Śr', '', 'Pt', '', 'Nd'];

export function Heatmap({ grid }: { grid: HeatmapDay[][] }) {
  const { c } = useTheme();

  const levelColor = (level: number): string => {
    switch (level) {
      case 1:
        return c.primary + '55';
      case 2:
        return c.primary + 'AA';
      case 3:
        return c.primary;
      default:
        return c.surfaceAlt;
    }
  };

  return (
    <View style={styles.wrap}>
      {/* etykiety dni po lewej */}
      <View style={styles.dayLabels}>
        {DAY_LABELS.map((l, i) => (
          <View key={i} style={styles.cellSlot}>
            <Text variant="caption" color={c.textMuted} style={{ fontSize: 9, lineHeight: 12 }}>
              {l}
            </Text>
          </View>
        ))}
      </View>

      {/* kolumny tygodni */}
      <View style={styles.grid}>
        {grid.map((week, wi) => (
          <View key={wi} style={styles.col}>
            {week.map((day, di) => (
              <View
                key={di}
                style={[styles.cell, { backgroundColor: levelColor(day.level) }]}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const CELL = 13;
const GAP = 3;

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: GAP },
  dayLabels: { justifyContent: 'space-between' },
  cellSlot: { height: CELL + GAP, justifyContent: 'center', width: 16 },
  grid: { flexDirection: 'row', gap: GAP, flex: 1, justifyContent: 'flex-end' },
  col: { gap: GAP },
  cell: { width: CELL, height: CELL, borderRadius: 3 },
});
