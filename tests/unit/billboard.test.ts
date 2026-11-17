import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { poleWorldPose } from '@/experience/poleRide';
import { ridePose, STATIONS } from '@/experience/route';
import { STACK_TO } from '@/experience/stackStops';
import { BILLBOARD, onBillboard } from '@/scene/billboard/layout';
import { billboardRect, endCamera } from '@/scene/billboard/billboardRect';
import { billboardFit, CONTACT_DESIGN, projectPanel } from '@/scene/billboard/fit';
import { desiredCameraPose } from '@/scene/cameraPose';
import { BOARD, LIGHT_Y } from '@/scene/pole/lightMount';
import { gantryLayout } from '@/scene/stack/layout';
import { ROAD, streetLayout } from '@/scene/street/layout';

const LAPTOPS: readonly [number, number][] = [
  [1440, 800],
  [1440, 900],
  [1280, 720],
  [1920, 1080],
  [2560, 1080],
];

it('the ride ends still in front of the billboard: from 0.86 the camera holds its pose', () => {
  const end = ridePose(1);
  for (const p of [0.86, 0.9, 0.95]) expect(ridePose(p)).toEqual(end);
  expect(end.target[2]).toBeCloseTo(STATIONS.billboard.z, 6);
  // it stopped past the gantry, short of the building
  expect(end.position[2]).toBeLessThan(gantryLayout().truss.back - 2);
  expect(end.position[2]).toBeGreaterThan(BILLBOARD.building.z0 + 10);
});

it('the billboard stands on a building across the end of the street, its panel facing the camera above the road', () => {
  const { panel, building, title } = BILLBOARD;
  expect(building.x0).toBeLessThan(-(ROAD.half + ROAD.sidewalk));
  expect(building.x1).toBeGreaterThan(ROAD.half + ROAD.sidewalk);
  expect(panel.center[2]).toBeGreaterThan(building.z0);
  expect(panel.center[1] - panel.height / 2).toBeGreaterThan(2.5);
  expect(title.offset[1] - title.height / 2).toBeGreaterThan(panel.height / 2);
  // it leans forward to face the camera where the ride ends; the frame's foot stays off the wall
  const end = ridePose(1).position;
  const toCamera = Math.atan2(panel.center[1] - end[1], end[2] - panel.center[2]);
  expect(BILLBOARD.tilt).toBeCloseTo(toCamera, 6);
  expect(onBillboard([0, -panel.height / 2 - BILLBOARD.frame, -0.3])[2]).toBeGreaterThan(building.z0);
});

for (const [w, h] of LAPTOPS) {
  it(`at the end on a ${w}×${h} laptop the panel is on screen, holds the form and stays clear of the green light`, () => {
    const canvas = { x: 0, y: 0, width: w, height: h };
    const rect = billboardRect(endCamera(w / h), canvas);
    expect(rect.x).toBeGreaterThan(0);
    expect(rect.y).toBeGreaterThan(70); // below the header
    expect(rect.x + rect.width).toBeLessThan(w);
    expect(rect.y + rect.height).toBeLessThan(h);
    if (w === 1440 && h === 800) expect(rect.width).toBeGreaterThanOrEqual(520);

    const fit = billboardFit({ w, h })!;
    expect(fit).not.toBeNull();
    expect(fit.scale).toBeGreaterThanOrEqual(0.8);
    expect(CONTACT_DESIGN.w * fit.scale).toBeLessThanOrEqual(rect.width + 1);
    expect(CONTACT_DESIGN.h * fit.scale).toBeLessThanOrEqual(rect.height + 1);

    // the traffic light's backboard, where the riding pole holds it at the end
    const pose = desiredCameraPose(1, w / h, false);
    const pole = poleWorldPose(1, pose, w / h);
    const cam = new PerspectiveCamera(35, w / h, 0.1, 200);
    cam.position.set(...pose.position);
    cam.lookAt(new Vector3(...pose.target));
    cam.updateMatrixWorld();
    const left = new Vector3(pole.position[0] - BOARD.w / 2, pole.position[1] + LIGHT_Y, pole.position[2]).project(cam);
    const lightX = ((left.x + 1) / 2) * w;
    expect(rect.x + rect.width).toBeLessThan(lightX);
  });
}

it('a phone, a portrait tablet or a very small window keeps the form in the page instead', () => {
  expect(billboardFit({ w: 412, h: 915 })).toBeNull();
  expect(billboardFit({ w: 820, h: 1180 })).toBeNull();
  expect(billboardFit({ w: 900, h: 600 })).toBeNull();
});

it('the page places the form by the same projection the scene draws with (no three.js in the page)', () => {
  for (const [w, h] of LAPTOPS) {
    const a = projectPanel(desiredCameraPose(1, w / h, false), { w, h });
    const b = billboardRect(endCamera(w / h), { x: 0, y: 0, width: w, height: h });
    for (const k of ['x', 'y', 'width', 'height'] as const) expect(a[k]).toBeCloseTo(b[k], 3);
  }
});

it('no street lamp stands between the end of the ride and the billboard (it would cross the panel)', () => {
  const end = ridePose(1).position[2];
  for (const l of streetLayout(5).lamps) expect(l.z > end - 0.5 || l.z < BILLBOARD.building.z1, `lamp at z ${l.z}`).toBe(true);
});

