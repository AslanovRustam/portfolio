import type { Pose, Vec3 } from './choreography';

/**
 * The places on the street the ride passes (spec §5), in metres; the road runs from the pole (z = 0) away
 * from the camera towards −z, its carriageway ±4 m, the sidewalks 2.6 m beyond.
 * - shop: the building on the left, its window between z0 and z1, its face at x
 * - pole: where the riding pole stops for About
 * - gantry: the sign gantry over the road
 * - billboard: the billboard at the end of the street, its centre height y
 */
export const STATIONS = {
  shop: { x: -6.6, z0: 0, z1: -11.8 },
  pole: { x: 1.4, z: -30 },
  gantry: { z: -40 },
  billboard: { z: -62, y: 7 },
} as const;

/** The intro's two keys: the blueprint from a raised three-quarter angle, then the pole (unchanged from the orbit). */
const INTRO: readonly { p: number; position: Vec3; target: Vec3 }[] = [
  { p: 0, position: [2.2, 3.6, 9.2], target: [0, 2.7, 0] },
  { p: 0.15, position: [1.4, 3.0, 6.2], target: [0, 3.0, 0] },
];

/**
 * The ride from the end of the intro: past the pole, along the shop on the left, up the pole for About,
 * under the gantry, to the billboard. Equal neighbours make a hold (the camera rests while the text rides).
 */
const RIDE: readonly { p: number; position: Vec3; target: Vec3 }[] = [
  { p: 0.15, position: [1.4, 3.0, 6.2], target: [0, 3.0, 0] },
  { p: 0.19, position: [0.6, 2.6, 0.5], target: [-3, 2.4, -8] },
  { p: 0.26, position: [0.4, 2.4, -6], target: [-6, 2.2, -8] },
  { p: 0.33, position: [0.4, 2.4, -15], target: [-6, 2.2, -12] },
  { p: 0.37, position: [0.8, 2.3, -22], target: [1.4, 2.2, -30] },
  { p: 0.4, position: [1.4, 2.0, -25.5], target: [1.4, 2.0, -30] },
  { p: 0.48, position: [1.4, 3.2, -25.6], target: [1.4, 3.2, -30] },
  { p: 0.565, position: [1.4, 4.4, -25.7], target: [1.4, 4.4, -30] },
  { p: 0.59, position: [0.8, 3.8, -28], target: [0.2, 5.2, -40] },
  { p: 0.62, position: [0, 3.4, -33], target: [0, 5.4, -40] },
  { p: 0.775, position: [0, 3.4, -33.1], target: [0, 5.4, -40] },
  // past the gantry, the billboard far ahead: a big panel, read from under 20 m away
  { p: 0.85, position: [0, 4.0, -42], target: [0, 6.6, -62] },
  { p: 1, position: [0, 4.2, -44], target: [0, 6.8, -62] },
];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smoothstep = (t: number) => t * t * (3 - 2 * t);

/**
 * Monotone cubic Hermite (Fritsch–Carlson) through (xs, ys): smooth, and it never overshoots a key, so a
 * camera that only moves forward between keys only moves forward in between too.
 */
function monotone(xs: readonly number[], ys: readonly number[], x: number): number {
  const n = xs.length;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[n - 1]) return ys[n - 1];
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  const m: number[] = new Array(n).fill(0);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  let i = 0;
  while (x > xs[i + 1]) i++;
  const h = xs[i + 1] - xs[i];
  const t = (x - xs[i]) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1]
  );
}

const xs = RIDE.map((k) => k.p);
const track = (pick: (k: (typeof RIDE)[number]) => Vec3) =>
  [0, 1, 2].map((c) => RIDE.map((k) => pick(k)[c])) as [number[], number[], number[]];
const POS = track((k) => k.position);
const TGT = track((k) => k.target);

/** The camera pose at story progress p: the intro as it was, then the ride down the street. */
export function ridePose(p: number): Pose {
  const q = clamp01(p);
  if (q <= INTRO[1].p) {
    const t = smoothstep(q / INTRO[1].p);
    const lerp = (a: Vec3, b: Vec3): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    return { position: lerp(INTRO[0].position, INTRO[1].position), target: lerp(INTRO[0].target, INTRO[1].target) };
  }
  const at = (tr: [number[], number[], number[]]): Vec3 => [monotone(xs, tr[0], q), monotone(xs, tr[1], q), monotone(xs, tr[2], q)];
  return { position: at(POS), target: at(TGT) };
}

/** Reduced motion: one still pose per section, looking at its place on the street. */
export function stationPose(id: 'work' | 'about' | 'stack' | 'contact'): Pose {
  switch (id) {
    case 'work':
      return { position: [0.4, 2.4, -8], target: [-6, 2.2, -9] };
    case 'about':
      return ridePose(0.48);
    case 'stack':
      return ridePose(0.7);
    case 'contact':
      return ridePose(1);
  }
}
