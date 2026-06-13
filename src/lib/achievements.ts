/**
 * Osiągnięcia, serie (streaki) i analiza częstotliwości treningów.
 * Czysta logika domenowa — bez React/DB, w pełni testowalna.
 *
 * To warstwa „grywalizacji" znana z high-endowych apek (Strong, Hevy):
 * odznaki za kamienie milowe, streak tygodniowy, analiza regularności.
 */

/** Minimalny opis treningu potrzebny do analizy (uniezależniony od DB). */
export interface WorkoutSummaryLike {
  startedAt: number; // ms
  volume: number; // kg, wolumen roboczy
  sets: number; // liczba serii roboczych
  durationSec: number;
}

const DAY_MS = 86_400_000;

/** Początek dnia (lokalnie) jako timestamp — do grupowania po dacie. */
function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Numer tygodnia ISO-podobny: rok*100 + tydzień, do grupowania streaka. */
function weekKey(ts: number): string {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  // przesuń na czwartek bieżącego tygodnia (ISO: tydzień należy do roku czwartku)
  const day = (d.getDay() + 6) % 7; // pon=0..niedz=6
  d.setDate(d.getDate() - day + 3);
  const firstThursday = new Date(d.getFullYear(), 0, 4);
  const ftDay = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - ftDay + 3);
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * DAY_MS));
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * Bieżąca seria treningów liczona w DNIACH: ile dni z rzędu (wstecz od dziś
 * lub ostatniego treningu) odbył się przynajmniej jeden trening. „Dziś bez
 * treningu" nie zrywa serii dopóki wczoraj był (próg łaski 1 dnia).
 */
export function currentDayStreak(workouts: WorkoutSummaryLike[], now: number = Date.now()): number {
  if (workouts.length === 0) return 0;
  const days = new Set(workouts.map((w) => startOfDay(w.startedAt)));
  const today = startOfDay(now);
  // Pozwól, by streak „trzymał się" jeśli ostatni trening był wczoraj.
  let cursor = days.has(today) ? today : today - DAY_MS;
  if (!days.has(cursor)) return 0;
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor -= DAY_MS;
  }
  return streak;
}

/** Najdłuższa seria dni w całej historii. */
export function longestDayStreak(workouts: WorkoutSummaryLike[]): number {
  if (workouts.length === 0) return 0;
  const days = [...new Set(workouts.map((w) => startOfDay(w.startedAt)))].sort((a, b) => a - b);
  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    if (days[i] - days[i - 1] === DAY_MS) run++;
    else run = 1;
    best = Math.max(best, run);
  }
  return best;
}

/** Liczba treningów w ostatnich 7 dniach (do celu tygodniowego). */
export function workoutsThisWeek(workouts: WorkoutSummaryLike[], now: number = Date.now()): number {
  const wk = weekKey(now);
  return workouts.filter((w) => weekKey(w.startedAt) === wk).length;
}

/** Liczba odrębnych tygodni z przynajmniej jednym treningiem. */
export function activeWeeks(workouts: WorkoutSummaryLike[]): number {
  return new Set(workouts.map((w) => weekKey(w.startedAt))).size;
}

/**
 * Średnia liczba treningów na tydzień w oknie ostatnich `weeks` tygodni —
 * wskaźnik konsekwencji. Liczona od pierwszego treningu, nie zaniża dla
 * świeżych kont.
 */
export function avgWorkoutsPerWeek(workouts: WorkoutSummaryLike[], now: number = Date.now()): number {
  if (workouts.length === 0) return 0;
  const first = Math.min(...workouts.map((w) => w.startedAt));
  const weeks = Math.max(1, Math.ceil((now - first) / (7 * DAY_MS)));
  return Math.round((workouts.length / weeks) * 10) / 10;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; // nazwa Ionicons
  /** Czy zdobyte. */
  unlocked: boolean;
  /** Postęp 0..1 (do paska przy niezdobytych). */
  progress: number;
  /** Tekst postępu, np. „7 / 10". */
  progressLabel: string;
  tier: 'brąz' | 'srebro' | 'złoto' | 'platyna';
}

/** Pomocnik: definicja progowa osiągnięcia liczbowego. */
function milestone(
  id: string,
  title: string,
  description: string,
  icon: string,
  value: number,
  target: number,
  tier: Achievement['tier'],
  unit = ''
): Achievement {
  const progress = target > 0 ? Math.min(1, value / target) : 0;
  return {
    id,
    title,
    description,
    icon,
    unlocked: value >= target,
    progress,
    progressLabel: `${Math.min(value, target).toLocaleString('pl-PL')} / ${target.toLocaleString('pl-PL')}${unit}`,
    tier,
  };
}

/**
 * Buduje pełną listę osiągnięć na podstawie statystyk konta.
 * Zdobyte sortowane są przed niezdobytymi; w obrębie grupy wg postępu.
 */
