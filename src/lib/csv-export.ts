/**
 * Eksport historii treningów do CSV (kompatybilny ze Strong/Excel).
 * Czysta logika — bez DB; przyjmuje już zebrane wiersze. Jeden wiersz = seria.
 *
 * Format kolumn wzorowany na eksporcie Strong (wariant z przecinkami), żeby
 * dało się otworzyć w Excelu i ewentualnie zaimportować do innych apek.
 */

export interface CsvSetRow {
  date: string; // "YYYY-MM-DD HH:mm:ss"
  workoutName: string;
  exerciseName: string;
  setOrder: number;
  weight: number | null; // w jednostce wyjściowej (kg domyślnie)
  reps: number | null;
  rpe: number | null;
  distance: number | null;
  seconds: number | null;
  notes: string;
}

const HEADER = [
  'Date',
  'Workout Name',
  'Exercise Name',
  'Set Order',
  'Weight',
  'Reps',
  'RPE',
  'Distance',
  'Seconds',
  'Notes',
];

/** Escapuje pole CSV (RFC-4180): cudzysłowy, przecinki, nowe linie. */
export function csvField(value: string | number | null): string {
  if (value == null) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/** Składa pełny tekst CSV z nagłówkiem + wierszami serii. */
export function buildCsv(rows: CsvSetRow[]): string {
  const lines = [HEADER.join(',')];
  for (const r of rows) {
    lines.push(
      [
        csvField(r.date),
        csvField(r.workoutName),
        csvField(r.exerciseName),
        csvField(r.setOrder),
        csvField(r.weight),
        csvField(r.reps),
        csvField(r.rpe),
        csvField(r.distance),
        csvField(r.seconds),
        csvField(r.notes),
      ].join(',')
    );
  }
  return lines.join('\n');
}
