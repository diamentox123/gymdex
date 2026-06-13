import { describe, it, expect } from 'vitest';
import {
  kgToLb,
  lbToKg,
  toKg,
  displayWeight,
  epley1RM,
  brzycki1RM,
  estimate1RM,
  setVolume,
  totalVolume,
  bestSet,
  totalReps,
  type SetLike,
} from './calc';

describe('konwersja jednostek', () => {
  it('kg ↔ lb jest odwracalne', () => {
    expect(lbToKg(kgToLb(100))).toBeCloseTo(100, 6);
  });
  it('100 kg ≈ 220.46 lb', () => {
    expect(kgToLb(100)).toBeCloseTo(220.462, 2);
  });
  it('toKg zwraca wartość bez zmian dla kg', () => {
    expect(toKg(80, 'kg')).toBe(80);
  });
  it('toKg konwertuje lb na kg', () => {
    expect(toKg(220.462, 'lb')).toBeCloseTo(100, 2);
  });
  it('displayWeight pokazuje kg bez zmian', () => {
    expect(displayWeight(82.5, 'kg')).toBe(82.5);
  });
});

describe('szacowanie 1RM', () => {
  it('dla 1 powtórzenia zwraca dokładny ciężar', () => {
    expect(epley1RM(100, 1)).toBe(100);
    expect(brzycki1RM(100, 1)).toBe(100);
  });
  it('Epley: 100 kg × 5 = 116.7 kg', () => {
    expect(epley1RM(100, 5)).toBeCloseTo(116.67, 1);
  });
  it('rośnie monotonicznie z liczbą powtórzeń', () => {
    expect(epley1RM(100, 8)).toBeGreaterThan(epley1RM(100, 5));
  });
  it('zwraca 0 dla nieprawidłowych danych', () => {
    expect(estimate1RM(0, 5)).toBe(0);
    expect(estimate1RM(100, 0)).toBe(0);
    expect(estimate1RM(-50, 5)).toBe(0);
  });
  it('Brzycki nie dzieli przez zero przy 37 powtórzeniach', () => {
    expect(Number.isFinite(brzycki1RM(50, 37))).toBe(true);
    expect(Number.isFinite(brzycki1RM(50, 40))).toBe(true);
  });
});

describe('wolumen serii', () => {
  it('liczy tonaż dla serii roboczej', () => {
    expect(setVolume(100, 5, 'normal')).toBe(500);
  });
  it('rozgrzewka nie liczy się do wolumenu', () => {
    expect(setVolume(100, 5, 'warmup')).toBe(0);
  });
  it('zwraca 0 dla zerowego ciężaru lub powtórzeń', () => {
    expect(setVolume(0, 5, 'normal')).toBe(0);
    expect(setVolume(100, 0, 'normal')).toBe(0);
  });
});

describe('agregaty z listy serii', () => {
  const sets: SetLike[] = [
    { weight: 60, reps: 10, type: 'warmup', isCompleted: true },
    { weight: 100, reps: 5, type: 'normal', isCompleted: true },
    { weight: 100, reps: 4, type: 'normal', isCompleted: true },
    { weight: 100, reps: 3, type: 'normal', isCompleted: false }, // nieukończona
  ];
  it('totalVolume pomija rozgrzewki i nieukończone', () => {
    expect(totalVolume(sets)).toBe(100 * 5 + 100 * 4);
  });
  it('totalReps pomija rozgrzewki i nieukończone', () => {
    expect(totalReps(sets)).toBe(5 + 4);
  });
  it('bestSet wybiera serię o najwyższym 1RM', () => {
    const best = bestSet(sets);
    expect(best).not.toBeNull();
    expect(best!.reps).toBe(5); // 100×5 ma wyższy e1RM niż 100×4
  });
  it('bestSet zwraca null gdy brak serii roboczych', () => {
    expect(bestSet([{ weight: 60, reps: 10, type: 'warmup', isCompleted: true }])).toBeNull();
  });
});
