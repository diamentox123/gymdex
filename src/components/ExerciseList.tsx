/**
 * Wielokrotnego użytku lista ćwiczeń z wyszukiwarką i filtrami partii.
 * Używana w bibliotece (tryb przeglądania) i w pickerze (tryb wyboru).
 */
import React, { useMemo, useState } from 'react';
import { View, TextInput, FlatList, Pressable, StyleSheet } from 'react-native';
import { Text, Chip, Divider } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useTheme, Spacing, Radius } from '@/theme';
import type { BodyPart, ExerciseDef } from '@/lib/types';

const BODY_PARTS: (BodyPart | 'wszystkie')[] = [
  'wszystkie',
  'klatka',
  'plecy',
  'barki',
  'biceps',
  'triceps',
  'nogi',
  'pośladki',
  'brzuch',
  'łydki',
  'przedramiona',
  'cardio',
  'całe ciało',
];

export function ExerciseList({
  exercises,
  selectMode = false,
  selectedIds,
  onPressExercise,
  ListHeader,
}: {
  exercises: ExerciseDef[];
  selectMode?: boolean;
  selectedIds?: Set<string>;
  onPressExercise: (ex: ExerciseDef) => void;
  ListHeader?: React.ReactElement;
}) {
  const { c } = useTheme();
  const [query, setQuery] = useState('');
  const [part, setPart] = useState<(typeof BODY_PARTS)[number]>('wszystkie');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter((e) => {
      const matchesQuery = !q || e.name.toLowerCase().includes(q);
      const matchesPart = part === 'wszystkie' || e.bodyPart === part;
      return matchesQuery && matchesPart;
    });
  }, [exercises, query, part]);

  return (
    <View style={{ flex: 1 }}>
      {/* Wyszukiwarka */}
      <View style={[styles.search, { backgroundColor: c.inputBg, borderColor: c.border }]}>
        <Icon name="search" size={18} color={c.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Szukaj ćwiczenia…"
          placeholderTextColor={c.textMuted}
          style={[styles.searchInput, { color: c.text }]}
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Icon name="close-circle" size={18} color={c.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {/* Filtry partii */}
      <View style={styles.chipsWrap}>
        <FlatList
          horizontal
          data={BODY_PARTS}
          keyExtractor={(p) => p}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: Spacing.sm, paddingHorizontal: Spacing.lg }}
          renderItem={({ item }) => (
            <Chip
              label={capitalize(item)}
              active={part === item}
              onPress={() => setPart(item)}
            />
          )}
        />
      </View>

      {/* Lista */}
      <FlatList
        data={filtered}
        keyExtractor={(e) => e.id}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl }}
        ItemSeparatorComponent={() => <Divider />}
        renderItem={({ item }) => {
          const selected = selectedIds?.has(item.id);
          return (
            <Pressable onPress={() => onPressExercise(item)} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text variant="body" weight="600" numberOfLines={1}>
                  {item.name}
                </Text>
                <Text variant="caption" color={c.textSecondary} style={{ marginTop: 2 }}>
                  {capitalize(item.bodyPart)} · {item.equipment}
                  {item.isCustom ? ' · własne' : ''}
                </Text>
              </View>
              {selectMode ? (
                <View
                  style={[
                    styles.checkbox,
                    { borderColor: selected ? c.primary : c.border, backgroundColor: selected ? c.primary : 'transparent' },
                  ]}
                >
                  {selected ? <Icon name="checkmark" size={16} color={c.onPrimary} /> : null}
                </View>
              ) : (
                <Icon name="chevron-forward" size={18} color={c.textMuted} />
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Text variant="body" color={c.textSecondary} center style={{ marginTop: Spacing.xxl }}>
            Brak ćwiczeń pasujących do filtrów.
          </Text>
        }
      />
    </View>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: { flex: 1, paddingVertical: Spacing.md, fontSize: 16 },
  chipsWrap: { marginVertical: Spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: Radius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
