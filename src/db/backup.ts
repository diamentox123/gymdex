/**
 * Eksport/import danych jako JSON — namiastka backupu (apka jest
 * offline-first, bez chmury). Eksport zrzuca wszystkie tabele; import
 * czyści i wczytuje je z powrotem. Walidacja formatu (czysta logika)
 * mieszka w `@/lib/backup-schema`.
 */
import dayjs from 'dayjs';
import { getRawDb } from './client';
import { BACKUP_TABLES, BACKUP_VERSION, validateBackup, type BackupData } from '@/lib/backup-schema';
import { buildCsv, type CsvSetRow } from '@/lib/csv-export';
import { displayWeight } from '@/lib/calc';
import type { Unit } from '@/lib/types';

export type { BackupData };

/**
 * Eksport całej historii treningów do CSV (kompatybilny ze Strong/Excel).
 * Ciężary w jednostce użytkownika. Jeden wiersz = jedna seria.
 */
export function exportWorkoutsCsv(unit: Unit): string {
  const db = getRawDb();
  const rows = db.getAllSync<{
    started_at: number;
    workout_name: string;
    exercise_name: string;
    order_index: number;
    weight: number | null;
    reps: number | null;
    rpe: number | null;
    distance_m: number | null;
    duration_sec: number | null;
    notes: string | null;
  }>(
    `SELECT w.started_at, w.name AS workout_name, e.name AS exercise_name,
            ws.order_index, ws.weight, ws.reps, ws.rpe, ws.distance_m,
            ws.duration_sec, ws.notes
     FROM workout_sets ws
     JOIN workout_exercises we ON ws.workout_exercise_id = we.id
     JOIN workouts w ON we.workout_id = w.id
     JOIN exercises e ON we.exercise_id = e.id
     WHERE w.finished_at IS NOT NULL AND ws.is_completed = 1
     ORDER BY w.started_at ASC, we.order_index ASC, ws.order_index ASC`
  );

  const csvRows: CsvSetRow[] = rows.map((r) => ({
    date: dayjs(r.started_at).format('YYYY-MM-DD HH:mm:ss'),
    workoutName: r.workout_name,
    exerciseName: r.exercise_name,
    setOrder: r.order_index + 1,
    weight: r.weight != null ? Math.round(displayWeight(r.weight, unit) * 100) / 100 : null,
    reps: r.reps,
    rpe: r.rpe,
    distance: r.distance_m,
    seconds: r.duration_sec,
    notes: r.notes ?? '',
  }));

  return buildCsv(csvRows);
}

/** Zrzuca całą bazę do obiektu JSON. */
export function exportData(): BackupData {
  const db = getRawDb();
  const tables: Record<string, unknown[]> = {};
  for (const t of BACKUP_TABLES) {
    tables[t] = db.getAllSync(`SELECT * FROM ${t}`);
  }
  return { version: BACKUP_VERSION, exportedAt: Date.now(), tables };
}

/** Liczba treningów + ćwiczeń — do podsumowania w UI. */
export function dataSummary(): { workouts: number; exercises: number; routines: number } {
  const db = getRawDb();
  const n = (t: string) => (db.getFirstSync<{ c: number }>(`SELECT COUNT(*) AS c FROM ${t}`)?.c ?? 0);
  return { workouts: n('workouts'), exercises: n('exercises'), routines: n('routines') };
}

/**
 * Wczytuje kopię zapasową, NADPISUJĄC całą bieżącą bazę. Operacja jest
 * transakcyjna: jeśli cokolwiek pójdzie nie tak, baza pozostaje nietknięta.
 * Klucze obce wyłączamy na czas importu (czyścimy i wstawiamy hurtowo),
 * po czym włączamy z powrotem.
 *
 * @returns liczba wstawionych wierszy w rozbiciu na tabele.
 * @throws Error z komunikatem po polsku, gdy dane są niepoprawne.
 */
export function importData(raw: unknown): { inserted: Record<string, number> } {
  const { error, data } = validateBackup(raw);
  if (error || !data) throw new Error(error ?? 'Nieznany błąd kopii zapasowej.');

  const db = getRawDb();
  const inserted: Record<string, number> = {};

  db.execSync('PRAGMA foreign_keys = OFF');
  try {
    db.execSync('BEGIN TRANSACTION');

    // Czyścimy w odwrotnej kolejności zależności (dzieci przed rodzicami).
    for (let i = BACKUP_TABLES.length - 1; i >= 0; i--) {
      db.execSync(`DELETE FROM ${BACKUP_TABLES[i]}`);
    }

    // Wstawiamy w kolejności zależności (rodzice przed dziećmi).
    for (const table of BACKUP_TABLES) {
      const rows = (data.tables[table] as Record<string, unknown>[] | undefined) ?? [];
      inserted[table] = 0;
      for (const row of rows) {
        if (row == null || typeof row !== 'object') continue;
        const cols = Object.keys(row);
        if (cols.length === 0) continue;
        const placeholders = cols.map(() => '?').join(', ');
        const colList = cols.map((col) => `"${col}"`).join(', ');
        db.runSync(
          `INSERT OR REPLACE INTO ${table} (${colList}) VALUES (${placeholders})`,
          cols.map((col) => (row as Record<string, unknown>)[col] as never)
        );
        inserted[table]++;
      }
    }

    db.execSync('COMMIT');
  } catch (err) {
    try {
      db.execSync('ROLLBACK');
    } catch {
      /* ignorujemy — i tak rzucamy oryginalny błąd */
    }
    throw err;
  } finally {
    db.execSync('PRAGMA foreign_keys = ON');
  }

  return { inserted };
}
