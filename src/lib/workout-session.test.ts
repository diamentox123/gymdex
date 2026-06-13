import { describe, it, expect } from 'vitest';
import { buildWorkoutInput, liveTotals } from './workout-session';
import type { LiveExercise } from '@/store/workout';

/** Pomocnik tworzący minimalne LiveExercise. */
function ex(weight: string, reps: string, done = true): LiveExercise {
  return {
    id: 'le1',
    exerciseId: 'wyciskanie-sztanga-lawka-plaska',
    name: 'Wyciskanie',
    inputType: 'weight_reps',
    restSeconds: 120,
    supersetGroup: null,
    notes: '',
    sets: [
      {
        id: 's1',
        type: 'normal',
        weight,
        reps,
        rpe: '',
        rir: '',
        durationSec: '',
        distanceM: '',
        done,
      },
    ],
  };
}

describe('buildWorkoutInput — konwersja jednostek', () => {
  it('w kg zapisuje wartość bez zmian', () => {
    const input = buildWorkoutInput('T', 0, 1000, null, [ex('82.5', '5')], 'kg');
    expect(input.exercises[0].sets[0].weight).toBe(82.5);
    expect(input.exercises[0].sets[0].reps).toBe(5);
  });

  it('w lb konwertuje wpisaną wartość na kg do zapisu', () => {
    const input = buildWorkoutInput('T', 0, 1000, null, [ex('100', '5')], 'lb');
    // 100 lb ≈ 45.36 kg
    expect(input.exercises[0].sets[0].weight).toBeCloseTo(45.36, 1);
  });

  it('obsługuje przecinek jako separator dziesiętny', () => {
    const input = buildWorkoutInput('T', 0, 1000, null, [ex('82,5', '5')], 'kg');
    expect(input.exercises[0].sets[0].weight).toBe(82.5);
  });

  it('puste pole ciężaru → null', () => {
    const input = buildWorkoutInput('T', 0, 1000, null, [ex('', '12')], 'kg');
    expect(input.exercises[0].sets[0].weight).toBeNull();
    expect(input.exercises[0].sets[0].reps).toBe(12);
  });

  it('notatka treningu: trim, a pusta → null', () => {
    expect(buildWorkoutInput('T', 0, 1000, null, [ex('100', '5')], 'kg', '  cięzki dzień  ').notes).toBe('cięzki dzień');
    expect(buildWorkoutInput('T', 0, 1000, null, [ex('100', '5')], 'kg', '   ').notes).toBeNull();
    expect(buildWorkoutInput('T', 0, 1000, null, [ex('100', '5')], 'kg').notes).toBeNull();
  });
});

describe('liveTotals — wolumen w kg niezależnie od jednostki', () => {
  it('w kg: 100 × 5 = 500 kg wolumenu', () => {
    const t = liveTotals([ex('100', '5')], 'kg');
    expect(t.volume).toBe(500);
    expect(t.completedSets).toBe(1);
  });

  it('w lb: 100 lb × 5 ≈ 226.8 kg wolumenu', () => {
    const t = liveTotals([ex('100', '5')], 'lb');
    expect(t.volume).toBeCloseTo(226.8, 0);
  });

  it('nieukończona seria nie liczy się do wolumenu', () => {
    const t = liveTotals([ex('100', '5', false)], 'kg');
    expect(t.volume).toBe(0);
    expect(t.completedSets).toBe(0);
    expect(t.totalSets).toBe(1);
  });
});
