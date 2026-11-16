import { expect, it } from 'vitest';
import { arcFor, speedFor } from '@/ui/loaderGauge';

it('the speedometer climbs with the load, never back, and reads 100 only when everything is in', () => {
  let speed = 0;
  for (let loaded = 0; loaded <= 100; loaded += 0.5) {
    const next = speedFor(loaded, speed);
    expect(next).toBeGreaterThanOrEqual(speed);
    expect(Number.isInteger(next)).toBe(true);
    if (loaded < 100) expect(next).toBeLessThan(100);
    speed = next;
  }
  expect(speed).toBe(100);
  // three's loading manager can step back when it finds more to load: the needle does not
  expect(speedFor(40, 63)).toBe(63);
  expect(speedFor(99.9, 0)).toBe(99);
  expect(speedFor(-5, 0)).toBe(0);
  expect(speedFor(140, 0)).toBe(100);
});

it('the tachometer arc fills with the speed, empty at 0 and full at 100', () => {
  expect(arcFor(0)).toBe(0);
  expect(arcFor(100)).toBe(1);
  let last = -1;
  for (let s = 0; s <= 100; s++) {
    const a = arcFor(s);
    expect(a).toBeGreaterThanOrEqual(last);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThanOrEqual(1);
    last = a;
  }
});
