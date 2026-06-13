import { describe, it, expect } from 'vitest';
import {
  trimNumber,
  formatWeight,
  formatDuration,
  formatWorkoutLength,
  formatSetsCount,
  formatDistance,
} from './format';

describe('formatowanie liczb', () => {
  it('usuwa zbędne zera', () => {
    expect(trimNumber(2.5)).toBe('2.5');
    expect(trimNumber(60)).toBe('60');
    expect(trimNumber(82.5)).toBe('82.5');
  });
});

describe('formatWeight', () => {
  it('pokazuje kg z jednostką', () => {
    expect(formatWeight(82.5, 'kg')).toBe('82.5 kg');
  });
  it('konwertuje na lb', () => {
    expect(formatWeight(100, 'lb')).toBe('220.5 lb');
  });
  it('może pominąć jednostkę', () => {
    expect(formatWeight(82.5, 'kg', false)).toBe('82.5');
  });
});

describe('formatDuration', () => {
  it('M:SS poniżej godziny', () => {
    expect(formatDuration(90)).toBe('1:30');
    expect(formatDuration(5)).toBe('0:05');
  });
  it('H:MM:SS powyżej godziny', () => {
    expect(formatDuration(3725)).toBe('1:02:05');
  });
  it('nie schodzi poniżej zera', () => {
    expect(formatDuration(-10)).toBe('0:00');
  });
});

describe('formatWorkoutLength', () => {
  it('minuty poniżej godziny', () => {
    expect(formatWorkoutLength(45 * 60)).toBe('45 min');
  });
  it('godziny i minuty', () => {
    expect(formatWorkoutLength(72 * 60)).toBe('1 h 12 min');
  });
  it('pełne godziny', () => {
    expect(formatWorkoutLength(120 * 60)).toBe('2 h');
  });
});

describe('formatSetsCount — polska odmiana', () => {
  it('1 seria', () => expect(formatSetsCount(1)).toBe('1 seria'));
  it('2-4 serie', () => {
    expect(formatSetsCount(2)).toBe('2 serie');
    expect(formatSetsCount(3)).toBe('3 serie');
  });
  it('5+ serii', () => {
    expect(formatSetsCount(5)).toBe('5 serii');
    expect(formatSetsCount(11)).toBe('11 serii');
    expect(formatSetsCount(12)).toBe('12 serii');
  });
  it('22 serie (wyjątek od 12-14)', () => {
    expect(formatSetsCount(22)).toBe('22 serie');
  });
});

describe('formatDistance', () => {
  it('metry poniżej km', () => {
    expect(formatDistance(850)).toBe('850 m');
  });
  it('kilometry', () => {
    expect(formatDistance(1200)).toContain('km');
  });
});
