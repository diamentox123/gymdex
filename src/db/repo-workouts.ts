/** Zapytania o treningi: zapis, historia, prefill, rekordy, wykresy. */
import { eq, desc, asc, inArray, and, isNotNull } from 'drizzle-orm';
import { getDb } from './client';
import {
  workouts,
  workoutExercises,
  workoutSets,
  personalRecords,
  type WorkoutRow,
  type WorkoutExerciseRow,
  type WorkoutSetRow,
} from './schema';
import { newId } from '@/lib/id';
import { estimate1RM, setVolume } from '@/lib/calc';
import { getExercise, getAllExercises } from './repo-exercises';
import { nextProgression, isCompoundLift } from '@/lib/progression';
import type { SetType, Unit } from '@/lib/types';

// ---- Typy złożone ----
export interface WorkoutExerciseFull extends WorkoutExerciseRow {
  sets: WorkoutSetRow[];
}
export interface WorkoutFull extends WorkoutRow {
  exercises: WorkoutExerciseFull[];
}

/** Dane do zapisu jednej serii (z aktywnego treningu). */
export interface SetInput {
  setType: SetType;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  rir: number | null;
  durationSec: number | null;
  distanceM: number | null;
  isCompleted: boolean;
}

/** Dane do zapisu jednego ćwiczenia treningu. */
export interface ExerciseInput {
  exerciseId: string;
  restSeconds: number;
  supersetGroup: number | null;
  notes: string | null;
  sets: SetInput[];
}

/** Pełny trening do zapisu. */
export interface WorkoutInput {
  name: string;
  startedAt: number;
  finishedAt: number;
  notes: string | null;
  routineId: string | null;
  exercises: ExerciseInput[];
}

// ===================== ZAPIS =====================

/**
 * Zapisuje ukończony trening i wykrywa rekordy życiowe.
 * Zwraca id treningu oraz listę nowych PR (do podsumowania).
 */
export function saveCompletedWorkout(input: WorkoutInput): { workoutId: string; newPRs: NewPR[] } {
  const db = getDb();
  const workoutId = newId('w');
  const durationSec = Math.max(0, Math.round((input.finishedAt - input.startedAt) / 1000));
  const newPRs: NewPR[] = [];

  db.transaction((tx) => {
    tx.insert(workouts).values({
      id: workoutId,
      name: input.name.trim() || 'Trening',
      startedAt: input.startedAt,
      finishedAt: input.finishedAt,
      durationSec,
      notes: input.notes,
      routineId: input.routineId,
    }).run();

    input.exercises.forEach((ex, exIdx) => {
      // Pomijamy ćwiczenia bez żadnej ukończonej serii.
      const completed = ex.sets.filter((s) => s.isCompleted);
      if (completed.length === 0) return;

      const weId = newId('we');
      tx.insert(workoutExercises).values({
        id: weId,
        workoutId,
        exerciseId: ex.exerciseId,
        orderIndex: exIdx,
        restSeconds: ex.restSeconds,
        supersetGroup: ex.supersetGroup,
        notes: ex.notes,
      }).run();

      ex.sets.forEach((s, sIdx) => {
        tx.insert(workoutSets).values({
          id: newId('s'),
          workoutExerciseId: weId,
          orderIndex: sIdx,
          setType: s.setType,
          weight: s.weight,
          reps: s.reps,
          rpe: s.rpe,
          rir: s.rir,
          durationSec: s.durationSec,
          distanceM: s.distanceM,
          isCompleted: s.isCompleted,
          isPR: false,
          completedAt: s.isCompleted ? input.finishedAt : null,
        }).run();
      });
    });
  });

  // Detekcja PR po zapisie (poza transakcją zapisu — odczytuje pełną historię).
  // Deduplikujemy exerciseId: gdyby to samo ćwiczenie było w treningu dwa razy,
  // skanowalibyśmy je wielokrotnie i mogli zapisać/ogłosić PR podwójnie.
  const uniqueExerciseIds = [...new Set(input.exercises.map((e) => e.exerciseId))];
  for (const exerciseId of uniqueExerciseIds) {
    const prs = detectAndStorePRs(exerciseId, workoutId, input.finishedAt);
    newPRs.push(...prs);
  }

  return { workoutId, newPRs };
}

// ===================== HISTORIA =====================