// final review: squarish laptop windows (4:3, 5:4) put the panel partly off the screen and under the light
it('wherever the form goes into the billboard, it is whole on the screen and clear of the green light', () => {
  const windows: [number, number][] = [
    [1024, 768],
    [1100, 900],
    [1280, 1024],
    [1366, 1024],
    [1600, 1200],
    [1024, 1000],
    [1280, 960],
    [1440, 1080],
    [1680, 1050],
    [1920, 1200],
    ...LAPTOPS,
  ];
  for (const [w, h] of windows) {
    const fit = billboardFit({ w, h });
    if (!fit) continue;
    const { x, y, width, height } = fit.rect;
    const at = `${w}×${h}`;
    expect(x, at).toBeGreaterThanOrEqual(16);
    expect(x + width, at).toBeLessThanOrEqual(w - 16);
    expect(y, at).toBeGreaterThanOrEqual(70);
    expect(y + height, at).toBeLessThanOrEqual(h - 16);
    const pose = desiredCameraPose(1, w / h, false);
    const pole = poleWorldPose(1, pose, w / h);
    const cam = new PerspectiveCamera(35, w / h, 0.1, 200);
    cam.position.set(...pose.position);
    cam.lookAt(new Vector3(...pose.target));
    cam.updateMatrixWorld();
    const left = new Vector3(pole.position[0] - BOARD.w / 2, pole.position[1] + LIGHT_Y, pole.position[2]).project(cam);
    expect(x + width, at).toBeLessThan(((left.x + 1) / 2) * w - 8);
  }
  // the usual laptop shapes still carry it on the billboard
  for (const [w, h] of LAPTOPS) expect(billboardFit({ w, h }), `${w}×${h}`).not.toBeNull();
});

// M4 round 1, note 1: the billboard hung in the air; it stands on a column with a catwalk and lamps
describe('the support under the billboard', () => {
  const { panel, building, frame } = BILLBOARD;
  const S = BILLBOARD.support;
  const bottom = onBillboard([0, -panel.height / 2, 0]);
  const frameBack = onBillboard([0, -panel.height / 2 - frame, -0.23]);
  const dist = ([x, y, z]: readonly number[], box: { min: number[]; max: number[] }) =>
    Math.hypot(
      Math.max(box.min[0] - x, 0, x - box.max[0]),
      Math.max(box.min[1] - y, 0, y - box.max[1]),
      Math.max(box.min[2] - z, 0, z - box.max[2]),
    );
  const column = {
    min: [S.column.x - S.column.width / 2, 0, S.column.z - S.column.width / 2],
    max: [S.column.x + S.column.width / 2, S.column.top, S.column.z + S.column.width / 2],
  };
  const catwalk = {
    min: [S.catwalk.x0, S.catwalk.y - 0.1, S.catwalk.z - S.catwalk.depth / 2],
    max: [S.catwalk.x1, S.catwalk.y + S.catwalk.rail, S.catwalk.z + S.catwalk.depth / 2],
  };

  it('one column stands on the ground behind the panel, in front of the wall, and reaches up to the frame', () => {
    expect(S.column.top).toBeLessThanOrEqual(bottom[1]);
    expect(S.column.top).toBeGreaterThan(bottom[1] - 0.4);
    expect(S.column.z - S.column.width / 2).toBeGreaterThan(building.z0);
    expect(S.column.z + S.column.width / 2).toBeLessThan(frameBack[2]);
    expect(S.column.x).toBeGreaterThan(panel.center[0] - panel.width / 2);
    expect(S.column.x).toBeLessThan(panel.center[0] + panel.width / 2);
  });

  it('a catwalk runs under the panel’s bottom edge, most of its width', () => {
    expect(S.catwalk.y).toBeLessThan(bottom[1]);
    expect(S.catwalk.x1 - S.catwalk.x0).toBeGreaterThanOrEqual((panel.width * 2) / 3);
    expect(S.catwalk.x0).toBeGreaterThanOrEqual(panel.center[0] - panel.width / 2 - frame);
    expect(S.catwalk.x1).toBeLessThanOrEqual(panel.center[0] + panel.width / 2 + frame);
    expect(S.catwalk.z - S.catwalk.depth / 2).toBeLessThan(bottom[2]);
    expect(S.catwalk.z + S.catwalk.depth / 2).toBeGreaterThan(bottom[2]);
  });

  it('three lamps rise from the catwalk in front of the panel, below its bottom edge', () => {
    expect(S.lamps).toHaveLength(3);
    for (const [x, y, z] of S.lamps) {
      expect(x).toBeGreaterThan(S.catwalk.x0);
      expect(x).toBeLessThan(S.catwalk.x1);
      expect(y).toBeGreaterThan(S.catwalk.y);
      expect(y).toBeLessThan(bottom[1]);
      expect(z).toBeGreaterThan(bottom[2]);
      expect(z).toBeLessThan(S.catwalk.z + S.catwalk.depth / 2 + 1);
    }
  });

  it('in the last frame the railing and the lamps stay below the panel, clear of the form', () => {
    for (const [w, h] of LAPTOPS) {
      const cam = endCamera(w / h);
      const y = (p: readonly number[]) => ((1 - new Vector3(p[0], p[1], p[2]).project(cam).y) / 2) * h;
      const edge = y(bottom);
      expect(y([panel.center[0], S.catwalk.y + S.catwalk.rail, S.catwalk.z + S.catwalk.depth / 2]), `${w}×${h}`).toBeGreaterThan(edge + 4);
      for (const l of S.lamps) expect(y(l), `${w}×${h}`).toBeGreaterThan(edge + 4);
    }
  });

  it('the ride from the last sign to the end keeps a metre from the column and the catwalk', () => {
    for (let p = STACK_TO; p <= 1; p += 0.002) {
      const at = ridePose(p).position;
      expect(dist(at, column), `p ${p.toFixed(3)}`).toBeGreaterThan(1);
      expect(dist(at, catwalk), `p ${p.toFixed(3)}`).toBeGreaterThan(1);
    }
  });
});
