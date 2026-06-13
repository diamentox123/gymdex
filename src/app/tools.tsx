/**
 * Ekran „Narzędzia" — kalkulatory: szacowany 1RM, tabela %1RM oraz
 * kalkulator talerzy. Wszystko liczone z czystej logiki (lib/calc, lib/plates,
 * lib/progression), działa offline.
 */
import React, { useState, useMemo } from 'react';
import { ScrollView, View, TextInput, StyleSheet, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import { Text, Card, Divider } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useTheme, Spacing, Radius } from '@/theme';
import { useSettings } from '@/store/settings';
import { estimate1RM, brzycki1RM, toKg, displayWeight } from '@/lib/calc';
import { percentTable } from '@/lib/progression';
import { calcPlates, DEFAULT_BAR_KG } from '@/lib/plates';
import { formatWeight, trimNumber } from '@/lib/format';
import type { Unit } from '@/lib/types';

type Tool = '1rm' | 'plates';

export default function ToolsScreen() {
  const { c } = useTheme();
  const unit = (useSettings((s) => s.settings?.unit) ?? 'kg') as Unit;
  const barKg = useSettings((s) => s.settings?.barWeightKg) ?? DEFAULT_BAR_KG;
  const [tab, setTab] = useState<Tool>('1rm');

  return (
    <>
      <Stack.Screen options={{ title: 'Narzędzia' }} />
      <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing.xxl }}>
        <View style={styles.tabs}>
          <TabBtn label="Kalkulator 1RM" active={tab === '1rm'} onPress={() => setTab('1rm')} />
          <TabBtn label="Talerze" active={tab === 'plates'} onPress={() => setTab('plates')} />
        </View>

        {tab === '1rm' ? <OneRmTool unit={unit} /> : <PlatesTool unit={unit} barKg={barKg} />}
      </ScrollView>
    </>
  );
}

function OneRmTool({ unit }: { unit: Unit }) {
  const { c } = useTheme();
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');

  const result = useMemo(() => {
    const w = parseFloat(weight.replace(',', '.'));
    const r = parseInt(reps, 10);
    if (!w || !r || w <= 0 || r <= 0) return null;
    const wKg = toKg(w, unit);
    const epley = estimate1RM(wKg, r);
    const brzycki = brzycki1RM(wKg, r);
    return {
      avg: (epley + brzycki) / 2,
      epley,
      brzycki,
      table: percentTable((epley + brzycki) / 2, unit),
    };
  }, [weight, reps, unit]);

  return (
    <>
      <Card>
        <Text variant="caption" color={c.textSecondary}>
          Podaj serię, a obliczę szacowany ciężar maksymalny (1RM) i tabelę procentów do programowania.
        </Text>
        <View style={styles.inputRow}>
          <Field label={`Ciężar (${unit})`} value={weight} onChangeText={setWeight} placeholder="100" />
          <Field label="Powtórzenia" value={reps} onChangeText={setReps} placeholder="5" />
        </View>
      </Card>

      {result ? (
        <>
          <Card style={{ marginTop: Spacing.lg, alignItems: 'center' }}>
            <Text variant="caption" color={c.textSecondary}>
              Szacowany 1RM
            </Text>
            <Text variant="display" weight="800" color={c.primary}>
              {formatWeight(result.avg, unit)}
            </Text>
            <Text variant="caption" color={c.textMuted}>
              Epley {trimNumber(displayWeight(result.epley, unit))} · Brzycki {trimNumber(displayWeight(result.brzycki, unit))}
            </Text>
          </Card>

          <Text variant="heading" weight="800" style={{ marginTop: Spacing.xl, marginBottom: Spacing.md }}>
            Tabela procentów
          </Text>
          <Card padded={false} style={{ paddingVertical: Spacing.xs }}>
            <View style={styles.tableHead}>
              <Text variant="caption" color={c.textMuted} style={{ flex: 1 }}>% 1RM</Text>
              <Text variant="caption" color={c.textMuted} style={{ flex: 1, textAlign: 'center' }}>Ciężar</Text>
              <Text variant="caption" color={c.textMuted} style={{ flex: 1, textAlign: 'right' }}>~powt.</Text>
            </View>
            {result.table.map((row, i) => (
              <View key={row.pct}>
                {i > 0 ? <Divider /> : null}
                <View style={styles.tableRow}>
                  <Text variant="body" weight="700" style={{ flex: 1 }}>{row.pct}%</Text>
                  <Text variant="body" style={{ flex: 1, textAlign: 'center' }}>{trimNumber(row.weight)} {unit}</Text>
                  <Text variant="body" color={c.textSecondary} style={{ flex: 1, textAlign: 'right' }}>{row.reps}</Text>
                </View>
              </View>
            ))}
          </Card>
        </>
      ) : (
        <Card style={{ marginTop: Spacing.lg }}>
          <Text variant="body" color={c.textSecondary} center>
            Wpisz ciężar i powtórzenia, aby zobaczyć wynik.
          </Text>
        </Card>
      )}
    </>
  );
}

