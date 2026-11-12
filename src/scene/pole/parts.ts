import { POLE, SIGNS } from '@/experience/signs';
import { LAMP_HEIGHT } from '../street/layout';
import { HOUSING, LIGHT_Y } from './lightMount';

/** Order in which parts render from blueprint to production, top to bottom (Task 10). */
export const PART_ORDER: readonly string[] = ['light', 'stack', 'work', 'about', 'contact', 'cv', 'pole', 'base', 'street'];

/** World-height span of a part: the render front sweeps it top to bottom. */
export function partRange(part: string): [number, number] {
  if (part === 'light') return [LIGHT_Y - HOUSING.h / 2, LIGHT_Y + HOUSING.h / 2];
  if (part === 'pole') return [0, POLE.height + 0.05];
  if (part === 'base') return [0, 0.16];
  // the road, kerbs and street lamps render last, top of the lamps first
  if (part === 'street') return [0, LAMP_HEIGHT + 0.4];
  const sign = SIGNS.find((s) => s.id === part);
  if (!sign) throw new Error(`unknown reveal part ${part}`);
  return [sign.y - sign.height / 2 - 0.05, sign.y + sign.height / 2 + 0.05];
}
