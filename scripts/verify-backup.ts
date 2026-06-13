import { validateBackup } from '../src/lib/backup-schema';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'panda-backup.json'), 'utf8'));

const { error } = validateBackup(data);
console.log('Walidacja formatu:', error ?? 'OK');

const T = data.tables;
const exIds = new Set(T.exercises.map((e: any) => e.id));
const weIds = new Set(T.workout_exercises.map((w: any) => w.id));
const woIds = new Set(T.workouts.map((w: any) => w.id));
let badEx = 0, badWo = 0, badWe = 0;
T.workout_exercises.forEach((we: any) => {
  if (!exIds.has(we.exercise_id)) badEx++;
  if (!woIds.has(we.workout_id)) badWo++;
});
T.workout_sets.forEach((s: any) => { if (!weIds.has(s.workout_exercise_id)) badWe++; });
console.log('Sieroce exercise_id:', badEx, '| sieroce workout_id:', badWo, '| sieroce workout_exercise_id:', badWe);

const w0 = T.workouts[0];
console.log('\n=== Pierwszy trening ===');
console.log('Nazwa:', w0.name, '| data:', new Date(w0.started_at).toISOString().slice(0, 16), '| czas(s):', w0.duration_sec);
T.workout_exercises.filter((we: any) => we.workout_id === w0.id).forEach((we: any) => {
  const ex = T.exercises.find((e: any) => e.id === we.exercise_id);
  const sets = T.workout_sets.filter((s: any) => s.workout_exercise_id === we.id);
  console.log('  •', ex?.name, '—', sets.map((s: any) => s.weight + 'kg×' + s.reps).join(', '));
});

const weights = T.workout_sets.map((s: any) => s.weight).filter((w: any) => w != null);
console.log('\nCiezary: min', Math.min(...weights), 'max', Math.max(...weights),
  '| serii z null weight:', T.workout_sets.filter((s: any) => s.weight == null).length,
  '| serii z null reps:', T.workout_sets.filter((s: any) => s.reps == null).length);

// --- Rutyny: integralnosc + podglad ---
const reIds = new Set(T.routine_exercises.map((r: any) => r.id));
const rIds = new Set(T.routines.map((r: any) => r.id));
let badREx = 0, badRRoutine = 0, badRSet = 0;
T.routine_exercises.forEach((re: any) => {
  if (!exIds.has(re.exercise_id)) badREx++;
  if (!rIds.has(re.routine_id)) badRRoutine++;
});
T.routine_sets.forEach((s: any) => { if (!reIds.has(s.routine_exercise_id)) badRSet++; });
console.log('\n=== Rutyny (' + T.routines.length + ') ===');
console.log('Sieroce exercise_id:', badREx, '| routine_id:', badRRoutine, '| routine_exercise_id:', badRSet);
T.routines.forEach((r: any) => {
  console.log('\n▸', r.name);
  T.routine_exercises.filter((re: any) => re.routine_id === r.id)
    .sort((a: any, b: any) => a.order_index - b.order_index)
    .forEach((re: any) => {
      const ex = T.exercises.find((e: any) => e.id === re.exercise_id);
      const sets = T.routine_sets.filter((s: any) => s.routine_exercise_id === re.id);
      const reps = sets[0]?.target_reps;
      console.log(`   ${sets.length}×${reps}  ${ex?.name}  (przerwa ${re.rest_seconds}s)`);
    });
});
