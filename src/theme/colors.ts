/**
 * Paleta kolorów i tokeny motywu. Ciemny i jasny wariant.
 * Akcent (energetyczny pomarańcz) nawiązuje do estetyki aplikacji
 * treningowych — wyraźny, motywujący, dobrze widoczny na ciemnym tle.
 */

export interface ThemePalette {
  // Tła
  bg: string;
  surface: string;
  surfaceAlt: string;
  elevated: string;
  // Tekst
  text: string;
  textSecondary: string;
  textMuted: string;
  // Akcenty
  primary: string;
  primaryMuted: string;
  onPrimary: string;
  // Stany
  success: string;
  successMuted: string;
  danger: string;
  warning: string;
  // Linie / obramowania
  border: string;
  borderStrong: string;
  // Specjalne
  pr: string; // złoto rekordów
  inputBg: string;
}

const orange = '#FF6B2C';

export const DARK: ThemePalette = {
  bg: '#0B0C0F',
  surface: '#15171C',
  surfaceAlt: '#1C1F26',
  elevated: '#23272F',
  text: '#F4F5F7',
  textSecondary: '#A4ABB8',
  textMuted: '#6B7280',
  primary: orange,
  primaryMuted: 'rgba(255,107,44,0.16)',
  onPrimary: '#0B0C0F',
  success: '#34D27B',
  successMuted: 'rgba(52,210,123,0.16)',
  danger: '#FF4D4F',
  warning: '#FFC53D',
  border: '#262A33',
  borderStrong: '#363B45',
  pr: '#FFC53D',
  inputBg: '#0F1115',
};

export const LIGHT: ThemePalette = {
  bg: '#F5F6F8',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F2F5',
  elevated: '#FFFFFF',
  text: '#15171C',
  textSecondary: '#4B5160',
  textMuted: '#8A909C',
  primary: orange,
  primaryMuted: 'rgba(255,107,44,0.12)',
  onPrimary: '#FFFFFF',
  success: '#1FA862',
  successMuted: 'rgba(31,168,98,0.14)',
  danger: '#E5484D',
  warning: '#D98E04',
  border: '#E3E6EB',
  borderStrong: '#CDD2DA',
  pr: '#D98E04',
  inputBg: '#FFFFFF',
};
