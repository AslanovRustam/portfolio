import { expect, it } from 'vitest';
import { screenLevel, WAVE } from '@/scene/tvwall/power';

it('standby outside Work, a left-to-right wave on entry, then bright active and dim idle screens', () => {
  expect(screenLevel({ order: 0, sinceOn: null, active: true, hovered: false, reduced: false })).toBe(0);
  expect(screenLevel({ order: 5, sinceOn: 5 * WAVE.step - 0.01, active: false, hovered: false, reduced: false })).toBe(0);
  expect(screenLevel({ order: 0, sinceOn: 0.02, active: false, hovered: false, reduced: false })).toBeGreaterThan(1); // the flash
  const settled = 3;
  expect(screenLevel({ order: 5, sinceOn: settled, active: true, hovered: false, reduced: false })).toBe(1);
  expect(screenLevel({ order: 5, sinceOn: settled, active: false, hovered: false, reduced: false })).toBeCloseTo(0.25, 6);
  expect(screenLevel({ order: 5, sinceOn: settled, active: false, hovered: true, reduced: false })).toBeCloseTo(0.45, 6);
  expect(screenLevel({ order: 20, sinceOn: 0, active: false, hovered: false, reduced: true })).toBeCloseTo(0.25, 6);
});
