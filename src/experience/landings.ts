import { holdWindow } from './sections';

/**
 * Where About's links land (M4 round 1): its text now starts below the screen — the camera reaches the
 * pole's face first and the bills come up to it (globals.css: About's --entry is a screen) — so a link
 * lands where the first bill has come a third of the way up the screen. A leaf module (sections only): the
 * stop tracks import it.
 */
export function aboutLanding(view: { h: number; aboutPx: number }): number {
  const [from, to] = holdWindow('about');
  // the first bill starts a screen below the top; land once it has risen to 30 % from the top
  const px = 0.7 * view.h;
  return Math.min(to, from + (px / view.aboutPx) * (to - from));
}
