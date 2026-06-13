// Generuje src/data/exercise-guide.ts z scripts/guides-verified.json.
// Pomija ćwiczenia bez zdjęć (imageCount 0) w mapie media, ale opis (steps)
// zachowuje zawsze, jeśli istnieje — tekst działa offline nawet bez zdjęć.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const guides = JSON.parse(fs.readFileSync(path.join(dir, 'guides-verified.json'), 'utf8'));

const entries = guides
  .filter((g) => (g.steps && g.steps.length) || g.imageCount > 0)
  .map((g) => {
    const steps = (g.steps || []).map((s) => '      ' + JSON.stringify(s) + ',').join('\n');
    return `  ${JSON.stringify(g.id)}: {
    mediaId: ${g.imageCount > 0 ? JSON.stringify(g.mediaId) : 'null'},
    imageCount: ${g.imageCount},
    steps: [
${steps}
    ],
  },`;
  })
  .join('\n');

const file = `/**
 * Instruktaże ćwiczeń: zdjęcia pozycji (start/koniec) + opis techniki po
 * polsku. Dane luźno powiązane z biblioteką po \`id\` ćwiczenia — trzymamy je
 * tu (nie w DB), żeby dało się je swobodnie rozbudowywać bez migracji bazy.
 *
 * Zdjęcia: free-exercise-db (licencja: Unlicense / public domain):
 * https://github.com/yuhonas/free-exercise-db
 * \`mediaId\` to identyfikator ćwiczenia w tamtej bazie (null = brak zdjęć,
 * zostaje sam opis tekstowy). WYGENEROWANE automatycznie — patrz scripts/.
 */

const FEDB_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

export interface ExerciseGuide {
  /** id ćwiczenia w free-exercise-db (null = brak zdjęć). */
  mediaId: string | null;
  /** Liczba zdjęć pozycji (0–2). */
  imageCount: number;
  /** Opis techniki po polsku (kroki). */
  steps: string[];
}

/** Pełne URL-e zdjęć pozycji dla danego instruktażu (puste, gdy brak mediaId). */
export function guideImageUrls(g: ExerciseGuide): string[] {
  if (!g.mediaId || g.imageCount <= 0) return [];
  return Array.from({ length: g.imageCount }, (_, i) => \`\${FEDB_BASE}/\${g.mediaId}/\${i}.jpg\`);
}

export const EXERCISE_GUIDES: Record<string, ExerciseGuide> = {
${entries}
};

export function getExerciseGuide(exerciseId: string): ExerciseGuide | null {
  return EXERCISE_GUIDES[exerciseId] ?? null;
}
`;

const outPath = path.join(dir, '..', 'src', 'data', 'exercise-guide.ts');
fs.writeFileSync(outPath, file);
console.log('Zapisano', outPath);
console.log('Instruktaży:', guides.filter((g) => (g.steps && g.steps.length) || g.imageCount > 0).length);
console.log('Ze zdjęciami:', guides.filter((g) => g.imageCount > 0).length);
