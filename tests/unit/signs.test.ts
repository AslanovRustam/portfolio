import { expect, it } from 'vitest';
import { POLE, SIGNS } from '@/experience/signs';
import { arrowPoints, octagonPoints, PLATE } from '@/scene/pole/geometry';
import { LIGHT_BOTTOM } from '@/scene/pole/lightMount';

it('labels are the fixed English set, top to bottom', () => {
  expect([...SIGNS].sort((a, b) => b.y - a.y).map((s) => s.label)).toEqual([
    'STACK',
    'WORK',
    'ABOUT',
    'CONTACT',
    'CV',
  ]);
});

it('section signs face four different directions', () => {
  const f = SIGNS.filter((s) => s.id !== 'cv').map((s) => s.facing);
  expect(new Set(f).size).toBe(4);
});

it('every sign sits on the pole below the traffic light', () => {
  for (const s of SIGNS) expect(s.y + s.height / 2).toBeLessThan(POLE.height - 0.9);
});

it('no sign corner, tilt included, reaches up into the traffic light backboard', () => {
  for (const s of SIGNS) {
    const pts: [number, number][] =
      s.shape === 'octagon'
        ? octagonPoints(s.width / 2)
        : s.shape === 'arrow'
          ? arrowPoints(s.width, s.height, s.height * 0.6)
          : [
              [-s.width / 2, -s.height / 2],
              [s.width / 2, -s.height / 2],
              [s.width / 2, s.height / 2],
              [-s.width / 2, s.height / 2],
            ];
    const top = Math.max(...pts.map(([x, y]) => x * Math.sin(s.tilt) + y * Math.cos(s.tilt)));
    expect(s.y + top + PLATE.bevel).toBeLessThan(LIGHT_BOTTOM - 0.03);
  }
});
