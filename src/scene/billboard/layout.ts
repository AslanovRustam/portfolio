import type { Vec3 } from '@/experience/choreography';
import { ridePose, STATIONS } from '@/experience/route';

const B = STATIONS.billboard;
const END = ridePose(1).position;
const PANEL = { width: 12, height: 5.2 };
const FRAME = 0.32;
const TILT = Math.atan2(B.y - END[1], END[2] - B.z);
/** the frame's lower bar, where the column's head carries it (y, before the bar's own depth) */
const FRAME_FOOT = B.y - (PANEL.height / 2 + FRAME) * Math.cos(TILT);
/** where the panel's bottom edge meets the air (z): the catwalk runs under it */
const EDGE_Z = B.z - (PANEL.height / 2) * Math.sin(TILT);
const CATWALK = { y: 2.95, depth: 0.9, rail: 0.6 };

/**
 * The billboard at the end of the street (spec §10), in metres: a dark panel in a frame on the building
 * across the road's end, the neon title standing on the frame. On a laptop the contact form is fitted
 * into the panel; on a phone the panel stays dark and the form follows in the page.
 */
export const BILLBOARD = {
  /** the panel: its centre and size; it faces the camera (+z), its top tilted forward by `tilt` */
  panel: { center: [B.x, B.y, B.z] as Vec3, ...PANEL },
  /** how far the billboard leans forward (rad, about x): square to the camera where the ride ends */
  tilt: TILT,
  /** the frame's width around the panel */
  frame: FRAME,
  /** the neon title on top of the frame, leaning with it: its centre relative to the panel's */
  title: { offset: [0, PANEL.height / 2 + FRAME + 0.95, -0.05] as Vec3, width: 7.5, height: 1.5 },
  /** the building behind it, across the end of the street: its face at z0 */
  building: { x0: -22, x1: 22, z0: B.z - 1.8, z1: B.z - 12, height: 24 },
  /**
   * What it stands on (M4 round 1: it hung in the air), in the street: one steel column from the ground in
   * the gap between the frame's back and the wall, its head under the frame's lower bar; a catwalk with a
   * railing under the panel's bottom edge; three lamps on goosenecks from the catwalk's front, just below
   * the panel, lighting it. The railing and the lamps stay under the panel's edge in the last frame.
   */
  support: {
    column: { x: B.x, z: B.z - 1.06, width: 0.8, top: FRAME_FOOT },
    catwalk: { ...CATWALK, z: EDGE_Z + 0.33, x0: B.x - 5, x1: B.x + 5 },
    lamps: [-4, 0, 4].map((dx): Vec3 => [B.x + dx, 3.62, EDGE_Z + 1.25]),
  },
} as const;

/** A point on the billboard (relative to the panel's centre, before the tilt) in the street. */
export function onBillboard([x, y, z]: Vec3): Vec3 {
  const [cx, cy, cz] = BILLBOARD.panel.center;
  const c = Math.cos(BILLBOARD.tilt);
  const s = Math.sin(BILLBOARD.tilt);
  return [cx + x, cy + y * c - z * s, cz + y * s + z * c];
}