export function getWorkoutHistory(limit = 100): WorkoutRow[] {
  return getDb()
    .select()
    .from(workouts)
    .where(isNotNull(workouts.finishedAt))
    .orderBy(desc(workouts.startedAt))
    .limit(limit)
    .all();
}

export function getWorkoutFull(workoutId: string): WorkoutFull | null {
  const db = getDb();
  const w = db.select().from(workouts).where(eq(workouts.id, workoutId)).get();
  if (!w) return null;

  const exRows = db
    .select()
    .from(workoutExercises)
    .where(eq(workoutExercises.workoutId, workoutId))
    .orderBy(asc(workoutExercises.orderIndex))
    .all();

  const exIds = exRows.map((e) => e.id);
  const setRows = exIds.length
    ? db.select().from(workoutSets).where(inArray(workoutSets.workoutExerciseId, exIds)).orderBy(asc(workoutSets.orderIndex)).all()
    : [];

  const byEx = new Map<string, WorkoutSetRow[]>();
  for (const s of setRows) {
    const arr = byEx.get(s.workoutExerciseId) ?? [];
    arr.push(s);
    byEx.set(s.workoutExerciseId, arr);
  }

  return { ...w, exercises: exRows.map((e) => ({ ...e, sets: byEx.get(e.id) ?? [] })) };
}

export function deleteWorkout(workoutId: string): void {
  const db = getDb();
  db.transaction((tx) => {
    const exRows = tx.select().from(workoutExercises).where(eq(workoutExercises.workoutId, workoutId)).all();
    const exIds = exRows.map((e) => e.id);
    if (exIds.length) tx.delete(workoutSets).where(inArray(workoutSets.workoutExerciseId, exIds)).run();
    tx.delete(workoutExercises).where(eq(workoutExercises.workoutId, workoutId)).run();
    tx.delete(personalRecords).where(eq(personalRecords.workoutId, workoutId)).run();
    tx.delete(workouts).where(eq(workouts.id, workoutId)).run();
  });
}

/** Liczba ukończonych treningów. */
export function workoutCount(): number {
  return getDb().select().from(workouts).where(isNotNull(workouts.finishedAt)).all().length;
}

// ===================== PREFILL (ostatnia sesja ćwiczenia) =====================

export interface PreviousSet {
  weight: number | null;
  reps: number | null;
  setType: SetType;
}

/**
 * Zwraca serie z OSTATNIEGO treningu, w którym wykonano dane ćwiczenie.
 * To podstawa kolumny „Poprzednio" znanej ze Strong — najważniejszy
 * pomocnik progresji.
 */
export function getLastPerformance(exerciseId: string): PreviousSet[] {
  const db = getDb();
  const lastWe = db
    .select({ id: workoutExercises.id, startedAt: workouts.startedAt })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(and(eq(workoutExercises.exerciseId, exerciseId), isNotNull(workouts.finishedAt)))
    .orderBy(desc(workouts.startedAt))
    .limit(1)
    .get();

  if (!lastWe) return [];

  const sets = db
    .select()
    .from(workoutSets)
    .where(and(eq(workoutSets.workoutExerciseId, lastWe.id), eq(workoutSets.isCompleted, true)))
    .orderBy(asc(workoutSets.orderIndex))
    .all();

  return sets.map((s) => ({ weight: s.weight, reps: s.reps, setType: s.setType as SetType }));
}

/**
 * Wolumen roboczy (kg) tego ćwiczenia z OSTATNIEGO ukończonego treningu —
 * do porównania „% względem poprzedniego treningu" na żywo. Zwraca null gdy
 * brak historii (ćwiczenie robione pierwszy raz).
 */
export function getLastExerciseVolume(exerciseId: string): number | null {
  const last = getLastPerformance(exerciseId);
  if (last.length === 0) return null;
  let vol = 0;
  for (const s of last) {
    if (s.setType === 'warmup') continue;
    vol += setVolume(s.weight ?? 0, s.reps ?? 0, s.setType);
  }
  return vol;
}

/**
 * Podpowiedź progresji dla ćwiczenia na NADCHODZĄCY trening — na bazie
 * ostatniej sesji. Zakres powtórzeń wywnioskowany z historii (jeśli stały)
 * lub domyślny: 5–8 dla dużych bojów, 8–12 dla reszty.
 */
