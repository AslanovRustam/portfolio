import { expect, it } from 'vitest';
import { POLE, SIGNS } from '@/experience/signs';

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
