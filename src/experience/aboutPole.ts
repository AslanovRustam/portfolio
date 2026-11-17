import type { Pose, Vec3 } from './choreography';
import { ridePose, STATIONS } from './route';
import { holdWindow } from './sections';
import { POLE } from './signs';

/**
 * About close to the pole (M4 round 1, spec §6): the camera comes up to the pole's face and the paper bills,
 * riding the page's scroll, look pasted on it — the camera goes down the pole exactly as fast as the page
 * scrolls, so its surface moves on the screen with the bills, pixel for pixel. It works the stretch below
 * the signs (the stack's stickers there show round the bills). How near it comes depends on the window and
 * on how long About's text makes its piece of the journey: a long one is fewer metres per pixel.
 */

/** The camera's vertical field of view (Experience.tsx), degrees. */
const FOV = 35;
const TAN = Math.tan(((FOV / 2) * Math.PI) / 180);
/** About's text rides past in this stretch of the story; the camera is at the pole all through it */
const [FROM, TO] = holdWindow('about');
/** it turns from the ride into the pole over this (from the end of Work's track), and back out to the ride after */
const IN_FROM = 0.33;
const OUT_TO = 0.6;
/** the stretch of the pole below its signs it goes down (m) */
const TOP = 1.6;
const FLOOR = 0.3;
/** never nearer the pole's face than this (the camera's near plane is 0.1 m) */
const NEAREST = 0.15;

/** The window, About's piece of the journey (px) and the bills' column width (px). */
export type AboutView = { w: number; h: number; aboutPx: number; billsPx: number };

/** As globals.css lays the bills' column out: min(32rem, 44vw) beside the scene on a laptop, the width less 2rem otherwise. */
export function billsWidth(w: number, h: number): number {
  const wide = w >= 1024 && w / h >= 1;
  return wide ? Math.min(512, 0.44 * w) : w - 32;
}

/**
 * How near the camera comes (its distance from the pole's axis) and the heights it goes down between: the
 * pole a little wider than the bills' column on a laptop, wider than the screen on a phone; nearer still
 * if About is too long for the stretch below the signs, never nearer than NEAREST.
 */
export function aboutCloseUp(view: AboutView): { distance: number; top: number; bottom: number } {
  const wide = view.w >= 1024 && view.w / view.h >= 1;
  const poleW = Math.max(1.15 * view.billsPx, wide ? 0 : 1.25 * view.w);
  const half = view.h / 2;
  // the pole's width on the screen from D off its axis is 2r · half / (D · TAN)
  let D = (2 * POLE.radius * half) / (poleW * TAN);
  // its face, D − r off, moves a pixel per pixel of scroll: About's px are this many metres
  const descent = (d: number) => (view.aboutPx * (d - POLE.radius) * TAN) / half;
  if (TOP - descent(D) < FLOOR) D = POLE.radius + ((TOP - FLOOR) * half) / (view.aboutPx * TAN);
  D = Math.max(D, POLE.radius + NEAREST);
  return { distance: D, top: TOP, bottom: Math.max(FLOOR, TOP - descent(D)) };
}

const smootherstep = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
};
const mix = (a: Pose, b: Pose, s: number): Pose => {
  const m = (x: Vec3, y: Vec3): Vec3 => [x[0] + (y[0] - x[0]) * s, x[1] + (y[1] - x[1]) * s, x[2] + (y[2] - x[2]) * s];
  return { position: m(a.position, b.position), target: m(a.target, b.target) };
};

/**
 * The camera for story progress p around About: turning in from the ride (`ride`, the pose the camera would
 * have without About: its own motion carried in, so nothing jerks where the turn begins), then level at the
 * pole's face going down from `top` to `bottom` through About's hold, then turning back out into the ride.
 */
export function aboutPose(p: number, view: AboutView, ride: Pose = ridePose(p)): Pose {
  const { distance, top, bottom } = aboutCloseUp(view);
  const { x, z } = STATIONS.pole;
  const at = (y: number): Pose => ({ position: [x, y, z + distance], target: [x, y, z] });
  if (p <= FROM) return mix(ride, at(top), smootherstep((p - IN_FROM) / (FROM - IN_FROM)));
  if (p >= TO) return mix(at(bottom), ride, smootherstep((p - TO) / (OUT_TO - TO)));
  return at(top + ((bottom - top) * (p - FROM)) / (TO - FROM));
}

/** Where aboutPose takes over from the ride (exclusive), and hands back. */
export const ABOUT_TURN = { from: IN_FROM, to: OUT_TO } as const;
