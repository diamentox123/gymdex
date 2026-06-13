/**
 * Inicjalizacja bazy SQLite + Drizzle. Tworzy tabele (idempotentnie),
 * seeduje ćwiczenia i domyślne ustawienia przy pierwszym uruchomieniu.
 *
 * Świadomie używamy ręcznego DDL (`CREATE TABLE IF NOT EXISTS`) zamiast
 * generowanych migracji drizzle-kit — w Expo Go to najpewniejsza droga,
 * bez zależności od bundlowania plików .sql.
 */
import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';

import * as schema from './schema';
import { SEED_EXERCISES } from '@/data/exercises';

const DB_NAME = 'panda_strength.db';

/** Surowy DDL — tworzy wszystkie tabele jeśli nie istnieją. */
const DDL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  body_part TEXT NOT NULL,
  equipment TEXT NOT NULL,
  input_type TEXT NOT NULL,
  secondary TEXT,
  is_custom INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS routines (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  notes TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS routine_exercises (
  id TEXT PRIMARY KEY NOT NULL,
  routine_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  rest_seconds INTEGER NOT NULL DEFAULT 120,
  superset_group INTEGER,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS routine_sets (
  id TEXT PRIMARY KEY NOT NULL,
  routine_exercise_id TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  target_reps INTEGER,
  target_weight REAL,
  set_type TEXT NOT NULL DEFAULT 'normal'
);

CREATE TABLE IF NOT EXISTS workouts (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  duration_sec INTEGER,
  notes TEXT,
  routine_id TEXT
);

CREATE TABLE IF NOT EXISTS workout_exercises (
  id TEXT PRIMARY KEY NOT NULL,
  workout_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  rest_seconds INTEGER NOT NULL DEFAULT 120,
  superset_group INTEGER,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS workout_sets (
  id TEXT PRIMARY KEY NOT NULL,
  workout_exercise_id TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  set_type TEXT NOT NULL DEFAULT 'normal',
  weight REAL,
  reps INTEGER,
  rpe REAL,
  rir INTEGER,
  duration_sec INTEGER,
  distance_m REAL,
  is_completed INTEGER NOT NULL DEFAULT 0,
  is_pr INTEGER NOT NULL DEFAULT 0,
  completed_at INTEGER
);

CREATE TABLE IF NOT EXISTS personal_records (
  id TEXT PRIMARY KEY NOT NULL,
  exercise_id TEXT NOT NULL,
  type TEXT NOT NULL,
  value REAL NOT NULL,
  reps INTEGER,
  weight REAL,
  workout_id TEXT,
  achieved_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS body_measurements (
  id TEXT PRIMARY KEY NOT NULL,
  date INTEGER NOT NULL,
  bodyweight REAL,
  body_fat REAL,
  chest REAL,
  waist REAL,
  hips REAL,
  thigh REAL,
  arm REAL,
  calf REAL,
  neck REAL,
  shoulders REAL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  language TEXT NOT NULL DEFAULT 'pl',
  theme TEXT NOT NULL DEFAULT 'system',
  rest_default_sec INTEGER NOT NULL DEFAULT 120,
  rest_auto_start INTEGER NOT NULL DEFAULT 1,
  bar_weight_kg REAL NOT NULL DEFAULT 20,
  haptics_enabled INTEGER NOT NULL DEFAULT 1,
  weekly_goal INTEGER NOT NULL DEFAULT 4
);

CREATE INDEX IF NOT EXISTS idx_we_workout ON workout_exercises(workout_id);
CREATE INDEX IF NOT EXISTS idx_ws_we ON workout_sets(workout_exercise_id);
CREATE INDEX IF NOT EXISTS idx_pr_exercise ON personal_records(exercise_id);
CREATE INDEX IF NOT EXISTS idx_re_routine ON routine_exercises(routine_id);
CREATE INDEX IF NOT EXISTS idx_rs_re ON routine_sets(routine_exercise_id);
`;

let _sqlite: SQLiteDatabase | null = null;
let _db: ExpoSQLiteDatabase<typeof schema> | null = null;

/** Zwraca (i przy pierwszym wywołaniu inicjalizuje) instancję Drizzle. */
export function getDb(): ExpoSQLiteDatabase<typeof schema> {
  if (_db) return _db;
  _sqlite = openDatabaseSync(DB_NAME);
  _sqlite.execSync(DDL);
  runMigrations(_sqlite);
  _db = drizzle(_sqlite, { schema });
  seedIfEmpty(_sqlite);
  return _db;
}

/**
 * Lekkie migracje dla baz utworzonych przed dodaniem kolumny. `CREATE TABLE
 * IF NOT EXISTS` nie dodaje kolumn do istniejących tabel, więc dokładamy je
 * ręcznie. `ADD COLUMN` rzuca błąd, gdy kolumna już jest — łapiemy i ignorujemy.
 */
function runMigrations(sqlite: SQLiteDatabase) {
  const addColumn = (sql: string) => {
    try {
      sqlite.execSync(sql);
    } catch {
      /* kolumna już istnieje — OK */
    }
  };
  addColumn('ALTER TABLE settings ADD COLUMN weekly_goal INTEGER NOT NULL DEFAULT 4');
}

/** Surowy uchwyt SQLite — dla operacji wsadowych (seed, eksport). */
export function getRawDb(): SQLiteDatabase {
  if (!_sqlite) getDb();
  return _sqlite!;
}

/**
 * Seeduje ćwiczenia (jeśli tabela pusta) i wiersz ustawień.
 * Wykonywane raz, idempotentne — bezpieczne przy każdym starcie.
 */
function seedIfEmpty(sqlite: SQLiteDatabase) {
  const row = sqlite.getFirstSync<{ c: number }>('SELECT COUNT(*) AS c FROM exercises');
  const exerciseCount = row?.c ?? 0;

  if (exerciseCount === 0) {
    const stmt = sqlite.prepareSync(
      `INSERT OR IGNORE INTO exercises (id, name, body_part, equipment, input_type, secondary, is_custom)
       VALUES (?, ?, ?, ?, ?, ?, 0)`
    );
    try {
      sqlite.execSync('BEGIN TRANSACTION');
      for (const e of SEED_EXERCISES) {
        stmt.executeSync([
          e.id,
          e.name,
          e.bodyPart,
          e.equipment,
          e.inputType,
          e.secondary ? JSON.stringify(e.secondary) : null,
        ]);
      }
      sqlite.execSync('COMMIT');
    } catch (err) {
      sqlite.execSync('ROLLBACK');
      throw err;
    } finally {
      stmt.finalizeSync();
    }
  }

  // Zawsze upewnij się, że istnieje wiersz ustawień.
  sqlite.runSync(
    `INSERT OR IGNORE INTO settings (id, unit, language, theme, rest_default_sec, rest_auto_start, bar_weight_kg, haptics_enabled, weekly_goal)
     VALUES ('app', 'kg', 'pl', 'system', 120, 1, 20, 1, 4)`
  );
}

/** Liczba ćwiczeń w bazie — używane w teście sanity i statystykach. */
export function exerciseCount(): number {
  const r = getRawDb().getFirstSync<{ c: number }>('SELECT COUNT(*) AS c FROM exercises');
  return r?.c ?? 0;
}
