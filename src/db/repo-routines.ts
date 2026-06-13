/** Zapytania o rutyny (szablony treningów) wraz z ćwiczeniami i seriami. */
import { eq, asc, inArray } from 'drizzle-orm';
import { getDb } from './client';
import {
  routines,
  routineExercises,
  routineSets,
  type RoutineRow,
  type RoutineExerciseRow,
  type RoutineSetRow,
} from './schema';
import { newId } from '@/lib/id';
import type { SetType } from '@/lib/types';

export interface RoutineExerciseFull extends RoutineExerciseRow {
  sets: RoutineSetRow[];
}
export interface RoutineFull extends RoutineRow {
  exercises: RoutineExerciseFull[];
}

export function getAllRoutines(): RoutineRow[] {
  return getDb().select().from(routines).orderBy(asc(routines.orderIndex), asc(routines.createdAt)).all();
}

/** Liczba ćwiczeń w rutynie (do podglądu na liście). */
export function routineExerciseCount(routineId: string): number {
  return getDb().select().from(routineExercises).where(eq(routineExercises.routineId, routineId)).all().length;
}

export function getRoutineFull(routineId: string): RoutineFull | null {
  const db = getDb();
  const routine = db.select().from(routines).where(eq(routines.id, routineId)).get();
  if (!routine) return null;

  const exRows = db
    .select()
    .from(routineExercises)
    .where(eq(routineExercises.routineId, routineId))
    .orderBy(asc(routineExercises.orderIndex))
    .all();

  const exIds = exRows.map((e) => e.id);
  const setRows = exIds.length
    ? db
        .select()
        .from(routineSets)
        .where(inArray(routineSets.routineExerciseId, exIds))
        .orderBy(asc(routineSets.orderIndex))
        .all()
    : [];

  const setsByEx = new Map<string, RoutineSetRow[]>();
  for (const s of setRows) {
    const arr = setsByEx.get(s.routineExerciseId) ?? [];
    arr.push(s);
    setsByEx.set(s.routineExerciseId, arr);
  }

  return {
    ...routine,
    exercises: exRows.map((e) => ({ ...e, sets: setsByEx.get(e.id) ?? [] })),
  };
}

export interface SaveRoutineInput {
  id?: string;
  name: string;
  notes?: string;
  exercises: {
    exerciseId: string;
    restSeconds: number;
    supersetGroup: number | null;
    sets: { targetReps: number | null; targetWeight: number | null; setType: SetType }[];
  }[];
}

/** Tworzy lub nadpisuje rutynę (transakcyjnie, zastępując ćwiczenia/serie). */
export function saveRoutine(input: SaveRoutineInput): string {
  const db = getDb();
  const id = input.id ?? newId('rt');

  db.transaction((tx) => {
    if (input.id) {
      // Usuń stare ćwiczenia + serie tej rutyny.
      const oldEx = tx.select().from(routineExercises).where(eq(routineExercises.routineId, id)).all();
      const oldIds = oldEx.map((e) => e.id);
      if (oldIds.length) tx.delete(routineSets).where(inArray(routineSets.routineExerciseId, oldIds)).run();
      tx.delete(routineExercises).where(eq(routineExercises.routineId, id)).run();
      tx.update(routines).set({ name: input.name.trim(), notes: input.notes ?? null }).where(eq(routines.id, id)).run();
    } else {
      tx.insert(routines).values({
        id,
        name: input.name.trim(),
        notes: input.notes ?? null,
        orderIndex: getAllRoutines().length,
        createdAt: Date.now(),
      }).run();
    }

    input.exercises.forEach((ex, exIdx) => {
      const reId = newId('re');
      tx.insert(routineExercises).values({
        id: reId,
        routineId: id,
        exerciseId: ex.exerciseId,
        orderIndex: exIdx,
        restSeconds: ex.restSeconds,
        supersetGroup: ex.supersetGroup,
      }).run();
      ex.sets.forEach((s, sIdx) => {
        tx.insert(routineSets).values({
          id: newId('rsp'),
          routineExerciseId: reId,
          orderIndex: sIdx,
          targetReps: s.targetReps,
          targetWeight: s.targetWeight,
          setType: s.setType,
        }).run();
      });
    });
  });

  return id;
}

export function deleteRoutine(routineId: string): void {
  const db = getDb();
  db.transaction((tx) => {
    const exRows = tx.select().from(routineExercises).where(eq(routineExercises.routineId, routineId)).all();
    const exIds = exRows.map((e) => e.id);
    if (exIds.length) tx.delete(routineSets).where(inArray(routineSets.routineExerciseId, exIds)).run();
    tx.delete(routineExercises).where(eq(routineExercises.routineId, routineId)).run();
    tx.delete(routines).where(eq(routines.id, routineId)).run();
  });
}
