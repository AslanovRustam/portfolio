import { PerspectiveCamera, Vector3 } from 'three';
import { expect, it } from 'vitest';
import type { Pose, Vec3 } from '@/experience/choreography';
import { poleWorldPose, stackPark } from '@/experience/poleRide';
import { STACK_STOPS, stackStopProgress } from '@/experience/stackStops';
import { ridePose, STATIONS } from '@/experience/route';

const LAPTOP = 16 / 9;
const PHONE = 0.45;

/** The pole's middle (where its signs hang) on screen, in NDC, as the site's 35° camera sees it. */
function ndc(pose: Pose, at: Vec3, aspect: number, local = 2.9): [number, number] {
  const cam = new PerspectiveCamera(35, aspect, 0.1, 200);
  cam.position.set(...pose.position);
  cam.lookAt(new Vector3(...pose.target));
  cam.updateMatrixWorld();
  const v = new Vector3(at[0], at[1] + local, at[2]).project(cam);
  return [v.x, v.y];
}
const SIGN_BAND: readonly [number, number] = [1.9, 3.68];
const LIGHT = 4.725;

/** The pole in the camera's frame: metres to the right, metres ahead. */
function cameraSpace(pose: Pose, at: Vec3): { right: number; ahead: number } {
  const f = new Vector3(pose.target[0] - pose.position[0], 0, pose.target[2] - pose.position[2]).normalize();
  const r = new Vector3(-f.z, 0, f.x);
  const d = new Vector3(at[0] - pose.position[0], 0, at[2] - pose.position[2]);
  return { right: d.dot(r), ahead: d.dot(f) };
}

it('at the start the pole stands where it always stood', () => {
  for (const p of [0, 0.1, 0.15]) {
    const pole = poleWorldPose(p, ridePose(p), LAPTOP);
    expect(pole.mode).toBe('start');
    expect(pole.position).toEqual([0, 0, 0]);
    expect(pole.facing).toBe(0);
  }
});

it('on the ride it keeps to the right of the frame, a few metres ahead, its foot below the frame', () => {
  const cam = ridePose(0.7);
  const pole = poleWorldPose(0.7, cam, LAPTOP);
  expect(pole.mode).toBe('ride');
  const { right, ahead } = cameraSpace(cam, pole.position);
  expect(right).toBeGreaterThanOrEqual(1.0);
  expect(right).toBeLessThanOrEqual(1.6);
  expect(ahead).toBeGreaterThanOrEqual(2.8);
  expect(ahead).toBeLessThanOrEqual(3.6);
  const [x] = ndc(cam, pole.position, LAPTOP);
  expect(x).toBeGreaterThan(0.3);
  expect(x).toBeLessThan(1);
});

// the camera looks up at the gantry and the billboard; the pole's foot is never in the frame, so the pole
// rides at whatever height keeps its signs (and, at the end, its light) in view
it('looking up at the gantry, its signs stay in the frame and its foot below it', () => {
  for (const p of [0.6, 0.65, 0.72, 0.77]) {
    const cam = ridePose(p);
    const pole = poleWorldPose(p, cam, LAPTOP);
    for (const h of SIGN_BAND) expect(Math.abs(ndc(cam, pole.position, LAPTOP, h)[1]), `p ${p}, sign at ${h} m`).toBeLessThan(0.95);
    expect(ndc(cam, pole.position, LAPTOP, 0)[1], `p ${p}, foot`).toBeLessThan(-1);
  }
});

it('in the final frame its light is in view, its foot below the frame', () => {
  const cam = ridePose(1);
  const pole = poleWorldPose(1, cam, LAPTOP);
  const [x, y] = ndc(cam, pole.position, LAPTOP, LIGHT);
  expect(Math.abs(x)).toBeLessThan(0.95);
  expect(Math.abs(y)).toBeLessThan(0.95);
  expect(ndc(cam, pole.position, LAPTOP, 0)[1]).toBeLessThan(-1);
});

it('on a phone it rides at the right edge, still in the frame', () => {
  const cam = ridePose(0.7);
  const [x] = ndc(cam, poleWorldPose(0.7, cam, PHONE).position, PHONE);
  expect(x).toBeGreaterThanOrEqual(0.55);
  expect(x).toBeLessThanOrEqual(0.95);
});

it('while the camera faces the shop window it steps aside, out of the frame to the right', () => {
  const cam: Pose = { position: [0.4, 2.4, -18], target: [-6, 2.2, -20] };
  const pole = poleWorldPose(0.26, cam, LAPTOP, 1);
  expect(pole.mode).toBe('parked');
  expect(ndc(cam, pole.position, LAPTOP)[0]).toBeGreaterThan(1.05);
});

it('in About it stands at its spot in the middle of the frame, faced to the camera', () => {
  const cam = ridePose(0.48);
  const pole = poleWorldPose(0.48, cam, LAPTOP);
  expect(pole.mode).toBe('centre');
  expect(pole.position[0]).toBeCloseTo(STATIONS.pole.x, 6);
  expect(pole.position[2]).toBeCloseTo(STATIONS.pole.z, 6);
  expect(Math.abs(ndc(cam, pole.position, LAPTOP)[0])).toBeLessThan(0.1);
  expect(pole.facing).toBeCloseTo(0, 6);
});

it('its signs turn with the camera: a camera looking left down the street turns them a quarter', () => {
  const cam: Pose = { position: [0, 2.5, -10], target: [-10, 2.5, -10] };
  expect(poleWorldPose(0.7, cam, LAPTOP).facing).toBeCloseTo(Math.PI / 2, 6);
});

it('on a phone the pole steps out of the frame at the Stack signs (a sign fills the width); on a laptop it rides on', () => {
  for (let i = 0; i < STACK_STOPS; i++) {
    expect(stackPark(stackStopProgress(i), PHONE)).toBe(1);
    expect(stackPark(stackStopProgress(i), LAPTOP)).toBe(0);
  }
  for (const p of [0.3, 0.5, 0.58, 0.81, 0.95]) expect(stackPark(p, PHONE), `p ${p}`).toBe(0);
  // it eases out and back, never jumps
  for (let p = 0.55; p < 0.85; p += 0.0005) expect(Math.abs(stackPark(p + 0.0005, PHONE) - stackPark(p, PHONE))).toBeLessThan(0.1);
});
