import { ABOUT_TURN, aboutPose, type AboutView, billsWidth } from '@/experience/aboutPole';
import { activeSection, cameraPose, fitDistance, type Pose, reducedCameraPose, type Vec3 } from '@/experience/choreography';
import { diveArrival, diveEnd, divePose } from '@/experience/dive';
import { pieceSpanPx } from '@/experience/journey';
import { CONTACT_FROM, holdWindow } from '@/experience/sections';
import { billboardFit } from './billboard/fit';
import { onWall } from './tvwall/camera';

/** The window the scene is drawn into (CSS px). */
export type Viewport = { w: number; h: number };

/** On a window that dives into the billboard's screen, the ride turns from the gantry to the arrival over this stretch. */
const DIVE_TURN: readonly [number, number] = [0.79, CONTACT_FROM];

let fitCache: { w: number; h: number; dive: boolean } | null = null;
/**
 * Whether this window dives into the billboard's screen at the end (M4 round 1): wherever the contact form
 * does not fit into the billboard. The scene only runs with WebGL, so that is taken for granted here.
 */
export function divesIntoScreen(v: Viewport): boolean {
  if (!fitCache || fitCache.w !== v.w || fitCache.h !== v.h) fitCache = { w: v.w, h: v.h, dive: billboardFit(v) === null };
  return fitCache.dive;
}

/** About as this window lays it out: its piece of the journey (px) and the bills' column. */
function aboutView(v: Viewport): AboutView {
  return { w: v.w, h: v.h, aboutPx: pieceSpanPx('about', v.h), billsPx: billsWidth(v.w, v.h) };
}

/** CameraRig's usual damping rate (1/s). */
export const LAMBDA = 3;
/** how hard the camera catches up at the end of the turn into About: it must be at the pole's face by then */
const CATCH_UP = 60;

const ramp = (p: number, a: number, b: number) => {
  const t = Math.min(1, Math.max(0, (p - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * How fast the camera follows its pose (CameraRig's damping rates, 1/s; Infinity: exactly), across the plane
 * and in height. In About's hold it follows exactly — the bills ride the page and the pole's face must move
 * with them pixel for pixel — and over the end of the turn in it catches up harder and harder, so a brisk
 * scroll finds it at the face, not metres out, when the first bill comes up; on the turn out it eases back.
 */
export function cameraLambdas(p: number, reduced: boolean): { xz: number; y: number } {
  if (reduced) return { xz: Infinity, y: Infinity };
  const [from, to] = holdWindow('about');
  if (p >= from && p <= to) return { xz: Infinity, y: Infinity };
  const k =
    p < from
      ? LAMBDA + (CATCH_UP - LAMBDA) * ramp(p, ABOUT_TURN.from + 0.015, from - 0.008)
      : CATCH_UP + (LAMBDA - CATCH_UP) * ramp(p, to, ABOUT_TURN.to);
  return { xz: k, y: k };
}

/** Backed off along the view line on narrow (portrait) screens, so the horizontal field still holds a sign. */
function fitted(base: Pose, aspect: number): Pose {
  const k = fitDistance(aspect);
  const position = base.position.map((v, i) => base.target[i] + (v - base.target[i]) * k) as Vec3;
  return { position, target: base.target };
}

const smoothstep = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};
const mix = (a: Vec3, b: Vec3, s: number): Vec3 => [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, a[2] + (b[2] - a[2]) * s];

/**
 * Where the camera should be for story progress p in a window of this size: the ride's pose (or the
 * section's still pose under reduced motion), backed off along its view line on narrow screens, and in Work
 * in front of the TVs. Where the window dives into the billboard's screen, the end of the ride turns to the
 * arrival in front of the screen and then drives into it (dive.ts); under reduced motion it stands inside
 * the screen for all of Contact. CameraRig damps towards it; the riding pole places itself against it.
 */
export function desiredCameraPose(p: number, viewport: Viewport, reduced: boolean): Pose {
  const aspect = viewport.w / viewport.h;
  // About: close to the pole's face, going down it with the bills (aboutPole.ts); under reduced motion it
  // cuts there and still goes down with the page inside the hold
  const [aboutFrom, aboutTo] = holdWindow('about');
  if (reduced ? activeSection(p) === 'about' : p > ABOUT_TURN.from && p < ABOUT_TURN.to) {
    if (reduced) return aboutPose(Math.min(aboutTo, Math.max(aboutFrom, p)), aboutView(viewport));
    // the turns in and out start from where the camera would be without About (in front of the TVs, say)
    return aboutPose(p, aboutView(viewport), onWall(p, fitted(cameraPose(p), aspect), aspect, false));
  }
  if (divesIntoScreen(viewport)) {
    if (reduced) {
      if (activeSection(p) === 'contact') return diveEnd(aspect);
    } else if (p >= CONTACT_FROM) {
      return divePose(p, { w: viewport.w, h: viewport.h, contactPx: pieceSpanPx('contact', viewport.h) });
    } else if (p > DIVE_TURN[0]) {
      const ride = onWall(p, fitted(cameraPose(p), aspect), aspect, false);
      const arrive = diveArrival(viewport);
      const s = smoothstep((p - DIVE_TURN[0]) / (DIVE_TURN[1] - DIVE_TURN[0]));
      // it rises to the arrival's height late in the turn, once it has passed under the gantry's catwalk
      const position = mix(ride.position, arrive.position, s);
      position[1] = ride.position[1] + (arrive.position[1] - ride.position[1]) * s * s;
      return { position, target: mix(ride.target, arrive.target, s) };
    }
  }
  const base = reduced ? reducedCameraPose(p) : cameraPose(p);
  return onWall(p, fitted(base, aspect), aspect, reduced);
}
