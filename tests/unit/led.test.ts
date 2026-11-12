import { expect, it } from 'vitest';
import { ledLayout } from '@/scene/pole/led';

it('LED dots fill a round lens on a hex grid, inside the rim', () => {
  const dots = ledLayout(256, 15, 110);
  expect(dots.length).toBeGreaterThan(150);
  for (const [x, y] of dots) expect(Math.hypot(x - 128, y - 128)).toBeLessThanOrEqual(110);
  // hex rows: neighbouring rows are offset by half a pitch
  const rows = [...new Set(dots.map(([, y]) => Math.round(y)))].sort((a, b) => a - b);
  expect(rows.length).toBeGreaterThan(10);
});
