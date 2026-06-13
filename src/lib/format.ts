/**
 * Formatowanie liczb, ciężaru, czasu i objętości do wyświetlania (PL).
 */
import { displayWeight } from './calc';
import type { Unit } from './types';

/** Liczba bez zbędnych zer (np. 2.50 → "2.5", 60.0 → "60"). */
export function trimNumber(n: number, maxDecimals = 2): string {
  if (!Number.isFinite(n)) return '0';
  const rounded = Math.round(n * 10 ** maxDecimals) / 10 ** maxDecimals;
  return String(rounded);
}

/** Ciężar z jednostką, np. "82.5 kg". Wartość wejściowa zawsze w kg. */
export function formatWeight(kg: number, unit: Unit, withUnit = true): string {
  const val = trimNumber(displayWeight(kg, unit), unit === 'kg' ? 2 : 1);
  return withUnit ? `${val} ${unit}` : val;
}

/** Wolumen (tonaż) z jednostką, zaokrąglony, np. "4 320 kg". */
export function formatVolume(kg: number, unit: Unit): string {
  const val = Math.round(displayWeight(kg, unit));
  return `${val.toLocaleString('pl-PL')} ${unit}`;
}

/** Czas trwania w sekundach → "M:SS" lub "H:MM:SS". */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (h > 0) return `${h}:${pad(m)}:${pad(sec)}`;
  return `${m}:${pad(sec)}`;
}

/** Krótki czas treningu, np. "1 h 12 min" lub "45 min". */
export function formatWorkoutLength(totalSeconds: number): string {
  const m = Math.round(totalSeconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h} h ${rem} min` : `${h} h`;
}

/** Dystans w metrach → "1,2 km" lub "850 m". */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toLocaleString('pl-PL', { maximumFractionDigits: 2 })} km`;
  }
  return `${Math.round(meters)} m`;
}

/** Liczba serii w formie "3 serie / 1 seria / 5 serii" (polska odmiana). */
export function formatSetsCount(n: number): string {
  if (n === 1) return '1 seria';
  const lastDigit = n % 10;
  const lastTwo = n % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14)) {
    return `${n} serie`;
  }
  return `${n} serii`;
}
