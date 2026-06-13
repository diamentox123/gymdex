// Weryfikuje, że zdjęcia (0.jpg, 1.jpg) dla każdego mediaId istnieją w free-exercise-db.
// Wejście: scripts/guides-raw.json  (tablica {id, mediaId, steps})
// Wyjście: scripts/guides-verified.json (z polem imageCount: 0/1/2) + raport.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';
const guides = JSON.parse(fs.readFileSync(path.join(dir, 'guides-raw.json'), 'utf8'));

async function head(url) {
  try {
    const r = await fetch(url, { method: 'HEAD' });
    return r.status === 200;
  } catch {
    return false;
  }
}

const out = [];
let noMedia = 0, noImg = 0;
for (const g of guides) {
  if (!g.mediaId) { out.push({ ...g, imageCount: 0 }); noMedia++; continue; }
  const has0 = await head(`${BASE}/${g.mediaId}/0.jpg`);
  const has1 = has0 ? await head(`${BASE}/${g.mediaId}/1.jpg`) : false;
  const imageCount = (has0 ? 1 : 0) + (has1 ? 1 : 0);
  if (imageCount === 0) noImg++;
  out.push({ ...g, imageCount });
  process.stdout.write(imageCount > 0 ? '.' : 'x');
}
console.log('');
fs.writeFileSync(path.join(dir, 'guides-verified.json'), JSON.stringify(out, null, 2));
console.log('Razem:', out.length, '| bez mediaId:', noMedia, '| mediaId bez zdjęć (404):', noImg);
console.log('Ze zdjęciami:', out.filter((g) => g.imageCount > 0).length);
