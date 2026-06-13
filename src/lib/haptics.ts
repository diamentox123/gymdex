/**
 * Cienka warstwa na expo-haptics, respektująca ustawienie użytkownika
 * i bezpieczna na web (gdzie haptyka nie istnieje).
 */
import * as Haptics from 'expo-haptics';
import { useSettings } from '@/store/settings';

function enabled(): boolean {
  return useSettings.getState().haptics();
}

export async function hapticTick() {
  if (!enabled()) return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    /* web / brak wsparcia */
  }
}

export async function hapticSuccess() {
  if (!enabled()) return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    /* noop */
  }
}

export async function hapticWarning() {
  if (!enabled()) return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {
    /* noop */
  }
}
