import { activeSection, cameraPose, fitDistance, type Pose, reducedCameraPose, type Vec3 } from '@/experience/choreography';
import { diveArrival, diveEnd, divePose } from '@/experience/dive';
import { pieceSpanPx } from '@/experience/journey';
import { CONTACT_FROM } from '@/experience/sections';
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
  if (divesIntoScreen(viewport)) {
    if (reduced) {
      if (activeSection(p) === 'contact') return diveEnd();
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
