/**
 * Store aktywnej sesji treningu (Zustand). Trzyma cały stan „treningu na
 * żywo" w pamięci: ćwiczenia, serie, stan ukończenia, timer odpoczynku.
 * Zapis do DB następuje dopiero przy zakończeniu treningu.
 *
 * To serce aplikacji — wszystkie interakcje na ekranie aktywnego treningu
 * przechodzą przez te akcje.
 */
import { create } from 'zustand';
import { newId } from '@/lib/id';
import { getLastPerformance } from '@/db/repo-workouts';
import { getExercise } from '@/db/repo-exercises';
import { getRoutineFull } from '@/db/repo-routines';
import { useSettings } from '@/store/settings';
import { displayWeight } from '@/lib/calc';
import { trimNumber } from '@/lib/format';
import type { InputType, SetType, Unit } from '@/lib/types';

/** Bieżąca jednostka użytkownika (ciężary w sesji trzymane są w niej). */
function currentUnit(): Unit {
  return useSettings.getState().unit();
}

/** kg z DB → tekst w jednostce użytkownika (do pola input). */
function kgToField(kg: number | null): string {
  if (kg == null) return '';
  return trimNumber(displayWeight(kg, currentUnit()));
}

/** Etykieta „Poprzednio" z kg w DB, w jednostce użytkownika. */
function prevLabel(weight: number | null, reps: number | null): string | undefined {
  if (weight != null && weight > 0 && reps != null) {
    return `${trimNumber(displayWeight(weight, currentUnit()))} × ${reps}`;
  }
  if (reps != null) return `${reps}`;
  return undefined;
}

/** Pojedyncza seria w aktywnym treningu (wartości jako string dla pól wejściowych). */
export interface LiveSet {
  id: string;
  type: SetType;
  weight: string; // kg jako tekst (pole input)
  reps: string;
  rpe: string;
  rir: string;
  durationSec: string;
  distanceM: string;
  done: boolean;
  /** Podgląd „Poprzednio" z ostatniej sesji (np. "100 × 5"). */
  prev?: string;
}

export interface LiveExercise {
  id: string;
  exerciseId: string;
  name: string;
  inputType: InputType;
  restSeconds: number;
  supersetGroup: number | null;
  notes: string;
  sets: LiveSet[];
}

interface RestTimer {
  active: boolean;
  endsAt: number; // timestamp ms
  total: number; // sekundy
  exerciseId: string | null;
}

interface WorkoutState {
  active: boolean;
  name: string;
  notes: string;
  startedAt: number | null;
  routineId: string | null;
  exercises: LiveExercise[];
  rest: RestTimer;

  // --- Cykl życia ---
  startEmpty: () => void;
  startFromRoutine: (routineId: string) => void;
  cancel: () => void;
  setName: (name: string) => void;
  setNotes: (notes: string) => void;

  // --- Ćwiczenia ---
  addExercise: (exerciseId: string) => void;
  removeExercise: (liveId: string) => void;
  setExerciseNotes: (liveId: string, notes: string) => void;
  setExerciseRest: (liveId: string, seconds: number) => void;
  reorderExercise: (liveId: string, dir: -1 | 1) => void;
  toggleSuperset: (liveId: string) => void;

  // --- Serie ---
  addSet: (exLiveId: string) => void;
  removeSet: (exLiveId: string, setId: string) => void;
  updateSet: (exLiveId: string, setId: string, patch: Partial<LiveSet>) => void;
  toggleSetDone: (exLiveId: string, setId: string) => string | null; // zwraca exerciseId jeśli ukończono (do rest)
  cycleSetType: (exLiveId: string, setId: string) => void;

  // --- Rest timer ---
  startRest: (seconds: number, exerciseId: string) => void;
  stopRest: () => void;
  addRestTime: (delta: number) => void;

  // --- Pomocnicze ---
  completedSetCount: () => number;
}

