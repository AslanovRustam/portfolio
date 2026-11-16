import type { SectionId } from './signs';

/**
 * The story's stretches (story progress 0..1), with no other imports: the scene's modules (route, the stop
 * tracks) read them while choreography, which re-exports them, may still be loading.
 */

/** End of the blueprint → render intro (spec §5). */
export const INTRO_END = 0.15;
/** Width of the turn window around each section boundary. */
export const TURN = 0.05;

export const SECTIONS: readonly { id: SectionId; start: number; end: number; center: number }[] = [
  { id: 'work', start: 0.15, end: 0.37, center: 0.26 },
  { id: 'about', start: 0.37, end: 0.59, center: 0.48 },
  { id: 'stack', start: 0.59, end: 0.8, center: 0.695 },
  { id: 'contact', start: 0.8, end: 1, center: 0.9 },
];

export type HoldId = 'about' | 'stack' | 'contact';

/** The story stretch where a section's text is on screen: from the end of the turn onto its sign to the start of the next. */
export function holdWindow(id: HoldId): [number, number] {
  const s = SECTIONS.find((x) => x.id === id);
  if (!s) throw new Error(`unknown section ${id}`);
  return [s.start + TURN / 2, s.end >= 1 ? 1 : s.end - TURN / 2];
}

export function activeSection(p: number): SectionId | null {
  if (p < INTRO_END) return null;
  for (const s of SECTIONS) if (p < s.end) return s.id;
  return 'contact';
}

export function sectionCenter(id: SectionId): number {
  const s = SECTIONS.find((x) => x.id === id);
  if (!s) throw new Error(`unknown section ${id}`);
  return s.center;
}