function PlatesTool({ unit, barKg }: { unit: Unit; barKg: number }) {
  const { c } = useTheme();
  const [target, setTarget] = useState('');

  const result = useMemo(() => {
    const t = parseFloat(target.replace(',', '.'));
    if (!t || t <= 0) return null;
    const targetKg = toKg(t, unit);
    return calcPlates(targetKg, barKg);
  }, [target, unit, barKg]);

  return (
    <>
      <Card>
        <Text variant="caption" color={c.textSecondary}>
          Podaj docelowy ciężar na sztandze — rozłożę talerze na jedną stronę. Gryf: {formatWeight(barKg, unit)}.
        </Text>
        <View style={styles.inputRow}>
          <Field label={`Ciężar docelowy (${unit})`} value={target} onChangeText={setTarget} placeholder="100" />
        </View>
      </Card>

      {result ? (
        <Card style={{ marginTop: Spacing.lg }}>
          {result.belowBar ? (
            <Text variant="body" color={c.textSecondary} center>
              Ciężar mniejszy niż sam gryf ({formatWeight(barKg, unit)}).
            </Text>
          ) : (
            <>
              <Text variant="caption" color={c.textSecondary} center>
                Na każdą stronę gryfu:
              </Text>
              <View style={styles.plates}>
                {result.perSide.length === 0 ? (
                  <Text variant="body" color={c.textMuted}>tylko gryf</Text>
                ) : (
                  result.perSide.map((p, i) => (
                    <View key={i} style={[styles.plate, { backgroundColor: c.primary }]}>
                      <Text variant="label" weight="800" color={c.onPrimary}>
                        {trimNumber(displayWeight(p, unit))}
                      </Text>
                    </View>
                  ))
                )}
              </View>
              <Text variant="heading" weight="800" center style={{ marginTop: Spacing.md }}>
                {formatWeight(result.achievable, unit)}
              </Text>
              {result.remainder > 0.01 ? (
                <Text variant="caption" color={c.warning} center style={{ marginTop: 4 }}>
                  Brakuje {formatWeight(result.remainder, unit)} do celu (niedostępne talerze).
                </Text>
              ) : null}
            </>
          )}
        </Card>
      ) : (
        <Card style={{ marginTop: Spacing.lg }}>
          <Text variant="body" color={c.textSecondary} center>
            Wpisz ciężar docelowy.
          </Text>
        </Card>
      )}
    </>
  );
}

function TabBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.md,
        backgroundColor: active ? c.primary : c.surfaceAlt,
        alignItems: 'center',
      }}
    >
      <Text variant="label" weight="700" color={active ? c.onPrimary : c.textSecondary}>
        {label}
      </Text>
    </Pressable>
  );
}

function Field({ label, value, onChangeText, placeholder }: { label: string; value: string; onChangeText: (t: string) => void; placeholder: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text variant="caption" color={c.textSecondary} style={{ marginBottom: 4 }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={(t) => onChangeText(t.replace(/[^0-9.,]/g, ''))}
        placeholder={placeholder}
        placeholderTextColor={c.textMuted}
        keyboardType="decimal-pad"
        style={[styles.input, { color: c.text, backgroundColor: c.inputBg, borderColor: c.border }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  inputRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  input: {
    fontSize: 18,
    fontWeight: '700',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tableHead: { flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  tableRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, alignItems: 'center' },
  plates: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, justifyContent: 'center', marginTop: Spacing.md },
  plate: { minWidth: 44, height: 44, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xs },
});
