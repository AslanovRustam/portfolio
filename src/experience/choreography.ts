import { ridePose, stackSignPose, stationPose } from './route';
import { stackStopAt } from './stackStops';
import { activeSection, INTRO_END, SECTIONS, TURN } from './sections';
import { signById, type SectionId } from './signs';

export { activeSection, holdWindow, type HoldId, INTRO_END, sectionCenter, SECTIONS, TURN } from './sections';
import type { LightState } from './store';

/**
 * Where the intro turn starts: a three-quarter view, so on the blueprint every sign is seen at an angle
 * with its thickness showing (from π the side signs were edge-on and read as flat slivers).
 */
export const INTRO_YAW = 0.75 * Math.PI;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function lightState(p: number): LightState {
  if (p < 0.02) return 'off';
  if (p < INTRO_END) return 'red';
  if (p < 0.8) return 'yellow';
  return 'green';
}

export function revealProgress(p: number): number {
  return easeInOutCubic(clamp01(p / INTRO_END));
}

/** Staggered reveal of part `index` of `count`: each part's window overlaps the next by `overlap`. */
export function partReveal(reveal: number, index: number, count: number, overlap = 0.5): number {
  const w = 1 / (count - (count - 1) * overlap);
  const start = index * w * (1 - overlap);
  return clamp01((reveal - start) / w);
}

const yawFacing = (id: SectionId) => -signById(id).facing;

/**
 * Pole rotation for scroll progress p. Intro: a three-quarter turn from INTRO_YAW to WORK facing the camera.
 * Then each section holds its sign towards the camera; around every boundary it turns to the next one.
 */
export function poleYaw(p: number): number {
  if (p <= INTRO_END) return INTRO_YAW * (1 - easeInOutCubic(clamp01(p / INTRO_END)));
  for (let i = 1; i < SECTIONS.length; i++) {
    const b = SECTIONS[i].start;
    if (p < b - TURN / 2) return yawFacing(SECTIONS[i - 1].id);
    if (p <= b + TURN / 2) {
      const t = easeInOutCubic((p - (b - TURN / 2)) / TURN);
      const from = yawFacing(SECTIONS[i - 1].id);
      const to = yawFacing(SECTIONS[i].id);
      return from + (to - from) * t;
    }
  }
  return yawFacing(SECTIONS[SECTIONS.length - 1].id);
}

/** Reduced motion: no rotation tied to scroll — the pole simply shows the active section's sign. */
export function reducedYaw(p: number): number {
  return yawFacing(activeSection(p) ?? 'work');
}

export type Vec3 = [number, number, number];
export interface Pose {
  position: Vec3;
  target: Vec3;
}
/** The camera pose for story progress p: the intro shot, then the ride down the street (route.ts). */
export function cameraPose(p: number): Pose {
  return ridePose(p);
}

/**
 * Reduced motion: one still camera pose per section (the intro keeps the opening shot), no ride; in Stack it
 * stands under the sign the caption shows, jumping from one to the next.
 */
export function reducedCameraPose(p: number): Pose {
  const s = activeSection(p);
  if (s === 'stack') return stackSignPose(stackStopAt(p));
  return s ? stationPose(s) : ridePose(0);
}

/**
 * How far to pull the camera back along its view line on narrow (portrait) screens, so the
 * horizontal field still holds a full sign: 1 from aspect 0.75 up, growing as the screen narrows.
 */
export function fitDistance(aspect: number): number {
  return Math.max(1, 0.75 / aspect);
}

/** Frame-rate independent exponential approach; dt is clamped so a returning hidden tab does not jump. */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  // an infinite rate means "jump" (reduced motion); Infinity × a zero-length frame would be NaN
  if (lambda === Infinity) return target;
  return current + (target - current) * (1 - Math.exp(-lambda * Math.min(dt, 0.1)));
}
