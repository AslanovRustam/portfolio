import { PerspectiveCamera, Vector3 } from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import type { Pose } from '@/experience/choreography';
import { contactLanding, diveStage, type DiveView } from '@/experience/dive';
import { DEFAULT_SVH, PIECE_IDS, resetJourneyLengths, setJourneyLengths } from '@/experience/journey';
import { ridePose } from '@/experience/route';
import { projectPanel } from '@/scene/billboard/fit';
import { BILLBOARD, onBillboard } from '@/scene/billboard/layout';
import { desiredCameraPose } from '@/scene/cameraPose';
import { gantryLayout } from '@/scene/stack/layout';

/** Phones, a portrait tablet and a small landscape window: none of them fits the form into the billboard. */
const SCREENS: readonly [number, number][] = [
  [412, 839],
  [390, 844],
  [360, 740],
  [768, 1024],
  [900, 600],
  // final review: wider than ~2.7:1 the panel's height alone never covered the window's width
  [1440, 500],
  [844, 190],
  [1180, 820],
];
/** Contact's piece, in screens: a short one, a usual one, a long one. */
const PIECES = [1.6, 2.5, 4];

/** Lays the journey out on a screen this tall, Contact's piece `screens` screens long (px). */
function layout(h: number, screens: number): DiveView {
  setJourneyLengths(PIECE_IDS.map((id) => (id === 'contact' ? screens * h : (DEFAULT_SVH[id] * h) / 100)));
  return { w: 0, h, contactPx: screens * h };
}

function project(pose: Pose, w: number, h: number) {
  const cam = new PerspectiveCamera(35, w / h, 0.1, 200);
  cam.position.set(...pose.position);
  cam.lookAt(new Vector3(...pose.target));
  cam.updateMatrixWorld();
  return (p: readonly number[]) => {
    const v = new Vector3(p[0], p[1], p[2]).project(cam);
    return [((v.x + 1) / 2) * w, ((1 - v.y) / 2) * h] as const;
  };
}

const dist = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const { panel, title, support } = BILLBOARD;
/** the panel's lit interior, inside the tube */
const INNER = { w: panel.width - 0.24, h: panel.height - 0.24 };

afterEach(() => resetJourneyLengths());

describe('the dive into the billboard’s screen', () => {
  it('counts its stages in screens from where Contact begins: arrived for 0.2, the dive for 0.6, then inside', () => {
    for (const k of PIECES) {
      const view = { ...layout(839, k), w: 412 };
      // 0.2 and 0.8 of a screen into a piece of k screens, which spans story 0.86..1
      const arrived = 0.86 + (0.2 / k) * 0.14;
      const inside = 0.86 + (0.8 / k) * 0.14;
      expect(diveStage(0.85, view).stage).toBe('approach');
      expect(diveStage(0.86 + 1e-6, view).stage).toBe('arrived');
      expect(diveStage(arrived - 1e-4, view).stage).toBe('arrived');
      expect(diveStage(arrived + 1e-4, view).stage).toBe('dive');
      expect(diveStage((arrived + inside) / 2, view).t).toBeCloseTo(0.5, 2);
      expect(diveStage(inside + 1e-4, view).stage).toBe('inside');
      expect(contactLanding(view)).toBeCloseTo(inside, 6);
      // a link lands exactly there: that is inside, whatever the rounding
      for (const h of [839, 844, 740, 1024, 600]) {
        const v = { w: 412, h, contactPx: k * h + 0.37 };
        expect(diveStage(contactLanding(v), v).stage, String(h)).toBe('inside');
      }
    }
  });

  for (const [w, h] of SCREENS) {
    for (const k of PIECES) {
      const at = `${w}×${h}, Contact ${k} screens`;

      it(`arrives square in front of the panel, centred, the title and the catwalk in the frame (${at})`, () => {
        layout(h, k);
        const pose = desiredCameraPose(0.865, { w, h }, false);
        const rect = projectPanel(pose, { w, h });
        expect(Math.abs(rect.x + rect.width / 2 - w / 2), at).toBeLessThan(2);
        const screen = project(pose, w, h);
        const top = screen(onBillboard([0, title.offset[1] + title.height / 2, title.offset[2]]))[1];
        const foot = screen([panel.center[0], support.catwalk.y, support.catwalk.z])[1];
        expect(top, at).toBeGreaterThan(60);
        expect(foot, at).toBeLessThan(h);
      });

      it(`ends with the panel’s dark interior over the whole screen (${at})`, () => {
        const view = { ...layout(h, k), w };
        const pose = desiredCameraPose(contactLanding(view) + 1e-6, { w, h }, false);
        const screen = project(pose, w, h);
        const [lx, ty] = screen(onBillboard([-INNER.w / 2, INNER.h / 2, 0]));
        const [rx, by] = screen(onBillboard([INNER.w / 2, -INNER.h / 2, 0]));
        expect(lx, at).toBeLessThanOrEqual(0);
        expect(ty, at).toBeLessThanOrEqual(0);
        expect(rx, at).toBeGreaterThanOrEqual(w);
        expect(by, at).toBeGreaterThanOrEqual(h);
        // and stays there to the end of the page
        expect(desiredCameraPose(1, { w, h }, false)).toEqual(pose);
      });

      it(`drives only towards the screen, joins the ride without a jump and keeps clear of the support and the gantry (${at})`, () => {
        const view = { ...layout(h, k), w };
        const centre = panel.center;
        let last = Infinity;
        for (let p = 0.86; p <= 1; p += 0.001) {
          const d = dist(desiredCameraPose(p, { w, h }, false).position, centre);
          expect(d, `${at} p ${p.toFixed(3)}`).toBeLessThanOrEqual(last + 1e-9);
          last = d;
        }
        for (const q of [0.83, 0.86, contactLanding(view)]) {
          const a = desiredCameraPose(q - 1e-7, { w, h }, false).position;
          const b = desiredCameraPose(q + 1e-7, { w, h }, false).position;
          expect(dist(a, b), `${at} at ${q.toFixed(4)}`).toBeLessThan(1e-3);
        }
        const c = support.column;
        const G = gantryLayout();
        for (let p = 0.775; p <= 1; p += 0.001) {
          const [x, y, z] = desiredCameraPose(p, { w, h }, false).position;
          const toColumn = Math.hypot(Math.max(Math.abs(x - c.x) - c.width / 2, 0), Math.max(y - c.top, 0), Math.max(Math.abs(z - c.z) - c.width / 2, 0));
          expect(toColumn, `${at} p ${p.toFixed(3)}`).toBeGreaterThan(0.5);
          if (Math.abs(z - G.truss.front) < 1.5 || Math.abs(z - G.truss.back) < 1.5)
            expect(y, `${at} under the gantry at p ${p.toFixed(3)}`).toBeLessThan(G.catwalk.y - 0.3);
        }
      });
    }

    it(`under reduced motion stands inside the screen for all of Contact (${w}×${h})`, () => {
      const view = { ...layout(h, 2.5), w };
      const inside = desiredCameraPose(contactLanding(view) + 1e-6, { w, h }, false);
      for (const p of [0.82, 0.86, 0.95, 1]) expect(desiredCameraPose(p, { w, h }, true)).toEqual(inside);
    });
  }

  it('a laptop that fits the form into the billboard does not dive: the ride ends as it did', () => {
    layout(800, 1.3);
    for (const p of [0.83, 0.86, 0.9, 1]) expect(desiredCameraPose(p, { w: 1440, h: 800 }, false)).toEqual(ridePose(p));
  });
});
