/**
 * Wizualny kalkulator talerzy — pokazuje, jakie talerze założyć na jedną
 * stronę sztangi dla docelowego ciężaru. Detal znany ze Strong/Stronger.
 */
import React, { useMemo } from 'react';
import { View, Modal, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Text, Button } from '@/components/ui';
import { useTheme, Spacing, Radius } from '@/theme';
import { calcPlates } from '@/lib/plates';
import { formatWeight, trimNumber } from '@/lib/format';
import { useSettings } from '@/store/settings';

// Kolory talerzy wg masy (umowne, ale czytelne).
const PLATE_COLOR: Record<number, string> = {
  25: '#E5484D',
  20: '#3E63DD',
  15: '#F5A623',
  10: '#30A46C',
  5: '#8E8E93',
  2.5: '#1C1F26',
  1.25: '#C0C4CC',
};

export function PlateCalculator({
  visible,
  targetKg,
  onClose,
}: {
  visible: boolean;
  targetKg: number;
  onClose: () => void;
}) {
  const { c } = useTheme();
  const unit = useSettings((s) => s.settings?.unit ?? 'kg');
  const barKg = useSettings((s) => s.settings?.barWeightKg ?? 20);

  const result = useMemo(() => calcPlates(targetKg, barKg), [targetKg, barKg]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => {}}>
          <Text variant="heading" center>
            Kalkulator talerzy
          </Text>
          <Text variant="body" color={c.textSecondary} center style={{ marginTop: 4 }}>
            Cel: {formatWeight(targetKg, unit as never)} · gryf {trimNumber(barKg)} kg
          </Text>

          {result.belowBar ? (
            <Text variant="body" color={c.warning} center style={{ marginTop: Spacing.lg }}>
              Ciężar mniejszy niż sam gryf.
            </Text>
          ) : result.perSide.length === 0 ? (
            <Text variant="body" color={c.textSecondary} center style={{ marginTop: Spacing.lg }}>
              Sam gryf — bez talerzy.
            </Text>
          ) : (
            <>
              {/* Wizualizacja sztangi z talerzami (jedna strona) */}
              <View style={styles.barWrap}>
                <View style={[styles.bar, { backgroundColor: c.borderStrong }]} />
                <View style={styles.plates}>
                  {result.perSide.map((p, i) => (
                    <View
                      key={i}
                      style={[
                        styles.plate,
                        {
                          backgroundColor: PLATE_COLOR[p] ?? c.textMuted,
                          height: 40 + Math.min(60, p * 2.4),
                        },
                      ]}
                    >
                      <Text variant="caption" weight="800" color="#fff">
                        {trimNumber(p)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <Text variant="label" color={c.textSecondary} center style={{ marginTop: Spacing.md }}>
                Na każdą stronę: {result.perSide.map((p) => trimNumber(p)).join(' + ')} kg
              </Text>
              <Text variant="caption" color={c.textMuted} center style={{ marginTop: 4 }}>
                Łącznie: {formatWeight(result.achievable, unit as never)}
                {result.remainder > 0 ? ` (brakuje ${trimNumber(result.remainder)} kg)` : ''}
              </Text>
            </>
          )}

          <Button title="Zamknij" variant="secondary" onPress={onClose} style={{ marginTop: Spacing.xl }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  sheet: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  barWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    minHeight: 110,
  },
  bar: {
    width: 50,
    height: 10,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  plates: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  plate: {
    width: 22,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
