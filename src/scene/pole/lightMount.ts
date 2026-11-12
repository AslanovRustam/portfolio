import { POLE } from '@/experience/signs';

export const HOUSING = { w: 0.36, h: 0.95, d: 0.3 } as const;
/** The black backboard behind the signal modules: the light's widest and lowest-reaching part. */
export const BOARD = { w: 0.58, h: 1.12, t: 0.012, r: 0.05, rim: 0.032 } as const;
/** Faces the same way as CONTACT, so it looks straight at the camera on the finale. */
export const LIGHT_FACING = (3 * Math.PI) / 2;
/** Housing centre: its top sits at the top of the pole. */
export const LIGHT_Y = POLE.height - HOUSING.h / 2;
/** Lowest point of the signal assembly (the backboard's bottom edge). */
export const LIGHT_BOTTOM = LIGHT_Y - BOARD.h / 2;
