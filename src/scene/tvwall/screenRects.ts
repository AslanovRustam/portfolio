import { type Camera, Vector3 } from 'three';
import { screenRect, type TvSlot } from './layout';

/** A rectangle on the page, in CSS pixels. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const corner = new Vector3();

/**
 * Where a set's picture tube lies on the page: its four corners projected through the camera (view
 * offset included) into the canvas rect, as one bounding rectangle. The case grows out of it.
 */
export function projectScreen(slot: TvSlot, camera: Camera, canvas: Rect): Rect {
  const { center, width, height } = screenRect(slot);
  const c = Math.cos(slot.yaw);
  const s = Math.sin(slot.yaw);
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [u, v] of [
    [-0.5, -0.5],
    [0.5, -0.5],
    [0.5, 0.5],
    [-0.5, 0.5],
  ]) {
    corner.set(center[0] + u * width * c, center[1] + v * height, center[2] - u * width * s).project(camera);
    const px = canvas.x + ((corner.x + 1) / 2) * canvas.width;
    const py = canvas.y + ((1 - corner.y) / 2) * canvas.height;
    x0 = Math.min(x0, px);
    y0 = Math.min(y0, py);
    x1 = Math.max(x1, px);
    y1 = Math.max(y1, py);
  }
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

let source: ((stop: number) => Rect | null) | null = null;

/** The TV wall registers how to find a stop's screen on the page while it is mounted (null when it goes). */
export function setScreenRectSource(fn: ((stop: number) => Rect | null) | null): void {
  source = fn;
}

/** Where stop's screen is on the page right now, or null without a wall. */
export function screenRectFor(stop: number): Rect | null {
  return source?.(stop) ?? null;
}
