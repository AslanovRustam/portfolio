/** A small seeded random (mulberry32), so a poster tears the same way on every render. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pct = (v: number) => `${+v.toFixed(2)}%`;

/**
 * A CSS `polygon()` for a street poster torn at the top and the bottom: `teeth` jagged points along each of
 * those edges, up to 3.5 % deep; the sides stay straight. Deterministic per seed.
 */
export function tornEdge(seed: number, teeth: number): string {
  const r = seeded(seed);
  const top: string[] = [];
  const bottom: string[] = [];
  for (let i = 0; i <= teeth; i++) {
    const x = (100 * i) / teeth;
    top.push(`${pct(x)} ${pct(r() * 3.5)}`);
  }
  for (let i = teeth; i >= 0; i--) {
    const x = (100 * i) / teeth;
    bottom.push(`${pct(x)} ${pct(100 - r() * 3.5)}`);
  }
  return `polygon(${[...top, ...bottom].join(', ')})`;
}
