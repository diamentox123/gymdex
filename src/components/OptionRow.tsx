/** Poziomy wybór jednej opcji z listy (segmentowany, przewijalny). */
import React from 'react';
import { ScrollView, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/ui';
import { useTheme, Spacing, Radius } from '@/theme';

export function OptionRow<T extends string>({
  options,
  value,
  onChange,
  labels,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  labels?: Record<string, string>;
}) {
  const { c } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: Spacing.sm }}
    >
      {options.map((opt) => {
        const active = opt === value;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={[
              styles.opt,
              { backgroundColor: active ? c.primary : c.surfaceAlt, borderColor: active ? c.primary : c.border },
            ]}
          >
            <Text variant="label" weight="700" color={active ? c.onPrimary : c.textSecondary}>
              {labels?.[opt] ?? cap(opt)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  opt: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
