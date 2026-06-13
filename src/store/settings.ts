/**
 * Globalny store ustawień (Zustand). Lustro wiersza `settings` z DB,
 * trzymane w pamięci dla szybkiego dostępu w UI. Zapis idzie do DB
 * i aktualizuje store.
 */
import { create } from 'zustand';
import { getSettings, updateSettings } from '@/db/repo-exercises';
import type { SettingsRow } from '@/db/schema';
import type { ThemeMode, Unit } from '@/lib/types';

interface SettingsState {
  loaded: boolean;
  settings: SettingsRow | null;
  load: () => void;
  update: (patch: Partial<Omit<SettingsRow, 'id'>>) => void;
  // Wygodne gettery z domyślnymi wartościami
  unit: () => Unit;
  theme: () => ThemeMode;
  restDefault: () => number;
  barWeight: () => number;
  haptics: () => boolean;
  autoStartRest: () => boolean;
}

export const useSettings = create<SettingsState>((set, get) => ({
  loaded: false,
  settings: null,
  load: () => {
    const s = getSettings();
    set({ settings: s, loaded: true });
  },
  update: (patch) => {
    const s = updateSettings(patch);
    set({ settings: s });
  },
  unit: () => (get().settings?.unit as Unit) ?? 'kg',
  theme: () => (get().settings?.theme as ThemeMode) ?? 'system',
  restDefault: () => get().settings?.restDefaultSec ?? 120,
  barWeight: () => get().settings?.barWeightKg ?? 20,
  haptics: () => get().settings?.hapticsEnabled ?? true,
  autoStartRest: () => get().settings?.restAutoStart ?? true,
}));
