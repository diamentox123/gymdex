/**
 * Wiersz pojedynczej serii w aktywnym treningu.
 * Układ kolumn: [Typ/Nr] [Poprzednio] [Ciężar] [Powt.] [✓]
 * — wzorowany na tabeli serii ze Strong. Kolumny zależą od typu wejścia.
 */
import React from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useTheme, Spacing, Radius } from '@/theme';
import type { LiveSet } from '@/store/workout';
import type { InputType, SetType } from '@/lib/types';
import { fieldsForInputType } from '@/lib/input-schema';

const SET_TYPE_LABEL: Record<SetType, string> = {
  normal: '',
  warmup: 'R',
  drop: 'D',
  failure: 'F',
};

const SET_TYPE_COLOR = (type: SetType, c: ReturnType<typeof useTheme>['c']): string => {
  switch (type) {
    case 'warmup':
      return c.warning;
    case 'drop':
      return c.primary;
    case 'failure':
      return c.danger;
    default:
      return c.textSecondary;
  }
};

export function SetRow({
  set,
  index,
  inputType,
  onUpdate,
  onToggleDone,
  onCycleType,
  onRemove,
}: {
  set: LiveSet;
  index: number;
  inputType: InputType;
  onUpdate: (patch: Partial<LiveSet>) => void;
  onToggleDone: () => void;
  onCycleType: () => void;
  onRemove: () => void;
}) {
  const { c } = useTheme();
  const fields = fieldsForInputType(inputType);
  const rowBg = set.done ? c.successMuted : 'transparent';

  // Ciężar w sesji trzymany jest jako tekst w jednostce użytkownika
  // (konwersja na kg następuje dopiero przy zapisie). Dzięki temu można
  // swobodnie wpisywać wartości dziesiętne (82.5, 2.5) — nic nie kasuje kropki.
  const onWeightChange = (txt: string) => {
    // dopuszczamy cyfry, jedną kropkę/przecinek
    const cleaned = txt.replace(/[^0-9.,]/g, '').replace(',', '.');
    onUpdate({ weight: cleaned });
  };

  const typeLabel = SET_TYPE_LABEL[set.type];

  return (
    <View style={[styles.row, { backgroundColor: rowBg, borderRadius: Radius.sm }]}>
      {/* Numer serii / typ — long press cykluje typ */}
      <Pressable onLongPress={onCycleType} onPress={onCycleType} style={styles.numCell} hitSlop={6}>
        {typeLabel ? (
          <Text variant="label" weight="800" color={SET_TYPE_COLOR(set.type, c)}>
            {typeLabel}
          </Text>
        ) : (
          <Text variant="label" weight="700" color={c.textSecondary}>
            {index + 1}
          </Text>
        )}
      </Pressable>

      {/* Poprzednio */}
      <View style={styles.prevCell}>
        <Text variant="caption" color={c.textMuted} numberOfLines={1}>
          {set.prev ?? '—'}
        </Text>
      </View>

      {/* Ciężar */}
      {fields.weight ? (
        <Field value={set.weight} onChangeText={onWeightChange} placeholder="0" />
      ) : (
        <View style={styles.field} />
      )}

      {/* Powtórzenia */}
      {fields.reps ? (
        <Field
          value={set.reps}
          onChangeText={(t) => onUpdate({ reps: t.replace(/[^0-9]/g, '') })}
          placeholder="0"
        />
      ) : fields.duration ? (
        <Field
          value={set.durationSec}
          onChangeText={(t) => onUpdate({ durationSec: t.replace(/[^0-9]/g, '') })}
          placeholder="s"
        />
      ) : (
        <View style={styles.field} />
      )}

      {/* Dystans (cardio) — pokazujemy zamiast checkmarka tylko przy distance */}
      {fields.distance ? (
        <Field
          value={set.distanceM}
          onChangeText={(t) => onUpdate({ distanceM: t.replace(/[^0-9.]/g, '') })}
          placeholder="m"
        />
      ) : null}

      {/* Checkmark */}
      <Pressable
        onPress={onToggleDone}
        onLongPress={onRemove}
        style={[
          styles.check,
          {
            backgroundColor: set.done ? c.success : c.surfaceAlt,
            borderColor: set.done ? c.success : c.border,
          },
        ]}
        hitSlop={6}
      >
        <Icon name="checkmark" size={18} color={set.done ? '#fff' : c.textMuted} />
      </Pressable>
    </View>
  );
}

function Field({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
}) {
  const { c } = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={c.textMuted}
      keyboardType="decimal-pad"
      selectTextOnFocus
      style={[
        styles.field,
        {
          color: c.text,
          backgroundColor: c.inputBg,
          borderColor: c.border,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    gap: Spacing.sm,
  },
  numCell: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prevCell: {
    flex: 1.2,
    paddingHorizontal: 2,
  },
  field: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  check: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
