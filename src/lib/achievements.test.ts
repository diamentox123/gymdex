import { describe, it, expect } from 'vitest';
import {
  currentDayStreak,
  longestDayStreak,
  workoutsThisWeek,
  activeWeeks,
  avgWorkoutsPerWeek,
  computeAchievements,
  achievementScore,
  buildHeatmap,
  type WorkoutSummaryLike,
} from './achievements';

const DAY = 86_400_000;
function w(daysAgo: number, base: number): WorkoutSummaryLike {
  return { startedAt: base - daysAgo * DAY, volume: 1000, sets: 10, durationSec: 3600 };
}

describe('currentDayStreak', () => {
  const now = new Date('2026-06-13T12:00:00').getTime();

  it('zero dla pustej listy', () => {
    expect(currentDayStreak([], now)).toBe(0);
  });

  it('liczy dni z rzędu od dziś', () => {
    const ws = [w(0, now), w(1, now), w(2, now)];
    expect(currentDayStreak(ws, now)).toBe(3);
  });

  it('utrzymuje streak gdy ostatni trening był wczoraj (łaska 1 dnia)', () => {
    const ws = [w(1, now), w(2, now)];
    expect(currentDayStreak(ws, now)).toBe(2);
  });

  it('zrywa streak po 2 dniach przerwy', () => {
    const ws = [w(3, now), w(4, now)];
    expect(currentDayStreak(ws, now)).toBe(0);
  });

  it('dwa treningi tego samego dnia liczą się jako 1 dzień', () => {
    const ws = [w(0, now), { ...w(0, now), startedAt: now - 3600_000 }];
    expect(currentDayStreak(ws, now)).toBe(1);
  });
});

describe('longestDayStreak', () => {
  const base = new Date('2026-06-13T12:00:00').getTime();
  it('znajduje najdłuższą serię', () => {
    // dni temu: 10,9,8 (seria 3) ... 2,1 (seria 2)
    const ws = [w(10, base), w(9, base), w(8, base), w(2, base), w(1, base)];
    expect(longestDayStreak(ws)).toBe(3);
  });
  it('pojedynczy trening = 1', () => {
    expect(longestDayStreak([w(0, base)])).toBe(1);
  });
});

describe('workoutsThisWeek / activeWeeks', () => {
  const now = new Date('2026-06-13T12:00:00').getTime(); // sobota
  it('liczy treningi z bieżącego tygodnia', () => {
    const ws = [w(0, now), w(1, now), w(8, now)]; // 2 w tym tyg, 1 w poprzednim
    expect(workoutsThisWeek(ws, now)).toBeGreaterThanOrEqual(2);
  });
  it('activeWeeks liczy odrębne tygodnie', () => {
    const ws = [w(0, now), w(8, now), w(16, now)];
    expect(activeWeeks(ws)).toBe(3);
  });
});

describe('avgWorkoutsPerWeek', () => {
  const now = new Date('2026-06-13T12:00:00').getTime();
  it('zero dla pustej listy', () => {
    expect(avgWorkoutsPerWeek([], now)).toBe(0);
  });
  it('liczy średnią od pierwszego treningu', () => {
    // 4 treningi w ciągu ~2 tygodni → ~2/tydz
    const ws = [w(0, now), w(3, now), w(7, now), w(10, now)];
    const avg = avgWorkoutsPerWeek(ws, now);
    expect(avg).toBeGreaterThan(1);
    expect(avg).toBeLessThanOrEqual(4);
  });
});

describe('computeAchievements', () => {
  const base = {
    totalWorkouts: 12,
    totalVolumeKg: 15000,
    totalSets: 120,
    totalPRs: 3,
    longestStreak: 4,
    activeWeeks: 5,
    earlyBird: true,
    nightOwl: false,
  };

  it('odblokowuje progi które przekroczono', () => {
    const list = computeAchievements(base);
    const first = list.find((a) => a.id === 'first-workout');
    const ten = list.find((a) => a.id === 'workouts-10');
    const fifty = list.find((a) => a.id === 'workouts-50');
    expect(first?.unlocked).toBe(true);
    expect(ten?.unlocked).toBe(true);
    expect(fifty?.unlocked).toBe(false);
  });

  it('postęp niezdobytego jest ułamkiem', () => {
    const list = computeAchievements(base);
    const fifty = list.find((a) => a.id === 'workouts-50')!;
    expect(fifty.progress).toBeCloseTo(12 / 50, 5);
  });

  it('binarny early-bird odblokowany, night-owl nie', () => {
    const list = computeAchievements(base);
    expect(list.find((a) => a.id === 'early-bird')?.unlocked).toBe(true);
    expect(list.find((a) => a.id === 'night-owl')?.unlocked).toBe(false);
  });

  it('zdobyte sortowane przed niezdobytymi', () => {
    const list = computeAchievements(base);
    const firstUnlockedIdx = list.findIndex((a) => a.unlocked);
    const firstLockedIdx = list.findIndex((a) => !a.unlocked);
    expect(firstUnlockedIdx).toBeLessThan(firstLockedIdx);
  });

  it('achievementScore liczy zdobyte', () => {
    const list = computeAchievements(base);
    const score = achievementScore(list);
    expect(score.total).toBe(list.length);
    expect(score.unlocked).toBeGreaterThan(0);
    expect(score.unlocked).toBeLessThan(score.total);
  });
});

describe('buildHeatmap', () => {
  const now = new Date('2026-06-13T12:00:00').getTime();

  it('zwraca weeks kolumn po 7 dni', () => {
    const grid = buildHeatmap([], 16, now);
    expect(grid).toHaveLength(16);
    expect(grid.every((col) => col.length === 7)).toBe(true);
  });

  it('zlicza treningi w odpowiednim dniu i nadaje poziom', () => {
    const grid = buildHeatmap([w(0, now), w(0, now), w(1, now)], 4, now);
    const flat = grid.flat();
    const today = flat.find((d) => d.count === 2);
    expect(today).toBeTruthy();
    expect(today!.level).toBe(2);
    expect(flat.some((d) => d.count === 1 && d.level === 1)).toBe(true);
  });

  it('przyszłe dni mają count 0', () => {
    const grid = buildHeatmap([], 2, now);
    const last = grid[grid.length - 1];
    // któreś dni bieżącego tygodnia są w przyszłości (sobota → niedziela)
    expect(last.every((d) => d.count === 0)).toBe(true);
  });
});
