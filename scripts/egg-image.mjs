// The Mentor's statue for the M6 egg: examples/ PNG → public/egg/mentor.webp, 1000 px tall, ≤ 160 KB.
import { mkdirSync, statSync } from 'node:fs';
import sharp from 'sharp';

const src = 'examples/Mentor in the Museum Gallery.png';
const out = 'public/egg/mentor.webp';
mkdirSync('public/egg', { recursive: true });
for (const quality of [80, 74, 68, 62, 56]) {
  await sharp(src).resize({ height: 1000 }).webp({ quality, effort: 6 }).toFile(out);
  const kb = statSync(out).size / 1024;
  console.log(`quality ${quality}: ${kb.toFixed(1)} KB`);
  if (kb <= 160) break;
}