function makeEmptySet(prev?: string): LiveSet {
  return {
    id: newId('ls'),
    type: 'normal',
    weight: '',
    reps: '',
    rpe: '',
    rir: '',
    durationSec: '',
    distanceM: '',
    done: false,
    prev,
  };
}

/** Buduje LiveExercise z definicji + prefill z ostatniej sesji. */
function buildLiveExercise(exerciseId: string, restDefault: number): LiveExercise | null {
  const def = getExercise(exerciseId);
  if (!def) return null;
  const last = getLastPerformance(exerciseId);

  // Tworzymy tyle serii ile ostatnio (min. 1), z podglądem „Poprzednio".
  const count = Math.max(1, last.length);
  const sets: LiveSet[] = [];
  for (let i = 0; i < count; i++) {
    const p = last[i];
    const s = makeEmptySet(p ? prevLabel(p.weight, p.reps) : undefined);
    if (p) s.type = p.setType;
    sets.push(s);
  }

  return {
    id: newId('le'),
    exerciseId,
    name: def.name,
    inputType: def.inputType,
    restSeconds: restDefault,
    supersetGroup: null,
    notes: '',
    sets,
  };
}

const SET_TYPE_CYCLE: SetType[] = ['normal', 'warmup', 'drop', 'failure'];

export const useWorkout = create<WorkoutState>((set, get) => ({
  active: false,
  name: '',
  notes: '',
  startedAt: null,
  routineId: null,
  exercises: [],
  rest: { active: false, endsAt: 0, total: 0, exerciseId: null },

  startEmpty: () => {
    set({
      active: true,
      name: 'Trening',
      notes: '',
      startedAt: Date.now(),
      routineId: null,
      exercises: [],
      rest: { active: false, endsAt: 0, total: 0, exerciseId: null },
    });
  },

  startFromRoutine: (routineId) => {
    const routine = getRoutineFull(routineId);
    if (!routine) {
      get().startEmpty();
      return;
    }
    const exercises: LiveExercise[] = [];
    for (const re of routine.exercises) {
      const def = getExercise(re.exerciseId);
      if (!def) continue;
      const last = getLastPerformance(re.exerciseId);
      // Liczba serii = z rutyny (lub z ostatniej sesji jako fallback).
      const targetCount = re.sets.length || Math.max(1, last.length);
      const sets: LiveSet[] = [];
      for (let i = 0; i < targetCount; i++) {
        const target = re.sets[i];
        const p = last[i];
        const s = makeEmptySet(p ? prevLabel(p.weight, p.reps) : undefined);
        if (target) {
          s.type = target.setType as SetType;
          // Prefill celami z rutyny (cele w DB w kg → jednostka użytkownika).
          if (target.targetWeight != null) s.weight = kgToField(target.targetWeight);
          if (target.targetReps != null) s.reps = String(target.targetReps);
        }
        sets.push(s);
      }
      exercises.push({
        id: newId('le'),
        exerciseId: re.exerciseId,
        name: def.name,
        inputType: def.inputType,
        restSeconds: re.restSeconds,
        supersetGroup: re.supersetGroup,
        notes: re.notes ?? '',
        sets,
      });
    }
    set({
      active: true,
      name: routine.name,
      notes: '',
      startedAt: Date.now(),
      routineId,
      exercises,
      rest: { active: false, endsAt: 0, total: 0, exerciseId: null },
    });
  },

  cancel: () => {
    set({
      active: false,
      name: '',
      notes: '',
      startedAt: null,
      routineId: null,
      exercises: [],
      rest: { active: false, endsAt: 0, total: 0, exerciseId: null },
    });
  },

  setName: (name) => set({ name }),

  setNotes: (notes) => set({ notes }),

  addExercise: (exerciseId) => {
    const restDefault = get().exercises[0]?.restSeconds ?? 120;
    const live = buildLiveExercise(exerciseId, restDefault);
    if (!live) return;
    set({ exercises: [...get().exercises, live] });
  },

  removeExercise: (liveId) => {
    set({ exercises: get().exercises.filter((e) => e.id !== liveId) });
  },

  setExerciseNotes: (liveId, notes) => {
    set({ exercises: get().exercises.map((e) => (e.id === liveId ? { ...e, notes } : e)) });
  },

  setExerciseRest: (liveId, seconds) => {
    set({ exercises: get().exercises.map((e) => (e.id === liveId ? { ...e, restSeconds: seconds } : e)) });
  },

  reorderExercise: (liveId, dir) => {
    const arr = [...get().exercises];
    const idx = arr.findIndex((e) => e.id === liveId);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    set({ exercises: arr });
  },

  toggleSuperset: (liveId) => {
    // Grupuje ćwiczenie z poprzednim w superserię (wspólny numer grupy).
    const arr = [...get().exercises];
    const idx = arr.findIndex((e) => e.id === liveId);
    if (idx <= 0) return;
    const prev = arr[idx - 1];
    if (arr[idx].supersetGroup != null && arr[idx].supersetGroup === prev.supersetGroup) {
      // Rozłącz.
      arr[idx] = { ...arr[idx], supersetGroup: null };
    } else {
      const group = prev.supersetGroup ?? Math.max(0, ...arr.map((e) => e.supersetGroup ?? 0)) + 1;
      arr[idx - 1] = { ...prev, supersetGroup: group };
      arr[idx] = { ...arr[idx], supersetGroup: group };
    }
    set({ exercises: arr });
  },

  addSet: (exLiveId) => {
    set({
      exercises: get().exercises.map((e) => {
        if (e.id !== exLiveId) return e;
        // Nowa seria dziedziczy wartości z ostatniej (wygodne przy progresji).
        const lastSet = e.sets[e.sets.length - 1];
        const fresh = makeEmptySet();
        if (lastSet) {
          fresh.weight = lastSet.weight;
          fresh.reps = lastSet.reps;
        }
        return { ...e, sets: [...e.sets, fresh] };
      }),
    });
  },

  removeSet: (exLiveId, setId) => {
    set({
      exercises: get().exercises.map((e) =>
        e.id === exLiveId ? { ...e, sets: e.sets.filter((s) => s.id !== setId) } : e
      ),
    });
  },

  updateSet: (exLiveId, setId, patch) => {
    set({
      exercises: get().exercises.map((e) =>
        e.id === exLiveId
          ? { ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }
          : e
      ),
    });
  },

  toggleSetDone: (exLiveId, setId) => {
    let completedExerciseId: string | null = null;
    set({
      exercises: get().exercises.map((e) => {
        if (e.id !== exLiveId) return e;
        return {
          ...e,
          sets: e.sets.map((s) => {
            if (s.id !== setId) return s;
            const nowDone = !s.done;
            if (nowDone) completedExerciseId = e.exerciseId;
            return { ...s, done: nowDone };
          }),
        };
      }),
    });
    return completedExerciseId;
  },

  cycleSetType: (exLiveId, setId) => {
    set({
      exercises: get().exercises.map((e) =>
        e.id === exLiveId
          ? {
              ...e,
              sets: e.sets.map((s) => {
                if (s.id !== setId) return s;
                const next = SET_TYPE_CYCLE[(SET_TYPE_CYCLE.indexOf(s.type) + 1) % SET_TYPE_CYCLE.length];
                return { ...s, type: next };
              }),
            }
          : e
      ),
    });
  },

  startRest: (seconds, exerciseId) => {
    set({ rest: { active: true, endsAt: Date.now() + seconds * 1000, total: seconds, exerciseId } });
  },

  stopRest: () => {
    set({ rest: { active: false, endsAt: 0, total: 0, exerciseId: null } });
  },

  addRestTime: (delta) => {
    const r = get().rest;
    if (!r.active) return;
    const newEnds = Math.max(Date.now(), r.endsAt + delta * 1000);
    set({ rest: { ...r, endsAt: newEnds, total: Math.max(1, r.total + delta) } });
  },

  completedSetCount: () => {
    return get().exercises.reduce((sum, e) => sum + e.sets.filter((s) => s.done).length, 0);
  },
}));
