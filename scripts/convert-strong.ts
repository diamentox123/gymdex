/**
 * Konwerter eksportu Strong (CSV, wariant z przecinkami) → plik kopii
 * zapasowej Panda Strength (JSON zgodny z `importData` / `BackupData`).
 *
 * Uruchom:  npx tsx scripts/convert-strong.ts
 * Wynik:    panda-backup.json  (do wklejenia w apce: Profil → Importuj)
 *           + raport mapowania na konsoli.
 *
 * Zasady:
 *  - Zachowujemy PEŁNĄ wbudowaną bibliotekę ćwiczeń (SEED_EXERCISES).
 *  - Ćwiczenia ze Strong mapujemy na istniejące id; brakujące tworzymy
 *    jako własne (isCustom = 1).
 *  - Ciężary w pliku są w KG (potwierdzone z użytkownikiem) → zapis 1:1.
 *  - Jeden wiersz CSV = jedna seria; grupujemy po (Date + Workout Name).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEED_EXERCISES } from '../src/data/exercises';
import type { ExerciseDef } from '../src/lib/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// ---------- 1. Mapowanie nazw Strong → id Panda Strength ----------
// 23/24 mapuje się na wbudowane; Hip Adductor tworzymy jako własne.
const MAP: Record<string, string> = {
  'Incline Bench Press (Barbell)': 'wyciskanie-sztanga-skos-gora',
  'Bench Press (Barbell)': 'wyciskanie-sztanga-lawka-plaska',
  'Bench Press (Dumbbell)': 'wyciskanie-hantle-lawka-plaska',
  'Incline Chest Press (Machine)': 'wyciskanie-maszyna-klatka',
  'Lat Pulldown (Machine)': 'sciaganie-drazka-gora',
  'Lat Pulldown (Cable)': 'sciaganie-drazka-gora',
  'Seated Row (Cable)': 'wioslowanie-wyciag-dol',
  'Seated Row (Machine)': 'wioslowanie-maszyna',
  'T Bar Row': 'wioslowanie-t-bar',
  'Deadlift (Barbell)': 'martwy-ciag',
  'Hack Squat': 'przysiad-hack',
  'Overhead Press (Smith Machine)': 'wyciskanie-zolnierskie',
  'Lateral Raise (Cable)': 'unoszenie-bokiem-wyciag',
  'Reverse Fly (Dumbbell)': 'odwrotne-rozpietki',
  'Triceps Extension (Cable)': 'prostowanie-wyciag-lina',
  'Triceps Pushdown (Cable - Straight Bar)': 'prostowanie-wyciag-drazek',
  'Preacher Curl (Machine)': 'uginanie-modlitewnik',
  'Hammer Curl (Dumbbell)': 'uginanie-mlotkowe',
  'Incline Curl (Dumbbell)': 'uginanie-skosna-lawka',
  'Leg Extension (Machine)': 'prostowanie-nog-maszyna',
  'Lying Leg Curl (Machine)': 'uginanie-nog-lezac',
  'Cable Crunch': 'spiecia-wyciag',
  'Hip Abductor (Machine)': 'odwodzenie-maszyna',
  // 'Hip Adductor (Machine)' — brak odpowiednika → własne (niżej)
};

// Własne ćwiczenia dla niezmapowanych nazw Strong.
const CUSTOM: Record<string, ExerciseDef> = {
  'Hip Adductor (Machine)': {
    id: 'wlasne-przywodzenie-maszyna',
    name: 'Przywodzenie nóg na maszynie',
    bodyPart: 'nogi',
    equipment: 'maszyna',
    inputType: 'weight_reps',
    isCustom: true,
  },
};

// ---------- 2. Parser CSV (świadomy cudzysłowów) ----------
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let cur = '';
  let field: string[] = [];
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; }
        else q = false;
      } else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { field.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      field.push(cur); cur = '';
      if (field.length > 1 || field[0] !== '') rows.push(field);
      field = [];
    } else cur += ch;
  }
  if (cur !== '' || field.length) { field.push(cur); rows.push(field); }
  const header = rows[0];
  return rows.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

// ---------- 3. Pomocnicze ----------
function num(s: string): number | null {
  if (s == null || s.trim() === '') return null;
  const v = parseFloat(s.replace(',', '.'));
  return Number.isNaN(v) ? null : v;
}
function intOrNull(s: string): number | null {
  const v = num(s);
  return v == null ? null : Math.round(v);
}
let _c = 0;
function id(prefix: string, t: number): string {
  _c++;
  return `${prefix}_${t.toString(36)}${_c.toString(36)}`;
}
/** "1h 14m" / "45m" / "98h 21m" → sekundy; absurdy (>24h) → null. */
function parseDuration(s: string): number | null {
  const h = /(\d+)h/.exec(s);
  const m = /(\d+)m/.exec(s);
  let sec = (h ? +h[1] * 3600 : 0) + (m ? +m[1] * 60 : 0);
  if (sec <= 0 || sec > 24 * 3600) return null; // Strong bywa zepsuty (np. 98h)
  return sec;
}

