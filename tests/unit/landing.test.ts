import { expect, it } from 'vitest';
import type { Pose } from '@/experience/choreography';
import { createLanding, HURRY, LANDING, landingArmed, landingPose, planHeight, planPose } from '@/experience/landing';

const TAN = Math.tan((17.5 * Math.PI) / 180);

it('from the plan height a 25 cm cell of the floor is as big as a cell of the loader’s sheet (24 px)', () => {
  for (const h of [600, 900, 915]) {
    const d = planHeight(h);
    expect((0.25 * h) / (2 * d * TAN)).toBeCloseTo(24, 6);
  }
});

it('the plan looks straight down at the pole’s foot, the street ahead at the top of the frame', () => {
  const p = planPose(900);
  expect(p.position[1]).toBeCloseTo(planHeight(900), 6);
  expect(Math.hypot(p.position[0] - p.target[0], p.position[2] - p.target[2])).toBeLessThan(0.05);
  expect(p.target[1]).toBe(0);
  // looking down with the camera a hair towards +z: up on the screen is −z, down the street
  expect(p.position[2]).toBeGreaterThan(p.target[2]);
});

it('the landing blends from the plan to the start pose, easing in and out', () => {
  const a: Pose = { position: [0, 15, 0.01], target: [0, 0, 0] };
  const b: Pose = { position: [2.2, 3.6, 9.2], target: [0, 2.7, 0] };
  expect(landingPose(0, a, b)).toEqual(a);
  expect(landingPose(1, a, b)).toEqual(b);
  const early = landingPose(0.05, a, b).position[1];
  expect(15 - early).toBeLessThan((15 - 3.6) * 0.05); // eases in
});

it('lands only from the top of the page, with WebGL, without a hash and without reduced motion', () => {
  const ok = { reduced: false, hash: '', scrollY: 0, webgl: true };
  expect(landingArmed(ok)).toBe(true);
  expect(landingArmed({ ...ok, reduced: true })).toBe(false);
  expect(landingArmed({ ...ok, hash: '#stack' })).toBe(false);
  expect(landingArmed({ ...ok, scrollY: 120 })).toBe(false);
  expect(landingArmed({ ...ok, webgl: false })).toBe(false);
});

it('holds while the loader goes out, then moves, then is done; a cancel stops it', () => {
  const l = createLanding();
  expect(l.progress(0)).toBeNull();
  expect(l.phase).toBe('off');
  l.arm();
  expect(l.phase).toBe('armed');
  expect(l.progress(0)).toBe(0);
  l.start(1000);
  expect(l.progress(1000 + LANDING.holdMs - 1)).toBe(0);
  expect(l.phase).toBe('hold');
  expect(l.progress(1000 + LANDING.holdMs + LANDING.moveMs / 2)).toBeCloseTo(0.5, 6);
  expect(l.phase).toBe('move');
  expect(l.progress(1000 + LANDING.holdMs + LANDING.moveMs + 1)).toBeNull();
  expect(l.phase).toBe('done');
  const c = createLanding();
  c.arm();
  c.start(0);
  c.cancel();
  expect(c.progress(100)).toBeNull();
  expect(c.phase).toBe('off');
});

it('arms once per page load: a scene mounted later (a language switch) never lands again', () => {
  const l = createLanding();
  l.arm();
  l.start(0);
  l.cancel();
  l.arm();
  expect(l.phase).toBe('off');
});

it('a scroll mid-landing runs the rest of the move HURRY times as fast, from where it is', () => {
  const l = createLanding();
  l.arm();
  l.start(0);
  const mid = LANDING.holdMs + LANDING.moveMs / 2;
  expect(l.progress(mid)).toBeCloseTo(0.5, 6);
  l.hurry(mid);
  // the scroll goes on every frame: only the first hurry counts
  l.hurry(mid + 100);
  const rest = (0.5 * LANDING.moveMs) / HURRY;
  expect(l.progress(mid)).toBeCloseTo(0.5, 6);
  expect(l.progress(mid + rest / 2)).toBeCloseTo(0.75, 6);
  expect(l.progress(mid + rest + 1)).toBeNull();
  expect(l.phase).toBe('done');
  // during the hold it starts the whole move at once, at that pace
  const h = createLanding();
  h.arm();
  h.start(0);
  h.hurry(100);
  expect(h.progress(100)).toBe(0);
  expect(h.progress(100 + LANDING.moveMs / HURRY / 2)).toBeCloseTo(0.5, 6);
});

it('keeps the move’s progress the camera last took, for the floor to follow', () => {
  const l = createLanding();
  expect(l.t).toBeNull();
  l.arm();
  l.start(0);
  l.progress(LANDING.holdMs + LANDING.moveMs / 4);
  expect(l.t).toBeCloseTo(0.25, 6);
  l.cancel();
  expect(l.t).toBeNull();
});
