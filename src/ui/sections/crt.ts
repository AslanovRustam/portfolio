import type { Rect } from '@/scene/tvwall/screenRects';

/** The case switching on, all phases together. */
export const CRT_OPEN_MS = 800;
/** And off: to a line, then a dot. */
export const CRT_CLOSE_MS = 450;
const FADE_MS = 150;
const ROUND = 'round 26px';

const n = (v: number, d = 2) => +v.toFixed(d);

/** The transform that puts a card sitting at `to` over `from`, centre on centre, scaled to its size. */
export function originTransform(from: Rect, to: Rect): string {
  const dx = from.x + from.width / 2 - (to.x + to.width / 2);
  const dy = from.y + from.height / 2 - (to.y + to.height / 2);
  return `translate(${n(dx)}px, ${n(dy)}px) scale(${n(from.width / to.width, 4)}, ${n(from.height / to.height, 4)})`;
}

/**
 * Switches the case on like an old TV: a white line flashes across the middle (at the clicked set's
 * screen when there is one), opens into the picture as it grows to its place, and the content jumps for
 * a moment like a tuning signal. Reduced motion: a short fade.
 */
export function crtOpen(el: HTMLElement, from: Rect | null, reduced: boolean): Animation[] {
  if (reduced) return [el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FADE_MS, easing: 'ease-out', fill: 'both' })];
  const start = from ? originTransform(from, el.getBoundingClientRect()) : 'none';
  const line = `inset(49.5% 0% 49.5% 0% ${ROUND})`;
  const card = el.animate(
    [
      { offset: 0, transform: start, clipPath: `inset(49.5% 50% 49.5% 50% ${ROUND})`, filter: 'brightness(5) saturate(0)' },
      { offset: 0.3, transform: start, clipPath: line, filter: 'brightness(5) saturate(0)' },
      { offset: 0.75, transform: 'none', clipPath: `inset(0% 0% 0% 0% ${ROUND})`, filter: 'brightness(1.5) saturate(1)' },
      { offset: 1, transform: 'none', clipPath: `inset(0% 0% 0% 0% ${ROUND})`, filter: 'none' },
    ],
    { duration: CRT_OPEN_MS, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' },
  );
  const content = el.querySelector<HTMLElement>('[data-crt-content]');
  const glitch = content?.animate(
    [
      { transform: 'translateX(-6px)', filter: 'hue-rotate(40deg)', opacity: 0.6 },
      { transform: 'translateX(5px)', filter: 'hue-rotate(-30deg)', opacity: 1 },
      { transform: 'translateX(-2px)', filter: 'none' },
      { transform: 'none', filter: 'none' },
    ],
    { duration: 450, delay: CRT_OPEN_MS * 0.7, easing: 'steps(4, end)' },
  );
  return glitch ? [card, glitch] : [card];
}

/** Switches the case off: the picture collapses to a bright line, then to a dot. */
export async function crtClose(el: HTMLElement, reduced: boolean): Promise<void> {
  const a = reduced
    ? el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FADE_MS, easing: 'ease-in', fill: 'forwards' })
    : el.animate(
        [
          { offset: 0, clipPath: `inset(0% 0% 0% 0% ${ROUND})`, filter: 'none', opacity: 1 },
          { offset: 0.55, clipPath: `inset(49.5% 0% 49.5% 0% ${ROUND})`, filter: 'brightness(3) saturate(0)', opacity: 1 },
          { offset: 1, clipPath: `inset(49.5% 49.5% 49.5% 49.5% ${ROUND})`, filter: 'brightness(4) saturate(0)', opacity: 0 },
        ],
        { duration: CRT_CLOSE_MS, easing: 'ease-in', fill: 'forwards' },
      );
  try {
    await a.finished;
  } catch {
    // cancelled (the page went away): nothing left to wait for
  }
}