export function computeAchievements(args: {
  totalWorkouts: number;
  totalVolumeKg: number;
  totalSets: number;
  totalPRs: number;
  longestStreak: number;
  activeWeeks: number;
  earlyBird: boolean; // trening przed 7:00
  nightOwl: boolean; // trening po 21:00
}): Achievement[] {
  const list: Achievement[] = [
    milestone('first-workout', 'Pierwszy krok', 'Zapisz swój pierwszy trening', 'footsteps', args.totalWorkouts, 1, 'brąz'),
    milestone('workouts-10', 'Rozpędzony', 'Ukończ 10 treningów', 'barbell', args.totalWorkouts, 10, 'brąz'),
    milestone('workouts-50', 'Bywalec siłowni', 'Ukończ 50 treningów', 'barbell', args.totalWorkouts, 50, 'srebro'),
    milestone('workouts-100', 'Setka', 'Ukończ 100 treningów', 'flame', args.totalWorkouts, 100, 'złoto'),
    milestone('workouts-365', 'Żelazna wola', 'Ukończ 365 treningów', 'trophy', args.totalWorkouts, 365, 'platyna'),

    milestone('volume-10t', 'Tonaż', 'Podnieś łącznie 10 000 kg', 'speedometer', Math.round(args.totalVolumeKg), 10_000, 'brąz', ' kg'),
    milestone('volume-100t', 'Stutonowiec', 'Podnieś łącznie 100 000 kg', 'speedometer', Math.round(args.totalVolumeKg), 100_000, 'srebro', ' kg'),
    milestone('volume-1m', 'Milioner', 'Podnieś łącznie 1 000 000 kg', 'planet', Math.round(args.totalVolumeKg), 1_000_000, 'złoto', ' kg'),

    milestone('sets-500', 'Pracuś', 'Wykonaj 500 serii roboczych', 'layers', args.totalSets, 500, 'srebro'),
    milestone('sets-2000', 'Maszyna', 'Wykonaj 2000 serii roboczych', 'layers', args.totalSets, 2000, 'złoto'),

    milestone('pr-1', 'Nowy rekord', 'Pobij pierwszy rekord życiowy', 'ribbon', args.totalPRs, 1, 'brąz'),
    milestone('pr-25', 'Łowca rekordów', 'Pobij 25 rekordów życiowych', 'ribbon', args.totalPRs, 25, 'srebro'),

    milestone('streak-7', 'Tydzień ognia', 'Trenuj 7 dni z rzędu', 'flame', args.longestStreak, 7, 'srebro'),
    milestone('streak-30', 'Niezłomny', 'Trenuj 30 dni z rzędu', 'flame', args.longestStreak, 30, 'platyna'),

    milestone('weeks-12', 'Kwartał', 'Trenuj w 12 różnych tygodniach', 'calendar', args.activeWeeks, 12, 'srebro'),
    milestone('weeks-52', 'Cały rok', 'Trenuj w 52 różnych tygodniach', 'calendar', args.activeWeeks, 52, 'platyna'),
  ];

  // Osiągnięcia binarne (klimatyczne).
  list.push({
    id: 'early-bird',
    title: 'Ranny ptaszek',
    description: 'Zacznij trening przed 7:00',
    icon: 'sunny',
    unlocked: args.earlyBird,
    progress: args.earlyBird ? 1 : 0,
    progressLabel: args.earlyBird ? 'Zdobyte' : 'Niezdobyte',
    tier: 'brąz',
  });
  list.push({
    id: 'night-owl',
    title: 'Nocny marek',
    description: 'Zacznij trening po 21:00',
    icon: 'moon',
    unlocked: args.nightOwl,
    progress: args.nightOwl ? 1 : 0,
    progressLabel: args.nightOwl ? 'Zdobyte' : 'Niezdobyte',
    tier: 'brąz',
  });

  return list.sort((a, b) => {
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    return b.progress - a.progress;
  });
}

/** Ile osiągnięć zdobyto / wszystkich. */
export function achievementScore(list: Achievement[]): { unlocked: number; total: number } {
  return { unlocked: list.filter((a) => a.unlocked).length, total: list.length };
}

export interface HeatmapDay {
  ts: number; // początek dnia
  count: number; // liczba treningów tego dnia
  /** Intensywność 0..3 do koloru komórki. */
  level: 0 | 1 | 2 | 3;
}

/**
 * Buduje siatkę aktywności (heatmapę à la GitHub) dla ostatnich `weeks`
 * tygodni: tablica tygodni, każdy = 7 dni (pon→niedz). Ostatnia kolumna to
 * bieżący tydzień. Dni spoza zakresu/przyszłe mają count 0.
 */
export function buildHeatmap(
  workouts: WorkoutSummaryLike[],
  weeks = 16,
  now: number = Date.now()
): HeatmapDay[][] {
  const perDay = new Map<number, number>();
  for (const w of workouts) {
    const d = startOfDay(w.startedAt);
    perDay.set(d, (perDay.get(d) ?? 0) + 1);
  }

  const today = startOfDay(now);
  // Znajdź poniedziałek bieżącego tygodnia.
  const dow = (new Date(today).getDay() + 6) % 7; // pon=0
  const mondayThisWeek = today - dow * DAY_MS;
  const startMonday = mondayThisWeek - (weeks - 1) * 7 * DAY_MS;

  const grid: HeatmapDay[][] = [];
  for (let wk = 0; wk < weeks; wk++) {
    const col: HeatmapDay[] = [];
    for (let d = 0; d < 7; d++) {
      const ts = startMonday + (wk * 7 + d) * DAY_MS;
      const count = ts > today ? 0 : perDay.get(ts) ?? 0;
      const level: HeatmapDay['level'] = count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : 3;
      col.push({ ts, count, level });
    }
    grid.push(col);
  }
  return grid;
}
