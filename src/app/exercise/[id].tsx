/**
 * Szczegóły ćwiczenia: opis, rekordy życiowe, wykres szacowanego 1RM
 * w czasie. Z poziomu biblioteki.
 */
import React, { useMemo } from 'react';
import { ScrollView, View, StyleSheet, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import dayjs from 'dayjs';
import { Text, Card, Divider, Button } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useTheme, Spacing, Radius } from '@/theme';
import { getExerciseGuide, guideImageUrls } from '@/data/exercise-guide';
import { LineProgressChart } from '@/components/Charts';
import { getExercise, deleteExercise } from '@/db/repo-exercises';
import { getExerciseProgress, getBestPR, getProgressionSuggestion } from '@/db/repo-workouts';
import { formatWeight, trimNumber } from '@/lib/format';
import { useSettings } from '@/store/settings';
import { displayWeight } from '@/lib/calc';

export default function ExerciseDetail() {
  const { c } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const unit = useSettings((s) => s.settings?.unit ?? 'kg');

  const ex = useMemo(() => (id ? getExercise(String(id)) : null), [id]);
  const guide = useMemo(() => (id ? getExerciseGuide(String(id)) : null), [id]);
  const progress = useMemo(() => (id ? getExerciseProgress(String(id)) : []), [id]);
  const pr1rm = useMemo(() => (id ? getBestPR(String(id), '1rm') : null), [id]);
  const prWeight = useMemo(() => (id ? getBestPR(String(id), 'maxWeight') : null), [id]);
  const suggestion = useMemo(() => (id ? getProgressionSuggestion(String(id), unit as never) : null), [id, unit]);

  if (!ex) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center' }}>
        <Text variant="body" center color={c.textSecondary}>
          Nie znaleziono ćwiczenia.
        </Text>
      </View>
    );
  }

  const chartData = progress.map((p) => ({
    value: Math.round(displayWeight(p.e1rm, unit as never)),
    label: dayjs(p.date).format('DD.MM'),
  }));

  const onDelete = () => {
    Alert.alert(
      'Usunąć ćwiczenie?',
      `„${ex.name}" zniknie z biblioteki. Historia treningów pozostanie, ale ćwiczenia nie będzie można dodać do nowych. Tej operacji nie można cofnąć.`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń',
          style: 'destructive',
          onPress: () => {
            deleteExercise(ex.id);
            router.back();
          },
        },
      ]
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: ex.name }} />
      <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: Spacing.lg }}>
        <Card>
          <Text variant="title" weight="800">
            {ex.name}
          </Text>
          <Text variant="body" color={c.textSecondary} style={{ marginTop: 4 }}>
            {cap(ex.bodyPart)} · {ex.equipment}
          </Text>
        </Card>

        {/* Podpowiedź progresji na następny trening */}
        {suggestion ? (
          <Card style={[styles.suggestCard, { borderColor: suggestion.isIncrease ? c.success : c.primary }]}>
            <View style={styles.suggestHead}>
              <Icon name={suggestion.isIncrease ? 'trending-up' : 'remove'} size={18} color={suggestion.isIncrease ? c.success : c.primary} />
              <Text variant="label" weight="800" color={suggestion.isIncrease ? c.success : c.primary}>
                NASTĘPNY TRENING
              </Text>
            </View>
            <Text variant="title" weight="800" style={{ marginTop: 4 }}>
              {trimNumber(suggestion.weight)} {unit} × {suggestion.reps}
            </Text>
            <Text variant="caption" color={c.textSecondary} style={{ marginTop: 4 }}>
              {suggestion.reason}
            </Text>
          </Card>
        ) : null}

        {/* Instruktaż: zdjęcia pozycji + opis techniki */}
        {guide ? (
          <>
            <Text variant="heading" weight="800" style={{ marginTop: Spacing.xl, marginBottom: Spacing.md }}>
              Jak wykonać
            </Text>
            {guideImageUrls(guide).length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: Spacing.md }}
                style={{ marginBottom: Spacing.md }}
              >
                {guideImageUrls(guide).map((uri, i) => (
                  <View key={uri} style={styles.frame}>
                    <Image source={{ uri }} style={styles.frameImg} contentFit="cover" transition={150} />
                    <Text variant="caption" color={c.textMuted} center style={{ marginTop: 4 }}>
                      {i === 0 ? 'Pozycja startowa' : i === 1 ? 'Pozycja końcowa' : `Faza ${i + 1}`}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            ) : null}
            <Card>
              {guide.steps.map((s, i) => (
                <View key={i} style={styles.step}>
                  <Text variant="body" weight="800" color={c.primary} style={{ width: 22 }}>
                    {i + 1}.
                  </Text>
                  <Text variant="body" color={c.textSecondary} style={{ flex: 1 }}>
                    {s}
                  </Text>
                </View>
              ))}
            </Card>
          </>
        ) : null}

        {/* Rekordy */}
        <Text variant="heading" weight="800" style={{ marginTop: Spacing.xl, marginBottom: Spacing.md }}>
          Rekordy
        </Text>
        <Card padded={false} style={{ paddingVertical: Spacing.sm }}>
          <PRRow
            icon="trophy"
            label="Szacowany 1RM"
            value={pr1rm ? formatWeight(pr1rm.value, unit as never) : '—'}
            detail={pr1rm ? `${formatWeight(pr1rm.weight ?? 0, unit as never)} × ${pr1rm.reps}` : undefined}
          />
          <Divider />
          <PRRow
            icon="barbell"
            label="Najcięższa seria"
            value={prWeight ? formatWeight(prWeight.weight ?? prWeight.value, unit as never) : '—'}
            detail={prWeight ? `× ${prWeight.reps}` : undefined}
          />
        </Card>

        {/* Wykres postępu 1RM */}
        <Text variant="heading" weight="800" style={{ marginTop: Spacing.xl, marginBottom: Spacing.md }}>
          Postęp (szac. 1RM)
        </Text>
        <Card>
          <LineProgressChart data={chartData} suffix={` ${unit}`} />
        </Card>

        <Text variant="caption" color={c.textMuted} center style={{ marginTop: Spacing.lg }}>
          {progress.length > 0
            ? `Wykonane w ${progress.length} ${progress.length === 1 ? 'treningu' : 'treningach'}`
            : 'Brak historii dla tego ćwiczenia'}
        </Text>

        {ex.isCustom ? (
          <Button
            title="Usuń ćwiczenie"
            variant="ghost"
            onPress={onDelete}
            style={{ marginTop: Spacing.xl }}
          />
        ) : null}
      </ScrollView>
    </>
  );
}

function PRRow({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ComponentProps<typeof Icon>['name'];
  label: string;
  value: string;
  detail?: string;
}) {
  const { c } = useTheme();
  return (
    <View style={styles.prRow}>
      <Icon name={icon} size={20} color={c.pr} />
      <View style={{ flex: 1 }}>
        <Text variant="body" weight="600">
          {label}
        </Text>
        {detail ? (
          <Text variant="caption" color={c.textSecondary}>
            {detail}
          </Text>
        ) : null}
      </View>
      <Text variant="heading" weight="800">
        {value}
      </Text>
    </View>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  suggestCard: { marginTop: Spacing.lg, borderWidth: 1 },
  suggestHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  frame: { width: 200 },
  frameImg: {
    width: 200,
    height: 200,
    borderRadius: Radius.md,
    backgroundColor: '#00000010',
  },
  step: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
});
