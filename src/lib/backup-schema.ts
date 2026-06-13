/**
 * Walidacja kopii zapasowej — czysta logika (bez bazy), więc testowalna
 * w vitest. Sam zapis do SQLite żyje w `db/backup.ts`.
 */

/** Tabele wchodzące w skład kopii (kolejność = zależności FK: rodzice → dzieci). */
export const BACKUP_TABLES = [
  'exercises',
  'routines',
  'routine_exercises',
  'routine_sets',
  'workouts',
  'workout_exercises',
  'workout_sets',
  'personal_records',
  'body_measurements',
  'settings',
] as const;

export type BackupTable = (typeof BACKUP_TABLES)[number];

export interface BackupData {
  version: number;
  exportedAt: number;
  tables: Record<string, unknown[]>;
}

const KNOWN_TABLES = new Set<string>(BACKUP_TABLES);

/** Aktualna wersja formatu kopii. */
export const BACKUP_VERSION = 1;

/**
 * Sprawdza, czy `raw` to poprawny obiekt backupu. Zwraca błąd jako string
 * (po polsku, do pokazania użytkownikowi) albo `null`, gdy wszystko OK.
 * Nieznane tabele są ignorowane przy imporcie (forward-compat).
 */
export function validateBackup(raw: unknown): { error: string | null; data?: BackupData } {
  if (raw == null || typeof raw !== 'object') {
    return { error: 'To nie jest poprawny plik kopii zapasowej.' };
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.version !== 'number') {
    return { error: 'Brak numeru wersji — to nie wygląda na kopię Panda Strength.' };
  }
  if (obj.version > BACKUP_VERSION) {
    return { error: `Kopia pochodzi z nowszej wersji aplikacji (v${obj.version}). Zaktualizuj aplikację.` };
  }
  if (obj.tables == null || typeof obj.tables !== 'object' || Array.isArray(obj.tables)) {
    return { error: 'Kopia nie zawiera danych (brak sekcji „tables").' };
  }
  const tables = obj.tables as Record<string, unknown>;
  for (const [name, rows] of Object.entries(tables)) {
    if (!KNOWN_TABLES.has(name)) continue;
    if (!Array.isArray(rows)) {
      return { error: `Uszkodzone dane w tabeli „${name}".` };
    }
  }
  return { error: null, data: obj as unknown as BackupData };
}

/** Parsuje tekst JSON i waliduje. Łapie błąd składni JSON. */
export function parseBackup(text: string): { error: string | null; data?: BackupData } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { error: 'Nie udało się odczytać pliku — to nie jest poprawny JSON.' };
  }
  return validateBackup(raw);
}
