import { holdWindow, type HoldId } from './choreography';
import { TRACK_FROM, TRACK_TO } from './panels';
import { WORK_STOPS } from './workStops';

/**
 * The scene, the panels and the tests speak "story progress": the windows in SECTIONS. The page itself is
 * a stack of eight pieces, each carrying one stretch of the story: the intro, the Work stops, the turns
 * between signs, and the three holds where a section's text rides past while the pole holds its sign.
 * The holds are as long as their text, so the page measures them (setJourneyLengths) and these two
 * functions translate between the position on the page and the story.
 */
/** Scroll per Work stop: a firm wheel gesture or a short swipe moves one project. */
export const STOP_SVH = 40;

export type PieceId = 'intro' | 'work' | 'toAbout' | 'about' | 'toStack' | 'stack' | 'toContact' | 'contact';

export const PIECE_IDS: readonly PieceId[] = ['intro', 'work', 'toAbout', 'about', 'toStack', 'stack', 'toContact', 'contact'];

export { holdWindow, type HoldId };

/** Story progress where each piece begins, and 1 at the end. */
export const STORY_CUTS: readonly number[] = [
  0,
  TRACK_FROM,
  TRACK_TO,
  ...holdWindow('about'),
  ...holdWindow('stack'),
  holdWindow('contact')[0],
  1,
];

/** Scroll length of each piece (svh) until the page has measured itself: the old 1000 svh story, Work stretched. */
export const DEFAULT_SVH: Readonly<Record<PieceId, number>> = Object.fromEntries(
  PIECE_IDS.map((id, i) => [id, id === 'work' ? WORK_STOPS * STOP_SVH : Math.round((STORY_CUTS[i + 1] - STORY_CUTS[i]) * 1000)]),
) as Record<PieceId, number>;

const defaults = (): number[] => PIECE_IDS.map((id) => DEFAULT_SVH[id]);
let lengths = defaults();
let total = lengths.reduce((a, b) => a + b, 0);

/** The measured scroll length of each piece, in PIECE_IDS order and in any one unit (the page uses px). */
export function setJourneyLengths(next: readonly number[]): void {
  if (next.length !== PIECE_IDS.length) throw new Error(`expected ${PIECE_IDS.length} lengths, got ${next.length}`);
  if (!next.every((v) => Number.isFinite(v) && v > 0)) throw new Error(`journey lengths must be positive: ${next.join(', ')}`);
  lengths = [...next];
  total = lengths.reduce((a, b) => a + b, 0);
}

/** Back to the unmeasured defaults. */
export function resetJourneyLengths(): void {
  setJourneyLengths(defaults());
}

/** The lengths in use (measured, or the defaults). */
export function journeyLengths(): readonly number[] {
  return lengths;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Story progress for a scroll progress s (0..1 of the page). */
export function storyFromScroll(s: number): number {
  let d = clamp01(s) * total;
  for (let i = 0; i < lengths.length; i++) {
    if (d <= lengths[i]) return STORY_CUTS[i] + (d / lengths[i]) * (STORY_CUTS[i + 1] - STORY_CUTS[i]);
    d -= lengths[i];
  }
  return 1;
}

/** Scroll progress (0..1 of the page) that shows story progress q. */
export function scrollFromStory(q: number): number {
  const v = clamp01(q);
  let d = 0;
  for (let i = 0; i < lengths.length; i++) {
    if (v <= STORY_CUTS[i + 1]) return (d + ((v - STORY_CUTS[i]) / (STORY_CUTS[i + 1] - STORY_CUTS[i])) * lengths[i]) / total;
    d += lengths[i];
  }
  return 1;
}
