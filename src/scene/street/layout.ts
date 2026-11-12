import { mulberry32 } from './random';

export interface Lamp {
  x: number;
  z: number;
  /** 1 on the right kerb (head leans left), −1 on the left */
  side: 1 | -1;
}

export interface Neon {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  /** rotation about y: 0 = faces down the street toward the viewer (a blade sign), ±π/2 = across it */
  facing: number;
  color: string;
  /** brightness multiplier (HDR, feeds bloom and the wet-street reflections) */
  power: number;
}

const NEON = ['#ff3d6e', '#35e0ff', '#ff7a1a', '#c56bff', '#ff5a1f', '#ffd23f'];

/**
 * The street behind the pole: lamps on both kerbs and neon signs on the facades — mostly tall blade
 * signs sticking out toward the viewer, some long ones flat on the walls. They are what the wet asphalt
 * reflects: near the horizon, so their reflections stretch into the frame as long coloured streaks.
 */
export function streetLayout(seed: number): { lamps: Lamp[]; neons: Neon[] } {
  const rand = mulberry32(seed);
  const lamps: Lamp[] = [];
  for (let z = -4; z > -46; z -= 7) {
    lamps.push({ x: 5.4, z: z - rand() * 0.8, side: 1 });
    lamps.push({ x: -5.4, z: z - 3.5 - rand() * 0.8, side: -1 });
  }
  const neons: Neon[] = [];
  for (const side of [1, -1] as const) {
    for (let z = -8; z > -44; z -= 3.5 + rand() * 3) {
      const color = NEON[Math.floor(rand() * NEON.length)];
      if (rand() < 0.65) {
        const h = 1.6 + rand() * 1.8;
        neons.push({
          x: side * (7.4 + rand() * 1.2),
          y: 2.4 + h / 2 + rand() * 1.2,
          z,
          w: 0.32 + rand() * 0.2,
          h,
          facing: 0,
          color,
          power: 3 + rand() * 2.5,
        });
      } else {
        neons.push({
          x: side * 8.6,
          y: 3.2 + rand() * 1.2,
          z,
          w: 1.8 + rand() * 1.6,
          h: 0.38 + rand() * 0.2,
          facing: side > 0 ? -Math.PI / 2 : Math.PI / 2,
          color,
          power: 3 + rand() * 2,
        });
      }
    }
  }
  return { lamps, neons };
}

export const LAMP_HEIGHT = 5.4;
export const LAMP_COLOR = '#ffbf7a';

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
  source: Neon | Lamp;
}

/**
 * The reflection each light throws on the wet road: a streak lying on the asphalt from under the light
 * toward the viewer — taller lights throw longer ones. Drawn as additive geometry, it stays bright and
 * crisp where a blurred mirror would smear a small far-away neon into nothing.
 */
export function reflectionStreaks({ lamps, neons }: { lamps: Lamp[]; neons: Neon[] }): Streak[] {
  const fromNeons = neons.map<Streak>((n) => ({
    x: n.facing === 0 ? n.x : n.x - Math.sign(n.x) * 0.25,
    y: 0.015,
    zFar: n.z,
    length: 3.5 + n.y * 2.2,
    width: n.facing === 0 ? Math.max(n.w, 0.3) * 1.2 : 0.5,
    color: n.color,
    power: n.power * 0.4,
    h: n.y,
    source: n,
  }));
  const fromLamps = lamps.map<Streak>((l) => ({
    x: l.x - l.side * 0.9,
    y: 0.015,
    zFar: l.z,
    length: 3.5 + LAMP_HEIGHT * 2,
    width: 0.55,
    color: LAMP_COLOR,
    power: 1.8,
    h: LAMP_HEIGHT,
    source: l,
  }));
  return [...fromNeons, ...fromLamps];
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
