import { expect, it } from 'vitest';
import { PART_ORDER, partRange } from '@/scene/pole/parts';
import { backgroundAt, neonFlicker } from '@/scene/reveal/revealMath';

it('background goes from blueprint blue to night black', () => {
  expect(backgroundAt(0)).toBe('#0b1f38');
  expect(backgroundAt(1)).toBe('#050507');
});

it('neon is off until its sign is nearly rendered, flickers, then stays on', () => {
  for (const t of [0, 0.3, 1.7]) {
    expect(neonFlicker(0, t)).toBe(0);
    expect(neonFlicker(0.8, t)).toBe(0);
    expect(neonFlicker(1, t)).toBe(1);
  }
  const mid = Array.from({ length: 50 }, (_, i) => neonFlicker(0.93, i * 0.037));
  expect(mid.some((v) => v === 0)).toBe(true);
  expect(mid.some((v) => v > 0.5)).toBe(true);
  expect(neonFlicker(0.93, 0.5)).toBe(neonFlicker(0.93, 0.5));
});

it('every reveal part has a height range on the pole', () => {
  for (const part of PART_ORDER) {
    const [lo, hi] = partRange(part);
    expect(hi).toBeGreaterThan(lo);
    expect(lo).toBeGreaterThanOrEqual(0);
  }
});
