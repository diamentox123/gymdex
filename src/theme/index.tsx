/**
 * Provider motywu — udostępnia paletę, skalę odstępów, typografię i tryb
 * (jasny/ciemny/systemowy). Tryb czytany z ustawień DB; reaguje też na
 * zmianę schematu systemu.
 */
import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { DARK, LIGHT, type ThemePalette } from './colors';
import type { ThemeMode } from '@/lib/types';

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

export const FontSize = {
  xs: 12,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  display: 34,
} as const;

export interface Theme {
  c: ThemePalette;
  dark: boolean;
}

const ThemeContext = createContext<Theme>({ c: DARK, dark: true });

export function AppThemeProvider({
  mode,
  children,
}: {
  mode: ThemeMode;
  children: React.ReactNode;
}) {
  const system = useColorScheme();
  const theme = useMemo<Theme>(() => {
    const effective = mode === 'system' ? (system ?? 'dark') : mode;
    const dark = effective !== 'light';
    return { c: dark ? DARK : LIGHT, dark };
  }, [mode, system]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
