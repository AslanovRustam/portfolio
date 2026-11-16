import { expect, it } from 'vitest';
import type { Pose } from '@/experience/choreography';
import { ridePose, STATIONS, stationPose } from '@/experience/route';

const near = (a: readonly number[], b: readonly number[], eps = 1e-6) => a.every((v, i) => Math.abs(v - b[i]) < eps);
const dist = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

it('the intro is the shot it was: the blueprint seen from a raised three-quarter angle, then the pole', () => {
  expect(near(ridePose(0).position, [2.2, 3.6, 9.2])).toBe(true);
  expect(near(ridePose(0).target, [0, 2.7, 0])).toBe(true);
  // halfway through the intro the old smoothstep sits exactly between its keys
  expect(near(ridePose(0.075).position, [1.8, 3.3, 7.7])).toBe(true);
  expect(near(ridePose(0.075).target, [0, 2.85, 0])).toBe(true);
  expect(near(ridePose(0.15).position, [1.4, 3.0, 6.2])).toBe(true);
});

it('the ride never jumps: a thousandth of the scroll moves the camera at most 0.25 m', () => {
  let worst = 0;
  for (let p = 0; p < 1; p += 0.001) worst = Math.max(worst, dist(ridePose(p).position, ridePose(Math.min(1, p + 0.001)).position));
  expect(worst).toBeLessThanOrEqual(0.25);
});

it('the camera only drives forward: its z never grows', () => {
  for (let p = 0; p < 1; p += 0.002) expect(ridePose(p + 0.002).position[2]).toBeLessThanOrEqual(ridePose(p).position[2] + 1e-9);
});

/** Whether a section's pose looks at its place on the street. */
function looksAt(pose: Pose, id: 'work' | 'about' | 'stack' | 'contact'): boolean {
  const [x, y, z] = pose.target;
  switch (id) {
    case 'work':
      return x <= STATIONS.shop.x + 2.5 && z <= STATIONS.shop.z0 && z >= STATIONS.shop.z1;
    case 'about':
      return Math.abs(x - STATIONS.pole.x) < 0.5 && Math.abs(z - STATIONS.pole.z) < 0.5;
    case 'stack':
      return Math.abs(z - STATIONS.gantry.z) < 0.5 && y > 4.5;
    case 'contact':
      return Math.abs(z - STATIONS.billboard.z) < 0.5 && y > 5;
  }
}

it('at each section the camera looks at its place: the shop, the pole, the gantry, the billboard', () => {
  expect(looksAt(ridePose(0.26), 'work')).toBe(true);
  expect(looksAt(ridePose(0.48), 'about')).toBe(true);
  expect(looksAt(ridePose(0.695), 'stack')).toBe(true);
  expect(looksAt(ridePose(0.9), 'contact')).toBe(true);
  expect(looksAt(ridePose(1), 'contact')).toBe(true);
});

it('reduced motion: one still pose per section, at the same places', () => {
  for (const id of ['work', 'about', 'stack', 'contact'] as const) expect(looksAt(stationPose(id), id), id).toBe(true);
});
