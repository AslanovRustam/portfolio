import { expect, it } from 'vitest';
import { BASE_SVH, JOURNEY_HEIGHT, JOURNEY_SVH, STOP_SVH, scrollFromStory, storyFromScroll } from '@/experience/journey';
import { WORK_STOPS } from '@/experience/workStops';

const svh = (a: number, b: number) => (scrollFromStory(b) - scrollFromStory(a)) * JOURNEY_SVH;

it('the stretch gives Work 40 svh per stop and leaves every other section its length', () => {
  expect(JOURNEY_SVH).toBeCloseTo(BASE_SVH - 140 + WORK_STOPS * STOP_SVH, 6);
  expect(JOURNEY_HEIGHT).toBe(`${JOURNEY_SVH + 100}svh`);
  expect(svh(0.18, 0.32)).toBeCloseTo(WORK_STOPS * STOP_SVH, 6);
  expect(svh(0, 0.15)).toBeCloseTo(150, 6);
  expect(svh(0.37, 0.59)).toBeCloseTo(220, 6);
  expect(svh(0.8, 1)).toBeCloseTo(200, 6);
});

it('story and scroll progress are inverse, monotonic and pinned at the ends', () => {
  for (const s of [0, 0.05, 0.13, 0.2, 0.5, 0.77, 1]) expect(scrollFromStory(storyFromScroll(s))).toBeCloseTo(s, 9);
  expect(storyFromScroll(0)).toBe(0);
  expect(storyFromScroll(1)).toBe(1);
  expect(storyFromScroll(-1)).toBe(0);
  let last = -1;
  for (let s = 0; s <= 1; s += 0.01) {
    const q = storyFromScroll(s);
    expect(q).toBeGreaterThanOrEqual(last);
    last = q;
  }
});
