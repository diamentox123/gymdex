/** Zapytania zbiorcze do ekranu Statystyki + pomiary ciała. */
import { eq, desc, asc, and, isNotNull } from 'drizzle-orm';
import { getDb, getRawDb } from './client';
import {
  workouts,
  workoutExercises,
  workoutSets,
  bodyMeasurements,
  personalRecords,
  type BodyMeasurementRow,
} from './schema';
import { newId } from '@/lib/id';
import { setVolume, estimate1RM } from '@/lib/calc';
import { getExercise, getAllExercises } from './repo-exercises';
import type { BodyPart, SetType } from '@/lib/types';

export interface OverallStats {
  totalWorkouts: number;
  totalVolume: number; // kg
  totalSets: number;
  totalReps: number;
  totalDurationSec: number;
  avgDurationSec: number;
}

/** Zbiorcze statystyki całego konta — do nagłówka „Wrapped". */
export function getOverallStats(): OverallStats {
  const db = getDb();
  const done = db.select().from(workouts).where(isNotNull(workouts.finishedAt)).all();

  const allSets = db
    .select({ weight: workoutSets.weight, reps: workoutSets.reps, setType: workoutSets.setType })
    .from(workoutSets)
    .where(eq(workoutSets.isCompleted, true))
    .all();

  let totalVolume = 0;
  let totalReps = 0;
  for (const s of allSets) {
    if (s.setType === 'warmup') continue;
    totalVolume += setVolume(s.weight ?? 0, s.reps ?? 0, s.setType as SetType);
    totalReps += s.reps ?? 0;
  }

  const totalDurationSec = done.reduce((sum, w) => sum + (w.durationSec ?? 0), 0);

  return {
    totalWorkouts: done.length,
    totalVolume,
    totalSets: allSets.filter((s) => s.setType !== 'warmup').length,
    totalReps,
    totalDurationSec,
    avgDurationSec: done.length ? Math.round(totalDurationSec / done.length) : 0,
  };
}

export interface VolumePoint {
  date: number;
  volume: number;
}

/** Wolumen per trening (do wykresu „wolumen w czasie"). */
export function getVolumeOverTime(limit = 30): VolumePoint[] {
  const db = getDb();
  const rows = db
    .select({
      startedAt: workouts.startedAt,
      workoutId: workouts.id,
      weight: workoutSets.weight,
      reps: workoutSets.reps,
      setType: workoutSets.setType,
    })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(and(eq(workoutSets.isCompleted, true), isNotNull(workouts.finishedAt)))
    .orderBy(asc(workouts.startedAt))
    .all();

  const byWorkout = new Map<string, VolumePoint>();
  for (const r of rows) {
    const vol = setVolume(r.weight ?? 0, r.reps ?? 0, r.setType as SetType);
    const ex = byWorkout.get(r.workoutId);
    if (ex) ex.volume += vol;
    else byWorkout.set(r.workoutId, { date: r.startedAt, volume: vol });
  }
  const points = [...byWorkout.values()].sort((a, b) => a.date - b.date);
  return points.slice(-limit);
}

/** Wolumen z podziałem na partie mięśniowe (do wykresu słupkowego). */
export function getVolumeByBodyPart(): { bodyPart: BodyPart; volume: number }[] {
  const db = getDb();
  const rows = db
    .select({
      exerciseId: workoutExercises.exerciseId,
      weight: workoutSets.weight,
      reps: workoutSets.reps,
      setType: workoutSets.setType,
    })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .where(eq(workoutSets.isCompleted, true))
    .all();

  // Mapa ćwiczeń raz (zamiast getExercise per wiersz — unika N+1 zapytań).
  const exMap = new Map(getAllExercises().map((e) => [e.id, e]));
  const byPart = new Map<BodyPart, number>();
  for (const r of rows) {
    if (r.setType === 'warmup') continue;
    const ex = exMap.get(r.exerciseId);
    if (!ex) continue;
    const vol = setVolume(r.weight ?? 0, r.reps ?? 0, r.setType as SetType);
    byPart.set(ex.bodyPart, (byPart.get(ex.bodyPart) ?? 0) + vol);
  }

  return [...byPart.entries()]
    .map(([bodyPart, volume]) => ({ bodyPart, volume }))
    .sort((a, b) => b.volume - a.volume);
}

