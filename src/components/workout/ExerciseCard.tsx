/**
 * Karta jednego ćwiczenia w aktywnym treningu: nagłówek + tabela serii +
 * akcje (dodaj serię, kalkulator talerzy, szybkie ±, usuń, superseria).
 */
import React, { useState, useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text, Divider } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useTheme, Spacing, Radius } from '@/theme';
import { SetRow } from './SetRow';
import { PlateCalculator } from './PlateCalculator';
import { useWorkout, type LiveExercise } from '@/store/workout';
import { useSettings } from '@/store/settings';
import { fieldsForInputType, supportsPlateCalc, weightColumnLabel } from '@/lib/input-schema';
import { toKg } from '@/lib/calc';
import { getProgressionSuggestion, getLastExerciseVolume } from '@/db/repo-workouts';
import { liveTotals } from '@/lib/workout-session';
import { trimNumber } from '@/lib/format';

export function ExerciseCard({
  ex,
  isSuperset,
  onToggleDone,
  onAddSet,
}: {
  ex: LiveExercise;
  isSuperset: boolean;
  /** Wywoływane przy zaznaczeniu serii — ekran odpala auto-rest/haptykę. */
  onToggleDone: (exLiveId: string, setId: string) => void;
  onAddSet?: () => void;
}) {
  const { c } = useTheme();
  const unit = useSettings((s) => s.settings?.unit ?? 'kg');
  const [menuOpen, setMenuOpen] = useState(false);
  const [plateFor, setPlateFor] = useState<number | null>(null);

  const updateSet = useWorkout((s) => s.updateSet);
  const cycleType = useWorkout((s) => s.cycleSetType);
  const removeSet = useWorkout((s) => s.removeSet);
  const addSet = useWorkout((s) => s.addSet);
  const removeExercise = useWorkout((s) => s.removeExercise);
  const reorder = useWorkout((s) => s.reorderExercise);
  const toggleSuperset = useWorkout((s) => s.toggleSuperset);

  const fields = fieldsForInputType(ex.inputType);
  const canPlate = supportsPlateCalc(ex.inputType);
  // Podpowiedź progresji (cel na ten trening) — liczona raz na bazie historii.
  const suggestion = useMemo(() => {
    try {
      return getProgressionSuggestion(ex.exerciseId, unit as never);
    } catch {
      return null;
    }
  }, [ex.exerciseId, unit]);

  // Wolumen poprzedniego treningu tego ćwiczenia (kg) — do porównania %.
  const prevVolume = useMemo(() => {
    try {
      return getLastExerciseVolume(ex.exerciseId);
    } catch {
      return null;
    }
  }, [ex.exerciseId]);

  // Bieżący wolumen ćwiczenia (z ukończonych serii) i % zmiany vs poprzednio.
  const currentVolume = liveTotals([ex], unit as never).volume;
  const volumeDelta =
    prevVolume != null && prevVolume > 0 && currentVolume > 0
      ? Math.round(((currentVolume - prevVolume) / prevVolume) * 100)
      : null;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: c.surface,
          borderColor: isSuperset ? c.primary : c.border,
          borderLeftWidth: isSuperset ? 3 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      {/* Nagłówek */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          {isSuperset ? (
            <Text variant="caption" color={c.primary} weight="700">
              SUPERSERIA
            </Text>
          ) : null}
          <Text variant="heading" color={c.primary} numberOfLines={2}>
            {ex.name}
          </Text>
          {suggestion ? (
            <View style={styles.target}>
              <Icon name={suggestion.isIncrease ? 'trending-up' : 'flag'} size={12} color={suggestion.isIncrease ? c.success : c.textSecondary} />
              <Text variant="caption" color={suggestion.isIncrease ? c.success : c.textSecondary} weight="600">
                Cel: {trimNumber(suggestion.weight)} {unit} × {suggestion.reps}
              </Text>
            </View>
          ) : null}
        </View>
        {volumeDelta != null ? (
          <View
            style={[
              styles.deltaPill,
              { backgroundColor: (volumeDelta > 0 ? c.success : volumeDelta < 0 ? c.danger : c.textMuted) + '22' },
            ]}
          >
            <Icon
              name={volumeDelta > 0 ? 'arrow-up' : volumeDelta < 0 ? 'arrow-down' : 'remove'}
              size={12}
              color={volumeDelta > 0 ? c.success : volumeDelta < 0 ? c.danger : c.textMuted}
            />
            <Text
              variant="caption"
              weight="800"
              color={volumeDelta > 0 ? c.success : volumeDelta < 0 ? c.danger : c.textMuted}
            >
              {volumeDelta > 0 ? '+' : ''}
              {volumeDelta}%
            </Text>
          </View>
        ) : null}
        <Pressable onPress={() => setMenuOpen((o) => !o)} hitSlop={8} style={styles.menuBtn}>
          <Icon name="ellipsis-horizontal" size={20} color={c.textSecondary} />
        </Pressable>
      </View>

      {/* Menu ćwiczenia */}
      {menuOpen ? (
        <View style={[styles.menu, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
          <MenuItem icon="arrow-up" label="W górę" onPress={() => { reorder(ex.id, -1); setMenuOpen(false); }} />
          <MenuItem icon="arrow-down" label="W dół" onPress={() => { reorder(ex.id, 1); setMenuOpen(false); }} />
          <MenuItem icon="git-merge" label="Superseria z poprzednim" onPress={() => { toggleSuperset(ex.id); setMenuOpen(false); }} />
          <MenuItem icon="trash" label="Usuń ćwiczenie" danger onPress={() => { removeExercise(ex.id); setMenuOpen(false); }} />
        </View>
      ) : null}

      {/* Nagłówki kolumn */}
      <View style={styles.colHead}>
        <Text variant="caption" color={c.textMuted} style={{ width: 28, textAlign: 'center' }}>
          Seria
        </Text>
        <Text variant="caption" color={c.textMuted} style={{ flex: 1.2 }}>
          Poprz.
        </Text>
        {fields.weight ? (
          <Text variant="caption" color={c.textMuted} style={{ flex: 1, textAlign: 'center' }}>
            {weightColumnLabel(fields, unit)}
          </Text>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <Text variant="caption" color={c.textMuted} style={{ flex: 1, textAlign: 'center' }}>
          {fields.reps ? 'Powt.' : fields.duration ? 'Czas' : ''}
        </Text>
        {fields.distance ? (
          <Text variant="caption" color={c.textMuted} style={{ flex: 1, textAlign: 'center' }}>
            Dyst.
          </Text>
        ) : null}
        <View style={{ width: 38 }} />
      </View>

      <Divider />

      {/* Serie */}
      {ex.sets.map((set, i) => (
        <View key={set.id}>
          <SetRow
            set={set}
            index={i}
            inputType={ex.inputType}
            onUpdate={(patch) => updateSet(ex.id, set.id, patch)}
            onToggleDone={() => onToggleDone(ex.id, set.id)}
            onCycleType={() => cycleType(ex.id, set.id)}
            onRemove={() => removeSet(ex.id, set.id)}
          />
          {/* Pasek narzędzi dla serii z ciężarem (talerze, ±) */}
          {canPlate && set.weight ? (
            <View style={styles.toolbar}>
              <Pressable
                onPress={() => setPlateFor(toKg(parseFloat(set.weight.replace(',', '.')) || 0, unit as never))}
                style={styles.toolBtn}
              >
                <Icon name="disc" size={14} color={c.textSecondary} />
                <Text variant="caption" color={c.textSecondary}>
                  Talerze
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ))}

      {/* Dodaj serię */}
      <Pressable
        onPress={() => { addSet(ex.id); onAddSet?.(); }}
        style={[styles.addSet, { backgroundColor: c.surfaceAlt }]}
      >
        <Icon name="add" size={16} color={c.text} />
        <Text variant="label" weight="700">
          Dodaj serię
        </Text>
      </Pressable>

      <PlateCalculator
        visible={plateFor != null}
        targetKg={plateFor ?? 0}
        onClose={() => setPlateFor(null)}
      />
    </View>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: React.ComponentProps<typeof Icon>['name'];
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.menuItem}>
      <Icon name={icon} size={18} color={danger ? c.danger : c.text} />
      <Text variant="body" color={danger ? c.danger : c.text}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  menuBtn: {
    padding: Spacing.xs,
  },
  target: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  deltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    marginRight: Spacing.xs,
  },
  menu: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  colHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  toolbar: {
    flexDirection: 'row',
    paddingLeft: 34,
    paddingBottom: Spacing.xs,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
  },
  addSet: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    marginTop: Spacing.sm,
  },
});
