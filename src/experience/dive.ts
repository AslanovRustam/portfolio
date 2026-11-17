import { BILLBOARD, onBillboard } from '@/scene/billboard/layout';
import type { Pose, Vec3 } from './choreography';
import { DIVE, type DiveView, diveStage } from './diveStages';

export { contactLanding, DIVE, type DiveStage, diveStage, type DiveView, pinDiveHeight } from './diveStages';

// The dive's camera (spec §5); its stages are in diveStages.ts.

/** The camera's vertical field of view (Experience.tsx), degrees. */
const FOV = 35;
const TAN = Math.tan(((FOV / 2) * Math.PI) / 180);
/** the arrival keeps the title clear of the header and the catwalk clear of the bottom edge (px) */
const MARGIN = 72;

const P = BILLBOARD.panel;
const C = P.center;
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const along = (a: Vec3, d: Vec3, k: number): Vec3 => [a[0] + d[0] * k, a[1] + d[1] * k, a[2] + d[2] * k];
/** the panel's normal (towards the street) and its up, in the street */
const N = sub(onBillboard([0, 0, 1]), C);
const U = sub(onBillboard([0, 1, 0]), C);
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/** the billboard as the arrival frames it, along the panel's up from its centre: the catwalk to the title's top */
const TOP = BILLBOARD.title.offset[1] + BILLBOARD.title.height / 2;
const FOOT = dot(sub([C[0], BILLBOARD.support.catwalk.y, BILLBOARD.support.catwalk.z], C), U);
/** the panel's interior, inside the tube */
const INNER_H = P.height - 0.24;

const smootherstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/**
 * Where the camera stops: square to the panel, its centre in the middle of the window, as near as keeps
 * the title and the catwalk inside the window (MARGIN from its top and bottom). A portrait window crops
 * the panel's sides: the billboard is wider than a phone.
 */
export function diveArrival(view: { h: number }): Pose {
  const mid = (TOP + FOOT) / 2;
  const half = (TOP - FOOT) / 2;
  const d = half / (TAN * Math.max(0.2, 1 - (2 * MARGIN) / view.h));
  const aim = along(C, U, mid);
  return { position: along(aim, N, d), target: aim };
}

/** Screen px per metre on the panel at the end of the dive, in a window this tall: the frame's scale. */
export function diveScale(h: number): number {
  return h / (INNER_H * DIVE.overscan);
}

/** The end of the dive: square to the panel, near enough that its interior overfills the window. */
export function diveEnd(): Pose {
  const d = (INNER_H * DIVE.overscan) / (2 * TAN);
  return { position: along(C, N, d), target: [...C] as Vec3 };
}

/** The camera at story progress p from where Contact begins: at rest in front of the screen, diving, inside. */
export function divePose(p: number, view: DiveView): Pose {
  const { stage, t } = diveStage(p, view);
  const a = diveArrival(view);
  if (stage === 'approach' || stage === 'arrived') return a;
  const e = diveEnd();
  if (stage === 'inside') return e;
  const s = smootherstep(t);
  const mix = (x: Vec3, y: Vec3): Vec3 => [x[0] + (y[0] - x[0]) * s, x[1] + (y[1] - x[1]) * s, x[2] + (y[2] - x[2]) * s];
  return { position: mix(a.position, e.position), target: mix(a.target, e.target) };
}
