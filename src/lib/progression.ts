/**
 * Algorytm progresji ciężaru — ile podnosić z treningu na trening, żeby
 * robić mierzalny postęp. Czysta logika domenowa (bez React/DB), testowalna.
 *
 * Model: DOUBLE PROGRESSION (podwójna progresja) — standard w rozsądnym
 * programowaniu siłowym i hipertrofii:
 *  1. Trzymasz ciężar, dopóki nie zrobisz GÓRNEJ granicy zakresu powtórzeń
 *     we wszystkich seriach roboczych.
 *  2. Gdy osiągniesz górę zakresu na wszystkich seriach → dokładasz ciężar
 *     i wracasz do dolnej granicy zakresu.
 * Wielkość przyrostu zależy od ćwiczenia (duże boje vs izolacja) i jednostki.
 *
 * Dodatkowo: jeśli RPE/RIR sugeruje, że było bardzo lekko (duży zapas),
 * algorytm proponuje większy skok; jeśli ledwo domknąłeś — mniejszy/utrzymanie.
 */
import type { Unit } from './types';
import { displayWeight, toKg } from './calc';

/** Najmniejszy sensowny przyrost dla danego sprzętu (w KG). */
export function minIncrementKg(equipment: string): number {
  switch (equipment) {
    case 'sztanga':
      return 2.5; // talerze 1.25 kg po stronie
    case 'hantle':
      return 2; // hantle zwykle co 2 kg (czasem 1)
    case 'maszyna':
    case 'wyciąg':
      return 2.5; // stos — przybliżenie; bywa 5
    case 'kettlebell':
      return 4;
    default:
      return 2.5;
  }
}

/** Czy ćwiczenie to duży bój wielostawowy (większe przyrosty znoszą lepiej). */
export function isCompoundLift(exerciseId: string): boolean {
  return /martwy-ciag|przysiad|wyciskanie-sztanga|wyciskanie-zolnierskie|wioslowanie-sztanga|hip-thrust|wypychanie-suwnica|przysiad-hack/.test(
    exerciseId
  );
}

export interface LastSetPerf {
  weightKg: number | null;
  reps: number | null;
  rpe?: number | null; // 1..10
  rir?: number | null; // powtórzenia w zapasie
}

export interface ProgressionTarget {
  /** Zalecany ciężar na NASTĘPNY trening, w jednostce użytkownika (zaokrąglony). */
  weight: number;
  /** Zalecana liczba powtórzeń (dolna granica zakresu po podniesieniu, lub utrzymanie). */
  reps: number;
  /** Czy to podniesienie ciężaru względem ostatniego. */
  isIncrease: boolean;
  /** Krótkie uzasadnienie po polsku — do pokazania w UI. */
  reason: string;
}

export interface ProgressionInput {
  /** Serie robocze z OSTATNIEGO treningu tego ćwiczenia (bez rozgrzewek). */
  lastSets: LastSetPerf[];
  /** Docelowy zakres powtórzeń (np. 8–12). */
  repRangeMin: number;
  repRangeMax: number;
  equipment: string;
  exerciseId: string;
  unit: Unit;
}

/** Zaokrąglij ciężar (w jednostce usera) do wielokrotności kroku sprzętu. */
function roundToIncrement(weightUserUnit: number, equipment: string, unit: Unit): number {
  const stepKg = minIncrementKg(equipment);
  const stepUser = displayWeight(stepKg, unit); // krok w jednostce usera
  if (stepUser <= 0) return Math.round(weightUserUnit);
  return Math.round(weightUserUnit / stepUser) * stepUser;
}

/**
 * Wylicza zalecany ciężar/powtórzenia na następny trening wg double progression.
 * Zwraca null, gdy brak sensownych danych (np. ćwiczenie bez ciężaru).
 */
export function nextProgression(input: ProgressionInput): ProgressionTarget | null {
  const working = input.lastSets.filter((s) => (s.weightKg ?? 0) > 0 && (s.reps ?? 0) > 0);
  if (working.length === 0) return null;

  // Bazujemy na najcięższej serii roboczej (top set) jako punkcie odniesienia.
  const topKg = Math.max(...working.map((s) => s.weightKg ?? 0));
  const setsAtTop = working.filter((s) => (s.weightKg ?? 0) === topKg);
  const minRepsAtTop = Math.min(...setsAtTop.map((s) => s.reps ?? 0));
  const allReps = working.map((s) => s.reps ?? 0);

  const topUser = displayWeight(topKg, input.unit);
  const inc = isCompoundLift(input.exerciseId)
    ? displayWeight(minIncrementKg(input.equipment), input.unit)
    : displayWeight(minIncrementKg(input.equipment), input.unit); // ten sam krok; różnicę robi decyzja niżej

  // Zapas siły z ostatniego topowego setu (RIR lub z RPE).
  const top = setsAtTop[0];
  const rir = top.rir ?? (top.rpe != null ? Math.max(0, 10 - top.rpe) : null);

  // 1) Osiągnięto górę zakresu na WSZYSTKICH seriach → podnieś ciężar.
  const hitTopAll = allReps.every((r) => r >= input.repRangeMax);
  if (hitTopAll) {
    // Duży zapas (RIR ≥ 3) → podwójny krok na bojach złożonych.
    const bigJump = isCompoundLift(input.exerciseId) && rir != null && rir >= 3;
    const newWeight = roundToIncrement(topUser + (bigJump ? inc * 2 : inc), input.equipment, input.unit);
    return {
      weight: newWeight,
      reps: input.repRangeMin,
      isIncrease: true,
      reason: bigJump
        ? `Górny zakres z dużym zapasem — śmiało dołóż ${Math.round((newWeight - topUser) * 10) / 10} ${input.unit}.`
        : `Zrobione ${input.repRangeMax} powt. we wszystkich seriach — czas dołożyć ciężar.`,
    };
  }

  // 2) Nie osiągnięto góry → utrzymaj ciężar, celuj w +1 powtórzenie.
  const target = Math.min(input.repRangeMax, minRepsAtTop + 1);
  // Jeśli ledwo domknięte (RIR 0) i nawet dolny zakres był ciężki → utrzymanie bez presji.
  const veryHard = rir != null && rir <= 0 && minRepsAtTop <= input.repRangeMin;
  return {
    weight: roundToIncrement(topUser, input.equipment, input.unit),
    reps: target,
    isIncrease: false,
    reason: veryHard
      ? `Było ciężko — utrzymaj ciężar i ustabilizuj technikę, zanim dołożysz.`
      : `Utrzymaj ciężar i dobij do ${target} powt. w każdej serii (potem podnieś).`,
  };
}

/**
 * Tabela procentów 1RM → ciężar roboczy (do programowania).
 * Zwraca pary (procent, ciężar w jednostce usera, ~powtórzenia wg Epleya odwrotnie).
 */
export function percentTable(oneRmKg: number, unit: Unit): { pct: number; weight: number; reps: number }[] {
  const pcts = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50];
  // Odwrotność Epleya: reps ≈ 30 * (1RM/w - 1)
  return pcts.map((pct) => {
    const wKg = (oneRmKg * pct) / 100;
    const reps = pct >= 100 ? 1 : Math.max(1, Math.round(30 * (oneRmKg / wKg - 1)));
    return { pct, weight: Math.round(displayWeight(wKg, unit) * 10) / 10, reps };
  });
}

/** Pomocnik: przelicz ProgressionTarget.weight z powrotem na kg (do zapisu/prefill). */
export function targetWeightKg(target: ProgressionTarget, unit: Unit): number {
  return toKg(target.weight, unit);
}
