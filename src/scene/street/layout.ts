import { ridePose, STATIONS } from '@/experience/route';
import { mulberry32 } from './random';

/** The road behind the pole: carriageway ±half, sidewalks beyond, running away from the camera. */
export const ROAD = { half: 4, sidewalk: 2.6, zNear: -3, zFar: -80, kerb: 0.15 } as const;
export const LAMP_HEIGHT = 6;
/** no lamp within this many metres of the sign gantry (along the road) */
const GANTRY_GAP = 3;
/** how far the arm carries the luminaire out over the road */
export const ARM_REACH = 1.5;
/** light-emitting panel under the luminaire */
export const LAMP_HEAD_Y = LAMP_HEIGHT + 0.12;
export const LAMP_COLOR = '#ffbf7a';

export interface Lamp {
  x: number;
  z: number;
  /** 1 on the right sidewalk (arm reaches −x), −1 on the left */
  side: 1 | -1;
  /** a failing lamp that flickers now and then */
  flicker: boolean;
  seed: number;
}

/**
 * Street lamps on both sidewalks of the road behind the pole, staggered (each side every ~11 m); a few of them
 * failing. They are what the wet asphalt reflects near the horizon.
 */
export function streetLayout(seed: number): { lamps: Lamp[] } {
  const rand = mulberry32(seed);
  const lamps: Lamp[] = [];
  const x = ROAD.half + 0.7;
  let i = 0;
  for (let z = ROAD.zNear - 2; z > ROAD.zFar + 10; z -= 5.5) {
    const side = (i % 2 === 0 ? 1 : -1) as 1 | -1;
    lamps.push({ x: side * x, z: z - rand() * 0.6, side, flicker: false, seed: Math.floor(rand() * 1e6) });
    i++;
  }
  // three failing lamps, spread along the street (not the nearest one: it would dominate the frame)
  for (const k of [2, 5, 7]) if (lamps[k]) lamps[k].flicker = true;
  // none just before or behind the sign gantry: it would stand across a sign (the gantry lights itself);
  // none past where the ride ends: they would stand in front of the billboard (and beyond it, in its building)
  const end = ridePose(1).position[2] - 0.5;
  return { lamps: lamps.filter((l) => Math.abs(l.z - STATIONS.gantry.z) > GANTRY_GAP && l.z > end) };
}

const hash = (n: number) => {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
};

/**
 * Brightness 0..1 of a lamp at time t (s). Steady lamps: 1. Failing ones: on, with a faint buzz, and
 * every few seconds a short burst where the tube stutters off and on — a sodium lamp about to go.
 */
export function lampIntensity(lamp: Lamp, t: number): number {
  if (!lamp.flicker) return 1;
  const period = 4 + hash(lamp.seed) * 5;
  const phase = (t + hash(lamp.seed + 1) * period) % period;
  const burst = 0.6 + hash(lamp.seed + 2) * 0.7;
  if (phase > burst) return 0.92 + 0.08 * hash(Math.floor(t * 24) + lamp.seed);
  const step = Math.floor(t * 16);
  return hash(step + lamp.seed * 3) < 0.55 ? 0.05 + 0.1 * hash(step + 7) : 0.75 + 0.25 * hash(step + 11);
}

export interface Streak {
  x: number;
  /** just above the road */
  y: number;
  /** the end under its light (far from the camera) */
  zFar: number;
  /** longest it may get (it lengthens with distance to the camera) */
  length: number;
  /** height of the light it mirrors */
  h: number;
  width: number;
  color: string;
  power: number;
  source: Lamp;
}

/**
 * The reflection each lamp throws on the wet road: a streak lying on the asphalt from under the
 * luminaire toward the viewer. Drawn as additive geometry, it stays bright and crisp where a blurred
 * mirror would smear a small far-away light into nothing.
 */
export function reflectionStreaks({ lamps }: { lamps: Lamp[] }): Streak[] {
  return lamps.map((l) => ({
    x: l.x - l.side * ARM_REACH,
    y: 0.015,
    zFar: l.z,
    length: 3.5 + LAMP_HEAD_Y * 2,
    h: LAMP_HEAD_Y,
    width: 0.6,
    color: LAMP_COLOR,
    power: 2,
    source: l,
  }));
}

/**
 * Where a light's reflection lands for the current camera: on the road line from the light's base to
 * the point under the camera, h/(H+h) of the way (h light height, H camera height) — the mirrored light
 * seen through the road plane. The streak is laid along that line (far end toward the light), so on
 * screen it drops straight down under its light; its length grows with the distance, up to `maxLength`.
 */
export function streakPlacement(
  light: { x: number; h: number; z: number },
  cam: { x: number; y: number; z: number },
  maxLength: number,
): { x: number; z: number; angle: number; length: number } {
  const dx = cam.x - light.x;
  const dz = cam.z - light.z;
  const D = Math.max(Math.hypot(dx, dz), 1e-3);
  const f = light.h / (Math.max(cam.y, 0.1) + light.h);
  const ux = dx / D;
  const uz = dz / D;
  return {
    x: light.x + dx * f,
    z: light.z + dz * f,
    // plane top (−z once laid flat) rotated about y must point back at the light: (−sin a, −cos a) = −u
    angle: Math.atan2(ux, uz),
    length: Math.min(maxLength, Math.max(1.5, D * f * 1.3)),
  };
}
