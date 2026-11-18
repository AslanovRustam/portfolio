import { expect, it } from 'vitest';
import { billTilt } from '@/ui/flow/tornEdge';

it('About’s bills tilt different ways, never more than 1.8°', () => {
  // AboutSection's seeds (and the poster's)
  const tilts = [10, 17, 24, 31, 38].map(billTilt);
  expect(new Set(tilts).size).toBeGreaterThanOrEqual(3);
  expect(tilts.some((t) => t > 0)).toBe(true);
  expect(tilts.some((t) => t < 0)).toBe(true);
  for (const t of tilts) expect(Math.abs(t)).toBeLessThanOrEqual(1.8);
});