export function getProgressionSuggestion(exerciseId: string, unit: Unit) {
  const ex = getExercise(exerciseId);
  if (!ex) return null;
  // Tylko ćwiczenia z ciężarem mają sens dla progresji ciężaru.
  if (ex.inputType !== 'weight_reps' && ex.inputType !== 'weighted_bodyweight') return null;

  const last = getLastPerformance(exerciseId).filter((s) => s.setType !== 'warmup');
  const lastSets = last.map((s) => ({ weightKg: s.weight, reps: s.reps }));
  if (lastSets.length === 0) return null;

  const compound = isCompoundLift(exerciseId);
  const repRangeMin = compound ? 5 : 8;
  const repRangeMax = compound ? 8 : 12;

  return nextProgression({
    lastSets,
    repRangeMin,
    repRangeMax,
    equipment: ex.equipment,
    exerciseId,
    unit,
  });
}

// ===================== REKORDY =====================

export interface NewPR {
  exerciseId: string;
  type: '1rm' | 'maxWeight' | 'maxVolume';
  value: number;
  weight: number | null;
  reps: number | null;
}

/**
 * Wykrywa nowe rekordy dla ćwiczenia, porównując pełną historię.
 * Zapisuje je do personal_records (cache). Zwraca tylko NOWE rekordy
 * ustanowione w tym treningu.
 */
function detectAndStorePRs(exerciseId: string, workoutId: string, achievedAt: number): NewPR[] {
  const db = getDb();

  // Wszystkie ukończone, robocze serie tego ćwiczenia w całej historii.
  const rows = db
    .select({
      weight: workoutSets.weight,
      reps: workoutSets.reps,
      setType: workoutSets.setType,
      workoutId: workoutExercises.workoutId,
    })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .where(and(eq(workoutExercises.exerciseId, exerciseId), eq(workoutSets.isCompleted, true)))
    .all();

  // Najlepsze w PRZESZŁOŚCI (z wykluczeniem tego treningu) vs najlepsze z TEGO
  // treningu. PR powstaje tylko gdy ten trening ŚCIŚLE poprawia historię —
  // dzięki temu zwykłe wyrównanie wyniku nie generuje fałszywego rekordu ani
  // duplikatów w bazie.
  let bestE1RMPrior = 0;
  let bestWeightPrior = 0;
  let bestE1RMFromThis = 0;
  let bestWeightFromThis = 0;
  let best1RMRow: { weight: number; reps: number } | null = null;
  let bestWeightRow: { weight: number; reps: number } | null = null;

  for (const r of rows) {
    if (r.setType === 'warmup') continue;
    const w = r.weight ?? 0;
    const reps = r.reps ?? 0;
    if (w <= 0 || reps <= 0) continue;

    const e1rm = estimate1RM(w, reps);
    if (r.workoutId === workoutId) {
      if (e1rm > bestE1RMFromThis) {
        bestE1RMFromThis = e1rm;
        best1RMRow = { weight: w, reps };
      }
      if (w > bestWeightFromThis) {
        bestWeightFromThis = w;
        bestWeightRow = { weight: w, reps };
      }
    } else {
      if (e1rm > bestE1RMPrior) bestE1RMPrior = e1rm;
      if (w > bestWeightPrior) bestWeightPrior = w;
    }
  }

  const newPRs: NewPR[] = [];

  // Rekord 1RM — ten trening pobił dotychczasową historię (lub jest pierwszy).
  if (best1RMRow && bestE1RMFromThis > bestE1RMPrior && bestE1RMFromThis > 0) {
    storePR(exerciseId, '1rm', bestE1RMFromThis, best1RMRow.weight, best1RMRow.reps, workoutId, achievedAt);
    newPRs.push({ exerciseId, type: '1rm', value: bestE1RMFromThis, weight: best1RMRow.weight, reps: best1RMRow.reps });
  }
  if (bestWeightRow && bestWeightFromThis > bestWeightPrior && bestWeightFromThis > 0) {
    storePR(exerciseId, 'maxWeight', bestWeightFromThis, bestWeightRow.weight, bestWeightRow.reps, workoutId, achievedAt);
    newPRs.push({ exerciseId, type: 'maxWeight', value: bestWeightFromThis, weight: bestWeightRow.weight, reps: bestWeightRow.reps });
  }

  // Oznacz serię, która ustanowiła rekord ciężaru, flagą isPR (dla odznak w UI).
  if (bestWeightRow && bestWeightFromThis > bestWeightPrior) {
    markPRSet(workoutId, exerciseId, bestWeightRow.weight, bestWeightRow.reps);
  }

  return newPRs;
}

