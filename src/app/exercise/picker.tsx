/**
 * Modal wyboru ćwiczeń (multi-select). Wybrane id zapisuje przez most
 * (picker-bridge), który odbiera ekran wywołujący po powrocie fokusu.
 * Obsługuje też dodanie własnego ćwiczenia w locie.
 */
import React, { useState, useCallback } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useTheme, Spacing } from '@/theme';
import { ExerciseList } from '@/components/ExerciseList';
import { getAllExercises } from '@/db/repo-exercises';
import { setPicked } from '@/lib/picker-bridge';
import type { ExerciseDef } from '@/lib/types';

export default function ExercisePicker() {
  const { c } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [exercises, setExercises] = useState<ExerciseDef[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      setExercises(getAllExercises());
    }, [])
  );

  const toggle = (ex: ExerciseDef) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ex.id)) next.delete(ex.id);
      else next.add(ex.id);
      return next;
    });
  };

  const confirm = () => {
    setPicked([...selected]);
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={styles.topActions}>
        <Pressable onPress={() => router.push('/exercise/new')} hitSlop={8} style={styles.addBtn}>
          <Icon name="add-circle" size={18} color={c.primary} />
          <Text variant="label" color={c.primary} weight="700">
            Nowe
          </Text>
        </Pressable>
      </View>

      <ExerciseList
        exercises={exercises}
        selectMode
        selectedIds={selected}
        onPressExercise={toggle}
      />

      {selected.size > 0 ? (
        <View style={[styles.footer, { backgroundColor: c.surface, borderColor: c.border, paddingBottom: insets.bottom + Spacing.md }]}>
          <Button
            title={`Dodaj (${selected.size})`}
            onPress={confirm}
            icon={<Icon name="checkmark" size={20} color={c.onPrimary} />}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  topActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
