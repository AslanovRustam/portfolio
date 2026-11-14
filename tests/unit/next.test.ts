import { expect, it } from 'vitest';
import { accentFor, nextSection } from '@/experience/next';

it('names the section after the current one, and nothing after Contact', () => {
  expect(nextSection(0)).toBe('work');
  expect(nextSection(0.1)).toBe('work');
  expect(nextSection(0.2)).toBe('about');
  expect(nextSection(0.48)).toBe('stack');
  expect(nextSection(0.7)).toBe('contact');
  expect(nextSection(0.9)).toBeNull();
  expect(nextSection(1)).toBeNull();
});

it('the accent follows the open section, blueprint blue before Work', () => {
  expect(accentFor(0.05)).toBe('#7fe3ff');
  expect(accentFor(0.2)).toBe('#ff8a2a');
  expect(accentFor(0.48)).toBe('#5fe1ff');
  expect(accentFor(0.7)).toBe('#ff3448');
  expect(accentFor(0.9)).toBe('#ff45b5');
});