/** Najlepszy szacowany 1RM dla ćwiczenia w całej historii (Strength Score). */
export function getBest1RM(exerciseId: string): number {
  const db = getDb();
  const rows = db
    .select({ weight: workoutSets.weight, reps: workoutSets.reps, setType: workoutSets.setType })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .where(and(eq(workoutExercises.exerciseId, exerciseId), eq(workoutSets.isCompleted, true)))
    .all();

  let best = 0;
  for (const r of rows) {
    if (r.setType === 'warmup') continue;
    const w = r.weight ?? 0;
    const reps = r.reps ?? 0;
    if (w > 0 && reps > 0) best = Math.max(best, estimate1RM(w, reps));
  }
  return best;
}

// ===================== OSIĄGNIĘCIA / STREAKI =====================

export interface WorkoutBrief {
  startedAt: number;
  volume: number;
  sets: number;
  durationSec: number;
}

/**
 * Lekka lista ukończonych treningów (data + wolumen + serie) do analizy
 * streaków, częstotliwości i osiągnięć. Jedno zapytanie, agregacja w pamięci.
 */
export function getWorkoutBriefs(): WorkoutBrief[] {
  const db = getDb();
  const done = db
    .select({ id: workouts.id, startedAt: workouts.startedAt, durationSec: workouts.durationSec })
    .from(workouts)
    .where(isNotNull(workouts.finishedAt))
    .all();

  const setRows = db
    .select({
      workoutId: workoutExercises.workoutId,
      weight: workoutSets.weight,
      reps: workoutSets.reps,
      setType: workoutSets.setType,
    })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .where(eq(workoutSets.isCompleted, true))
    .all();

  const agg = new Map<string, { volume: number; sets: number }>();
  for (const r of setRows) {
    if (r.setType === 'warmup') continue;
    const a = agg.get(r.workoutId) ?? { volume: 0, sets: 0 };
    a.volume += setVolume(r.weight ?? 0, r.reps ?? 0, r.setType as SetType);
    a.sets += 1;
    agg.set(r.workoutId, a);
  }

  return done.map((d) => ({
    startedAt: d.startedAt,
    durationSec: d.durationSec ?? 0,
    volume: agg.get(d.id)?.volume ?? 0,
    sets: agg.get(d.id)?.sets ?? 0,
  }));
}

/** Łączna liczba pobitych rekordów życiowych (wszystkie typy). */
export function getTotalPRCount(): number {
  return getRawDb().getFirstSync<{ c: number }>('SELECT COUNT(*) AS c FROM personal_records')?.c ?? 0;
}

/** Czy istnieje trening rozpoczęty przed 7:00 / po 21:00 (osiągnięcia klimatyczne). */
export function getTimeOfDayFlags(): { earlyBird: boolean; nightOwl: boolean } {
  const db = getDb();
  const rows = db.select({ startedAt: workouts.startedAt }).from(workouts).where(isNotNull(workouts.finishedAt)).all();
  let earlyBird = false;
  let nightOwl = false;
  for (const r of rows) {
    const h = new Date(r.startedAt).getHours();
    if (h < 7) earlyBird = true;
    if (h >= 21) nightOwl = true;
  }
  return { earlyBird, nightOwl };
}

// ===================== POMIARY CIAŁA =====================

export function getBodyMeasurements(): BodyMeasurementRow[] {
  return getDb().select().from(bodyMeasurements).orderBy(desc(bodyMeasurements.date)).all();
}

export function getLatestBodyweight(): number | null {
  const r = getDb()
    .select()
    .from(bodyMeasurements)
    .where(isNotNull(bodyMeasurements.bodyweight))
    .orderBy(desc(bodyMeasurements.date))
    .limit(1)
    .get();
  return r?.bodyweight ?? null;
}

export function addBodyMeasurement(input: Partial<Omit<BodyMeasurementRow, 'id' | 'date'>> & { date?: number }): string {
  const id = newId('bm');
  getDb().insert(bodyMeasurements).values({
    id,
    date: input.date ?? Date.now(),
    bodyweight: input.bodyweight ?? null,
    bodyFat: input.bodyFat ?? null,
    chest: input.chest ?? null,
    waist: input.waist ?? null,
    hips: input.hips ?? null,
    thigh: input.thigh ?? null,
    arm: input.arm ?? null,
    calf: input.calf ?? null,
    neck: input.neck ?? null,
    shoulders: input.shoulders ?? null,
    notes: input.notes ?? null,
  }).run();
  return id;
}

export function deleteBodyMeasurement(id: string): void {
  getDb().delete(bodyMeasurements).where(eq(bodyMeasurements.id, id)).run();
}
