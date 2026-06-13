/**
 * Mapuje typ wejścia ćwiczenia na widoczne pola serii. To mechanizm znany
 * ze Strong/Strive: różne ćwiczenia mają różne kolumny w tabeli serii.
 */
import type { InputType } from './types';

export interface InputFields {
  weight: boolean; // ciężar (kg)
  reps: boolean; // powtórzenia
  duration: boolean; // czas (s)
  distance: boolean; // dystans (m)
  /**
   * Prefiks etykiety kolumny ciężaru: '' dla zwykłego, '+' dla dociążenia
   * (weighted bodyweight), '−' dla odciążenia (assisted). Jednostkę (kg/lb)
   * dokleja UI — patrz `weightColumnLabel`.
   */
  weightPrefix: '' | '+' | '−';
}

export function fieldsForInputType(t: InputType): InputFields {
  switch (t) {
    case 'weight_reps':
      return { weight: true, reps: true, duration: false, distance: false, weightPrefix: '' };
    case 'weighted_bodyweight':
      return { weight: true, reps: true, duration: false, distance: false, weightPrefix: '+' };
    case 'assisted_bodyweight':
      return { weight: true, reps: true, duration: false, distance: false, weightPrefix: '−' };
    case 'bodyweight_reps':
    case 'reps_only':
      return { weight: false, reps: true, duration: false, distance: false, weightPrefix: '' };
    case 'duration':
      return { weight: false, reps: false, duration: true, distance: false, weightPrefix: '' };
    case 'distance_duration':
      return { weight: false, reps: false, duration: true, distance: true, weightPrefix: '' };
    default:
      return { weight: true, reps: true, duration: false, distance: false, weightPrefix: '' };
  }
}

/** Etykieta kolumny ciężaru z jednostką użytkownika, np. „kg", „+kg", „−lb". */
export function weightColumnLabel(fields: InputFields, unit: string): string {
  return `${fields.weightPrefix}${unit}`;
}

/** Czy dla tego typu wejścia ma sens kalkulator talerzy (tylko sztanga-podobne). */
export function supportsPlateCalc(t: InputType): boolean {
  return t === 'weight_reps' || t === 'weighted_bodyweight';
}
