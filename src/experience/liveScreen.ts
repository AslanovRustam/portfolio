import { registerProbe } from '@/dev/sceneProbe';
import type { Rect } from '@/scene/tvwall/screenRects';

/**
 * The billboard's panel on the page as the live (damped) camera sees it, every frame, for the page's dive
 * (ContactScreen places the picture of the form on it). The scene only works it out while someone listens.
 */
type Listener = (rect: Rect) => void;
const listeners = new Set<Listener>();

export function onScreenRect(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export const screenRectWanted = (): boolean => listeners.size > 0;
registerProbe('screenRectWanted', screenRectWanted);

export function publishScreenRect(rect: Rect): void {
  for (const fn of listeners) fn(rect);
}
