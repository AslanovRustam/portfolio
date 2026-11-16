import { Color } from 'three';
import { mulberry32 } from './random';

const PALETTE = ['#ffcf8a', '#ffb36b', '#9fd8ff', '#ff3d6e', '#35e0ff', '#ff7a1a', '#fff1d6'].map((c) => new Color(c));

/**
 * How far the skyline's blocks keep from the road's axis, m: the ride drives in among them (the gantry
 * stands at z −40, the camera goes on to −44), so a block may neither reach the sidewalks nor the
 * gantry's posts. A block drawn nearer is moved out, the rest of the skyline left as it was.
 */
export const SKYLINE_CLEAR = 9.5;

/** The far blocks and the defocused city lights, the same for a seed. */
export function skylineLayout(seed: number) {
  const rand = mulberry32(seed);
  const blocks: { x: number; z: number; w: number; d: number; h: number }[] = [];
  let x = -60;
  while (x < 60) {
    const w = 5 + rand() * 9;
    const cx = x + w / 2;
    if (Math.abs(cx) > 6) {
      const out = Math.sign(cx) * Math.max(Math.abs(cx), SKYLINE_CLEAR + w / 2);
      blocks.push({ x: out, z: -34 - rand() * 18, w, d: 8, h: 10 + rand() * 30 });
    }
    x += w + 0.5 + rand() * 2;
  }
  // defocused city lights: windows, shop neons, far headlights at street level
  const n = 140;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const size = new Float32Array(n);
  const phase = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const street = rand() < 0.25;
    pos.set([(rand() - 0.5) * 70, street ? 0.4 + rand() * 2.5 : 2 + rand() * 24, -20 - rand() * 34], i * 3);
    const c = PALETTE[Math.floor(rand() * PALETTE.length)];
    col.set([c.r, c.g, c.b], i * 3);
    size[i] = 0.35 + rand() * (street ? 1.1 : 0.7);
    phase[i] = rand() * 6.283;
  }
  return { blocks, bokeh: { pos, col, size, phase } };
}
