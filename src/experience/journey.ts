import { TRACK_FROM, TRACK_TO } from './panels';
import { WORK_STOPS } from './workStops';

/**
 * The scene, the panels and the tests speak "story progress": the windows in SECTIONS were drawn on a
 * 1000 svh scroll. The page itself is longer, because each Work stop gets its own stretch of scroll. These
 * two functions translate between the position on the page and the story.
 */
export const BASE_SVH = 1000;
/** Scroll per Work stop: a firm wheel gesture or a short swipe moves one project. */
export const STOP_SVH = 40;

const PIECES = [
  { q0: 0, q1: TRACK_FROM, svh: Math.round(TRACK_FROM * BASE_SVH) },
  { q0: TRACK_FROM, q1: TRACK_TO, svh: WORK_STOPS * STOP_SVH },
  { q0: TRACK_TO, q1: 1, svh: Math.round((1 - TRACK_TO) * BASE_SVH) },
] as const;

/** Scroll length of the whole journey after the stretch. */
export const JOURNEY_SVH = PIECES.reduce((s, p) => s + p.svh, 0);
/** Height of #journey: its scroll length plus the one screen it is measured against. */
export const JOURNEY_HEIGHT = `${JOURNEY_SVH + 100}svh`;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Story progress for a scroll progress s (0..1 of the page). */
export function storyFromScroll(s: number): number {
  let d = clamp01(s) * JOURNEY_SVH;
  for (const p of PIECES) {
    if (d <= p.svh) return p.q0 + (d / p.svh) * (p.q1 - p.q0);
    d -= p.svh;
  }
  return 1;
}

/** Scroll progress (0..1 of the page) that shows story progress q. */
export function scrollFromStory(q: number): number {
  const v = clamp01(q);
  let d = 0;
  for (const p of PIECES) {
    if (v <= p.q1) return (d + ((v - p.q0) / (p.q1 - p.q0)) * p.svh) / JOURNEY_SVH;
    d += p.svh;
  }
  return 1;
}
