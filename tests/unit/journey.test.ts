import { afterEach, expect, it } from 'vitest';
import { STACK_STOPS } from '@/experience/stackStops';
import {
  DEFAULT_SVH,
  holdWindow,
  lengthsFromLayout,
  PIECE_IDS,
  resetJourneyLengths,
  scrollFromStory,
  setJourneyLengths,
  STOP_SVH,
  STORY_CUTS,
  storyFromScroll,
} from '@/experience/journey';
import { WORK_STOPS } from '@/experience/workStops';
import { HOLD } from '../e2e/helpers';

afterEach(resetJourneyLengths);

it('eight pieces run in order over the whole story', () => {
  expect(PIECE_IDS).toEqual(['intro', 'work', 'toAbout', 'about', 'toStack', 'stack', 'toContact', 'contact']);
  expect(STORY_CUTS).toHaveLength(9);
  [0, 0.18, 0.32, 0.395, 0.565, 0.615, 0.775, 0.86, 1].forEach((v, i) => expect(STORY_CUTS[i]).toBeCloseTo(v, 9));
});

it('a hold runs between the turns around its section', () => {
  expect(holdWindow('about')[0]).toBeCloseTo(0.395, 9);
  expect(holdWindow('about')[1]).toBeCloseTo(0.565, 9);
  expect(holdWindow('stack')[0]).toBeCloseTo(0.615, 9);
  expect(holdWindow('stack')[1]).toBeCloseTo(0.775, 9);
  // Contact holds from the arrival at the billboard: the drive from the gantry is the stretch before it
  expect(holdWindow('contact')[0]).toBeCloseTo(0.86, 9);
  expect(holdWindow('contact')[1]).toBe(1);
});

it('the e2e mirror of the holds matches', () => {
  for (const id of ['about', 'stack', 'contact'] as const) {
    expect(HOLD[id][0]).toBeCloseTo(holdWindow(id)[0], 9);
    expect(HOLD[id][1]).toBeCloseTo(holdWindow(id)[1], 9);
  }
});

it('by default Work and Stack get 40 svh a stop and every other piece its old length', () => {
  expect(DEFAULT_SVH).toEqual({
    intro: 180,
    work: WORK_STOPS * STOP_SVH,
    toAbout: 75,
    about: 170,
    toStack: 50,
    stack: STACK_STOPS * STOP_SVH,
    toContact: 85,
    contact: 140,
  });
  const total = Object.values(DEFAULT_SVH).reduce((a, b) => a + b, 0);
  expect((scrollFromStory(0.565) - scrollFromStory(0.395)) * total).toBeCloseTo(170, 6);
  expect((scrollFromStory(0.32) - scrollFromStory(0.18)) * total).toBeCloseTo(WORK_STOPS * STOP_SVH, 6);
});

it('a measured hold stretches only its own piece', () => {
  setJourneyLengths([180, 400, 75, 1000, 50, 160, 50, 175]);
  const total = 2090;
  expect((scrollFromStory(0.565) - scrollFromStory(0.395)) * total).toBeCloseTo(1000, 6);
  expect((scrollFromStory(0.18) - scrollFromStory(0)) * total).toBeCloseTo(180, 6);
  expect(storyFromScroll((180 + 400 + 75 + 500) / total)).toBeCloseTo(0.48, 6);
});

const inverseAndMonotonic = () => {
  for (const s of [0, 0.05, 0.13, 0.2, 0.5, 0.77, 1]) expect(scrollFromStory(storyFromScroll(s))).toBeCloseTo(s, 9);
  expect(storyFromScroll(0)).toBe(0);
  expect(storyFromScroll(1)).toBe(1);
  expect(storyFromScroll(-1)).toBe(0);
  expect(storyFromScroll(2)).toBe(1);
  let last = -1;
  for (let s = 0; s <= 1; s += 0.01) {
    const q = storyFromScroll(s);
    expect(q).toBeGreaterThanOrEqual(last);
    last = q;
  }
};

it('story and scroll stay inverse, monotonic and pinned, default and measured', () => {
  inverseAndMonotonic();
  setJourneyLengths([900, 3000, 400, 5000, 300, 2000, 300, 4000]);
  inverseAndMonotonic();
});

it('rejects a wrong count or a non-positive length', () => {
  expect(() => setJourneyLengths([1, 2])).toThrow();
  expect(() => setJourneyLengths([180, 400, 75, 0, 50, 160, 50, 175])).toThrow();
  expect(() => setJourneyLengths([180, 400, 75, Number.NaN, 50, 160, 50, 175])).toThrow();
});

it('reads the lengths off the layout, and gives up on a layout that measured nothing', () => {
  const heights = [1440, 3200, 600, 1600, 400, 1400, 400, 1300];
  const track = heights.reduce((a, b) => a + b, 0);
  // the last piece is what the trigger can still scroll: the track minus one screen minus the others
  expect(lengthsFromLayout(heights, track, 800)).toEqual([1440, 3200, 600, 1600, 400, 1400, 400, 500]);
  expect(lengthsFromLayout([0, 0, 0, 0, 0, 0, 0, 0], 0, 0)).toBeNull();
  expect(lengthsFromLayout([1440, 3200, 600, Number.NaN, 400, 1400, 400, 1300], track, 800)).toBeNull();
});