/**
 * Przelicza WSZYSTKIE rekordy życiowe od zera na podstawie pełnej historii.
 * Potrzebne po imporcie danych (np. ze Strong) — zaimportowane treningi nie
 * przechodzą przez `detectAndStorePRs`, więc bez tego Rekordy/1RM są puste.
 * Czyści personal_records i flagi is_pr, po czym wyznacza dla KAŻDEGO
 * ćwiczenia najlepszy szacowany 1RM i najcięższą serię.
 *
 * @returns liczba ćwiczeń, dla których ustanowiono rekordy.
 */
export function rebuildAllPRs(): number {
  const db = getDb();

  // Wszystkie ukończone, robocze serie z całej historii + data treningu.
  const rows = db
    .select({
      setId: workoutSets.id,
      weight: workoutSets.weight,
      reps: workoutSets.reps,
      setType: workoutSets.setType,
      exerciseId: workoutExercises.exerciseId,
      workoutId: workoutExercises.workoutId,
      startedAt: workouts.startedAt,
    })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(eq(workoutSets.isCompleted, true))
    .all();

  interface Best {
    e1rm: number;
    e1rmSet: { weight: number; reps: number; workoutId: string; setId: string; at: number } | null;
    maxWeight: number;
    maxWeightSet: { weight: number; reps: number; workoutId: string; setId: string; at: number } | null;
  }
  const byExercise = new Map<string, Best>();

  for (const r of rows) {
    if (r.setType === 'warmup') continue;
    const w = r.weight ?? 0;
    const reps = r.reps ?? 0;
    if (w <= 0 || reps <= 0) continue;

    const e1rm = estimate1RM(w, reps);
    let b = byExercise.get(r.exerciseId);
    if (!b) {
      b = { e1rm: 0, e1rmSet: null, maxWeight: 0, maxWeightSet: null };
      byExercise.set(r.exerciseId, b);
    }
    const ref = { weight: w, reps, workoutId: r.workoutId, setId: r.setId, at: r.startedAt };
    if (e1rm > b.e1rm) {
      b.e1rm = e1rm;
      b.e1rmSet = ref;
    }
    if (w > b.maxWeight) {
      b.maxWeight = w;
      b.maxWeightSet = ref;
    }
  }

  db.transaction((tx) => {
    // Reset: usuń wszystkie PR-y i zdejmij flagi is_pr.
    tx.delete(personalRecords).run();
    tx.update(workoutSets).set({ isPR: false }).run();

    for (const [exerciseId, b] of byExercise) {
      if (b.e1rmSet) {
        tx.insert(personalRecords).values({
          id: newId('pr'), exerciseId, type: '1rm', value: b.e1rm,
          weight: b.e1rmSet.weight, reps: b.e1rmSet.reps,
          workoutId: b.e1rmSet.workoutId, achievedAt: b.e1rmSet.at,
        }).run();
      }
      if (b.maxWeightSet) {
        tx.insert(personalRecords).values({
          id: newId('pr'), exerciseId, type: 'maxWeight', value: b.maxWeight,
          weight: b.maxWeightSet.weight, reps: b.maxWeightSet.reps,
          workoutId: b.maxWeightSet.workoutId, achievedAt: b.maxWeightSet.at,
        }).run();
        // Oznacz serię rekordu ciężaru flagą is_pr.
        tx.update(workoutSets).set({ isPR: true }).where(eq(workoutSets.id, b.maxWeightSet.setId)).run();
      }
    }
  });

  return byExercise.size;
}

/** Ustawia is_pr=1 na serii (z tego treningu) o danym ciężarze/powtórzeniach. */
function markPRSet(workoutId: string, exerciseId: string, weight: number, reps: number) {
  const db = getDb();
  const row = db
    .select({ id: workoutSets.id })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .where(
      and(
        eq(workoutExercises.workoutId, workoutId),
        eq(workoutExercises.exerciseId, exerciseId),
        eq(workoutSets.weight, weight),
        eq(workoutSets.reps, reps),
        eq(workoutSets.isCompleted, true)
      )
    )
    .limit(1)
    .get();
  if (row) {
    db.update(workoutSets).set({ isPR: true }).where(eq(workoutSets.id, row.id)).run();
  }
}

function storePR(
  exerciseId: string,
  type: NewPR['type'],
  value: number,
  weight: number | null,
  reps: number | null,
  workoutId: string,
  achievedAt: number
) {
  getDb().insert(personalRecords).values({
    id: newId('pr'),
    exerciseId,
    type,
    value,
    weight,
    reps,
    workoutId,
    achievedAt,
  }).run();
}

