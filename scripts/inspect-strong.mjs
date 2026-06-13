// Jednorazowy podgląd eksportu Strong (strong_workouts.csv).
import fs from 'node:fs';

const raw = fs.readFileSync(new URL('../strong_workouts.csv', import.meta.url), 'utf8');

// Parser CSV świadomy cudzysłowów (RFC-4180-ish), delimiter = przecinek.
function parseLine(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else q = false;
      } else cur += ch;
    } else {
      if (ch === '"') q = true;
      else if (ch === ',') { out.push(cur); cur = ''; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

const lines = raw.split(/\r?\n/).filter((l) => l.trim());
const header = parseLine(lines[0]);
const rows = lines.slice(1).map(parseLine);
const col = (n) => header.indexOf(n);

console.log('Nagłówek:', header.join(' | '));
console.log('Liczba serii (wierszy):', rows.length);

const workouts = new Set(rows.map((r) => r[col('Date')] + '|' + r[col('Workout Name')]));
console.log('Liczba treningów (Date+Name):', workouts.size);

const dates = rows.map((r) => r[col('Date')]).sort();
console.log('Zakres dat:', dates[0], '->', dates[dates.length - 1]);

const ex = {};
rows.forEach((r) => {
  const n = r[col('Exercise Name')];
  ex[n] = (ex[n] || 0) + 1;
});
console.log('\n=== Ćwiczenia (' + Object.keys(ex).length + ' unikalnych) ===');
Object.entries(ex)
  .sort((a, b) => b[1] - a[1])
  .forEach(([n, c]) => console.log(String(c).padStart(4), n));

const ws = rows.map((r) => parseFloat(r[col('Weight')])).filter((w) => w > 0);
const distinct = [...new Set(ws)].sort((a, b) => a - b);
console.log('\n=== Weight: min', Math.min(...ws), 'max', Math.max(...ws), '===');
console.log('Unikalne ciężary:', distinct.join(', '));

// Czy są ćwiczenia oparte na czasie/dystansie?
const cardio = rows.filter((r) => parseFloat(r[col('Seconds')]) > 0 || parseFloat(r[col('Distance')]) > 0);
console.log('\nWierszy z czasem/dystansem (cardio):', cardio.length);
