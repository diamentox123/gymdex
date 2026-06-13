/**
 * Czysta logika domenowa treningu siłowego. Bez zależności od React/DB —
 * dzięki temu w pełni testowalna i wielokrotnego użytku.
 */
import type { SetType, Unit } from './types';

const KG_PER_LB = 0.45359237;

/** Konwersja kg → lb. */
export function kgToLb(kg: number): number {
  return kg / KG_PER_LB;
}

/** Konwersja lb → kg. */
export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}

/** Konwersja wartości ciężaru z kg do wybranej jednostki wyświetlania. */
export function displayWeight(kg: number, unit: Unit): number {
  return unit === 'kg' ? kg : kgToLb(kg);
}

/** Konwersja wprowadzonej przez użytkownika wartości (w jego jednostce) na kg do zapisu. */
export function toKg(value: number, unit: Unit): number {
  return unit === 'kg' ? value : lbToKg(value);
}

/**
 * Szacowanie ciężaru maksymalnego (1RM).
 * Dla 1 powtórzenia zwraca dokładny ciężar. Dla wyższych powtórzeń
 * używa wzoru Epleya — standard w Strong/Strive. Powyżej ~12 powtórzeń
 * szacunki przestają być wiarygodne, ale wzór nadal działa monotonicznie.
 */
export function epley1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/** Alternatywny wzór Brzyckiego — lepszy dla niskich powtórzeń. */
export function brzycki1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  // Wzór załamuje się przy 37 powtórzeniach (mianownik → 0).
  if (reps >= 37) return epley1RM(weight, reps);
  return weight * (36 / (37 - reps));
}

/** Domyślne szacowanie 1RM używane w aplikacji (Epley). */
export function estimate1RM(weight: number, reps: number): number {
  return epley1RM(weight, reps);
}

/**
 * Wolumen pojedynczej serii (tonaż = ciężar × powtórzenia).
 * Serie rozgrzewkowe (warmup) nie liczą się do wolumenu roboczego —
 * tak samo jak w Strong.
 */
export function setVolume(weight: number, reps: number, type: SetType): number {
  if (type === 'warmup') return 0;
  if (weight <= 0 || reps <= 0) return 0;
  return weight * reps;
}

/** Reprezentacja serii dla obliczeń (uniezależniona od kształtu wiersza DB). */
export interface SetLike {
  weight: number | null;
  reps: number | null;
  type: SetType;
  isCompleted: boolean;
}

/** Łączny wolumen z listy serii (tylko ukończone, bez rozgrzewkowych). */
export function totalVolume(sets: SetLike[]): number {
  return sets.reduce((sum, s) => {
    if (!s.isCompleted) return sum;
    return sum + setVolume(s.weight ?? 0, s.reps ?? 0, s.type);
  }, 0);
}

/** Najlepsza seria (najwyższy szacowany 1RM) z listy — pomija rozgrzewki. */
export function bestSet(sets: SetLike[]): { weight: number; reps: number; e1rm: number } | null {
  let best: { weight: number; reps: number; e1rm: number } | null = null;
  for (const s of sets) {
    if (!s.isCompleted || s.type === 'warmup') continue;
    const w = s.weight ?? 0;
    const r = s.reps ?? 0;
    if (w <= 0 || r <= 0) continue;
    const e1rm = estimate1RM(w, r);
    if (!best || e1rm > best.e1rm) best = { weight: w, reps: r, e1rm };
  }
  return best;
}

/** Łączna liczba powtórzeń (bez rozgrzewek, tylko ukończone). */
export function totalReps(sets: SetLike[]): number {
  return sets.reduce((sum, s) => {
    if (!s.isCompleted || s.type === 'warmup') return sum;
    return sum + (s.reps ?? 0);
  }, 0);
}
