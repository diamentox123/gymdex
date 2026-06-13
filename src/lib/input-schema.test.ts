import { describe, it, expect } from 'vitest';
import { fieldsForInputType, weightColumnLabel, supportsPlateCalc } from './input-schema';

describe('fieldsForInputType', () => {
  it('weight_reps: ciężar + powtórzenia, brak prefiksu', () => {
    const f = fieldsForInputType('weight_reps');
    expect(f.weight).toBe(true);
    expect(f.reps).toBe(true);
    expect(f.weightPrefix).toBe('');
  });

  it('weighted_bodyweight: prefiks +', () => {
    expect(fieldsForInputType('weighted_bodyweight').weightPrefix).toBe('+');
  });

  it('assisted_bodyweight: prefiks −', () => {
    expect(fieldsForInputType('assisted_bodyweight').weightPrefix).toBe('−');
  });

  it('distance_duration: czas + dystans, bez ciężaru', () => {
    const f = fieldsForInputType('distance_duration');
    expect(f.weight).toBe(false);
    expect(f.duration).toBe(true);
    expect(f.distance).toBe(true);
  });
});

describe('weightColumnLabel', () => {
  it('skleja prefiks z jednostką użytkownika', () => {
    expect(weightColumnLabel(fieldsForInputType('weight_reps'), 'kg')).toBe('kg');
    expect(weightColumnLabel(fieldsForInputType('weight_reps'), 'lb')).toBe('lb');
    expect(weightColumnLabel(fieldsForInputType('weighted_bodyweight'), 'kg')).toBe('+kg');
    expect(weightColumnLabel(fieldsForInputType('assisted_bodyweight'), 'lb')).toBe('−lb');
  });
});

describe('supportsPlateCalc', () => {
  it('tylko sztanga-podobne typy', () => {
    expect(supportsPlateCalc('weight_reps')).toBe(true);
    expect(supportsPlateCalc('weighted_bodyweight')).toBe(true);
    expect(supportsPlateCalc('reps_only')).toBe(false);
    expect(supportsPlateCalc('duration')).toBe(false);
  });
});
