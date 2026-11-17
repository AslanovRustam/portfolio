import { CONTACT_FROM } from './sections';

/**
 * The dive into the billboard's screen (M4 round 1, spec §5): wherever the contact form does not fit into
 * the billboard (a phone, a small or squarish window), the ride stops square in front of the panel, the
 * screen switches on, and the scroll then drives the camera into the screen until its dark interior fills
 * the window; the form scrolls inside a neon frame from there (the page's part, ContactScreen). The
 * stretches are counted in screens of scroll from where Contact's piece begins (the ride stops there,
 * CONTACT_FROM = END_FROM), so they keep their feel however long Contact's text makes the piece. A leaf
 * module (sections only): the stop tracks may import it.
 */
export const DIVE = {
  /** the camera rests in front of the switched-on screen for this much scroll (svh) */
  arriveSvh: 20,
  /** then drives into it over this much (svh) */
  diveSvh: 60,
  /** the frame's tube runs this far inside the window's edges (px) */
  frameInset: 8,
  /** the interior's height over the window's at the end: it overfills it a little */
  overscan: 0.9,
} as const;

export type DiveView = { w: number; h: number; contactPx: number };
export type DiveStage = 'approach' | 'arrived' | 'dive' | 'inside';

const SPAN = 1 - CONTACT_FROM;
const offsetPx = (p: number, view: DiveView) => ((p - CONTACT_FROM) / SPAN) * view.contactPx;
const px = (svh: number, view: DiveView) => (svh * view.h) / 100;

/** Where the dive is at story progress p: before Contact the approach, then arrived, diving (t 0..1), inside. */
export function diveStage(p: number, view: DiveView): { stage: DiveStage; t: number } {
  if (p < CONTACT_FROM) return { stage: 'approach', t: 0 };
  const off = offsetPx(p, view);
  const a = px(DIVE.arriveSvh, view);
  const d = px(DIVE.diveSvh, view);
  if (off < a) return { stage: 'arrived', t: 0 };
  if (off < a + d) return { stage: 'dive', t: (off - a) / d };
  return { stage: 'inside', t: 1 };
}

/** Story progress where the dive ends and the form's start shows inside the frame (Contact links land here). */
export function contactLanding(view: DiveView): number {
  return Math.min(1, CONTACT_FROM + (px(DIVE.arriveSvh + DIVE.diveSvh, view) / view.contactPx) * SPAN);
}
