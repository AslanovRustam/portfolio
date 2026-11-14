import { afterEach, beforeEach, expect, it } from 'vitest';
import { rememberPlace, takePlace } from '@/experience/place';

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  (globalThis as { sessionStorage?: unknown }).sessionStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
});
afterEach(() => {
  delete (globalThis as { sessionStorage?: unknown }).sessionStorage;
});

it('a language switch hands the exact place over to the new page, once', () => {
  rememberPlace(0.48, 1000);
  expect(takePlace(0.395, 2000)).toBeCloseTo(0.48, 9); // the hash says About; the place is inside About
  expect(takePlace(0.395, 3500)).toBeNull();
});

it("asked twice in a row (React's development double run of an effect), it answers the same", () => {
  rememberPlace(0.48, 1000);
  expect(takePlace(0.395, 2000)).toBeCloseTo(0.48, 9);
  expect(takePlace(0.395, 2005)).toBeCloseTo(0.48, 9);
});

it('a place in another section, or an old one, is not used', () => {
  rememberPlace(0.48, 1000);
  expect(takePlace(0.615, 2000)).toBeNull(); // the hash says Stack
  rememberPlace(0.48, 1000);
  expect(takePlace(0.395, 60_000)).toBeNull();
});

it('works without storage (private mode)', () => {
  delete (globalThis as { sessionStorage?: unknown }).sessionStorage;
  expect(() => rememberPlace(0.5)).not.toThrow();
  expect(takePlace(0.5)).toBeNull();
});
