import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import sharp from 'sharp';
import { expect, it } from 'vitest';
import { TV_MODELS } from '@/scene/tvwall/layout';

/** The images a set's glTF points at, by role. */
function maps(url: string) {
  const file = `public${url}`;
  const gltf = JSON.parse(readFileSync(file, 'utf8')) as { images: { uri: string }[] };
  const find = (re: RegExp) => join(dirname(file), gltf.images.find((i) => re.test(i.uri))!.uri);
  return { diff: find(/_diff_/), nor: find(/_nor_gl_/) };
}

it('each set carries a 2k colour map and a 1k normal map, so its badge and knobs read close up', async () => {
  for (const m of Object.values(TV_MODELS)) {
    const { diff, nor } = maps(m.url);
    expect((await sharp(diff).metadata()).width, diff).toBe(2048);
    expect((await sharp(nor).metadata()).width, nor).toBe(1024);
  }
});
