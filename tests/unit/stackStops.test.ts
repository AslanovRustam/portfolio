import { expect, it } from 'vitest';
import { holdWindow } from '@/experience/choreography';
import { STACK_STOPS, stackPosition, stackSnapTarget, stackStopAt, stackStopProgress } from '@/experience/stackStops';

const [h0, h1] = holdWindow('stack');

it('six stops, one per sign, evenly spread inside the Stack hold', () => {
  expect(STACK_STOPS).toBe(6);
  for (let i = 0; i < STACK_STOPS; i++) {
    const q = stackStopProgress(i);
    expect(q).toBeGreaterThan(h0);
    expect(q).toBeLessThan(h1);
    expect(stackStopAt(q)).toBe(i);
    if (i > 0) expect(q - stackStopProgress(i - 1)).toBeCloseTo(stackStopProgress(1) - stackStopProgress(0), 9);
  }
  // the e2e helper stackStop() mirrors these two
  expect(stackStopProgress(0)).toBeCloseTo(0.635, 9);
  expect(stackStopProgress(STACK_STOPS - 1)).toBeCloseTo(0.77, 9);
});

it('the camera holds still at each sign and eases to the next in between', () => {
  for (let i = 0; i < STACK_STOPS; i++) expect(stackPosition(stackStopProgress(i))).toBeCloseTo(i, 9);
  const gap = stackStopProgress(1) - stackStopProgress(0);
  // a little past a stop it has not moved yet; halfway it is halfway
  expect(stackPosition(stackStopProgress(2) + gap * 0.1)).toBeCloseTo(2, 9);
  expect(stackPosition(stackStopProgress(2) + gap * 0.5)).toBeCloseTo(2.5, 6);
  expect(stackPosition(h0 - 0.01)).toBe(0);
  expect(stackPosition(h1 + 0.01)).toBe(STACK_STOPS - 1);
});

it('a scroll that comes to rest between two signs settles on one, like the TVs in Work', () => {
  const gap = stackStopProgress(1) - stackStopProgress(0);
  const between = stackStopProgress(2) + gap * 0.3;
  expect(stackSnapTarget(between)).toBeCloseTo(stackStopProgress(2), 9);
  // a gesture that went forward more than a step goes on to the next sign
  expect(stackSnapTarget(between, stackStopProgress(2))).toBeCloseTo(stackStopProgress(3), 9);
  expect(stackSnapTarget(stackStopProgress(4))).toBeNull();
  expect(stackSnapTarget(0.5)).toBeNull();
  expect(stackSnapTarget(0.9)).toBeNull();
});
