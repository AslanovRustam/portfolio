import { SECTIONS } from './choreography';
import type { SectionId } from './signs';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Fade margins (in progress) around a section's window: the panel stays out of the pole's turns. */
const FADE_FROM = 0.01;
/** = TURN / 2: a section is fully present the moment the pole has turned its sign to the camera */
const FADE_TO = 0.025;

/**
 * How present a section's HTML panel is at progress p (0..1). It fades in once the pole has finished
 * turning its sign to the camera and fades out before the next turn starts; contact never fades out.
 */
export function sectionPresence(p: number, id: SectionId): number {
  const s = SECTIONS.find((x) => x.id === id);
  if (!s) throw new Error(`unknown section ${id}`);
  if (p < s.start || p > s.end) return 0;
  const fadeIn = smoothstep(s.start + FADE_FROM, s.start + FADE_TO, p);
  const fadeOut = s.end >= 1 ? 1 : 1 - smoothstep(s.end - FADE_TO, s.end - FADE_FROM, p);
  return Math.min(fadeIn, fadeOut);
}

export const TRACK_FROM = 0.15 + 0.03;
export const TRACK_TO = 0.37 - 0.05;

/** Where the Work card track is (0 = first card, 1 = the last tile) at progress p. */
export function trackProgress(p: number): number {
  return clamp01((p - TRACK_FROM) / (TRACK_TO - TRACK_FROM));
}

/** The scroll progress at which the Work track sits at position t (the inverse of trackProgress). */
export function progressForTrack(t: number): number {
  return TRACK_FROM + clamp01(t) * (TRACK_TO - TRACK_FROM);
}

/**
 * How far the rendered scene steps aside for the active panel, as fractions of the viewport: on wide
 * screens it moves right of the left-hand panel (or up above the Work cards); on narrow ones it moves
 * up above the bottom sheet.
 */
export function frameShift(
  id: SectionId | null,
  presence: number,
  viewport: { w: number; h: number },
): { x: number; y: number } {
  if (!id) return { x: 0, y: 0 };
  const wide = viewport.w >= 1024 && viewport.w / viewport.h >= 1;
  if (!wide) return { x: 0, y: 0.2 * presence };
  // the wall frames its screen itself; the frame only steps clear of the caption in the lower-left corner
  if (id === 'work') return { x: 0.08 * presence, y: 0 };
  // the ride frames About, Stack and Contact itself, with the pole riding on the right of the frame
  return { x: 0, y: 0 };
}
