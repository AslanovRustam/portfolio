import { expect, it } from 'vitest';
import type { Vec3 } from '@/experience/choreography';
import { stopProgress, WORK_STOPS } from '@/experience/workStops';
import { onWall, wallFill, wallWeight } from '@/scene/tvwall/camera';
import { screenRect, stopSlots, TV_MODELS, wallLayout } from '@/scene/tvwall/layout';

const stops = stopSlots(wallLayout(7));
const base = { position: [1, 3.4, 4.6] as Vec3, target: [0, 3.4, 0] as Vec3 };

it('at each stop the camera looks straight at its screen', () => {
  for (let i = 0; i < WORK_STOPS; i++) {
    const c = screenRect(stops[i]).center;
    const p = onWall(stopProgress(i), base, 16 / 9, false);
    expect(p.target[0]).toBeCloseTo(c[0], 3);
    expect(p.target[1]).toBeCloseTo(c[1], 3);
    expect(p.position[0]).toBeCloseTo(c[0], 3);
    expect(p.position[2]).toBeGreaterThan(c[2] + 1);
  }
});

it('the wall pose blends in before the first stop and out before the turn to About', () => {
  expect(wallWeight(0.15, false)).toBe(0);
  expect(wallWeight(0.18, false)).toBe(1);
  expect(wallWeight(0.25, false)).toBe(1);
  expect(wallWeight(0.36, false)).toBe(0);
  expect(wallWeight(0.48, false)).toBe(0);
  for (let q = 0.14; q < 0.36; q += 0.0005) {
    const a = onWall(q, base, 16 / 9, false).position;
    const b = onWall(q + 0.0005, base, 16 / 9, false).position;
    expect(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])).toBeLessThan(0.25);
  }
});

it('reduced motion holds the nearest stop; on a phone the set fills the width', () => {
  const gap = stopProgress(1) - stopProgress(0);
  expect(onWall(stopProgress(2) + gap * 0.4, base, 16 / 9, true)).toEqual(onWall(stopProgress(2), base, 16 / 9, true));
  // the share of the frame width the set takes, from the camera distance
  const fill = (aspect: number) => {
    const p = onWall(stopProgress(2), base, aspect, false);
    const width = TV_MODELS[stops[2].model].size[0] * stops[2].scale;
    return width / (2 * (p.position[2] - p.target[2]) * Math.tan((17.5 * Math.PI) / 180) * aspect);
  };
  expect(fill(16 / 9)).toBeCloseTo(wallFill(16 / 9), 6);
  expect(fill(0.46)).toBeCloseTo(0.85, 6);
});
