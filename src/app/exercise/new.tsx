/** Formularz dodawania własnego ćwiczenia. */
import React, { useState } from 'react';
import { View, ScrollView, TextInput, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Text, Button } from '@/components/ui';
import { useTheme, Spacing, Radius } from '@/theme';
import { OptionRow } from '@/components/OptionRow';
import { addCustomExercise } from '@/db/repo-exercises';
import type { BodyPart, Equipment, InputType } from '@/lib/types';

const BODY_PARTS: BodyPart[] = ['klatka', 'plecy', 'barki', 'biceps', 'triceps', 'przedramiona', 'nogi', 'pośladki', 'łydki', 'brzuch', 'cardio', 'całe ciało'];
const EQUIPMENT: Equipment[] = ['sztanga', 'hantle', 'maszyna', 'wyciąg', 'kettlebell', 'masa ciała', 'guma', 'inne'];
const INPUT_TYPES: InputType[] = ['weight_reps', 'bodyweight_reps', 'weighted_bodyweight', 'assisted_bodyweight', 'duration', 'distance_duration', 'reps_only'];

const INPUT_LABELS: Record<InputType, string> = {
  weight_reps: 'Ciężar + powt.',
  bodyweight_reps: 'Powtórzenia',
  weighted_bodyweight: 'Dociążenie + powt.',
  assisted_bodyweight: 'Odciążenie + powt.',
  duration: 'Czas',
  distance_duration: 'Dystans + czas',
  reps_only: 'Same powtórzenia',
};

export default function NewExercise() {
  const { c } = useTheme();
  const router = useRouter();
  const [name, setName] = useState('');
  const [bodyPart, setBodyPart] = useState<BodyPart>('klatka');
  const [equipment, setEquipment] = useState<Equipment>('sztanga');
  const [inputType, setInputType] = useState<InputType>('weight_reps');

  const save = () => {
    if (!name.trim()) {
      Alert.alert('Podaj nazwę', 'Ćwiczenie musi mieć nazwę.');
      return;
    }
    addCustomExercise({ name, bodyPart, equipment, inputType });
    router.back();
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: Spacing.lg }}>
      <Label text="Nazwa" />
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="np. Wyciskanie hantli neutralnym chwytem"
        placeholderTextColor={c.textMuted}
        style={[styles.input, { color: c.text, backgroundColor: c.inputBg, borderColor: c.border }]}
        autoFocus
      />

      <Label text="Partia mięśniowa" />
      <OptionRow options={BODY_PARTS} value={bodyPart} onChange={setBodyPart} />

      <Label text="Sprzęt" />
      <OptionRow options={EQUIPMENT} value={equipment} onChange={setEquipment} />

      <Label text="Typ pomiaru" />
      <OptionRow options={INPUT_TYPES} value={inputType} onChange={setInputType} labels={INPUT_LABELS} />

      <Button title="Zapisz ćwiczenie" onPress={save} style={{ marginTop: Spacing.xl }} />
    </ScrollView>
  );
}

function Label({ text }: { text: string }) {
  const { c } = useTheme();
  return (
    <Text variant="label" color={c.textSecondary} weight="700" style={{ marginTop: Spacing.lg, marginBottom: Spacing.sm }}>
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  input: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 16,
  },
});
