/**
 * Edytor długości przerwy między seriami (per ćwiczenie). Rozwijany pod
 * paskiem przerwy w karcie ćwiczenia. Presety + dostrajanie ±15 s + wyłączenie.
 */
import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useTheme, Spacing, Radius } from '@/theme';
import { formatDuration } from '@/lib/format';

const PRESETS = [60, 90, 120, 150, 180, 300];

export function RestEditor({
  seconds,
  onChange,
  onClose,
}: {
  seconds: number;
  onChange: (seconds: number) => void;
  onClose: () => void;
}) {
  const { c } = useTheme();

  const adjust = (delta: number) => {
    // Trzymamy w granicach 0..30 min, krok siatki 15 s.
    const next = Math.max(0, Math.min(1800, seconds + delta));
    onChange(next);
  };

  return (
    <View style={[styles.wrap, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
      {/* Dostrajanie + bieżąca wartość */}
      <View style={styles.adjustRow}>
        <Pressable onPress={() => adjust(-15)} style={[styles.adjBtn, { backgroundColor: c.surface }]} hitSlop={6}>
          <Text variant="label" weight="800" color={c.text}>−15</Text>
        </Pressable>
        <View style={styles.current}>
          <Text variant="title" weight="800" color={c.primary}>
            {seconds > 0 ? formatDuration(seconds) : 'Wyłączona'}
          </Text>
        </View>
        <Pressable onPress={() => adjust(15)} style={[styles.adjBtn, { backgroundColor: c.surface }]} hitSlop={6}>
          <Text variant="label" weight="800" color={c.text}>+15</Text>
        </Pressable>
      </View>

      {/* Presety */}
      <View style={styles.presets}>
        {PRESETS.map((p) => {
          const active = seconds === p;
          return (
            <Pressable
              key={p}
              onPress={() => onChange(p)}
              style={[
                styles.preset,
                { borderColor: active ? c.primary : c.border, backgroundColor: active ? c.primary + '22' : 'transparent' },
              ]}
            >
              <Text variant="caption" weight="700" color={active ? c.primary : c.textSecondary}>
                {formatDuration(p)}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => onChange(0)}
          style={[
            styles.preset,
            { borderColor: seconds === 0 ? c.danger : c.border, backgroundColor: seconds === 0 ? c.danger + '22' : 'transparent' },
          ]}
        >
          <Text variant="caption" weight="700" color={seconds === 0 ? c.danger : c.textSecondary}>
            Wył.
          </Text>
        </Pressable>
      </View>

      <Pressable onPress={onClose} style={styles.done} hitSlop={6}>
        <Icon name="checkmark" size={16} color={c.primary} />
        <Text variant="label" weight="700" color={c.primary}>Gotowe</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    marginTop: Spacing.xs,
    gap: Spacing.md,
  },
  adjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  adjBtn: {
    width: 56,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  current: {
    flex: 1,
    alignItems: 'center',
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  preset: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  done: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.xs,
  },
});
