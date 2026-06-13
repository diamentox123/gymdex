import { describe, it, expect } from 'vitest';
import { calcPlates, DEFAULT_BAR_KG } from './plates';

describe('kalkulator talerzy', () => {
  it('100 kg na sztandze 20 kg = 40 kg na stronę = 25+15', () => {
    const r = calcPlates(100);
    expect(r.perSide).toEqual([25, 15]);
    expect(r.achievable).toBe(100);
    expect(r.remainder).toBe(0);
  });

  it('sam ciężar sztangi → brak talerzy', () => {
    const r = calcPlates(20);
    expect(r.perSide).toEqual([]);
    expect(r.achievable).toBe(20);
  });

  it('ciężar poniżej sztangi → belowBar', () => {
    const r = calcPlates(15);
    expect(r.belowBar).toBe(true);
    expect(r.achievable).toBe(DEFAULT_BAR_KG);
  });

  it('60 kg = 20 kg na stronę = jeden talerz 20', () => {
    const r = calcPlates(60);
    expect(r.perSide).toEqual([20]);
  });

  it('rozkłada 2.5 i 1.25 bez błędów zmiennoprzecinkowych', () => {
    const r = calcPlates(25); // 2.5 na stronę = 2.5
    expect(r.perSide).toEqual([2.5]);
    expect(r.achievable).toBe(25);
    expect(r.remainder).toBe(0);
  });

  it('zgłasza resztę gdy talerze nie składają ciężaru', () => {
    const r = calcPlates(21, 20, [25]); // 0.5 na stronę, najmniejszy talerz 25
    expect(r.remainder).toBeGreaterThan(0);
  });

  it('składa złożony ciężar 142.5 kg', () => {
    const r = calcPlates(142.5); // (142.5-20)/2 = 61.25 = 25+20+15+1.25
    const sum = r.perSide.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(61.25, 6);
    expect(r.achievable).toBeCloseTo(142.5, 6);
  });
});
