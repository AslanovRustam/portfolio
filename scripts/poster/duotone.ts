// The About poster's colour map (scripts/about-poster.mjs). Erasable TypeScript only: Node runs it by type
// stripping, and Vitest imports it for the unit tests.

const rgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/**
 * A duotone lookup table: 256 RGB triples running from `shadow` (luminance 0) to `highlight` (255).
 * `gamma` above 1 holds the mid-tones down in the shadow colour, which keeps a night portrait dark.
 */
export function duotoneLut(shadow: string, highlight: string, gamma: number): Uint8Array {
  const a = rgb(shadow);
  const b = rgb(highlight);
  const lut = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = (i / 255) ** gamma;
    for (let c = 0; c < 3; c++) lut[i * 3 + c] = Math.round(a[c] + (b[c] - a[c]) * t);
  }
  return lut;
}
