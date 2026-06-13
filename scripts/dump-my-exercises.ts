import { SEED_EXERCISES } from '../src/data/exercises';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const lines = SEED_EXERCISES.map((e) =>
  [e.id, e.name, e.equipment, e.bodyPart, e.inputType].join(' | ')
);
fs.writeFileSync(path.join(dir, 'my-exercises.txt'), lines.join('\n'));
console.log('Nasze cwiczenia:', SEED_EXERCISES.length);
