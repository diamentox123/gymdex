import { describe, it, expect } from 'vitest';
import { validateBackup, parseBackup, BACKUP_VERSION } from './backup-schema';

const validBackup = {
  version: 1,
  exportedAt: 1700000000000,
  tables: {
    exercises: [{ id: 'e1', name: 'Przysiad' }],
    workouts: [],
    settings: [{ id: 'app', unit: 'kg' }],
  },
};

describe('validateBackup', () => {
  it('akceptuje poprawną kopię', () => {
    const { error, data } = validateBackup(validBackup);
    expect(error).toBeNull();
    expect(data?.version).toBe(1);
  });

  it('odrzuca null i prymitywy', () => {
    expect(validateBackup(null).error).toBeTruthy();
    expect(validateBackup(42).error).toBeTruthy();
    expect(validateBackup('tekst').error).toBeTruthy();
  });

  it('odrzuca brak wersji', () => {
    expect(validateBackup({ tables: {} }).error).toBeTruthy();
  });

  it('odrzuca nowszą wersję niż obsługiwana', () => {
    const { error } = validateBackup({ version: BACKUP_VERSION + 1, tables: {} });
    expect(error).toContain('nowszej wersji');
  });

  it('odrzuca brak sekcji tables', () => {
    expect(validateBackup({ version: 1 }).error).toBeTruthy();
  });

  it('odrzuca tables jako tablicę', () => {
    expect(validateBackup({ version: 1, tables: [] }).error).toBeTruthy();
  });

  it('odrzuca uszkodzoną tabelę (nie-tablica)', () => {
    const { error } = validateBackup({ version: 1, tables: { exercises: 'oops' } });
    expect(error).toContain('Uszkodzone');
  });

  it('ignoruje nieznane tabele (forward-compat)', () => {
    const { error } = validateBackup({
      version: 1,
      tables: { exercises: [], jakas_nowa_tabela: 'cokolwiek' },
    });
    expect(error).toBeNull();
  });
});

describe('parseBackup', () => {
  it('parsuje poprawny JSON', () => {
    const { error, data } = parseBackup(JSON.stringify(validBackup));
    expect(error).toBeNull();
    expect(data?.tables.exercises).toHaveLength(1);
  });

  it('zgłasza błąd przy niepoprawnym JSON', () => {
    const { error } = parseBackup('{ to nie jest json ');
    expect(error).toContain('JSON');
  });
});
