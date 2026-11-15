import { expect, it } from 'vitest';
import { projectBySlug } from '@/content/projects';
import { loopAllowed, loopSources, loopsDisabled } from '@/experience/loops';
import { experienceStore } from '@/experience/store';

it('the wall plays only on medium and high, with motion, without save-data or ?loops=0', () => {
  const base = { place: 'wall', tier: 'high', reducedMotion: false, saveData: false, disabled: false } as const;
  expect(loopAllowed(base)).toBe(true);
  expect(loopAllowed({ ...base, tier: 'medium' })).toBe(true);
  expect(loopAllowed({ ...base, tier: 'low' })).toBe(false);
  expect(loopAllowed({ ...base, reducedMotion: true })).toBe(false);
  expect(loopAllowed({ ...base, saveData: true })).toBe(false);
  expect(loopAllowed({ ...base, disabled: true })).toBe(false);
});

it('the case card plays on every tier, but never under reduced motion, save-data or ?loops=0', () => {
  const base = { place: 'case', tier: 'low', reducedMotion: false, saveData: false, disabled: false } as const;
  expect(loopAllowed(base)).toBe(true);
  expect(loopAllowed({ ...base, reducedMotion: true })).toBe(false);
  expect(loopAllowed({ ...base, saveData: true })).toBe(false);
  expect(loopAllowed({ ...base, disabled: true })).toBe(false);
});

it('a project with a loop has its webm, mp4 and still next to each other; one without has none', () => {
  expect(loopSources({ ...projectBySlug('altus')!, loop: true })).toEqual({
    webm: '/projects/altus.webm',
    mp4: '/projects/altus.mp4',
    still: '/projects/altus.webp',
  });
  expect(loopSources({ ...projectBySlug('altus')!, loop: undefined })).toBeNull();
});

it('?loops=0 switches loops off', () => {
  expect(loopsDisabled('?loops=0')).toBe(true);
  expect(loopsDisabled('?quality=low&loops=0')).toBe(true);
  expect(loopsDisabled('?quality=low')).toBe(false);
  expect(loopsDisabled('')).toBe(false);
});

it('the store knows when a case is open', () => {
  expect(experienceStore.getState().caseOpen).toBe(false);
  experienceStore.getState().setCaseOpen(true);
  expect(experienceStore.getState().caseOpen).toBe(true);
  experienceStore.getState().setCaseOpen(false);
});
