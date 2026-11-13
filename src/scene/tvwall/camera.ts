import { activeSection, type Pose, type Vec3 } from '@/experience/choreography';
import { stopAt, wallPosition } from '@/experience/workStops';
import { screenRect, stopSlots, TV_MODELS, wallLayout } from './layout';

/** Story-progress windows where the camera leaves the WORK sign for the wall and comes back to the pole. */
export const WALL_IN = [0.155, 0.18] as const;
/** The way back is long (the wall is ~10 m wide), so it runs into the start of the turn to ABOUT. */
export const WALL_OUT = [0.32, 0.36] as const;
/** Vertical field of view of the scene camera (Experience.tsx). */
const FOV = 35;

const STOPS = stopSlots(wallLayout());
const RECTS = STOPS.map(screenRect);
const SET_WIDTH = STOPS.map((s) => TV_MODELS[s.model].size[0] * s.scale);

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smoothstep = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/** Share of the frame width the TV set takes: room for its neighbours on a wide screen, all of it on a phone. */
export function wallFill(aspect: number): number {
  return aspect >= 1 ? 0.55 : 0.85;
}

/**
 * How much of the keyframed pose gives way to the wall pose. Reduced motion: all of it for the whole Work
 * section (a scroll rounded to the pixel can land a hair outside the track at the first or last stop).
 */
export function wallWeight(q: number, reduced: boolean): number {
  if (reduced) return activeSection(q) === 'work' ? 1 : 0;
  if (q <= WALL_IN[0] || q >= WALL_OUT[1]) return 0;
  if (q < WALL_IN[1]) return smoothstep((q - WALL_IN[0]) / (WALL_IN[1] - WALL_IN[0]));
  if (q > WALL_OUT[0]) return 1 - smoothstep((q - WALL_OUT[0]) / (WALL_OUT[1] - WALL_OUT[0]));
  return 1;
}

/** Straight in front of the screen at wall position s (fractional between stops). */
export function wallPose(s: number, aspect: number): Pose {
  const last = RECTS.length - 1;
  const i = Math.min(Math.max(Math.floor(s), 0), last - 1);
  const f = clamp01(s - i);
  const center = lerp3(RECTS[i].center, RECTS[i + 1].center, f);
  const width = lerp(SET_WIDTH[i], SET_WIDTH[i + 1], f);
  const halfWidthTan = Math.tan(((FOV / 2) * Math.PI) / 180) * aspect;
  const distance = width / wallFill(aspect) / 2 / halfWidthTan;
  return { position: [center[0], center[1], center[2] + distance], target: center };
}

/** The camera pose for story progress q: the keyframed `base`, blended onto the wall while in Work. */
export function onWall(q: number, base: Pose, aspect: number, reduced: boolean): Pose {
  const w = wallWeight(q, reduced);
  if (w === 0) return base;
  const wall = wallPose(reduced ? stopAt(q) : wallPosition(q), aspect);
  if (w === 1) return wall;
  return { position: lerp3(base.position, wall.position, w), target: lerp3(base.target, wall.target, w) };
}