// ---------- 4. Konwersja ----------
const csv = fs.readFileSync(path.join(ROOT, 'strong_workouts.csv'), 'utf8');
const rows = parseCsv(csv);

// Zbierz nazwy ćwiczeń i ostrzeż o niezmapowanych.
const unmapped = new Set<string>();
function resolveExerciseId(name: string): string {
  if (MAP[name]) return MAP[name];
  if (CUSTOM[name]) return CUSTOM[name].id;
  unmapped.add(name);
  return ''; // pominiemy serię, ale to nie powinno się zdarzyć
}

// Grupowanie w treningi po (Date + Workout Name), z zachowaniem kolejności
// ćwiczeń i serii.
interface WGroup {
  date: number;
  name: string;
  durationSec: number | null;
  // exerciseId → lista serii
  order: string[]; // kolejność wystąpień exerciseId
  sets: Record<string, Record<string, string>[]>;
}
const groups = new Map<string, WGroup>();

for (const r of rows) {
  const exId = resolveExerciseId(r['Exercise Name']);
  if (!exId) continue;
  const dateStr = r['Date'];
  const ts = Date.parse(dateStr.replace(' ', 'T')); // lokalny czas bez strefy
  const key = dateStr + '|' + r['Workout Name'];
  let g = groups.get(key);
  if (!g) {
    g = {
      date: ts,
      name: r['Workout Name'] || 'Trening',
      durationSec: parseDuration(r['Duration'] ?? ''),
      order: [],
      sets: {},
    };
    groups.set(key, g);
  }
  if (!g.sets[exId]) { g.sets[exId] = []; g.order.push(exId); }
  g.sets[exId].push(r);
}

// ---------- 5. Budowa tabel backupu (kolumny snake_case = jak w DDL) ----------
const tWorkouts: any[] = [];
const tWorkoutExercises: any[] = [];
const tWorkoutSets: any[] = [];

const sortedGroups = [...groups.values()].sort((a, b) => a.date - b.date);
for (const g of sortedGroups) {
  const wid = id('wo', g.date);
  const finishedAt = g.durationSec ? g.date + g.durationSec * 1000 : g.date;
  tWorkouts.push({
    id: wid,
    name: g.name,
    started_at: g.date,
    finished_at: finishedAt,
    duration_sec: g.durationSec,
    notes: 'Zaimportowano ze Strong',
    routine_id: null,
  });
  g.order.forEach((exId, exIdx) => {
    const weid = id('we', g.date);
    tWorkoutExercises.push({
      id: weid,
      workout_id: wid,
      exercise_id: exId,
      order_index: exIdx,
      rest_seconds: 120,
      superset_group: null,
      notes: null,
    });
    g.sets[exId].forEach((s, setIdx) => {
      tWorkoutSets.push({
        id: id('ws', g.date),
        workout_exercise_id: weid,
        order_index: setIdx,
        set_type: 'normal',
        weight: num(s['Weight']) ?? null, // kg
        reps: intOrNull(s['Reps']),
        rpe: num(s['RPE']),
        rir: null,
        duration_sec: intOrNull(s['Seconds']) || null,
        distance_m: num(s['Distance']) || null,
        is_completed: 1, // w eksporcie są tylko wykonane serie
        is_pr: 0,
        completed_at: g.date,
      });
    });
  });
}

