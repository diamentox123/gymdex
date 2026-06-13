/**
 * Pomocnicy konwertujący stan aktywnej sesji (LiveExercise) na dane do
 * zapisu w DB oraz liczący agregaty na żywo (wolumen, serie).
 */
import type { LiveExercise } from '@/store/workout';
import type { WorkoutInput, ExerciseInput, SetInput } from '@/db/repo-workouts';
import { setVolume, toKg } from '@/lib/calc';
import type { SetType, Unit } from '@/lib/types';

function num(s: string): number | null {
  if (s === '' || s == null) return null;
  const v = parseFloat(s.replace(',', '.'));
  return Number.isNaN(v) ? null : v;
}

function int(s: string): number | null {
  const v = num(s);
  return v == null ? null : Math.round(v);
}

/** Ciężar wpisany w jednostce użytkownika → kg do zapisu/obliczeń. */
function weightKg(s: string, unit: Unit): number | null {
  const v = num(s);
  return v == null ? null : toKg(v, unit);
}

/** Agregaty wyświetlane na żywo w nagłówku treningu (wolumen w kg). */
export function liveTotals(
  exercises: LiveExercise[],
  unit: Unit
): {
  volume: number;
  completedSets: number;
  totalSets: number;
} {
  let volume = 0;
  let completedSets = 0;
  let totalSets = 0;
  for (const ex of exercises) {
    for (const s of ex.sets) {
      totalSets++;
      if (s.done) {
        completedSets++;
        volume += setVolume(weightKg(s.weight, unit) ?? 0, int(s.reps) ?? 0, s.type);
      }
    }
  }
  return { volume, completedSets, totalSets };
}

/** Buduje wejście do zapisu treningu z aktywnej sesji (ciężar → kg). */
export function buildWorkoutInput(
  name: string,
  startedAt: number,
  finishedAt: number,
  routineId: string | null,
  exercises: LiveExercise[],
  unit: Unit,
  notes: string | null = null
): WorkoutInput {
  const exInputs: ExerciseInput[] = exercises.map((ex) => {
    const sets: SetInput[] = ex.sets.map((s) => ({
      setType: s.type as SetType,
      weight: weightKg(s.weight, unit),
      reps: int(s.reps),
      rpe: num(s.rpe),
      rir: int(s.rir),
      durationSec: int(s.durationSec),
      distanceM: num(s.distanceM),
      isCompleted: s.done,
    }));
    return {
      exerciseId: ex.exerciseId,
      restSeconds: ex.restSeconds,
      supersetGroup: ex.supersetGroup,
      notes: ex.notes || null,
      sets,
    };
  });

  return {
    name,
    startedAt,
    finishedAt,
    notes: notes && notes.trim() ? notes.trim() : null,
    routineId,
    exercises: exInputs,
  };
}

/** Czy w sesji jest cokolwiek do zapisania (min. jedna ukończona seria). */
export function hasCompletedSets(exercises: LiveExercise[]): boolean {
  return exercises.some((ex) => ex.sets.some((s) => s.done));
}
