/**
 * Zakładka „Profil" — ustawienia (jednostki, motyw, odpoczynek, haptyka,
 * masa gryfa), pomiary ciała i eksport danych.
 */
import React, { useState, useCallback } from 'react';
import { ScrollView, View, Switch, Pressable, StyleSheet, Alert, Share } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import dayjs from 'dayjs';
import { Text, Card, Divider, Button } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { OptionRow } from '@/components/OptionRow';
import { useTheme, Spacing, Radius } from '@/theme';
import { useSettings } from '@/store/settings';
import { getBodyMeasurements } from '@/db/repo-stats';
import { rebuildAllPRs } from '@/db/repo-workouts';
import { exportData, dataSummary, importData, exportWorkoutsCsv } from '@/db/backup';
import { parseBackup } from '@/lib/backup-schema';
import { formatWeight } from '@/lib/format';
import type { Unit, ThemeMode } from '@/lib/types';
import type { BodyMeasurementRow } from '@/db/schema';

export default function ProfileTab() {
  const { c } = useTheme();
  const router = useRouter();
  const settings = useSettings((s) => s.settings);
  const update = useSettings((s) => s.update);
  const reloadSettings = useSettings((s) => s.load);

  const [measurements, setMeasurements] = useState<BodyMeasurementRow[]>([]);
  const [summary, setSummary] = useState({ workouts: 0, exercises: 0, routines: 0 });

  useFocusEffect(
    useCallback(() => {
      setMeasurements(getBodyMeasurements());
      setSummary(dataSummary());
    }, [])
  );

  const unit = (settings?.unit as Unit) ?? 'kg';
  const theme = (settings?.theme as ThemeMode) ?? 'system';

  const onExport = async () => {
    const data = JSON.stringify(exportData(), null, 2);
    try {
      await Clipboard.setStringAsync(data);
      await Share.share({ message: data, title: 'Backup Panda Strength' });
    } catch {
      Alert.alert('Eksport', 'Dane skopiowano do schowka.');
    }
  };

  const onExportCsv = async () => {
    const csv = exportWorkoutsCsv(unit);
    if (csv.split('\n').length <= 1) {
      Alert.alert('Eksport CSV', 'Brak ukończonych treningów do wyeksportowania.');
      return;
    }
    try {
      await Clipboard.setStringAsync(csv);
      await Share.share({ message: csv, title: 'Historia treningów (CSV)' });
    } catch {
      Alert.alert('Eksport CSV', 'Historia skopiowana do schowka (CSV).');
    }
  };

  // Wspólny krok: zwaliduj tekst JSON, pokaż dialog potwierdzenia i — po
  // akceptacji — NADPISZ całą bazę. Źródłem tekstu jest schowek lub plik.
  const confirmAndImport = (text: string, sourceEmptyMsg: string) => {
    if (!text.trim()) {
      Alert.alert('Import', sourceEmptyMsg);
      return;
    }
    const { error, data } = parseBackup(text);
    if (error || !data) {
      Alert.alert('Niepoprawna kopia', error ?? 'Nie udało się odczytać kopii zapasowej.');
      return;
    }

    const w = data.tables.workouts?.length ?? 0;
    const e = data.tables.exercises?.length ?? 0;
    const r = data.tables.routines?.length ?? 0;
    const when = dayjs(data.exportedAt).format('D MMM YYYY, HH:mm');

    Alert.alert(
      'Zastąpić wszystkie dane?',
      `Kopia z ${when}\n\n${w} treningów · ${e} ćwiczeń · ${r} rutyn\n\nObecne dane na tym urządzeniu zostaną BEZPOWROTNIE usunięte i zastąpione kopią. Tej operacji nie można cofnąć.`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Zastąp',
          style: 'destructive',
          onPress: () => {
            try {
              importData(data);
              // Po imporcie przelicz rekordy z całej historii — zaimportowane
              // treningi nie przechodzą przez wykrywanie PR przy zapisie.
              rebuildAllPRs();
              reloadSettings();
              setSummary(dataSummary());
              setMeasurements(getBodyMeasurements());
              Alert.alert('Gotowe', 'Dane przywrócone, rekordy przeliczone z historii.');
            } catch (err) {
              Alert.alert('Błąd importu', err instanceof Error ? err.message : 'Nie udało się przywrócić danych.');
            }
          },
        },
      ]
    );
  };

  // Import ze schowka (symetrycznie do eksportu).
  const onImport = async () => {
    let text = '';
    try {
      text = await Clipboard.getStringAsync();
    } catch {
      Alert.alert('Import', 'Nie udało się odczytać schowka.');
      return;
    }
    confirmAndImport(text, 'Schowek jest pusty. Skopiuj najpierw kopię zapasową (JSON), a potem dotknij „Importuj ze schowka".');
  };

  // Import z pliku (.json) wybranego z Plików / iCloud Drive — pewniejsze
  // dla dużych kopii niż wklejanie ze schowka.
  const onImportFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const text = await new File(res.assets[0].uri).text();
      confirmAndImport(text, 'Wybrany plik jest pusty.');
    } catch (err) {
      Alert.alert('Import', err instanceof Error ? err.message : 'Nie udało się wczytać pliku.');
    }
  };

  // Przelicza rekordy (1RM, najcięższa seria) z całej historii — przydatne po
  // imporcie ze Strong, gdzie PR-y nie zostały policzone przy zapisie.
  const onRebuildPRs = () => {
    try {
      const n = rebuildAllPRs();
      Alert.alert('Rekordy przeliczone', `Przeanalizowano historię i wyznaczono rekordy dla ${n} ćwiczeń.`);
    } catch (err) {
      Alert.alert('Błąd', err instanceof Error ? err.message : 'Nie udało się przeliczyć rekordów.');
    }
  };

  const setRest = (delta: number) => {
    const cur = settings?.restDefaultSec ?? 120;
    update({ restDefaultSec: Math.max(0, cur + delta) });
  };
  // Krok masy gryfa zależny od jednostki: 2.5 kg lub ~5 lb (w przeliczeniu na kg).
  const setBar = (dir: -1 | 1) => {
    const stepKg = unit === 'lb' ? 5 * 0.45359237 : 2.5;
    const cur = settings?.barWeightKg ?? 20;
    update({ barWeightKg: Math.max(0, Math.round((cur + dir * stepKg) * 100) / 100) });
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing.xxl }}>
      {/* Podsumowanie konta */}
      <Card>
        <View style={styles.summaryRow}>
          <SummaryItem value={String(summary.workouts)} label="treningów" />
          <SummaryItem value={String(summary.routines)} label="rutyn" />
          <SummaryItem value={String(summary.exercises)} label="ćwiczeń" />
        </View>
      </Card>

      {/* Jednostki */}
      <Section title="Jednostki">
        <OptionRow<Unit>
          options={['kg', 'lb']}
          value={unit}
          onChange={(u) => update({ unit: u })}
          labels={{ kg: 'Kilogramy (kg)', lb: 'Funty (lb)' }}
        />
      </Section>

      {/* Motyw */}
      <Section title="Motyw">
        <OptionRow<ThemeMode>
          options={['system', 'dark', 'light']}
          value={theme}
          onChange={(t) => update({ theme: t })}
          labels={{ system: 'Systemowy', dark: 'Ciemny', light: 'Jasny' }}
        />
      </Section>

      {/* Trening */}
      <Section title="Trening">
        <Stepper
          label="Cel treningów / tydzień"
          value={String(settings?.weeklyGoal ?? 4)}
          onMinus={() => update({ weeklyGoal: Math.max(1, (settings?.weeklyGoal ?? 4) - 1) })}
          onPlus={() => update({ weeklyGoal: Math.min(14, (settings?.weeklyGoal ?? 4) + 1) })}
        />
        <Divider style={{ marginVertical: Spacing.sm }} />
        <Stepper
          label="Domyślny odpoczynek"
          value={`${settings?.restDefaultSec ?? 120}s`}
          onMinus={() => setRest(-15)}
          onPlus={() => setRest(15)}
        />
        <Divider style={{ marginVertical: Spacing.sm }} />
        <Stepper
          label="Masa gryfa"
          value={formatWeight(settings?.barWeightKg ?? 20, unit)}
          onMinus={() => setBar(-1)}
          onPlus={() => setBar(1)}
        />
        <Divider style={{ marginVertical: Spacing.sm }} />
        <ToggleRow
          label="Auto-start odpoczynku"
          value={settings?.restAutoStart ?? true}
          onChange={(v) => update({ restAutoStart: v })}
        />
        <Divider style={{ marginVertical: Spacing.sm }} />
        <ToggleRow
          label="Dźwięk końca przerwy"
          value={settings?.restSound ?? true}
          onChange={(v) => update({ restSound: v })}
        />
        <Divider style={{ marginVertical: Spacing.sm }} />
        <ToggleRow
          label="Wibracje (haptyka)"
          value={settings?.hapticsEnabled ?? true}
          onChange={(v) => update({ hapticsEnabled: v })}
        />
      </Section>

      {/* Pomiary ciała */}
      <View style={styles.sectionHead}>
        <Text variant="heading" weight="800">
          Pomiary ciała
        </Text>
        <View style={{ flexDirection: 'row', gap: Spacing.lg }}>
          {measurements.length > 0 ? (
            <Pressable onPress={() => router.push('/measurement/progress')} hitSlop={8} style={styles.addBtn}>
              <Icon name="trending-up" size={18} color={c.primary} />
              <Text variant="label" color={c.primary} weight="700">
                Wykres
              </Text>
            </Pressable>
          ) : null}
          <Pressable onPress={() => router.push('/measurement/new')} hitSlop={8} style={styles.addBtn}>
            <Icon name="add-circle" size={18} color={c.primary} />
            <Text variant="label" color={c.primary} weight="700">
              Dodaj
            </Text>
          </Pressable>
        </View>
      </View>
      <Card padded={false} style={{ paddingVertical: Spacing.xs }}>
        {measurements.length === 0 ? (
          <Text variant="body" color={c.textSecondary} style={{ padding: Spacing.lg }}>
            Brak pomiarów. Dodaj masę ciała, aby śledzić postęp i obliczać Strength Score.
          </Text>
        ) : (
          measurements.slice(0, 5).map((m, i) => (
            <View key={m.id}>
              <View style={styles.measRow}>
                <Text variant="body" weight="600">
                  {m.bodyweight != null ? formatWeight(m.bodyweight, unit) : '—'}
                </Text>
                <Text variant="caption" color={c.textSecondary}>
                  {dayjs(m.date).format('D MMM YYYY')}
                </Text>
              </View>
              {i < Math.min(4, measurements.length - 1) ? <Divider /> : null}
            </View>
          ))
        )}
      </Card>

      {/* Dane */}
      <Section title="Dane">
        <Button
          title="Eksportuj dane (JSON)"
          variant="secondary"
          icon={<Icon name="download-outline" size={18} color={c.text} />}
          onPress={onExport}
        />
        <Button
          title="Eksportuj historię (CSV)"
          variant="secondary"
          icon={<Icon name="grid-outline" size={18} color={c.text} />}
          onPress={onExportCsv}
          style={{ marginTop: Spacing.sm }}
        />
        <Button
          title="Importuj z pliku (.json)"
          variant="secondary"
          icon={<Icon name="document-outline" size={18} color={c.text} />}
          onPress={onImportFile}
          style={{ marginTop: Spacing.sm }}
        />
        <Button
          title="Importuj ze schowka"
          variant="secondary"
          icon={<Icon name="cloud-upload-outline" size={18} color={c.text} />}
          onPress={onImport}
          style={{ marginTop: Spacing.sm }}
        />
        <Text variant="caption" color={c.textMuted} center style={{ marginTop: Spacing.sm }}>
          Eksport kopiuje całą bazę do schowka. Import wczytuje ją z pliku lub schowka i zastępuje obecne dane.
        </Text>
      </Section>

      {/* Rekordy */}
      <Section title="Rekordy">
        <Button
          title="Przelicz rekordy z historii"
          variant="secondary"
          icon={<Icon name="refresh-outline" size={18} color={c.text} />}
          onPress={onRebuildPRs}
        />
        <Text variant="caption" color={c.textMuted} center style={{ marginTop: Spacing.sm }}>
          Wylicza szacowany 1RM i najcięższe serie dla wszystkich ćwiczeń z całej historii. Użyj po imporcie danych ze Strong.
        </Text>
      </Section>

      <Text variant="caption" color={c.textMuted} center style={{ marginTop: Spacing.xl }}>
        Panda Strength · offline-first tracker treningu
      </Text>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <>
      <Text variant="heading" weight="800" style={{ marginTop: Spacing.xl, marginBottom: Spacing.md }}>
        {title}
      </Text>
      <Card>{children}</Card>
    </>
  );
}

