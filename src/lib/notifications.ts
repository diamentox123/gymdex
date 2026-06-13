/**
 * Lokalne powiadomienia dla timera odpoczynku. Działają w Expo Go
 * (powiadomienia LOKALNE są wspierane; push by nie był). Powiadomienie
 * odpala się nawet gdy aplikacja jest w tle — dzięki temu wiesz, że czas
 * odpoczynku minął.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

let configured = false;
let restNotificationId: string | null = null;

/** Konfiguruje sposób prezentacji powiadomień (raz). */
export function configureNotifications() {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: false,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Prosi o pozwolenie na powiadomienia (idempotentne). */
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.status === 'granted';
  } catch {
    return false;
  }
}

/** Planuje powiadomienie o końcu odpoczynku za `seconds` sekund. */
export async function scheduleRestDone(seconds: number) {
  try {
    await cancelRestNotification();
    if (Platform.OS === 'web') return;
    restNotificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Koniec odpoczynku 💪',
        body: 'Czas na kolejną serię!',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(seconds)),
      },
    });
  } catch {
    /* brak wsparcia / odmowa — timer i tak działa w aplikacji */
  }
}

/** Anuluje zaplanowane powiadomienie o odpoczynku (np. po „pomiń"). */
export async function cancelRestNotification() {
  try {
    if (restNotificationId) {
      await Notifications.cancelScheduledNotificationAsync(restNotificationId);
      restNotificationId = null;
    }
  } catch {
    /* noop */
  }
}
