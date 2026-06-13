/**
 * Zakładka „Ćwiczenia" — biblioteka. Przeglądanie, wyszukiwanie, filtrowanie
 * i dodawanie własnych ćwiczeń. Tap → szczegóły ćwiczenia (postęp + PR).
 */
import React, { useState, useCallback } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Text } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useTheme, Spacing } from '@/theme';
import { ExerciseList } from '@/components/ExerciseList';
import { getAllExercises } from '@/db/repo-exercises';
import type { ExerciseDef } from '@/lib/types';

export default function ExercisesTab() {
  const { c } = useTheme();
  const router = useRouter();
  const [exercises, setExercises] = useState<ExerciseDef[]>([]);

  useFocusEffect(
    useCallback(() => {
      setExercises(getAllExercises());
    }, [])
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={styles.header}>
        <Text variant="caption" color={c.textSecondary}>
          {exercises.length} ćwiczeń w bibliotece
        </Text>
        <Pressable onPress={() => router.push('/exercise/new')} hitSlop={8} style={styles.addBtn}>
          <Icon name="add-circle" size={18} color={c.primary} />
          <Text variant="label" color={c.primary} weight="700">
            Nowe ćwiczenie
          </Text>
        </Pressable>
      </View>
      <ExerciseList
        exercises={exercises}
        onPressExercise={(ex) => router.push({ pathname: '/exercise/[id]', params: { id: ex.id } })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