function SummaryItem({ value, label }: { value: string; label: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text variant="title" weight="800" color={c.primary}>
        {value}
      </Text>
      <Text variant="caption" color={c.textSecondary}>
        {label}
      </Text>
    </View>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const { c } = useTheme();
  return (
    <View style={styles.toggleRow}>
      <Text variant="body">{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: c.primary, false: c.surfaceAlt }}
        thumbColor="#fff"
      />
    </View>
  );
}

function Stepper({ label, value, onMinus, onPlus }: { label: string; value: string; onMinus: () => void; onPlus: () => void }) {
  const { c } = useTheme();
  return (
    <View style={styles.toggleRow}>
      <Text variant="body">{label}</Text>
      <View style={styles.stepper}>
        <Pressable onPress={onMinus} style={[styles.stepBtn, { backgroundColor: c.surfaceAlt }]}>
          <Text variant="heading" weight="800">−</Text>
        </Pressable>
        <Text variant="body" weight="700" style={{ minWidth: 56, textAlign: 'center' }}>
          {value}
        </Text>
        <Pressable onPress={onPlus} style={[styles.stepBtn, { backgroundColor: c.surfaceAlt }]}>
          <Text variant="heading" weight="800">+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryRow: { flexDirection: 'row' },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.xs },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepBtn: { width: 36, height: 36, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  measRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg },
});
