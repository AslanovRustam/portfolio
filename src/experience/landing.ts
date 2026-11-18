import type { Pose, Vec3 } from './choreography';

/**
 * The intro's landing (2026-11-18): the loader is a sheet of blueprint paper with a 24 px grid, and the
 * scene starts on a blueprint floor with a 25 cm one. So the camera starts high above the floor looking
 * straight down, where a floor cell is as big as a cell of the sheet: the sheet goes out over nearly the
 * same picture, and the camera then cranes down to the start pose. The sheet becomes the floor.
 */

/** the camera's vertical field of view (Experience.tsx), degrees */
const FOV = 35;
const TAN = Math.tan(((FOV / 2) * Math.PI) / 180);
/** the loader sheet's cell (globals.css .loader-sign) and the floor's (Blueprint.tsx), px and m */
const SHEET_CELL_PX = 24;
const FLOOR_CELL_M = 0.25;

/** after the scene is ready: the sign switches off (0.5 s) and the sheet fades (0.4 s), then the move */
export const LANDING = { holdMs: 900, moveMs: 1800 } as const;

/** How high above the floor (m) a 25 cm cell spans 24 px on a window hPx tall. */
export function planHeight(hPx: number): number {
  return (FLOOR_CELL_M * hPx) / (2 * SHEET_CELL_PX * TAN);
}

/**
 * Straight down at the pole's foot. The camera sits a hair towards +z, so the screen's up is −z: down the
 * street, where the start pose looks — the crane down keeps the picture's top where it was.
 */
export function planPose(hPx: number): Pose {
  return { position: [0, planHeight(hPx), 0.01], target: [0, 0, 0] };
}

const smootherstep = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
};
const mix = (a: Vec3, b: Vec3, s: number): Vec3 => [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, a[2] + (b[2] - a[2]) * s];

/** The camera t (0..1) of the way through the move, eased in and out. */
export function landingPose(t: number, from: Pose, to: Pose): Pose {
  const s = smootherstep(t);
  if (s <= 0) return from;
  if (s >= 1) return to;
  return { position: mix(from.position, to.position, s), target: mix(from.target, to.target, s) };
}

/**
 * Whether this page load lands: only from the top of the page — not on a deep link (a hash) or a page the
 * browser put back mid-scroll — with the 3D scene, and not under reduced motion.
 */
export function landingArmed(o: { reduced: boolean; hash: string; scrollY: number; webgl: boolean }): boolean {
  return o.webgl && !o.reduced && o.hash === '' && o.scrollY <= 0;
}

export type LandingPhase = 'off' | 'armed' | 'hold' | 'move' | 'done';

/**
 * A scroll during the landing runs the rest of the move this many times as fast, from where it is: no leap
 * into the damping, and never much faster than the landing itself moves.
 */
export const HURRY = 1.4;

/**
 * The landing's clock: armed once per page load at mount, started when the scene is ready, hurried by the
 * visitor's scroll. The move runs from t0 at `from` (ms) to 1 at `to`.
 */
export function createLanding() {
  let phase: LandingPhase = 'off';
  let used = false;
  let from = 0;
  let to = 0;
  let t0 = 0;
  let hurried = false;
  let last: number | null = null;
  const at = (nowMs: number) => t0 + ((1 - t0) * (nowMs - from)) / (to - from);
  const step = (nowMs: number): number | null => {
    if (phase === 'off' || phase === 'done') return null;
    if (phase === 'armed') return 0;
    if (nowMs <= from) {
      phase = 'hold';
      return t0;
    }
    const t = at(nowMs);
    if (t > 1) {
      phase = 'done';
      return null;
    }
    phase = 'move';
    return t;
  };
  return {
    get phase(): LandingPhase {
      return phase;
    },
    /** the move's progress the camera last took (null when not running): the floor's metre lines follow it */
    get t(): number | null {
      return last;
    },
    arm() {
      if (used) return;
      used = true;
      phase = 'armed';
    },
    start(nowMs: number) {
      if (phase !== 'armed') return;
      phase = 'hold';
      from = nowMs + LANDING.holdMs;
      to = from + LANDING.moveMs;
      t0 = 0;
    },
    /** run the rest of the move HURRY times as fast from now, carrying on from where it is */
    hurry(nowMs: number) {
      if (hurried || phase === 'armed' || phase === 'off' || phase === 'done') return;
      hurried = true;
      t0 = nowMs < from ? 0 : Math.min(1, at(nowMs));
      from = nowMs;
      to = nowMs + ((1 - t0) * LANDING.moveMs) / HURRY;
    },
    cancel() {
      if (phase !== 'done') phase = 'off';
      last = null;
    },
    /** how far through the move (0..1) at nowMs; 0 while armed or holding; null when not running */
    progress(nowMs: number): number | null {
      last = step(nowMs);
      return last;
    },
  };
}

/** The page load's landing (one per load: a language switch keeps the scene and never re-arms it). */
export const landing = createLanding();
