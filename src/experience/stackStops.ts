import { holdWindow } from './sections';
import { DWELL, STEP } from './workStops';

/** One stop per Stack category: one green sign each on the gantry over the road (spec §9). */
export const STACK_STOPS = 6;

const [H0, H1] = holdWindow('stack');
/** the first and the last sign's stop, just inside the Stack hold */
export const STACK_FROM = H0 + 0.02;
export const STACK_TO = H1 - 0.005;
const GAP = (STACK_TO - STACK_FROM) / (STACK_STOPS - 1);
const last = STACK_STOPS - 1;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
/** where along the signs story progress q is, 0..STACK_STOPS−1 (unsmoothed) */
const along = (q: number) => clamp((q - STACK_FROM) / GAP, 0, last);

/** Story progress at which sign i stands square in the frame. */
export function stackStopProgress(i: number): number {
  return STACK_FROM + clamp(i, 0, last) * GAP;
}

/** The sign nearest to story progress q (the first before Stack, the last after it). */
export function stackStopAt(q: number): number {
  return Math.round(along(q));
}

/** Where along the gantry the camera is, 0..STACK_STOPS−1: it rests at each sign and eases to the next. */
export function stackPosition(q: number): number {
  const u = along(q);
  const k = Math.floor(u);
  if (k >= last) return last;
  return k + smoothstep(DWELL, 1 - DWELL, u - k);
}

/**
 * The sign a scroll that came to rest at q should settle on, like the TVs in Work (workStops.snapTarget):
 * null outside the signs' stretch or on a sign; a gesture that travelled more than STEP of a gap goes on to
 * the next sign in its direction.
 */
export function stackSnapTarget(q: number, from?: number): number | null {
  if (q <= STACK_FROM || q >= STACK_TO) return null;
  const u = along(q);
  let stop = Math.round(u);
  // a gesture from outside the signs (About before them, Contact after) settles on the nearest: measured
  // from where it came in, it would always have "travelled" past the first sign it meets
  if (from !== undefined && from >= STACK_FROM - 1e-6 && from <= STACK_TO + 1e-6) {
    const moved = u - along(from);
    if (Math.abs(moved) > STEP) stop = moved > 0 ? Math.ceil(u - 1e-9) : Math.floor(u + 1e-9);
  }
  const target = stackStopProgress(stop);
  return Math.abs(q - target) < 1e-6 ? null : target;
}
