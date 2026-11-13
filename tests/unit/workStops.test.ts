import { expect, it } from 'vitest';
import { PROJECTS } from '@/content/projects';
import {
  hashFor,
  parseHash,
  sectionTarget,
  snapTarget,
  stopAt,
  stopProgress,
  wallPosition,
  WORK_STOPS,
} from '@/experience/workStops';

it('ten stops spread over the Work track', () => {
  expect(WORK_STOPS).toBe(PROJECTS.length + 1);
  expect(stopProgress(0)).toBeCloseTo(0.18, 9);
  expect(stopProgress(WORK_STOPS - 1)).toBeCloseTo(0.32, 9);
  for (let i = 0; i < WORK_STOPS; i++) expect(stopAt(stopProgress(i))).toBe(i);
  expect(stopAt(0.05)).toBe(0);
  expect(stopAt(0.9)).toBe(WORK_STOPS - 1);
});

it('the wall position holds still around each stop and moves between them', () => {
  const gap = stopProgress(1) - stopProgress(0);
  expect(wallPosition(stopProgress(3))).toBe(3);
  expect(wallPosition(stopProgress(3) + gap * 0.15)).toBe(3);
  expect(wallPosition(stopProgress(3) + gap * 0.5)).toBeCloseTo(3.5, 6);
  expect(wallPosition(0.1)).toBe(0);
  expect(wallPosition(0.5)).toBe(WORK_STOPS - 1);
});

it('snap pulls a resting scroll onto the nearest stop, only inside Work', () => {
  const gap = stopProgress(1) - stopProgress(0);
  expect(snapTarget(stopProgress(4) + gap * 0.3)).toBeCloseTo(stopProgress(4), 9);
  expect(snapTarget(stopProgress(4) + gap * 0.7)).toBeCloseTo(stopProgress(5), 9);
  expect(snapTarget(stopProgress(4))).toBeNull();
  expect(snapTarget(0.16)).toBeNull();
  expect(snapTarget(0.34)).toBeNull();
  expect(snapTarget(0.48)).toBeNull();
});

it('Work links land on the first project; hashes carry the stop', () => {
  expect(sectionTarget('work')).toBeCloseTo(0.18, 9);
  expect(sectionTarget('about')).toBeCloseTo(0.48, 9);
  expect(hashFor(stopProgress(4))).toBe('work-5');
  expect(hashFor(0.48)).toBe('about');
  expect(hashFor(0.05)).toBeNull();
  expect(parseHash('work-5')).toBeCloseTo(stopProgress(4), 9);
  expect(parseHash('work')).toBeCloseTo(0.18, 9);
  expect(parseHash('stack')).toBeCloseTo(0.695, 9);
  expect(parseHash('work-99')).toBeNull();
  expect(parseHash('nope')).toBeNull();
});

it('a gesture that moved on from a stop settles on the next one in its direction; a nudge goes back', () => {
  const gap = stopProgress(1) - stopProgress(0);
  // one wheel notch from stop 4: ~0.2 of the gap
  expect(snapTarget(stopProgress(4) + gap * 0.2, stopProgress(4))).toBeCloseTo(stopProgress(5), 9);
  expect(snapTarget(stopProgress(4) - gap * 0.2, stopProgress(4))).toBeCloseTo(stopProgress(3), 9);
  // a twitch is not a step
  expect(snapTarget(stopProgress(4) + gap * 0.05, stopProgress(4))).toBeCloseTo(stopProgress(4), 9);
  // a long fling settles on the stop just past where it came to rest
  expect(snapTarget(stopProgress(4) + gap * 2.3, stopProgress(4))).toBeCloseTo(stopProgress(7), 9);
  // from between stops (a site-made scroll left it there), the direction still decides
  expect(snapTarget(stopProgress(3) + gap * 0.4, stopProgress(3) + gap * 0.3)).toBeCloseTo(stopProgress(3), 9);
});
