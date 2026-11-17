import { describe, expect, it } from 'vitest';
import { GLITCH_MS, panelFlicker, screenOn } from '@/experience/billboardScreen';

/** How many times the brightness flashes up (above 0.8) out of a dip (below 0.3) over the glitch. */
function flashes(on: boolean): number {
  let dipped = false;
  let count = 0;
  for (let ms = 0; ms <= GLITCH_MS; ms += 5) {
    const v = panelFlicker(ms, on);
    if (v < 0.3) dipped = true;
    else if (v > 0.8 && dipped) {
      count++;
      dipped = false;
    }
  }
  return count;
}

describe('the billboard’s screen', () => {
  it('is off while the ride still drives in and on once it has stopped (0.86) and the camera has come to rest there', () => {
    expect(screenOn(0.82, false, true)).toBe(false);
    expect(screenOn(0.859, false, true)).toBe(false);
    expect(screenOn(0.86, false, true)).toBe(true);
    expect(screenOn(0.93, false, true)).toBe(true);
    expect(screenOn(1, false, true)).toBe(true);
  });

  it('stays off while the camera is still catching up with the scroll', () => {
    expect(screenOn(0.9, false, false)).toBe(false);
    expect(screenOn(1, false, false)).toBe(false);
  });

  it('under reduced motion is on as Contact begins, the camera being there at once', () => {
    expect(screenOn(0.79, true, true)).toBe(false);
    expect(screenOn(0.82, true, false)).toBe(true);
    expect(screenOn(1, true, true)).toBe(true);
  });

  it('switching on, the panel flickers and then holds full brightness', () => {
    expect(panelFlicker(0, true)).toBeLessThan(0.3);
    expect(panelFlicker(GLITCH_MS + 1, true)).toBe(1);
    expect(panelFlicker(5000, true)).toBe(1);
    const n = flashes(true);
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n).toBeLessThanOrEqual(3);
  });

  it('switching off, it flickers and goes dark', () => {
    expect(panelFlicker(GLITCH_MS + 1, false)).toBe(0);
    expect(panelFlicker(5000, false)).toBe(0);
    const n = flashes(false);
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n).toBeLessThanOrEqual(3);
  });
});
