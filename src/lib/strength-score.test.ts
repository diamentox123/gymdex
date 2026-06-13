import { describe, it, expect } from 'vitest';
import { scoreLift, overallStrengthScore } from './strength-score';

describe('Strength Score', () => {
  it('wyciskanie 100 kg przy 80 kg masy = ratio 1.25 → wyższy poziom', () => {
    const r = scoreLift('wyciskanie-sztanga-lawka-plaska', 100, 80);
    expect(r).not.toBeNull();
    expect(r!.ratio).toBeCloseTo(1.25, 2);
    expect(r!.level).toBe('Zaawansowany');
  });

  it('słaby wynik → Początkujący', () => {
    const r = scoreLift('przysiad-ze-sztanga', 40, 80); // ratio 0.5 < pierwszy próg 0.75
    expect(r!.level).toBe('Początkujący');
  });

  it('bardzo mocny martwy ciąg → Światowa klasa', () => {
    const r = scoreLift('martwy-ciag', 280, 80); // ratio 3.5 > 3.25
    expect(r!.level).toBe('Światowa klasa');
  });

  it('zwraca null dla nieznanego ćwiczenia', () => {
    expect(scoreLift('nieistniejace', 100, 80)).toBeNull();
  });

  it('zwraca null dla zerowej masy ciała', () => {
    expect(scoreLift('martwy-ciag', 200, 0)).toBeNull();
  });

  it('procent jest w zakresie 0–100', () => {
    const r = scoreLift('martwy-ciag', 1000, 80);
    expect(r!.percent).toBeLessThanOrEqual(100);
    expect(r!.percent).toBeGreaterThanOrEqual(0);
  });

  it('overallStrengthScore uśrednia procenty', () => {
    const lifts = [
      scoreLift('wyciskanie-sztanga-lawka-plaska', 100, 80)!,
      scoreLift('przysiad-ze-sztanga', 160, 80)!,
    ];
    const overall = overallStrengthScore(lifts);
    expect(overall).not.toBeNull();
    expect(overall!.score).toBeGreaterThan(0);
  });

  it('overallStrengthScore zwraca null dla pustej listy', () => {
    expect(overallStrengthScore([])).toBeNull();
  });
});
