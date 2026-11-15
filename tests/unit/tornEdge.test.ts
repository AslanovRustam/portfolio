import { expect, it } from 'vitest';
import { tornEdge } from '@/ui/flow/tornEdge';

/** The polygon's points as [x, y] in percent. */
const points = (polygon: string) =>
  [...polygon.matchAll(/(-?[\d.]+)% (-?[\d.]+)%/g)].map((m) => [Number(m[1]), Number(m[2])] as const);

it('a torn edge is the same for the same seed and stays inside the box', () => {
  expect(tornEdge(7, 14)).toBe(tornEdge(7, 14));
  expect(tornEdge(7, 14)).not.toBe(tornEdge(8, 14));
  const pts = points(tornEdge(7, 14));
  expect(pts.length).toBeGreaterThanOrEqual(2 * 14);
  for (const [x, y] of pts) expect(x >= 0 && x <= 100 && y >= 0 && y <= 100).toBe(true);
});

it('only the top and bottom edges are torn, a few percent deep', () => {
  const pts = points(tornEdge(3, 12));
  const top = pts.filter(([, y]) => y < 50);
  const bottom = pts.filter(([, y]) => y >= 50);
  expect(Math.max(...top.map(([, y]) => y))).toBeLessThanOrEqual(4);
  expect(Math.min(...bottom.map(([, y]) => y))).toBeGreaterThanOrEqual(96);
});
