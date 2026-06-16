/**
 * Schema bazy danych (SQLite via Drizzle ORM).
 *
 * Model offline-first. Źródłem prawdy są surowe serie (workout_sets) —
 * wolumen, 1RM i rekordy WYLICZAMY z nich, nie traktujemy zapisanych
 * wartości pochodnych jako prawdy (poza cache PR dla szybkości).
 */
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

/** Ćwiczenia — wbudowane (z seed) i własne użytkownika. */
export const exercises = sqliteTable('exercises', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  bodyPart: text('body_part').notNull(),
  equipment: text('equipment').notNull(),
  inputType: text('input_type').notNull(),
  secondary: text('secondary'), // JSON: BodyPart[]
  isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false),
  notes: text('notes'),
});

/** Rutyny / szablony treningów. */
export const routines = sqliteTable('routines', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  notes: text('notes'),
  orderIndex: integer('order_index').notNull().default(0),
  createdAt: integer('created_at').notNull(),
});

/** Ćwiczenia w rutynie (uporządkowane, z grupami superserii). */
export const routineExercises = sqliteTable('routine_exercises', {
  id: text('id').primaryKey(),
  routineId: text('routine_id').notNull(),
  exerciseId: text('exercise_id').notNull(),
  orderIndex: integer('order_index').notNull().default(0),
  restSeconds: integer('rest_seconds').notNull().default(120),
  supersetGroup: integer('superset_group'), // null = brak superserii
  notes: text('notes'),
});

/** Planowane serie w rutynie (cele: ciężar/powtórzenia). */
export const routineSets = sqliteTable('routine_sets', {
  id: text('id').primaryKey(),
  routineExerciseId: text('routine_exercise_id').notNull(),
  orderIndex: integer('order_index').notNull().default(0),
  targetReps: integer('target_reps'),
  targetWeight: real('target_weight'), // kg
  setType: text('set_type').notNull().default('normal'),
});

/** Zapisany / aktywny trening. */
export const workouts = sqliteTable('workouts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  startedAt: integer('started_at').notNull(),
  finishedAt: integer('finished_at'), // null = trening w toku
  durationSec: integer('duration_sec'),
  notes: text('notes'),
  routineId: text('routine_id'), // z jakiej rutyny powstał (opcjonalnie)
});

/** Ćwiczenia wykonane w treningu. */
export const workoutExercises = sqliteTable('workout_exercises', {
  id: text('id').primaryKey(),
  workoutId: text('workout_id').notNull(),
  exerciseId: text('exercise_id').notNull(),
  orderIndex: integer('order_index').notNull().default(0),
  restSeconds: integer('rest_seconds').notNull().default(120),
  supersetGroup: integer('superset_group'),
  notes: text('notes'),
});

/** Pojedyncza wykonana seria — atom danych aplikacji. */
export const workoutSets = sqliteTable('workout_sets', {
  id: text('id').primaryKey(),
  workoutExerciseId: text('workout_exercise_id').notNull(),
  orderIndex: integer('order_index').notNull().default(0),
  setType: text('set_type').notNull().default('normal'),
  weight: real('weight'), // kg, null dla bodyweight/cardio
  reps: integer('reps'),
  rpe: real('rpe'), // 1–10, opcjonalnie
  rir: integer('rir'), // powtórzenia w zapasie, opcjonalnie
  durationSec: integer('duration_sec'), // dla plank/cardio
  distanceM: real('distance_m'), // dla cardio
  isCompleted: integer('is_completed', { mode: 'boolean' }).notNull().default(false),
  isPR: integer('is_pr', { mode: 'boolean' }).notNull().default(false),
  completedAt: integer('completed_at'),
});

/** Rekordy życiowe (cache — przeliczane z serii). */
export const personalRecords = sqliteTable('personal_records', {
  id: text('id').primaryKey(),
  exerciseId: text('exercise_id').notNull(),
  type: text('type').notNull(), // 1rm | maxWeight | maxVolume | bestSet
  value: real('value').notNull(),
  reps: integer('reps'),
  weight: real('weight'),
  workoutId: text('workout_id'),
  achievedAt: integer('achieved_at').notNull(),
});

/** Pomiary ciała (masa + obwody). */
export const bodyMeasurements = sqliteTable('body_measurements', {
  id: text('id').primaryKey(),
  date: integer('date').notNull(),
  bodyweight: real('bodyweight'), // kg
  bodyFat: real('body_fat'), // %
  chest: real('chest'),
  waist: real('waist'),
  hips: real('hips'),
  thigh: real('thigh'),
  arm: real('arm'),
  calf: real('calf'),
  neck: real('neck'),
  shoulders: real('shoulders'),
  notes: text('notes'),
});

/** Ustawienia aplikacji (jeden wiersz, id = 'app'). */
export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(), // 'app'
  unit: text('unit').notNull().default('kg'),
  language: text('language').notNull().default('pl'),
  theme: text('theme').notNull().default('system'),
  restDefaultSec: integer('rest_default_sec').notNull().default(120),
  restAutoStart: integer('rest_auto_start', { mode: 'boolean' }).notNull().default(true),
  restSound: integer('rest_sound', { mode: 'boolean' }).notNull().default(true),
  barWeightKg: real('bar_weight_kg').notNull().default(20),
  hapticsEnabled: integer('haptics_enabled', { mode: 'boolean' }).notNull().default(true),
  weeklyGoal: integer('weekly_goal').notNull().default(4),
});

// Typy wnioskowane — używane w warstwie zapytań i UI.
export type ExerciseRow = typeof exercises.$inferSelect;
export type RoutineRow = typeof routines.$inferSelect;
export type RoutineExerciseRow = typeof routineExercises.$inferSelect;
export type RoutineSetRow = typeof routineSets.$inferSelect;
export type WorkoutRow = typeof workouts.$inferSelect;
export type WorkoutExerciseRow = typeof workoutExercises.$inferSelect;
export type WorkoutSetRow = typeof workoutSets.$inferSelect;
export type PersonalRecordRow = typeof personalRecords.$inferSelect;
export type BodyMeasurementRow = typeof bodyMeasurements.$inferSelect;
export type SettingsRow = typeof settings.$inferSelect;
