import type { Vec3 } from '@/experience/choreography';
import { gantrySignX, STATIONS } from '@/experience/route';
import { STACK_STOPS } from '@/experience/stackStops';

const G = STATIONS.gantry;

export interface GantryLayout {
  /** the six signs, left to right, each facing the camera (+z) */
  signs: { position: Vec3; width: number; height: number }[];
  /** the posts' centre, either side of the road (±x), and their width */
  postX: number;
  postWidth: number;
  /** the box truss the signs hang on: its chords' heights and its front and back faces (z) */
  truss: { top: number; bottom: number; front: number; back: number };
  /** the catwalk under the signs, with a lamp lighting each sign from below */
  catwalk: { y: number; z: number; depth: number; x0: number; x1: number };
  /** how high a lorry may be to pass under it */
  clearance: number;
}

/**
 * The sign gantry over the road (spec §9): six green signs side by side on a box truss, a post beyond each
 * sidewalk, a catwalk under the signs. The catwalk sits low enough under the signs that, from where the
 * camera reads them, it never hides their bottom edge.
 */
export function gantryLayout(): GantryLayout {
  const signs = Array.from({ length: STACK_STOPS }, (_, i) => ({
    position: [gantrySignX(i), G.y, G.z] as Vec3,
    width: G.signW,
    height: G.signH,
  }));
  const outer = gantrySignX(STACK_STOPS - 1) + G.signW / 2;
  const postWidth = 0.5;
  const postX = outer + 0.45 + postWidth / 2;
  const top = G.y + G.signH / 2 - 0.25;
  const bottom = G.y - G.signH / 2 + 0.3;
  const catwalkY = G.y - G.signH / 2 - 0.24;
  return {
    signs,
    postX,
    postWidth,
    truss: { top, bottom, front: G.z - 0.14, back: G.z - 1 },
    catwalk: { y: catwalkY, z: G.z + 0.32, depth: 0.64, x0: -outer, x1: outer },
    clearance: catwalkY - 0.03,
  };
}
