import { signById, type SectionId } from './signs';
import type { LightState } from './store';

/** End of the blueprint → render intro (spec §5). */
export const INTRO_END = 0.15;
/** Width of the turn window around each section boundary. */
export const TURN = 0.05;

export const SECTIONS: readonly { id: SectionId; start: number; end: number; center: number }[] = [
  { id: 'work', start: 0.15, end: 0.37, center: 0.26 },
  { id: 'about', start: 0.37, end: 0.59, center: 0.48 },
  { id: 'stack', start: 0.59, end: 0.8, center: 0.695 },
  { id: 'contact', start: 0.8, end: 1, center: 0.9 },
];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const smoothstep = (t: number) => t * t * (3 - 2 * t);

export function activeSection(p: number): SectionId | null {
  if (p < INTRO_END) return null;
  for (const s of SECTIONS) if (p < s.end) return s.id;
  return 'contact';
}

export function sectionCenter(id: SectionId): number {
  const s = SECTIONS.find((x) => x.id === id);
  if (!s) throw new Error(`unknown section ${id}`);
  return s.center;
}

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
 * Pole rotation for scroll progress p. Intro: half a turn from π to WORK facing the camera.
 * Then each section holds its sign towards the camera; around every boundary it turns to the next one.
 */
export function poleYaw(p: number): number {
  if (p <= INTRO_END) return Math.PI * (1 - easeInOutCubic(clamp01(p / INTRO_END)));
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

type Vec3 = [number, number, number];
const CAMERA_KEYS: readonly { p: number; position: Vec3; target: Vec3 }[] = [
  { p: 0, position: [0, 2.6, 9.5], target: [0, 2.6, 0] },
  { p: 0.15, position: [1.4, 3.0, 6.2], target: [0, 3.0, 0] },
  { p: 0.26, position: [1.0, 3.4, 4.6], target: [0, 3.4, 0] },
  { p: 0.48, position: [1.0, 2.9, 4.6], target: [0, 2.9, 0] },
  { p: 0.695, position: [1.0, 3.8, 4.8], target: [0, 3.8, 0] },
  { p: 0.85, position: [0.6, 2.6, 4.8], target: [0, 2.6, 0] },
  { p: 1, position: [0, 4.6, 3.4], target: [0, 4.7, 0] },
];

const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

export function cameraPose(p: number): { position: Vec3; target: Vec3 } {
  const q = clamp01(p);
  const last = CAMERA_KEYS[CAMERA_KEYS.length - 1];
  if (q >= last.p) return { position: [...last.position], target: [...last.target] };
  let i = 0;
  while (q >= CAMERA_KEYS[i + 1].p) i++;
  const a = CAMERA_KEYS[i];
  const b = CAMERA_KEYS[i + 1];
  const t = smoothstep((q - a.p) / (b.p - a.p));
  if (t === 0) return { position: [...a.position], target: [...a.target] };
  return { position: lerp3(a.position, b.position, t), target: lerp3(a.target, b.target, t) };
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
  return current + (target - current) * (1 - Math.exp(-lambda * Math.min(dt, 0.1)));
}
