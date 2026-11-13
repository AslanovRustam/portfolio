/** The power-on wave: each set switches on `step` s after its left neighbour, with a `flash` s flare. */
export const WAVE = { step: 0.06, flash: 0.12 } as const;
/** Brightness of a lit screen that is not the current project, and the lift under the pointer. */
export const IDLE = 0.25;
export const HOVER = 0.2;
const FLASH = 1.5;

export interface ScreenState {
  /** left-to-right rank on the wall (slot.order) */
  order: number;
  /** seconds since the visitor entered Work; null outside it (standby) */
  sinceOn: number | null;
  /** this screen shows the current project */
  active: boolean;
  hovered: boolean;
  reduced: boolean;
}

/** Seconds this screen has been on (negative before the wave reaches it, Infinity under reduced motion). */
export function screenAge(s: Pick<ScreenState, 'order' | 'sinceOn' | 'reduced'>): number {
  if (s.sinceOn === null) return -1;
  return s.reduced ? Infinity : s.sinceOn - s.order * WAVE.step;
}

/**
 * How bright a screen is: 0 in standby and before the wave reaches it, a short flare as it switches on,
 * then full for the current project and dim for the rest, a little brighter under the pointer.
 */
export function screenLevel(s: ScreenState): number {
  const age = screenAge(s);
  if (age < 0) return 0;
  if (age < WAVE.flash) return FLASH;
  return (s.active ? 1 : IDLE) + (s.hovered ? HOVER : 0);
}
