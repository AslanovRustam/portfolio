import { expect, it } from 'vitest';
import {
  ARM_REACH,
  lampIntensity,
  reflectionStreaks,
  ROAD,
  streakPlacement,
  streetLayout,
} from '@/scene/street/layout';

it('lamps stand on the sidewalks of the road behind the pole, arms reaching over the carriageway', () => {
  const { lamps } = streetLayout(5);
  expect(lamps.length).toBeGreaterThanOrEqual(11);
  expect(lamps.some((l) => l.side === 1)).toBe(true);
  expect(lamps.some((l) => l.side === -1)).toBe(true);
  for (const l of lamps) {
    expect(Math.abs(l.x)).toBeGreaterThan(ROAD.half);
    expect(Math.abs(l.x)).toBeLessThan(ROAD.half + ROAD.sidewalk);
    expect(Math.sign(l.x)).toBe(l.side);
    // the head hangs over the road
    expect(Math.abs(l.x - l.side * ARM_REACH)).toBeLessThan(ROAD.half);
    expect(l.z).toBeLessThan(ROAD.zNear);
  }
});

it('a few lamps flicker, the rest burn steady, and the street repeats for a seed', () => {
  const a = streetLayout(5);
  expect(a).toEqual(streetLayout(5));
  const flickering = a.lamps.filter((l) => l.flicker).length;
  expect(flickering).toBeGreaterThanOrEqual(2);
  expect(flickering).toBeLessThanOrEqual(4);
});

it('a steady lamp is always on; a flickering one is mostly on, with short failing bursts', () => {
  const { lamps } = streetLayout(5);
  const steady = lamps.find((l) => !l.flicker)!;
  const failing = lamps.find((l) => l.flicker)!;
  const samples = Array.from({ length: 2000 }, (_, i) => i * 0.013);
  for (const t of samples) expect(lampIntensity(steady, t)).toBe(1);
  const values = samples.map((t) => lampIntensity(failing, t));
  for (const v of values) {
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
  }
  expect(values.some((v) => v < 0.3)).toBe(true);
  expect(values.filter((v) => v > 0.8).length / values.length).toBeGreaterThan(0.6);
  expect(lampIntensity(failing, 7.3)).toBe(lampIntensity(failing, 7.3));
});

it('every lamp throws one reflection streak, from under its head', () => {
  const layout = streetLayout(5);
  const streaks = reflectionStreaks(layout);
  expect(streaks).toHaveLength(layout.lamps.length);
  streaks.forEach((s, i) => {
    const l = layout.lamps[i];
    expect(s.x).toBeCloseTo(l.x - l.side * ARM_REACH, 6);
    expect(s.zFar).toBe(l.z);
    expect(s.y).toBeGreaterThan(0);
    expect(s.y).toBeLessThan(0.05);
    expect(s.length).toBeGreaterThan(3);
  });
});

it('a streak sits on the line from its light to the camera, where the mirror image lands', () => {
  const cam = { x: 1, y: 3, z: 5 };
  const light = { x: 5, h: 3, z: -11 };
  const p = streakPlacement(light, cam, 30);
  const D = Math.hypot(cam.x - light.x, cam.z - light.z);
  // the mirrored light (at −h) is seen where the camera-to-image line crosses the road: h/(H+h) of the way
  const expected = { x: light.x + ((cam.x - light.x) * 3) / 6, z: light.z + ((cam.z - light.z) * 3) / 6 };
  expect(p.x).toBeCloseTo(expected.x, 6);
  expect(p.z).toBeCloseTo(expected.z, 6);
  // its far end points back at the light: plane top (−z after laying flat) rotated by the angle
  const top = { x: -Math.sin(p.angle), z: -Math.cos(p.angle) };
  const len = Math.hypot(light.x - p.x, light.z - p.z);
  expect(top.x).toBeCloseTo((light.x - p.x) / len, 6);
  expect(top.z).toBeCloseTo((light.z - p.z) / len, 6);
  expect(p.length).toBeGreaterThan(1);
  expect(p.length).toBeLessThanOrEqual(30);
  expect(p.length).toBeLessThan(D);
});
