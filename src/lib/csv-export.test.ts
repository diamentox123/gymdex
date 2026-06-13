import { describe, it, expect } from 'vitest';
import { csvField, buildCsv, type CsvSetRow } from './csv-export';

describe('csvField', () => {
  it('puste dla null', () => {
    expect(csvField(null)).toBe('');
  });
  it('liczby bez zmian', () => {
    expect(csvField(42.5)).toBe('42.5');
  });
  it('escapuje przecinki i cudzysłowy', () => {
    expect(csvField('a,b')).toBe('"a,b"');
    expect(csvField('on "powiedział"')).toBe('"on ""powiedział"""');
  });
  it('escapuje nowe linie', () => {
    expect(csvField('linia1\nlinia2')).toBe('"linia1\nlinia2"');
  });
});

describe('buildCsv', () => {
  const rows: CsvSetRow[] = [
    {
      date: '2026-06-13 12:00:00',
      workoutName: 'Góra A',
      exerciseName: 'Wyciskanie sztangi',
      setOrder: 1,
      weight: 60,
      reps: 10,
      rpe: 8,
      distance: null,
      seconds: null,
      notes: '',
    },
  ];

  it('zaczyna się nagłówkiem Strong-like', () => {
    const csv = buildCsv(rows);
    expect(csv.split('\n')[0]).toBe('Date,Workout Name,Exercise Name,Set Order,Weight,Reps,RPE,Distance,Seconds,Notes');
  });

  it('zawiera wiersz danych', () => {
    const csv = buildCsv(rows);
    expect(csv).toContain('2026-06-13 12:00:00,Góra A,Wyciskanie sztangi,1,60,10,8,,,');
  });

  it('pusta lista = sam nagłówek', () => {
    expect(buildCsv([]).split('\n')).toHaveLength(1);
  });

  it('nazwa z przecinkiem jest escapowana', () => {
    const csv = buildCsv([{ ...rows[0], workoutName: 'Push, A' }]);
    expect(csv).toContain('"Push, A"');
  });
});
