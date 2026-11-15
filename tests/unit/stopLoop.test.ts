import { expect, it } from 'vitest';
import { type Project, PROJECTS } from '@/content/projects';
import { loopTarget } from '@/scene/tvwall/stopLoop';

/** PROJECTS with a loop on the given slugs only. */
const withLoops = (...slugs: string[]): Project[] => PROJECTS.map((p) => ({ ...p, loop: slugs.includes(p.slug) ? true : undefined }));

it('plays the current stop only in Work, when allowed, with no case open, and never on the NDA stop', () => {
  const o = { current: 4, inWork: true, allowed: true, caseOpen: false, projects: withLoops('altus') };
  expect(loopTarget(o)).toBe(4);
  expect(loopTarget({ ...o, inWork: false })).toBeNull();
  expect(loopTarget({ ...o, allowed: false })).toBeNull();
  expect(loopTarget({ ...o, caseOpen: true })).toBeNull();
  expect(loopTarget({ ...o, current: 9 })).toBeNull(); // "a small part"
  expect(loopTarget({ ...o, current: 3 })).toBeNull(); // moto has no loop in this fixture
});
