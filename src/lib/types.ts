/**
 * Domenowe typy aplikacji — wspólne dla bazy danych, logiki i UI.
 * Trzymamy je w jednym miejscu, żeby schema Drizzle, seed i ekrany
 * mówiły tym samym językiem.
 */

/** Partia mięśniowa — używana do filtrowania biblioteki i Strength Score. */
export type BodyPart =
  | 'klatka'
  | 'plecy'
  | 'barki'
  | 'biceps'
  | 'triceps'
  | 'przedramiona'
  | 'nogi'
  | 'pośladki'
  | 'łydki'
  | 'brzuch'
  | 'cardio'
  | 'całe ciało';

/** Sprzęt — wpływa na ikonę i kalkulator talerzy (sztanga). */
export type Equipment =
  | 'sztanga'
  | 'hantle'
  | 'maszyna'
  | 'wyciąg'
  | 'kettlebell'
  | 'masa ciała'
  | 'guma'
  | 'inne';

/**
 * Typ wejścia ćwiczenia — steruje tym, jakie pola pokazujemy w serii.
 * To kluczowy mechanizm znany ze Strong/Strive: bieżnia ma czas+dystans,
 * podciąganie ma tylko powtórzenia, wyciskanie ma ciężar+powtórzenia.
 */
export type InputType =
  | 'weight_reps' // ciężar + powtórzenia (sztanga, hantle, maszyna, wyciąg)
  | 'bodyweight_reps' // tylko powtórzenia (podciąganie, pompki)
  | 'weighted_bodyweight' // dodatkowy ciężar + powtórzenia (podciąganie z obciążeniem)
  | 'assisted_bodyweight' // ciężar = pomoc/odciążenie + powtórzenia
  | 'duration' // tylko czas (plank, rozciąganie)
  | 'distance_duration' // dystans + czas (bieg, rower, wiosło)
  | 'reps_only'; // sama liczba powtórzeń bez ciężaru (np. brzuszki)

/** Typ pojedynczej serii — wpływa na kolor, liczenie wolumenu i PR. */
export type SetType = 'normal' | 'warmup' | 'drop' | 'failure';

/** Typ rekordu życiowego. */
export type PRType = '1rm' | 'maxWeight' | 'maxVolume' | 'bestSet';

/** Jednostka ciężaru. */
export type Unit = 'kg' | 'lb';

/** Motyw interfejsu. */
export type ThemeMode = 'light' | 'dark' | 'system';

/** Definicja ćwiczenia (wbudowanego lub własnego). */
export interface ExerciseDef {
  id: string;
  name: string;
  bodyPart: BodyPart;
  equipment: Equipment;
  inputType: InputType;
  /** Mięśnie pomocnicze — dla podziału wolumenu w Strength Score. */
  secondary?: BodyPart[];
  isCustom?: boolean;
  notes?: string;
}
