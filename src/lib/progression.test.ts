import { describe, it, expect } from 'vitest';
import {
  minIncrementKg,
  isCompoundLift,
  nextProgression,
  percentTable,
  type ProgressionInput,
} from './progression';

function base(over: Partial<ProgressionInput>): ProgressionInput {
  return {
    lastSets: [],
    repRangeMin: 8,
    repRangeMax: 12,
    equipment: 'sztanga',
    exerciseId: 'wyciskanie-sztanga-lawka-plaska',
    unit: 'kg',
    ...over,
  };
}

describe('minIncrementKg', () => {
  it('sztanga 2.5, hantle 2, kettlebell 4', () => {
    expect(minIncrementKg('sztanga')).toBe(2.5);
    expect(minIncrementKg('hantle')).toBe(2);
    expect(minIncrementKg('kettlebell')).toBe(4);
  });
});

describe('isCompoundLift', () => {
  it('rozpoznaje duże boje', () => {
    expect(isCompoundLift('martwy-ciag')).toBe(true);
    expect(isCompoundLift('przysiad-ze-sztanga')).toBe(true);
    expect(isCompoundLift('uginanie-mlotkowe')).toBe(false);
  });
});

describe('nextProgression — double progression', () => {
  it('podnosi ciężar gdy górny zakres osiągnięty na wszystkich seriach', () => {
    const t = nextProgression(
      base({
        lastSets: [
          { weightKg: 60, reps: 12 },
          { weightKg: 60, reps: 12 },
          { weightKg: 60, reps: 12 },
        ],
      })
    )!;
    expect(t.isIncrease).toBe(true);
    expect(t.weight).toBe(62.5); // +2.5 kg
    expect(t.reps).toBe(8); // wraca do dolnej granicy
  });

  it('utrzymuje ciężar i celuje +1 powt. gdy nie osiągnięto góry', () => {
    const t = nextProgression(
      base({
        lastSets: [
          { weightKg: 60, reps: 10 },
          { weightKg: 60, reps: 9 },
          { weightKg: 60, reps: 8 },
        ],
      })
    )!;
    expect(t.isIncrease).toBe(false);
    expect(t.weight).toBe(60);
    expect(t.reps).toBe(12); // cel = górna granica zakresu (dobij każdą serię)
  });

  it('cel utrzymania nigdy nie jest niższy niż już zrobione powt.', () => {
    // Realny przypadek użytkownika: 40×8, 40×7, 40×5 (zakres 8–12)
    const t = nextProgression(
      base({
        lastSets: [
          { weightKg: 40, reps: 8 },
          { weightKg: 40, reps: 7 },
          { weightKg: 40, reps: 5 },
        ],
      })
    )!;
    expect(t.isIncrease).toBe(false);
    expect(t.weight).toBe(40);
    expect(t.reps).toBe(12); // dąży do górnej granicy, NIE 6 (był bug min+1)
  });

  it('duży zapas (RIR≥3) na boju złożonym → podwójny skok', () => {
    const t = nextProgression(
      base({
        exerciseId: 'przysiad-ze-sztanga',
        lastSets: [
          { weightKg: 100, reps: 12, rir: 4 },
          { weightKg: 100, reps: 12, rir: 3 },
          { weightKg: 100, reps: 12, rir: 3 },
        ],
      })
    )!;
    expect(t.isIncrease).toBe(true);
    expect(t.weight).toBe(105); // +5 kg (podwójny krok)
  });

  it('izolacja z dużym zapasem → pojedynczy krok (nie podwójny)', () => {
    const t = nextProgression(
      base({
        exerciseId: 'uginanie-mlotkowe',
        equipment: 'hantle',
        lastSets: [
          { weightKg: 14, reps: 12, rir: 4 },
          { weightKg: 14, reps: 12, rir: 4 },
        ],
      })
    )!;
    expect(t.isIncrease).toBe(true);
    expect(t.weight).toBe(16); // +2 kg, nie +4
  });

  it('zaokrągla ciężar do kroku sprzętu', () => {
    const t = nextProgression(
      base({
        lastSets: [
          { weightKg: 61, reps: 12 },
          { weightKg: 61, reps: 12 },
        ],
      })
    )!;
    // 61 + 2.5 = 63.5 → zaokrąglone do wielokrotności 2.5 = 62.5 lub 65; round(63.5/2.5)*2.5 = 62.5
    expect(t.weight % 2.5).toBe(0);
  });

  it('ramp-up: ostatnia (najcięższa) seria na górze zakresu → podnosi mimo lżejszych wcześniej', () => {
    const t = nextProgression(
      base({
        exerciseId: 'przysiad-ze-sztanga',
        repRangeMin: 5,
        repRangeMax: 8,
        lastSets: [
          { weightKg: 80, reps: 5 }, // ramp
          { weightKg: 90, reps: 5 }, // ramp
          { weightKg: 100, reps: 8 }, // top set, górny zakres
        ],
      })
    )!;
    expect(t.isIncrease).toBe(true);
  });

  it('zwraca null gdy brak serii z ciężarem', () => {
    expect(nextProgression(base({ lastSets: [{ weightKg: null, reps: 10 }] }))).toBeNull();
    expect(nextProgression(base({ lastSets: [] }))).toBeNull();
  });

  it('bazuje na najcięższej serii (top set), nie myli się przy mieszanych ciężarach', () => {
    const t = nextProgression(
      base({
        lastSets: [
          { weightKg: 60, reps: 12 },
          { weightKg: 50, reps: 12 }, // lżejsza dogrzewka/drop
        ],
      })
    )!;
    // top = 60; tylko jedna seria na top, ma 12 (=max) → ale nie wszystkie serie ≥max? allReps=[12,12] obie ≥12 → podnosi
    expect(t.weight).toBe(62.5);
  });

  it('lb: krok przelicza się na funty', () => {
    const t = nextProgression(
      base({
        unit: 'lb',
        lastSets: [
          { weightKg: 60, reps: 12 },
          { weightKg: 60, reps: 12 },
        ],
      })
    )!;
    expect(t.isIncrease).toBe(true);
    // ciężar w lb, dodatni
    expect(t.weight).toBeGreaterThan(displayWeightLb(60));
  });
});

function displayWeightLb(kg: number) {
  return kg / 0.45359237;
}

describe('percentTable', () => {
  it('100% = 1RM, 1 powtórzenie', () => {
    const t = percentTable(100, 'kg');
    const row100 = t.find((r) => r.pct === 100)!;
    expect(row100.weight).toBe(100);
    expect(row100.reps).toBe(1);
  });

  it('zwraca pustą tablicę dla 1RM ≤ 0 (brak NaN)', () => {
    expect(percentTable(0, 'kg')).toEqual([]);
    expect(percentTable(-5, 'kg')).toEqual([]);
  });

  it('niższy procent → więcej powtórzeń', () => {
    const t = percentTable(100, 'kg');
    const row80 = t.find((r) => r.pct === 80)!;
    const row60 = t.find((r) => r.pct === 60)!;
    expect(row80.weight).toBe(80);
    expect(row60.reps).toBeGreaterThan(row80.reps);
  });
});