/** Najlepszy rekord danego typu dla ćwiczenia (do ekranu szczegółów). */
export function getBestPR(exerciseId: string, type: NewPR['type']): { value: number; weight: number | null; reps: number | null } | null {
  const r = getDb()
    .select()
    .from(personalRecords)
    .where(and(eq(personalRecords.exerciseId, exerciseId), eq(personalRecords.type, type)))
    .orderBy(desc(personalRecords.value))
    .limit(1)
    .get();
  return r ? { value: r.value, weight: r.weight, reps: r.reps } : null;
}

export interface ExerciseRecord {
  exerciseId: string;
  exerciseName: string;
  bodyPart: string;
  best1RM: number; // kg
  maxWeight: number; // kg
  maxWeightReps: number | null;
  achievedAt: number;
}

/**
 * Najlepsze rekordy dla KAŻDEGO ćwiczenia, które ma jakikolwiek PR.
 * Do ekranu „Rekordy" (hub). Sortowane wg najświeższego osiągnięcia.
 */
export function getAllRecords(): ExerciseRecord[] {
  const db = getDb();
  const prs = db.select().from(personalRecords).orderBy(desc(personalRecords.achievedAt)).all();
  if (prs.length === 0) return [];

  // Mapa ćwiczeń raz (unika N+1 zapytań przy wielu rekordach).
  const exMap = new Map(getAllExercises().map((e) => [e.id, e]));
  const byExercise = new Map<string, ExerciseRecord>();
  for (const pr of prs) {
    const ex = exMap.get(pr.exerciseId);
    if (!ex) continue;
    let rec = byExercise.get(pr.exerciseId);
    if (!rec) {
      rec = {
        exerciseId: pr.exerciseId,
        exerciseName: ex.name,
        bodyPart: ex.bodyPart,
        best1RM: 0,
        maxWeight: 0,
        maxWeightReps: null,
        achievedAt: pr.achievedAt,
      };
      byExercise.set(pr.exerciseId, rec);
    }
    if (pr.type === '1rm') rec.best1RM = Math.max(rec.best1RM, pr.value);
    if (pr.type === 'maxWeight') {
      if ((pr.weight ?? pr.value) > rec.maxWeight) {
        rec.maxWeight = pr.weight ?? pr.value;
        rec.maxWeightReps = pr.reps;
      }
    }
    rec.achievedAt = Math.max(rec.achievedAt, pr.achievedAt);
  }

  return [...byExercise.values()].sort((a, b) => b.achievedAt - a.achievedAt);
}

// ===================== WYKRESY =====================

export interface ProgressPoint {
  date: number;
  e1rm: number;
  volume: number;
  topWeight: number;
}

/**
 * Punkty postępu dla ćwiczenia — jeden na trening (najlepszy 1RM + wolumen
 * w danej sesji). Sortowane rosnąco po dacie. Do wykresów liniowych.
 */
export function getExerciseProgress(exerciseId: string): ProgressPoint[] {
  const db = getDb();
  const rows = db
    .select({
      startedAt: workouts.startedAt,
      weight: workoutSets.weight,
      reps: workoutSets.reps,
      setType: workoutSets.setType,
      workoutId: workouts.id,
    })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(and(eq(workoutExercises.exerciseId, exerciseId), eq(workoutSets.isCompleted, true), isNotNull(workouts.finishedAt)))
    .orderBy(asc(workouts.startedAt))
    .all();

  const byWorkout = new Map<string, ProgressPoint>();
  for (const r of rows) {
    if (r.setType === 'warmup') continue;
    const w = r.weight ?? 0;
    const reps = r.reps ?? 0;
    const e1rm = w > 0 && reps > 0 ? estimate1RM(w, reps) : 0;
    const vol = setVolume(w, reps, r.setType as SetType);

    const existing = byWorkout.get(r.workoutId);
    if (!existing) {
      byWorkout.set(r.workoutId, { date: r.startedAt, e1rm, volume: vol, topWeight: w });
    } else {
      existing.e1rm = Math.max(existing.e1rm, e1rm);
      existing.volume += vol;
      existing.topWeight = Math.max(existing.topWeight, w);
    }
  }

  return [...byWorkout.values()].sort((a, b) => a.date - b.date);
}
