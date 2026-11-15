import { expect, it } from 'vitest';
import { duotoneLut } from '../../scripts/poster/duotone';

it('the duotone runs from the shadow colour to the highlight colour', () => {
  const lut = duotoneLut('#0b0716', '#5fe1ff', 1);
  expect(lut).toHaveLength(256 * 3);
  expect([...lut.slice(0, 3)]).toEqual([0x0b, 0x07, 0x16]);
  expect([...lut.slice(255 * 3, 255 * 3 + 3)]).toEqual([0x5f, 0xe1, 0xff]);
});

it('gamma above 1 keeps the mid-tones darker', () => {
  const flat = duotoneLut('#000000', '#ffffff', 1);
  const deep = duotoneLut('#000000', '#ffffff', 1.6);
  expect(deep[128 * 3]).toBeLessThan(flat[128 * 3]);
  expect(flat[128 * 3]).toBe(128);
});
