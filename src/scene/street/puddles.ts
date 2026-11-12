import { mulberry32 } from './random';

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Roughness-like puddle mask, size×size, values 0..1: low = standing water (sharp reflection),
 * high = dry asphalt. Tileable value-noise fbm thresholded into soft-edged blobs.
 */
export function puddleMask(size: number, seed: number): Float32Array {
  const rand = mulberry32(seed);
  const octaves = [
    { cells: 4, amp: 0.55 },
    { cells: 8, amp: 0.25 },
    { cells: 16, amp: 0.13 },
    { cells: 32, amp: 0.07 },
  ].map((o) => ({ ...o, grid: Float32Array.from({ length: o.cells * o.cells }, rand) }));

  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let n = 0;
      for (const { cells, amp, grid } of octaves) {
        const fx = (x / size) * cells;
        const fy = (y / size) * cells;
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const tx = fx - x0;
        const ty = fy - y0;
        const sx = tx * tx * (3 - 2 * tx);
        const sy = ty * ty * (3 - 2 * ty);
        const at = (i: number, j: number) => grid[(j % cells) * cells + (i % cells)];
        const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
        const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
        n += (top + (bottom - top) * sy) * amp;
      }
      // n ≈ 0..1: the lower ~third becomes water, with a soft shore
      out[y * size + x] = 0.08 + 0.92 * smoothstep(0.41, 0.46, n);
    }
  }
  return out;
}
