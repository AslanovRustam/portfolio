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
  /**
   * then stays inside this much before Contact's text reaches the frame's top (svh): a little scroll back
   * while filling the form in moves the text down inside the frame, not the camera out (Plan 4c)
   */
  backSvh: 33,
  /** the frame's tube runs this far inside the window's edges (px) */
  frameInset: 8,
  /** the interior's height over the window's at the end: it overfills it a little */
  overscan: 0.9,
} as const;

/** A window that dives; `still` under reduced motion: the camera stands inside from the start, no dive. */
export type DiveView = { w: number; h: number; contactPx: number; still?: boolean };
export type DiveStage = 'approach' | 'arrived' | 'dive' | 'inside';

const SPAN = 1 - CONTACT_FROM;
const offsetPx = (p: number, view: DiveView) => ((p - CONTACT_FROM) / SPAN) * view.contactPx;

let pinned: number | null = null;
/**
 * The window height the page's dive laid Contact out for (ContactScreen): the scene's stages count with it
 * too, so a phone's address bar showing or hiding (it changes the window's height, not the layout) never
 * leaves the camera and the frame a stage apart. Null: count with the view's own height.
 */
export function pinDiveHeight(h: number | null): void {
  pinned = h;
}
const px = (svh: number, view: DiveView) => (svh * (pinned ?? view.h)) / 100;

/** Where the dive is at story progress p: before Contact the approach, then arrived, diving (t 0..1), inside. */
export function diveStage(p: number, view: DiveView): { stage: DiveStage; t: number } {
  if (p < CONTACT_FROM) return { stage: 'approach', t: 0 };
  const off = offsetPx(p, view);
  const a = px(DIVE.arriveSvh, view);
  const d = px(DIVE.diveSvh, view);
  if (off < a) return { stage: 'arrived', t: 0 };
  // a pixel of slack: a link that lands exactly where the dive ends is inside
  if (off < a + d - 1) return { stage: 'dive', t: Math.min(1, (off - a) / (d - 1)) };
  return { stage: 'inside', t: 1 };
}

/** Story progress where Contact's text starts at the frame's top, a little past the dive's end (Contact links land here). */
export function contactLanding(view: DiveView): number {
  // with no dive, the form starts in the frame where Contact begins
  if (view.still) return CONTACT_FROM;
  return Math.min(1, CONTACT_FROM + (px(DIVE.arriveSvh + DIVE.diveSvh + DIVE.backSvh, view) / view.contactPx) * SPAN);
}
