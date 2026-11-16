import { WORK_STOPS } from '@/experience/workStops';
import { mulberry32 } from '../street/random';

export type TvModel = 'tv1' | 'tv2';

export interface TvModelDef {
  url: string;
  /** local bounding box: width, height, depth (m); origin at the bottom centre */
  size: [number, number, number];
  /**
   * The picture area, local: centre x/y, width/height, the z of the glass at its edge and how far the
   * glass bulges forward at its centre (measured from the mesh, see scripts in the Plan 2b ledger).
   */
  screen: { center: [number, number]; size: [number, number]; z: number; bulge: number };
}

/** Two CC0 Poly Haven sets (public/models/tv), mixed on the wall like the reference's stack. */
export const TV_MODELS: Record<TvModel, TvModelDef> = {
  tv1: {
    url: '/models/tv/television_01/Television_01_2k.gltf',
    size: [0.6, 0.457, 0.47],
    screen: { center: [-0.065, 0.255], size: [0.36, 0.25], z: 0.17, bulge: 0.016 },
  },
  tv2: {
    url: '/models/tv/television_02/television_02_2k.gltf',
    size: [0.4, 0.411, 0.35],
    screen: { center: [-0.005, 0.255], size: [0.315, 0.22], z: 0.1, bulge: 0.022 },
  },
};

/**
 * The wall in its own frame: the sets stand in columns from x0 along +x, facing +z (wallLayoutLocal).
 * WALL_FRAME puts that frame in the street: inside the shop on the left (Plan 4, spec §7), the point
 * (x0, 0, z) at (x, y, z) — y lifts the sets onto a display riser above the window's sill — and turned
 * by yaw, so the columns run away down the street and the screens face the road (+x).
 */
export const WALL = { x0: 1.8, z: -1.5, scale: 1.6 } as const;
export const WALL_FRAME = { x: -7.35, y: 0.45, z: -0.2, yaw: Math.PI / 2 } as const;

export type ScreenContent = { kind: 'stop'; stop: number } | { kind: 'filler'; pattern: 0 | 1 | 2 | 3 };

export interface TvSlot {
  model: TvModel;
  /** bottom centre of the set, world space */
  position: [number, number, number];
  yaw: number;
  roll: number;
  scale: number;
  content: ScreenContent;
  /** rank from left to right: the order the power-on wave reaches it */
  order: number;
}

const GAP = 0.06;

/**
 * The stack: one column per Work stop, its project set at eye height on a set standing on the ground,
 * another set on top in most columns, and a filler column closing the wall on the right. Seeded, so the
 * wall is the same on every load and in every screenshot.
 */
export function wallLayoutLocal(seed = 7): TvSlot[] {
  const rand = mulberry32(seed);
  const pick = (): TvModel => (rand() < 0.5 ? 'tv1' : 'tv2');
  const pattern = () => Math.floor(rand() * 4) as 0 | 1 | 2 | 3;
  const height = (m: TvModel) => TV_MODELS[m].size[1] * WALL.scale;
  const width = (m: TvModel) => TV_MODELS[m].size[0] * WALL.scale;

  const slots: Omit<TvSlot, 'order'>[] = [];
  let x = WALL.x0;
  for (let col = 0; col <= WORK_STOPS; col++) {
    const isStop = col < WORK_STOPS;
    const rows: TvModel[] = [pick(), pick()];
    if (!isStop || rand() < 0.75) rows.push(pick());
    const w = Math.max(...rows.map(width));
    const cx = x + w / 2;
    let y = 0;
    rows.forEach((model, row) => {
      const jitter = (width(model) < w ? (rand() - 0.5) * (w - width(model)) : 0) * 0.8;
      const content: ScreenContent = isStop && row === 1 ? { kind: 'stop', stop: col } : { kind: 'filler', pattern: pattern() };
      slots.push({
        model,
        position: [cx + jitter, y, WALL.z + (rand() - 0.5) * 0.12],
        // the project sets look almost straight at the camera; the others sit a little askew
        yaw: (rand() - 0.5) * (content.kind === 'stop' ? 0.06 : 0.16),
        roll: row === 2 ? (rand() - 0.5) * 0.04 : 0,
        scale: WALL.scale,
        content,
      });
      y += height(model) + 0.004;
    });
    x += w + GAP;
  }
  const byX = [...slots.keys()].sort((a, b) => slots[a].position[0] - slots[b].position[0] || slots[a].position[1] - slots[b].position[1]);
  const order = new Map(byX.map((i, rank) => [i, rank]));
  return slots.map((s, i) => ({ ...s, order: order.get(i)! }));
}

/** A point of the wall's own frame in the street. */
export function wallToWorld(p: readonly [number, number, number]): [number, number, number] {
  const c = Math.cos(WALL_FRAME.yaw);
  const s = Math.sin(WALL_FRAME.yaw);
  const x = p[0] - WALL.x0;
  const z = p[2] - WALL.z;
  return [WALL_FRAME.x + x * c + z * s, WALL_FRAME.y + p[1], WALL_FRAME.z - x * s + z * c];
}

/** The wall's frame as a group transform (for what is drawn in the wall's own frame, like its road streaks). */
export function wallFrameTransform(): { position: [number, number, number]; yaw: number } {
  return { position: wallToWorld([0, 0, 0]), yaw: WALL_FRAME.yaw };
}

/** The wall as it stands in the shop window: every set in street coordinates. */
export function wallLayout(seed = 7): TvSlot[] {
  return wallLayoutLocal(seed).map((s) => ({ ...s, position: wallToWorld(s.position), yaw: s.yaw + WALL_FRAME.yaw }));
}

/** Which way a set's screen faces (unit, flat on the street). */
export function screenNormal(slot: TvSlot): [number, number, number] {
  return [Math.sin(slot.yaw), 0, Math.cos(slot.yaw)];
}

/** The picture area of a set in world space: the centre at the front of the glass, and its size. */
export function screenRect(slot: TvSlot): { center: [number, number, number]; width: number; height: number } {
  const { screen } = TV_MODELS[slot.model];
  const lx = screen.center[0] * slot.scale;
  const lz = (screen.z + screen.bulge) * slot.scale;
  const c = Math.cos(slot.yaw);
  const s = Math.sin(slot.yaw);
  return {
    center: [
      slot.position[0] + lx * c + lz * s,
      slot.position[1] + screen.center[1] * slot.scale,
      slot.position[2] - lx * s + lz * c,
    ],
    width: screen.size[0] * slot.scale,
    height: screen.size[1] * slot.scale,
  };
}

/** The WORK_STOPS stop screens, by stop. */
export function stopSlots(layout: TvSlot[]): TvSlot[] {
  return layout
    .filter((s): s is TvSlot & { content: { kind: 'stop'; stop: number } } => s.content.kind === 'stop')
    .sort((a, b) => a.content.stop - b.content.stop);
}

export interface WallStreak {
  stop: number;
  /** the screen's centre: x, height above the road */
  x: number;
  h: number;
  /** the far end of the streak, under the set */
  zFar: number;
  /** longest it may get, and how wide (the screen's width) */
  length: number;
  width: number;
}

/**
 * One reflection per project screen on the wet road, laid like the street lamps' (streakPlacement):
 * from under the set toward the viewer, as wide as the screen.
 */
export function wallStreaks(layout: TvSlot[]): WallStreak[] {
  return stopSlots(layout).map((s, stop) => {
    const r = screenRect(s);
    return { stop, x: r.center[0], h: r.center[1], zFar: s.position[2], length: 2.6, width: r.width * 0.9 };
  });
}