// Ćwiczenia: pełna biblioteka + własne. Mapujemy ExerciseDef → wiersz DB.
function exToRow(e: ExerciseDef) {
  return {
    id: e.id,
    name: e.name,
    body_part: e.bodyPart,
    equipment: e.equipment,
    input_type: e.inputType,
    secondary: e.secondary ? JSON.stringify(e.secondary) : null,
    is_custom: e.isCustom ? 1 : 0,
    notes: e.notes ?? null,
  };
}
const tExercises = [
  ...SEED_EXERCISES.map(exToRow),
  ...Object.values(CUSTOM).map(exToRow),
];

// Ustawienia: jeden wiersz 'app', kg (jak potwierdził użytkownik).
const tSettings = [{
  id: 'app', unit: 'kg', language: 'pl', theme: 'system',
  rest_default_sec: 120, rest_auto_start: 1, bar_weight_kg: 20, haptics_enabled: 1,
}];

// ---------- Rutyny z planu Góra/Dół (PDF) ----------
// targetReps = górna granica zakresu (cel progresji: zrób górną granicę → dołóż ciężar).
// targetWeight = null (uzupełniane na treningu). restSeconds wg kolumny „Przerwa".
interface RPlan {
  name: string;
  exercises: { id: string; sets: number; reps: number; rest: number }[];
}
const ROUTINE_PLANS: RPlan[] = [
  {
    name: 'Góra A',
    exercises: [
      { id: 'wyciskanie-sztanga-skos-gora', sets: 4, reps: 10, rest: 180 }, // Incline Bench Press
      { id: 'sciaganie-drazka-gora', sets: 3, reps: 12, rest: 120 },        // Lat Pulldown
      { id: 'wioslowanie-wyciag-dol', sets: 3, reps: 12, rest: 120 },       // Seated Row
      { id: 'wyciskanie-zolnierskie', sets: 3, reps: 12, rest: 120 },       // OHP (Smith)
      { id: 'unoszenie-bokiem-wyciag', sets: 3, reps: 20, rest: 60 },       // Lateral Raise
      { id: 'prostowanie-nad-glowa-wyciag', sets: 3, reps: 15, rest: 90 },  // Triceps overhead
      { id: 'uginanie-skosna-lawka', sets: 3, reps: 15, rest: 90 },         // Incline Curl
      { id: 'spiecia-wyciag', sets: 3, reps: 15, rest: 60 },                // brzuch: allahy
      { id: 'skrety-tulowia-wyciag', sets: 3, reps: 15, rest: 45 },         // brzuch: skośne (drwal)
    ],
  },
  {
    name: 'Góra B',
    exercises: [
      { id: 'wyciskanie-hantle-lawka-plaska', sets: 3, reps: 12, rest: 120 }, // Bench Press (hantle)
      { id: 'wioslowanie-t-bar', sets: 3, reps: 12, rest: 120 },             // T-Bar Row
      { id: 'sciaganie-drazka-waski', sets: 3, reps: 12, rest: 120 },        // Pulldown inny chwyt
      { id: 'wyciskanie-maszyna-klatka', sets: 3, reps: 12, rest: 90 },      // Incline Chest Press (maszyna)
      { id: 'unoszenie-bokiem-wyciag', sets: 3, reps: 20, rest: 60 },        // Lateral Raise
      { id: 'odwrotne-rozpietki', sets: 3, reps: 20, rest: 60 },             // Reverse Fly
      { id: 'prostowanie-wyciag-drazek', sets: 3, reps: 15, rest: 90 },      // Triceps pushdown
      { id: 'uginanie-modlitewnik', sets: 2, reps: 15, rest: 90 },          // Preacher Curl
      { id: 'uginanie-mlotkowe', sets: 2, reps: 15, rest: 90 },             // Hammer Curl
      { id: 'spiecia-wyciag', sets: 3, reps: 15, rest: 60 },                // brzuch: allahy
      { id: 'skrety-tulowia-wyciag', sets: 3, reps: 15, rest: 45 },         // brzuch: skośne (drwal)
    ],
  },
  {
    name: 'Dół',
    exercises: [
      { id: 'przysiad-hack', sets: 3, reps: 12, rest: 180 },           // Hack Squat
      { id: 'martwy-ciag-rumunski', sets: 3, reps: 12, rest: 180 },    // Romanian Deadlift
      { id: 'uginanie-nog-lezac', sets: 3, reps: 15, rest: 90 },       // Lying Leg Curl
      { id: 'prostowanie-nog-maszyna', sets: 2, reps: 15, rest: 90 },  // Leg Extension
      { id: 'wspiecia-stojac', sets: 3, reps: 20, rest: 60 },          // Standing Calf Raise
      { id: 'wspiecia-siedzac', sets: 3, reps: 20, rest: 60 },         // Seated Calf Raise
    ],
  },
];

