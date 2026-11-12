import { expect, it } from 'vitest';
import { puddleMask } from '@/scene/street/puddles';

it('is deterministic for a seed', () => {
  expect(puddleMask(64, 7)).toEqual(puddleMask(64, 7));
  expect(puddleMask(64, 7)).not.toEqual(puddleMask(64, 8));
});

it('has both puddles and dry asphalt', () => {
  const m = puddleMask(128, 7);
  expect(m).toHaveLength(128 * 128);
  const wet = m.filter((v) => v < 0.35).length / m.length;
  expect(wet).toBeGreaterThan(0.12);
  expect(wet).toBeLessThan(0.55);
  for (const v of m) {
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
  }
});
