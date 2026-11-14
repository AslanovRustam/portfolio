import { PerspectiveCamera } from 'three';
import { expect, it } from 'vitest';
import { projectScreen } from '@/scene/tvwall/screenRects';
import { WORK_STOPS } from '@/experience/workStops';
import { screenRect, stopSlots, TV_MODELS, type TvSlot, WALL, wallLayout, wallStreaks } from '@/scene/tvwall/layout';

const layout = wallLayout(7);
const stops = stopSlots(layout);

it('one stop screen per Work stop, left to right at eye height', () => {
  expect(stops.map((s) => (s.content as { stop: number }).stop)).toEqual([...Array(WORK_STOPS).keys()]);
  const xs = stops.map((s) => screenRect(s).center[0]);
  for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThan(xs[i - 1] + 0.3);
  for (const s of stops) {
    const y = screenRect(s).center[1];
    expect(y).toBeGreaterThan(0.8);
    expect(y).toBeLessThan(2.0);
  }
});

it('a stacked wall right of the pole: no overlaps, fillers around the stops', () => {
  expect(layout.filter((s) => s.content.kind === 'filler').length).toBeGreaterThanOrEqual(10);
  for (const s of layout) {
    expect(s.position[0]).toBeGreaterThanOrEqual(WALL.x0 - 0.01);
    expect(Math.abs(s.position[2] - WALL.z)).toBeLessThan(0.35);
  }
  const box = (s: TvSlot) => {
    const d = TV_MODELS[s.model].size;
    const w = (d[0] * s.scale) / 2;
    return [s.position[0] - w, s.position[0] + w, s.position[1], s.position[1] + d[1] * s.scale] as const;
  };
  for (const a of layout)
    for (const b of layout)
      if (a !== b) {
        const [ax0, ax1, ay0, ay1] = box(a);
        const [bx0, bx1, by0, by1] = box(b);
        expect(ax1 - 0.02 <= bx0 || bx1 - 0.02 <= ax0 || ay1 - 0.02 <= by0 || by1 - 0.02 <= ay0).toBe(true);
      }
  expect(new Set(layout.map((s) => s.order)).size).toBe(layout.length);
});

it('the layout is deterministic', () => {
  expect(wallLayout(7)).toEqual(layout);
});

it('each lit screen throws one streak on the road, toward the viewer', () => {
  const s = wallStreaks(layout);
  expect(s.map((x) => x.stop)).toEqual([...Array(WORK_STOPS).keys()]);
  s.forEach((x, i) => {
    expect(x.x).toBeCloseTo(screenRect(stops[i]).center[0], 3);
    expect(x.h).toBeCloseTo(screenRect(stops[i]).center[1], 3);
    expect(x.zFar).toBeLessThanOrEqual(WALL.z + 0.1);
    expect(x.length).toBeGreaterThan(1);
  });
});

it("a TV straight ahead projects to a screen-shaped rect in the middle of the canvas", () => {
  const slot = stops[3];
  const { center } = screenRect(slot);
  const camera = new PerspectiveCamera(40, 1440 / 800, 0.1, 100);
  camera.position.set(center[0], center[1], center[2] + 3);
  camera.lookAt(center[0], center[1], center[2]);
  camera.updateMatrixWorld();
  const canvas = { x: 0, y: 0, width: 1440, height: 800 };
  const r = projectScreen(slot, camera, canvas);
  expect(Math.abs(r.x + r.width / 2 - 720)).toBeLessThan(2);
  expect(Math.abs(r.y + r.height / 2 - 400)).toBeLessThan(2);
  expect(r.width).toBeGreaterThan(r.height);
  expect(r.height).toBeGreaterThan(0);
});
