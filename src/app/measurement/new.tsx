/** Formularz dodawania pomiaru ciała (masa + obwody). */
import React, { useState } from 'react';
import { ScrollView, View, TextInput, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Text, Button } from '@/components/ui';
import { useTheme, Spacing, Radius } from '@/theme';
import { addBodyMeasurement } from '@/db/repo-stats';
import { useSettings } from '@/store/settings';
import { toKg } from '@/lib/calc';

const FIELDS: { key: string; label: string; weight?: boolean }[] = [
  { key: 'bodyweight', label: 'Masa ciała', weight: true },
  { key: 'bodyFat', label: 'Tkanka tłuszczowa (%)' },
  { key: 'chest', label: 'Klatka (cm)' },
  { key: 'waist', label: 'Talia (cm)' },
  { key: 'hips', label: 'Biodra (cm)' },
  { key: 'arm', label: 'Ramię (cm)' },
  { key: 'thigh', label: 'Udo (cm)' },
  { key: 'calf', label: 'Łydka (cm)' },
];

export default function NewMeasurement() {
  const { c } = useTheme();
  const router = useRouter();
  const unit = useSettings((s) => s.settings?.unit ?? 'kg');
  const [vals, setVals] = useState<Record<string, string>>({});

  const set = (key: string, v: string) => setVals((p) => ({ ...p, [key]: v.replace(/[^0-9.,]/g, '') }));

  const save = () => {
    const num = (k: string) => {
      const raw = vals[k];
      if (!raw) return null;
      const v = parseFloat(raw.replace(',', '.'));
      return Number.isNaN(v) ? null : v;
    };
    const bwRaw = num('bodyweight');
    if (Object.values(vals).every((v) => !v)) {
      Alert.alert('Puste pola', 'Podaj przynajmniej jedną wartość.');
      return;
    }
    addBodyMeasurement({
      // masę zapisujemy zawsze w kg
      bodyweight: bwRaw != null ? toKg(bwRaw, unit as never) : null,
      bodyFat: num('bodyFat'),
      chest: num('chest'),
      waist: num('waist'),
      hips: num('hips'),
      arm: num('arm'),
      thigh: num('thigh'),
      calf: num('calf'),
    });
    router.back();
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: Spacing.lg }}>
      {FIELDS.map((f) => (
        <View key={f.key} style={{ marginBottom: Spacing.lg }}>
          <Text variant="label" color={c.textSecondary} weight="700" style={{ marginBottom: Spacing.sm }}>
            {f.weight ? `${f.label} (${unit})` : f.label}
          </Text>
          <TextInput
            value={vals[f.key] ?? ''}
            onChangeText={(v) => set(f.key, v)}
            placeholder="—"
            placeholderTextColor={c.textMuted}
            keyboardType="decimal-pad"
            style={[styles.input, { color: c.text, backgroundColor: c.inputBg, borderColor: c.border }]}
          />
        </View>
      ))}
      <Button title="Zapisz pomiar" onPress={save} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  input: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 16,
    fontWeight: '700',
  },
});
