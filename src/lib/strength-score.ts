/**
 * Strength Score — ekstra inspirowany funkcją ze Stronger.
 * Ocenia siłę względną (najlepszy szacowany 1RM / masa ciała) dla kluczowych
 * bojów i mapuje na poziom: Początkujący → Światowa klasa.
 *
 * Progi są przybliżone i opierają się na popularnych standardach siły dla
 * mężczyzn (jako rozsądny domyślny punkt odniesienia). To wskaźnik
 * motywacyjny, nie pomiar naukowy.
 */

export type StrengthLevel =
  | 'Początkujący'
  | 'Nowicjusz'
  | 'Średniozaawansowany'
  | 'Zaawansowany'
  | 'Elita'
  | 'Światowa klasa';

export const STRENGTH_LEVELS: StrengthLevel[] = [
  'Początkujący',
  'Nowicjusz',
  'Średniozaawansowany',
  'Zaawansowany',
  'Elita',
  'Światowa klasa',
];

/**
 * Mnożniki masy ciała dla głównych bojów na kolejnych poziomach.
 * Klucz = id ćwiczenia z seed (lub "kategoria" boju).
 */
const RATIO_THRESHOLDS: Record<string, number[]> = {
  // [Nowicjusz, Średnio, Zaaw., Elita, Światowa]
  'wyciskanie-sztanga-lawka-plaska': [0.5, 0.75, 1.25, 1.75, 2.0],
  'przysiad-ze-sztanga': [0.75, 1.25, 1.75, 2.5, 3.0],
  'martwy-ciag': [1.0, 1.5, 2.0, 2.75, 3.25],
  'wyciskanie-zolnierskie': [0.35, 0.55, 0.8, 1.1, 1.4],
  podciaganie: [0.0, 0.1, 0.35, 0.6, 1.0], // dodatkowy ciężar / masa ciała
};

/** Wynik dla jednego boju. */
export interface LiftScore {
  exerciseId: string;
  ratio: number; // najlepszy 1RM / masa ciała
  level: StrengthLevel;
  /** 0–100, pozycja w obrębie skali (do paska postępu). */
  percent: number;
}

/** Mapuje stosunek 1RM/masa ciała na poziom + procent dla danego boju. */
export function scoreLift(exerciseId: string, best1RM: number, bodyweight: number): LiftScore | null {
  const thresholds = RATIO_THRESHOLDS[exerciseId];
  if (!thresholds || bodyweight <= 0 || best1RM <= 0) return null;

  const ratio = best1RM / bodyweight;

  // Znajdź poziom: ile progów przekroczono.
  let levelIdx = 0;
  for (let i = 0; i < thresholds.length; i++) {
    if (ratio >= thresholds[i]) levelIdx = i + 1;
  }
  const level = STRENGTH_LEVELS[Math.min(levelIdx, STRENGTH_LEVELS.length - 1)];

  // Procent: interpolacja w obrębie aktualnego przedziału (0 → pierwszy próg, max → ostatni).
  const maxThreshold = thresholds[thresholds.length - 1];
  const percent = Math.min(100, Math.round((ratio / maxThreshold) * 100));

  return { exerciseId, ratio, level, percent };
}

/** Ogólny Strength Score (0–100) jako średnia z dostępnych bojów. */
export function overallStrengthScore(lifts: LiftScore[]): { score: number; level: StrengthLevel } | null {
  if (lifts.length === 0) return null;
  const avgPercent = Math.round(lifts.reduce((s, l) => s + l.percent, 0) / lifts.length);
  // Mapuj średni procent na poziom.
  const idx = Math.min(STRENGTH_LEVELS.length - 1, Math.floor((avgPercent / 100) * STRENGTH_LEVELS.length));
  return { score: avgPercent, level: STRENGTH_LEVELS[idx] };
}

/** Lista bojów branych pod uwagę w Strength Score (do UI). */
export const SCORED_LIFTS: { id: string; label: string }[] = [
  { id: 'przysiad-ze-sztanga', label: 'Przysiad' },
  { id: 'wyciskanie-sztanga-lawka-plaska', label: 'Wyciskanie' },
  { id: 'martwy-ciag', label: 'Martwy ciąg' },
  { id: 'wyciskanie-zolnierskie', label: 'OHP' },
  { id: 'podciaganie', label: 'Podciąganie' },
];
