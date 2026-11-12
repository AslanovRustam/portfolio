// Downloads the CC0 assets listed in scripts/assets.manifest.json into public/ and copies the OFL fonts.
// Texture maps are re-encoded to WebP (they would not fit the 6 MB asset budget as JPG). Idempotent.
import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(join(root, 'scripts/assets.manifest.json'), 'utf8'));
const UA = { 'User-Agent': 'portfolio-asset-fetch/1.0' };

const exists = async (p) => !!(await stat(p).catch(() => null));

async function files(id) {
  const res = await fetch(`https://api.polyhaven.com/files/${id}`, { headers: UA });
  if (!res.ok) throw new Error(`Poly Haven: ${id} → HTTP ${res.status}`);
  return res.json();
}

async function download(url) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Normal maps keep more quality: compression artefacts there read as bumpy noise in highlights. */
const webpQuality = (map) => (map.startsWith('nor') ? 92 : 82);

for (const h of manifest.hdris) {
  const out = join(root, `public/hdri/${h.id}_${h.res}.hdr`);
  if (await exists(out)) continue;
  const f = await files(h.id);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, await download(f.hdri[h.res].hdr.url));
  console.log('hdri', out);
}

for (const t of manifest.textures) {
  const f = await files(t.id);
  for (const map of t.maps) {
    const out = join(root, `public/textures/${t.id}/${map.toLowerCase()}.webp`);
    if (await exists(out)) continue;
    const src = f[map]?.[t.res]?.jpg?.url;
    if (!src) throw new Error(`${t.id}: no ${t.res} jpg for ${map}`);
    await mkdir(dirname(out), { recursive: true });
    await sharp(await download(src)).webp({ quality: webpQuality(map) }).toFile(out);
    console.log('texture', out);
  }
}

for (const font of manifest.fonts) {
  const out = join(root, 'public/fonts', font.to);
  await mkdir(dirname(out), { recursive: true });
  await copyFile(join(root, font.from), out);
}
console.log('assets ready');
