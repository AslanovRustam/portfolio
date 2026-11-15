// Turns Rustam's portrait into About's street poster (spec §8): a 3:4 crop at 600×800, greyscale stretched to
// the full range, mapped through a neon duotone (near-black violet → About cyan), a light film grain, WebP
// no larger than 120 KB. Processing only: the face is not regenerated.
// Usage: npm run poster   (the source lives in examples/, which stays out of git)
import { mkdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { duotoneLut } from './poster/duotone.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(root, 'examples', '1782901779f3ef.png');
const OUT = join(root, 'public', 'about', 'poster.webp');
const SIZE = { width: 600, height: 800 };
const SHADOW = '#0b0716';
const HIGHLIGHT = '#5fe1ff';
const GAMMA = 1.05;
const GRAIN = 9; // ± levels of luminance noise
const MAX_BYTES = 120 * 1024;

const { data, info } = await sharp(SOURCE)
  .resize(SIZE.width, SIZE.height, { fit: 'cover', position: 'attention' })
  .greyscale()
  .normalise()
  .raw()
  .toBuffer({ resolveWithObject: true });

const lut = duotoneLut(SHADOW, HIGHLIGHT, GAMMA);
const out = Buffer.alloc(info.width * info.height * 3);
let seed = 7;
const noise = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296 - 0.5;
};
for (let i = 0; i < info.width * info.height; i++) {
  const v = Math.max(0, Math.min(255, Math.round(data[i * info.channels] + noise() * 2 * GRAIN)));
  out[i * 3] = lut[v * 3];
  out[i * 3 + 1] = lut[v * 3 + 1];
  out[i * 3 + 2] = lut[v * 3 + 2];
}

await mkdir(dirname(OUT), { recursive: true });
for (const quality of [82, 76, 70, 64]) {
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } }).webp({ quality }).toFile(OUT);
  const { size } = await stat(OUT);
  if (size <= MAX_BYTES) {
    console.log(`poster: ${info.width}×${info.height}, ${(size / 1024).toFixed(0)} KB (q ${quality})`);
    process.exit(0);
  }
}
console.error(`poster: still over ${MAX_BYTES / 1024} KB`);
process.exit(1);
