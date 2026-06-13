/**
 * Pływający pasek timera odpoczynku. Odlicza w czasie rzeczywistym,
 * pozwala dodać/odjąć czas i pominąć. Po upływie czasu — haptyka + auto
 * ukrycie. Powiadomienie systemowe planowane jest przy starcie timera.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useTheme, Spacing, Radius } from '@/theme';
import { useWorkout } from '@/store/workout';
import { formatDuration } from '@/lib/format';
import { hapticSuccess } from '@/lib/haptics';
import { cancelRestNotification } from '@/lib/notifications';

export function RestTimerBar() {
  const { c } = useTheme();
  const rest = useWorkout((s) => s.rest);
  const stopRest = useWorkout((s) => s.stopRest);
  const addRestTime = useWorkout((s) => s.addRestTime);
  const [now, setNow] = useState(Date.now());
  const firedRef = useRef(false);

  useEffect(() => {
    if (!rest.active) return;
    firedRef.current = false;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [rest.active, rest.endsAt]);

  const remaining = Math.max(0, Math.ceil((rest.endsAt - now) / 1000));

  useEffect(() => {
    if (rest.active && remaining === 0 && !firedRef.current) {
      firedRef.current = true;
      hapticSuccess();
      // Krótkie opóźnienie, by użytkownik zobaczył „0:00", potem chowamy.
      const t = setTimeout(() => stopRest(), 800);
      return () => clearTimeout(t);
    }
  }, [rest.active, remaining, stopRest]);

  if (!rest.active) return null;

  const progress = rest.total > 0 ? 1 - remaining / rest.total : 1;

  return (
    <View style={[styles.wrap, { backgroundColor: c.elevated, borderColor: c.border }]}>
      {/* Pasek postępu */}
      <View style={[styles.progressTrack, { backgroundColor: c.surfaceAlt }]}>
        <View style={[styles.progressFill, { backgroundColor: c.primary, width: `${Math.min(100, progress * 100)}%` }]} />
      </View>

      <View style={styles.row}>
        <Pressable
          onPress={() => addRestTime(-15)}
          style={[styles.adjBtn, { backgroundColor: c.surfaceAlt }]}
          hitSlop={6}
        >
          <Text variant="label" weight="800" color={c.text}>
            −15
          </Text>
        </Pressable>

        <View style={styles.center}>
          <Text variant="caption" color={c.textSecondary}>
            Odpoczynek
          </Text>
          <Text variant="title" weight="800" color={c.primary}>
            {formatDuration(remaining)}
          </Text>
        </View>

        <Pressable
          onPress={() => addRestTime(15)}
          style={[styles.adjBtn, { backgroundColor: c.surfaceAlt }]}
          hitSlop={6}
        >
          <Text variant="label" weight="800" color={c.text}>
            +15
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            cancelRestNotification();
            stopRest();
          }}
          style={[styles.skipBtn, { backgroundColor: c.primary }]}
          hitSlop={6}
        >
          <Icon name="play-skip-forward" size={18} color={c.onPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    bottom: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  progressTrack: {
    height: 4,
    width: '100%',
  },
  progressFill: {
    height: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  adjBtn: {
    width: 48,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  skipBtn: {
    width: 48,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
