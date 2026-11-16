import { LIGHT_Y } from '@/scene/pole/lightMount';
import { INTRO_END, type Pose, type Vec3 } from './choreography';
import { sectionPresence } from './panels';
import { STATIONS } from './route';
import { SIGNS } from './signs';

export type PoleMode = 'start' | 'ride' | 'parked' | 'centre';

/** The camera's vertical field of view (Experience.tsx), degrees. */
const FOV = 35;
/** the pole leaves its spot and joins the ride over this stretch of the story */
const RIDE_IN: readonly [number, number] = [INTRO_END, 0.19];
/** About: into its spot at the start of the section, back to the ride before Stack */
const ABOUT_IN: readonly [number, number] = [0.37, 0.4];
const ABOUT_OUT: readonly [number, number] = [0.565, 0.59];
/** Contact: the light, turning green, takes over from the signs as what the frame keeps in view */
const LIGHT_IN: readonly [number, number] = [0.8, 0.88];
/** the middle of the signs' band on the pole (their centres from CV to STACK) */
const SIGNS_MID = (Math.min(...SIGNS.map((s) => s.y)) + Math.max(...SIGNS.map((s) => s.y))) / 2;
const TAN_HALF = Math.tan(((FOV / 2) * Math.PI) / 180);

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smoothstep = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};
const between = (p: number, [a, b]: readonly [number, number]) => smoothstep((p - a) / (b - a));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Where the riding pole stands relative to the camera: far enough ahead that its signs fit the frame and
 * its foot is below it, and as far right as puts it near the right edge of this screen (a phone's narrow
 * frame takes it further ahead, so it is not all edge).
 */
export function rideOffset(aspect: number): { right: number; ahead: number } {
  const ahead = aspect >= 1 ? 3.5 : 4.6;
  const edge = aspect >= 1 ? 0.74 : 0.8;
  const halfWidth = TAN_HALF * ahead * aspect;
  return { right: edge * halfWidth, ahead };
}

/**
 * How far the pole steps out of the frame at the Stack signs (0..1): on a portrait screen a sign fills the
 * frame's width and the riding pole would stand across it (the menu is in the header there); on a wide
 * one it rides on beside the signs. It eases out as Stack's caption comes and back as it goes.
 */
export function stackPark(p: number, aspect: number): number {
  if (aspect >= 1) return 0;
  return sectionPresence(p, 'stack');
}

/**
 * The pole's place in the street for story progress p, given the camera's pose: at its spot while the
 * intro plays; then riding with the camera on the right of the frame, its signs turned to it; out of the
 * frame to the right while the camera faces the shop window or, on a phone, the Stack signs (`parked`,
 * 0..1: the Work wall's weight, stackPark);
 * at its own spot, in the middle of the frame, for About. `facing` turns its signs towards the camera.
 */
export function poleWorldPose(
  p: number,
  camera: Pose,
  aspect: number,
  parked = 0,
): { position: Vec3; facing: number; mode: PoleMode } {
  if (p <= INTRO_END) return { position: [0, 0, 0], facing: 0, mode: 'start' };

  // the camera's heading, flat on the street
  let fx = camera.target[0] - camera.position[0];
  let fz = camera.target[2] - camera.position[2];
  const len = Math.hypot(fx, fz) || 1;
  fx /= len;
  fz /= len;
  const rx = -fz;
  const rz = fx;

  const join = between(p, RIDE_IN);
  const { right, ahead } = rideOffset(aspect);
  const away = clamp01(parked);
  // joining the ride, it slides in the frame from where it stood to the right edge (in the camera's frame,
  // so it never comes nearer than its riding distance while the camera drives past its old spot)
  const right0 = -camera.position[0] * rx - camera.position[2] * rz;
  const ahead0 = -camera.position[0] * fx - camera.position[2] * fz;
  const r = lerp(right0, right, join) + 4 * away;
  const a = lerp(ahead0, ahead, join) - 1.8 * away;
  const ride: Vec3 = [camera.position[0] + rx * r + fx * a, 0, camera.position[2] + rz * r + fz * a];

  // Its foot is never in the frame, so it rides at the height that keeps its signs mid-frame (a touch low,
  // clear of the header) — or, as Contact ends, its light a little above the middle — however the camera
  // tilts up at the gantry or the billboard.
  const flat = Math.hypot(camera.target[0] - camera.position[0], camera.target[2] - camera.position[2]) || 1;
  const tilt = (camera.target[1] - camera.position[1]) / flat;
  const centre = camera.position[1] + a * tilt;
  const end = between(p, LIGHT_IN);
  const anchor = lerp(SIGNS_MID, LIGHT_Y, end);
  ride[1] = lerp(0, centre + lerp(-0.08, 0.3, end) * a * TAN_HALF - anchor, join);

  const about = between(p, ABOUT_IN) * (1 - between(p, ABOUT_OUT));
  const x = lerp(ride[0], STATIONS.pole.x, about);
  const y = lerp(ride[1], 0, about);
  const z = lerp(ride[2], STATIONS.pole.z, about);
  // the signs face the camera: +z turned onto the way back to it
  const facing = join * Math.atan2(-fx, -fz);

  const mode: PoleMode = about > 0.5 ? 'centre' : away > 0.5 ? 'parked' : 'ride';
  return { position: [x, y, z], facing, mode };
}
