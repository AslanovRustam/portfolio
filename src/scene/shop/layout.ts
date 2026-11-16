import { STATIONS } from '@/experience/route';

export interface ShopLayout {
  /** the building's box: x from its back (x0) to its face on the sidewalk (x1), along the street z0 → z1 */
  facade: { x0: number; x1: number; z0: number; z1: number; height: number };
  /** the shop window: the glass plane at glassX, its opening from y0 to y1 and from z0 to z1 */
  window: { glassX: number; y0: number; y1: number; z0: number; z1: number };
  /** the neon sign over the window */
  sign: { text: 'WORK'; position: [number, number, number]; width: number };
}

/**
 * The building on the left with its electronics shop (spec §7): its face on the back of the left sidewalk,
 * three floors above a shop front, the window long enough for the whole TV wall on its riser, and a neon
 * WORK sign above it.
 */
export function shopLayout(): ShopLayout {
  const { x, z0, z1 } = STATIONS.shop;
  return {
    facade: { x0: x - 7.4, x1: x, z0: z0 + 2, z1: z1 - 2.2, height: 13 },
    window: { glassX: x - 0.1, y0: 0.3, y1: 2.9, z0, z1 },
    sign: { text: 'WORK', position: [x + 0.06, 3.55, (z0 + z1) / 2], width: 3.2 },
  };
}
