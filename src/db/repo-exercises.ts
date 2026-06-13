/** Zapytania o ćwiczenia i ustawienia. */
import { eq, asc } from 'drizzle-orm';
import { getDb } from './client';
import { exercises, settings, type ExerciseRow, type SettingsRow } from './schema';
import { newId } from '@/lib/id';
import type { BodyPart, Equipment, ExerciseDef, InputType } from '@/lib/types';

/** Mapuje wiersz DB na domenową definicję ćwiczenia. */
export function rowToExercise(r: ExerciseRow): ExerciseDef {
  return {
    id: r.id,
    name: r.name,
    bodyPart: r.bodyPart as BodyPart,
    equipment: r.equipment as Equipment,
    inputType: r.inputType as InputType,
    secondary: r.secondary ? (JSON.parse(r.secondary) as BodyPart[]) : undefined,
    isCustom: r.isCustom,
    notes: r.notes ?? undefined,
  };
}

export function getAllExercises(): ExerciseDef[] {
  const rows = getDb().select().from(exercises).orderBy(asc(exercises.name)).all();
  return rows.map(rowToExercise);
}

export function getExercise(id: string): ExerciseDef | null {
  const r = getDb().select().from(exercises).where(eq(exercises.id, id)).get();
  return r ? rowToExercise(r) : null;
}

export function addCustomExercise(input: {
  name: string;
  bodyPart: BodyPart;
  equipment: Equipment;
  inputType: InputType;
  notes?: string;
}): ExerciseDef {
  const id = newId('ex');
  getDb()
    .insert(exercises)
    .values({
      id,
      name: input.name.trim(),
      bodyPart: input.bodyPart,
      equipment: input.equipment,
      inputType: input.inputType,
      secondary: null,
      isCustom: true,
      notes: input.notes ?? null,
    })
    .run();
  return getExercise(id)!;
}

export function deleteExercise(id: string): void {
  getDb().delete(exercises).where(eq(exercises.id, id)).run();
}

// ===================== USTAWIENIA =====================

export function getSettings(): SettingsRow {
  const r = getDb().select().from(settings).where(eq(settings.id, 'app')).get();
  // client.ts gwarantuje istnienie wiersza 'app', ale na wszelki wypadek:
  if (!r) {
    getDb()
      .insert(settings)
      .values({ id: 'app' })
      .onConflictDoNothing()
      .run();
    return getDb().select().from(settings).where(eq(settings.id, 'app')).get()!;
  }
  return r;
}

export function updateSettings(patch: Partial<Omit<SettingsRow, 'id'>>): SettingsRow {
  getDb().update(settings).set(patch).where(eq(settings.id, 'app')).run();
  return getSettings();
}
