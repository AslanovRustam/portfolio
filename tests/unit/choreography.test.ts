import { expect, it } from 'vitest';
import {
  activeSection,
  cameraPose,
  damp,
  fitDistance,
  lightState,
  partReveal,
  poleYaw,
  reducedCameraPose,
  reducedYaw,
  revealProgress,
  sectionCenter,
} from '@/experience/choreography';
import { stationPose } from '@/experience/route';
import { STACK_STOPS, stackStopProgress } from '@/experience/stackStops';
import { experienceStore } from '@/experience/store';

const close = (a: number, b: number, eps = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(eps);

it('traffic light follows the spec table', () => {
  expect([0, 0.01, 0.05, 0.15, 0.79, 0.8, 1].map(lightState)).toEqual([
    'off',
    'off',
    'red',
    'yellow',
    'yellow',
    'green',
    'green',
  ]);
});

it('sections and centres', () => {
  expect([0.1, 0.15, 0.37, 0.6, 0.8, 1].map(activeSection)).toEqual([
    null,
    'work',
    'about',
    'stack',
    'contact',
    'contact',
  ]);
  expect(sectionCenter('work')).toBe(0.26);
  expect(sectionCenter('contact')).toBe(0.9);
});

it('reveal runs over the intro', () => {
  close(revealProgress(0), 0);
  close(revealProgress(0.075), 0.5);
  close(revealProgress(0.15), 1);
  close(revealProgress(0.6), 1);
});

it('parts reveal in order', () => {
  close(partReveal(0, 3, 4), 0);
  close(partReveal(1, 0, 4), 1);
  close(partReveal(1, 3, 4), 1);
  expect(partReveal(0.5, 0, 4)).toBeGreaterThan(partReveal(0.5, 3, 4));
});

it('pole yaw: a three-quarter turn in the intro (no sign edge-on on the blueprint), then holds each section', () => {
  close(poleYaw(0), 0.75 * Math.PI);
  close(poleYaw(0.15), 0);
  close(poleYaw(0.26), 0);
  close(poleYaw(0.37), -Math.PI / 4);
  close(poleYaw(0.48), -Math.PI / 2);
  close(poleYaw(0.695), -Math.PI);
  close(poleYaw(0.9), -1.5 * Math.PI);
  close(poleYaw(1), -1.5 * Math.PI);
  for (let p = 0; p < 1; p += 0.001) expect(poleYaw(p + 0.001)).toBeLessThanOrEqual(poleYaw(p) + 1e-9);
});

it('camera pose hits its end keys and is continuous', () => {
  // the blueprint is seen from a raised three-quarter angle, like an axonometric drawing
  expect(cameraPose(0)).toEqual({ position: [2.2, 3.6, 9.2], target: [0, 2.7, 0] });
  // the ride ends before the billboard at the end of the street (route.ts)
  expect(cameraPose(1)).toEqual({ position: [0, 4.2, -46], target: [0, 7.1, -62] });
  // the ride covers ~50 m: a thousandth of the scroll may move it up to 0.25 m, never a jump (route.test.ts)
  for (let p = 0; p < 1; p += 0.001) {
    const a = cameraPose(p).position;
    const b = cameraPose(p + 0.001).position;
    expect(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])).toBeLessThanOrEqual(0.25);
  }
});

it('damp converges and clamps long frames', () => {
  close(damp(0, 1, 4, 0.016), 1 - Math.exp(-4 * 0.016));
  close(damp(0, 1, 4, 5), damp(0, 1, 4, 0.1));
});

it('store clamps progress', () => {
  experienceStore.getState().setProgress(1.4);
  expect(experienceStore.getState().progress).toBe(1);
  experienceStore.getState().setProgress(-1);
  expect(experienceStore.getState().progress).toBe(0);
});

it('narrow screens pull the camera back so a 1.5 m sign still fits', () => {
  expect(fitDistance(1.8)).toBe(1);
  expect(fitDistance(0.75)).toBe(1);
  expect(fitDistance(0.49)).toBeCloseTo(0.75 / 0.49, 6);
  // visible width at the WORK pose (d ≈ 4.7 m, fov 35°) covers the sign plus margin on a phone
  const d = 4.7 * fitDistance(0.49);
  expect(2 * d * Math.tan((35 * Math.PI) / 360) * 0.49).toBeGreaterThan(2.1);
});

it('reduced motion: the pole jumps from sign to sign, never turns with scroll', () => {
  close(reducedYaw(0), 0);
  close(reducedYaw(0.05), 0);
  close(reducedYaw(0.36), 0);
  close(reducedYaw(0.37), -Math.PI / 2);
  close(reducedYaw(0.9), -1.5 * Math.PI);
});

it('reduced motion: the camera holds one pose per section', () => {
  expect(reducedCameraPose(0.05)).toEqual(cameraPose(0));
  expect(reducedCameraPose(0.3)).toEqual(stationPose('work'));
  expect(reducedCameraPose(0.36)).toEqual(stationPose('work'));
  expect(reducedCameraPose(0.5)).toEqual(stationPose('about'));
  expect(reducedCameraPose(0.95)).toEqual(stationPose('contact'));
});

it('reduced motion: in Stack the camera stands still under each sign in turn', () => {
  const gap = stackStopProgress(1) - stackStopProgress(0);
  for (let i = 0; i < STACK_STOPS; i++) {
    const q = stackStopProgress(i);
    const at = reducedCameraPose(q);
    const ride = cameraPose(q);
    for (let c = 0; c < 3; c++) {
      close(at.position[c], ride.position[c]);
      close(at.target[c], ride.target[c]);
    }
    // a little either side of the stop it has not moved: no ride between the signs
    expect(reducedCameraPose(q + gap * 0.3)).toEqual(at);
    if (i > 0) expect(reducedCameraPose(q - gap * 0.3)).toEqual(at);
  }
});

it('an instant damp (reduced motion) lands on the target even on a zero-length frame', () => {
  expect(damp(1, 2, Infinity, 0)).toBe(2);
  expect(damp(1, 2, Infinity, 0.016)).toBe(2);
});
