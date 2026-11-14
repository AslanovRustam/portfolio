import { expect, it } from 'vitest';
import { CRT_CLOSE_MS, CRT_OPEN_MS, originTransform } from '@/ui/sections/crt';

it('moves the card from the TV screen to its own place, centre to centre', () => {
  expect(originTransform({ x: 100, y: 100, width: 200, height: 100 }, { x: 0, y: 0, width: 1000, height: 500 })).toBe(
    'translate(-300px, -100px) scale(0.2, 0.2)',
  );
});

it('switching on takes under a second, switching off under half', () => {
  expect(CRT_OPEN_MS).toBeLessThanOrEqual(1000);
  expect(CRT_CLOSE_MS).toBeLessThanOrEqual(500);
});
