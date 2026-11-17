import { expect, it } from 'vitest';
import type { Pose } from '@/experience/choreography';
import { CONTACT_ON_BILLBOARD_SCROLL, DEFAULT_SVH, PIECE_IDS, resetJourneyLengths, scrollFromStory, setJourneyLengths } from '@/experience/journey';
import { ridePose, STATIONS, stationPose } from '@/experience/route';
import { STACK_TO } from '@/experience/stackStops';
import { desiredCameraPose } from '@/scene/cameraPose';

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

// M4 round 1: the camera now comes close to the pole and descends with the bills (aboutPole.test.ts); the
// route's own About keys only carry the turns in and out of it
it('in About the route looks at the pole all the way', () => {
  for (let p = 0.4; p <= 0.565; p += 0.005) {
    const pose = ridePose(p);
    expect(Math.abs(pose.target[0] - STATIONS.pole.x)).toBeLessThan(0.05);
    expect(Math.abs(pose.target[2] - STATIONS.pole.z)).toBeLessThan(0.05);
  }
});

// final review: the drive to the billboard ended inside Contact's short stretch of scroll (a laptop puts the
// form on the billboard, and that stretch is short) — its last metres went by in one wheel notch
it('the camera never surges: at most 0.5 m per svh of scroll anywhere on the ride, on a laptop and in a phone’s dive', () => {
  const cases: { w: number; h: number; contact: number; about?: number; from?: number; to?: number }[] = [
    // a laptop: the form on the billboard (a short Contact), or in the page
    { w: 1440, h: 800, contact: CONTACT_ON_BILLBOARD_SCROLL },
    { w: 1440, h: 800, contact: DEFAULT_SVH.contact },
    // a phone diving into the screen, Contact 1.6 to 4 screens long: from the gantry on (the phone's ride
    // before it, backed off along the view line, is Plan 4's and unchanged here)
    ...[160, 250, 400].map((contact) => ({ w: 412, h: 839, contact, from: STACK_TO })),
    // About close to the pole: a short and a long About, in and out of it (M4 round 1)
    ...[2600, 7000].flatMap((about) => [
      { w: 1440, h: 800, contact: CONTACT_ON_BILLBOARD_SCROLL, about, from: 0.33, to: 0.62 },
      { w: 412, h: 839, contact: 250, about, from: 0.33, to: 0.62 },
    ]),
  ];
  for (const { w, h, contact, about, from = 0.15, to = 0.999 } of cases) {
    // the page measures its pieces in px: svh × h / 100 (About given in px)
    const lengths = PIECE_IDS.map((id) =>
      id === 'about' && about ? about : ((id === 'contact' ? contact : DEFAULT_SVH[id]) * h) / 100,
    );
    setJourneyLengths(lengths);
    const total = lengths.reduce((a, b) => a + b, 0);
    let worst = { v: 0, p: 0 };
    for (let p = from; p < to; p += 0.0005) {
      const svh = ((scrollFromStory(p + 0.0005) - scrollFromStory(p)) * total * 100) / h;
      const v = dist(desiredCameraPose(p, { w, h }, false).position, desiredCameraPose(p + 0.0005, { w, h }, false).position) / svh;
      if (v > worst.v) worst = { v, p };
    }
    expect(worst.v, `${w}×${h}, contact ${contact} svh, at ${worst.p.toFixed(4)}`).toBeLessThanOrEqual(0.5);
  }
  resetJourneyLengths();
});
