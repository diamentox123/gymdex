/** Zapytania zbiorcze do ekranu Statystyki + pomiary ciała. */
import { eq, desc, asc, and, isNotNull } from 'drizzle-orm';
import { getDb } from './client';
import {
  workouts,
  workoutExercises,
  workoutSets,
  bodyMeasurements,
  type BodyMeasurementRow,
} from './schema';
import { newId } from '@/lib/id';
import { setVolume, estimate1RM } from '@/lib/calc';
import { getExercise } from './repo-exercises';
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

  const byPart = new Map<BodyPart, number>();
  for (const r of rows) {
    if (r.setType === 'warmup') continue;
    const ex = getExercise(r.exerciseId);
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