const tRoutines: any[] = [];
const tRoutineExercises: any[] = [];
const tRoutineSets: any[] = [];
const baseTs = backupExportTs();
function backupExportTs() {
  return sortedGroups.length ? sortedGroups[sortedGroups.length - 1].date : 1700000000000;
}
// Sanity: każdy id z planu musi istnieć w bibliotece.
const libIds = new Set(tExercises.map((e) => e.id));
const missingRoutineEx: string[] = [];
ROUTINE_PLANS.forEach((plan, planIdx) => {
  const rid = id('rt', baseTs);
  tRoutines.push({
    id: rid,
    name: plan.name,
    notes: 'Z planu Góra/Dół',
    order_index: planIdx,
    created_at: baseTs + planIdx,
  });
  plan.exercises.forEach((ex, exIdx) => {
    if (!libIds.has(ex.id)) missingRoutineEx.push(plan.name + ' → ' + ex.id);
    const reId = id('re', baseTs);
    tRoutineExercises.push({
      id: reId,
      routine_id: rid,
      exercise_id: ex.id,
      order_index: exIdx,
      rest_seconds: ex.rest,
      superset_group: null,
      notes: null,
    });
    for (let s = 0; s < ex.sets; s++) {
      tRoutineSets.push({
        id: id('rsp', baseTs),
        routine_exercise_id: reId,
        order_index: s,
        target_reps: ex.reps,
        target_weight: null,
        set_type: 'normal',
      });
    }
  });
});

const backup = {
  version: 1,
  exportedAt: sortedGroups.length ? sortedGroups[sortedGroups.length - 1].date : 0,
  tables: {
    exercises: tExercises,
    routines: tRoutines,
    routine_exercises: tRoutineExercises,
    routine_sets: tRoutineSets,
    workouts: tWorkouts,
    workout_exercises: tWorkoutExercises,
    workout_sets: tWorkoutSets,
    personal_records: [],
    body_measurements: [],
    settings: tSettings,
  },
};

const outPath = path.join(ROOT, 'panda-backup.json');
fs.writeFileSync(outPath, JSON.stringify(backup, null, 2));

// ---------- 6. Raport ----------
console.log('=== KONWERSJA STRONG → PANDA STRENGTH ===');
console.log('Treningi:', tWorkouts.length);
console.log('Ćwiczenia w treningach:', tWorkoutExercises.length);
console.log('Serie:', tWorkoutSets.length);
console.log('Biblioteka ćwiczeń w backupie:', tExercises.length, `(w tym ${Object.keys(CUSTOM).length} własne)`);
if (unmapped.size) {
  console.log('\n⚠️  NIEZMAPOWANE ćwiczenia (serie pominięte!):');
  [...unmapped].forEach((n) => console.log('   -', n));
} else {
  console.log('\n✓ Wszystkie ćwiczenia z historii zmapowane.');
}

console.log('\n=== RUTYNY z planu ===');
tRoutines.forEach((r) => {
  const exCount = tRoutineExercises.filter((e) => e.routine_id === r.id).length;
  console.log(`  • ${r.name} — ${exCount} ćwiczeń`);
});
if (missingRoutineEx.length) {
  console.log('⚠️  Rutyna odwołuje się do nieistniejącego ćwiczenia:');
  missingRoutineEx.forEach((m) => console.log('   -', m));
} else {
  console.log('✓ Wszystkie ćwiczenia w rutynach istnieją w bibliotece.');
}
console.log('\nZapisano:', outPath);
const sizeKb = (fs.statSync(outPath).size / 1024).toFixed(0);
console.log('Rozmiar:', sizeKb, 'KB');
