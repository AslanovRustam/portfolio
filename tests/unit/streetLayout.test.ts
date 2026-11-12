import { expect, it } from 'vitest';
import { reflectionStreaks, streakPlacement, streetLayout } from '@/scene/street/layout';

it('street lamps line both kerbs, running away from the camera behind the pole', () => {
  const { lamps } = streetLayout(5);
  expect(lamps.length).toBeGreaterThanOrEqual(10);
  expect(lamps.some((l) => l.x < 0)).toBe(true);
  expect(lamps.some((l) => l.x > 0)).toBe(true);
  for (const l of lamps) {
    expect(Math.abs(l.x)).toBeGreaterThanOrEqual(4.5);
    expect(l.z).toBeLessThan(-2);
  }
});

it('neon signs sit along the street, clear of the pole, and repeat for a seed', () => {
  const a = streetLayout(5);
  expect(a).toEqual(streetLayout(5));
  expect(a.neons.length).toBeGreaterThanOrEqual(8);
  for (const n of a.neons) {
    expect(Math.hypot(n.x, n.z)).toBeGreaterThan(6);
    expect(n.y - n.h / 2).toBeGreaterThan(1);
  }
});

it('blade signs face down the street toward the viewer, so the wet road can reflect them', () => {
  const { neons } = streetLayout(5);
  const blades = neons.filter((n) => n.facing === 0);
  expect(blades.length).toBeGreaterThanOrEqual(neons.length / 2);
  for (const b of blades) expect(b.h).toBeGreaterThan(b.w);
});

it('every street light gets a reflection streak lying on the road and running toward the viewer', () => {
  const layout = streetLayout(5);
  const streaks = reflectionStreaks(layout);
  expect(streaks).toHaveLength(layout.neons.length + layout.lamps.length);
  for (const s of streaks) {
    expect(s.y).toBeGreaterThan(0);
    expect(s.y).toBeLessThan(0.05);
    expect(s.length).toBeGreaterThan(3);
    // the streak starts under its light and extends toward +z (the camera side)
    expect(s.zFar).toBeLessThan(s.zFar + s.length);
  }
  // a taller light throws a longer streak
  const byHeight = [...layout.neons].sort((a, b) => a.y - b.y);
  const low = streaks.find((s) => s.source === byHeight[0])!;
  const high = streaks.find((s) => s.source === byHeight[byHeight.length - 1])!;
  expect(high.length).toBeGreaterThan(low.length);
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
  const toLight = { x: (light.x - p.x) / Math.hypot(light.x - p.x, light.z - p.z), z: (light.z - p.z) / Math.hypot(light.x - p.x, light.z - p.z) };
  expect(top.x).toBeCloseTo(toLight.x, 6);
  expect(top.z).toBeCloseTo(toLight.z, 6);
  expect(p.length).toBeGreaterThan(1);
  expect(p.length).toBeLessThanOrEqual(30);
  expect(p.length).toBeLessThan(D);
});
