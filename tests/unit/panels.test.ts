import { expect, it } from 'vitest';
import { frameShift, sectionPresence, trackProgress } from '@/experience/panels';

const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 6);

it('a section is present inside its window, absent in the turns', () => {
  close(sectionPresence(0.26, 'work'), 1);
  close(sectionPresence(0.15, 'work'), 0);
  expect(sectionPresence(0.1725, 'work')).toBeGreaterThan(0);
  expect(sectionPresence(0.1725, 'work')).toBeLessThan(1);
  close(sectionPresence(0.37, 'work'), 0);
  close(sectionPresence(0.37, 'about'), 0);
  close(sectionPresence(0.48, 'about'), 1);
  close(sectionPresence(0.48, 'work'), 0);
  close(sectionPresence(1, 'contact'), 1);
});

it('the work track runs through the middle of the work window', () => {
  close(trackProgress(0.1), 0);
  close(trackProgress(0.18), 0);
  close(trackProgress(0.25), 0.5);
  close(trackProgress(0.32), 1);
  close(trackProgress(0.9), 1);
});

it('the scene steps aside for the panel', () => {
  const wide = { w: 1440, h: 800 };
  const phone = { w: 412, h: 915 };
  expect(frameShift(null, 1, wide)).toEqual({ x: 0, y: 0 });
  expect(frameShift('about', 1, wide)).toEqual({ x: 0.2, y: 0 });
  expect(frameShift('work', 0.5, wide)).toEqual({ x: 0, y: 0.08 });
  expect(frameShift('about', 1, phone)).toEqual({ x: 0, y: 0.2 });
  expect(frameShift('contact', 1, { w: 900, h: 700 })).toEqual({ x: 0, y: 0.2 });
});
