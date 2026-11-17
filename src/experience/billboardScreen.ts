import { sectionPresence } from './panels';
import { END_FROM } from './route';

/**
 * The billboard is a screen (M4 round 1, spec §4): dark while the camera drives in, switched on the moment
 * the ride stops in front of it, off again as soon as the visitor scrolls back. The page (the form's glitch)
 * and the scene (the panel's flicker) both read their state from here, so they switch together.
 */

/** How long a switch's glitch lasts (ms): the CSS keyframes and the panel's flicker share it. */
export const GLITCH_MS = 700;

/**
 * Whether the screen is on at story progress p: once the ride has stopped in front of it and the damped
 * camera has come to rest there (`atBillboard`, from CameraRig: a fast scroll runs well ahead of the
 * camera). Under reduced motion it is on with Contact: the camera cuts there at once.
 */
export function screenOn(p: number, reduced: boolean, atBillboard: boolean): boolean {
  return reduced ? sectionPresence(p, 'contact') > 0 : p >= END_FROM && atBillboard;
}

/** [from ms, brightness] steps: a cold start, two flashes, a dip, then the picture settles. */
const ON: readonly [number, number][] = [
  [0, 0.1],
  [60, 1],
  [120, 0.15],
  [220, 0.9],
  [260, 0.25],
  [380, 0.6],
];
/** a flash as the picture collapses, a last glimmer, then dark */
const OFF: readonly [number, number][] = [
  [0, 0.2],
  [60, 0.95],
  [110, 0.1],
  [250, 0.5],
  [300, 0],
];

/**
 * The 3D panel's brightness `ms` after the screen last switched: on — a short stutter that settles at full
 * brightness by GLITCH_MS; off — a flash and dark. Never more than three flashes in the second it takes.
 */
export function panelFlicker(ms: number, on: boolean): number {
  if (ms >= GLITCH_MS) return on ? 1 : 0;
  const steps = on ? ON : OFF;
  let v = steps[0][1];
  for (const [at, b] of steps) if (ms >= at) v = b;
  // switching on, the last stretch eases up to full brightness
  if (on && ms >= 380) v = 0.6 + (0.4 * (ms - 380)) / (GLITCH_MS - 380);
  return v;
}
