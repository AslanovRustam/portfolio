import { RepeatWrapping, SRGBColorSpace, Texture } from 'three';
import { expect, it } from 'vitest';
import { tiled } from '@/scene/pole/textures';

it('a tiled clone carries the colour space it is given, whatever the original says', () => {
  const original = new Texture();
  const c = tiled(original, 1, 14, SRGBColorSpace);
  expect(c).not.toBe(original);
  expect(c.colorSpace).toBe(SRGBColorSpace);
  expect(c.wrapS).toBe(RepeatWrapping);
  expect(c.wrapT).toBe(RepeatWrapping);
  expect(c.repeat.y).toBe(14);
});
