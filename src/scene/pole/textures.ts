import { type ColorSpace, NoColorSpace, RepeatWrapping, type Texture } from 'three';

/**
 * A repeat-wrapped clone of a shared (drei-cached) texture. The colour space is set on the clone here:
 * useTexture's onLoad runs after render, so a clone made during render would miss it and an sRGB
 * colour map would be sampled as linear (washed out).
 */
export function tiled(t: Texture, x: number, y: number, colorSpace: ColorSpace = NoColorSpace): Texture {
  const c = t.clone();
  c.wrapS = c.wrapT = RepeatWrapping;
  c.repeat.set(x, y);
  c.anisotropy = 8;
  c.colorSpace = colorSpace;
  c.needsUpdate = true;
  return c;
}
