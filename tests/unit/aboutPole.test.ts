import { PerspectiveCamera, Vector3 } from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import type { Pose } from '@/experience/choreography';
import { aboutCloseUp, aboutPose, type AboutView, billsWidth } from '@/experience/aboutPole';
import { DEFAULT_SVH, PIECE_IDS, resetJourneyLengths, setJourneyLengths } from '@/experience/journey';
import { STATIONS } from '@/experience/route';
import { POLE } from '@/experience/signs';
import { desiredCameraPose } from '@/scene/cameraPose';

const SCREENS: readonly [number, number][] = [
  [1440, 800],
  [1280, 720],
  [1920, 1080],
  [412, 839],
  [360, 740],
];
const ABOUT_PX = [2600, 4000, 7000];
/** About's hold: its piece of the journey (story progress) */
const HOLD = [0.395, 0.565] as const;
const SPAN = HOLD[1] - HOLD[0];

function camera(pose: Pose, w: number, h: number) {
  const cam = new PerspectiveCamera(35, w / h, 0.1, 200);
  cam.position.set(...pose.position);
  cam.lookAt(new Vector3(...pose.target));
  cam.updateMatrixWorld();
  return (p: readonly number[]) => {
    const v = new Vector3(p[0], p[1], p[2]).project(cam);
    return [((v.x + 1) / 2) * w, ((1 - v.y) / 2) * h] as const;
  };
}

afterEach(() => resetJourneyLengths());

describe('About, the pole close up', () => {
  it('the bills’ column is as wide as the page lays it out: 32rem or 44 % on a laptop, the width less 2rem on a phone', () => {
    expect(billsWidth(1440, 800)).toBe(512);
    expect(billsWidth(1100, 800)).toBeCloseTo(484, 6);
    expect(billsWidth(412, 839)).toBe(380);
    // a portrait or narrow window lays the column out like a phone
    expect(billsWidth(900, 1200)).toBe(868);
  });

  for (const [w, h] of SCREENS)
    for (const aboutPx of ABOUT_PX) {
      const at = `${w}×${h}, About ${aboutPx} px`;
      const view: AboutView = { w, h, aboutPx, billsPx: billsWidth(w, h) };

      it(`the pole’s surface moves up the screen pixel for pixel with the scroll (${at})`, () => {
        for (const p of [0.42, 0.48, 0.54]) {
          const a = aboutPose(p, view);
          const d = 0.01;
          // a point on the pole's face, where the camera looks at p
          const point = [STATIONS.pole.x, a.target[1], STATIONS.pole.z + POLE.radius];
          const y0 = camera(a, w, h)(point)[1];
          const y1 = camera(aboutPose(p + d, view), w, h)(point)[1];
          expect(y0 - y1, `${at} at ${p}`).toBeCloseTo((d / SPAN) * aboutPx, 0);
          expect(Math.abs(y0 - y1 - (d / SPAN) * aboutPx), `${at} at ${p}`).toBeLessThan(0.5);
        }
      });

      it(`stays on the pole below its signs, near but not too near, and the pole fills the column (${at})`, () => {
        const { distance } = aboutCloseUp(view);
        expect(distance - POLE.radius, at).toBeGreaterThanOrEqual(0.15);
        for (let p = HOLD[0]; p <= HOLD[1] + 1e-9; p += 0.005) {
          const y = aboutPose(p, view).position[1];
          expect(y, `${at} at ${p.toFixed(3)}`).toBeLessThanOrEqual(1.6 + 1e-9);
          expect(y, `${at} at ${p.toFixed(3)}`).toBeGreaterThanOrEqual(0.3 - 1e-9);
        }
        const pose = aboutPose(0.48, view);
        const screen = camera(pose, w, h);
        const y = pose.target[1];
        const left = screen([STATIONS.pole.x - POLE.radius, y, STATIONS.pole.z])[0];
        const right = screen([STATIONS.pole.x + POLE.radius, y, STATIONS.pole.z])[0];
        if (w >= 1024) expect(right - left, at).toBeGreaterThanOrEqual(view.billsPx);
        else expect(right - left, at).toBeGreaterThanOrEqual(w);
      });
    }

  it('the camera in the page follows it: About measured in px, the pose from the window and the bills', () => {
    for (const [w, h] of SCREENS) {
      const lengths = PIECE_IDS.map((id) => (id === 'about' ? 4000 : (DEFAULT_SVH[id] * h) / 100));
      setJourneyLengths(lengths);
      const view: AboutView = { w, h, aboutPx: 4000, billsPx: billsWidth(w, h) };
      for (const p of [0.4, 0.48, 0.56]) expect(desiredCameraPose(p, { w, h }, false)).toEqual(aboutPose(p, view));
      // under reduced motion the camera stands at the pole too, moving with the page inside the hold
      expect(desiredCameraPose(0.48, { w, h }, true)).toEqual(aboutPose(0.48, view));
      expect(desiredCameraPose(0.38, { w, h }, true)).toEqual(aboutPose(HOLD[0], view));
      expect(desiredCameraPose(0.58, { w, h }, true)).toEqual(aboutPose(HOLD[1], view));
    }
  });
});
