import { POLE } from '@/experience/signs';

export const HOUSING = { w: 0.36, h: 0.95, d: 0.3 } as const;
/** Faces the same way as CONTACT, so it looks straight at the camera on the finale. */
export const LIGHT_FACING = (3 * Math.PI) / 2;
/** Housing centre: its top sits at the top of the pole. */
export const LIGHT_Y = POLE.height - HOUSING.h / 2;
