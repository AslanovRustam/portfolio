import type { Pose } from '@/experience/choreography';
import { desiredCameraPose } from '../cameraPose';
import type { Rect } from '../tvwall/screenRects';
import { BILLBOARD, onBillboard } from './layout';

/** The size the contact content is laid out at (CSS px); it is scaled to fit the panel. */
export const CONTACT_DESIGN = { w: 880, h: 380 } as const;
/** The camera's vertical field of view (Experience.tsx), degrees. */
export const FOV = 35;
/** below this the text would be too small to read in the panel: the form goes back into the page */
const MIN_SCALE = 0.75;
/** a margin inside the panel, as a share of its size */
const INSET = 0.035;

type V = [number, number, number];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: V): V => {
  const l = Math.hypot(...a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/**
 * Where the billboard's panel lies on a page of this size for a camera pose (a perspective camera of FOV
 * looking from position at target, up +y): the bounding rect of its projected corners. Plain arithmetic,
 * so the page can place the form without loading three.js (the scene's own projection matches it).
 */
export function projectPanel(pose: Pose, viewport: { w: number; h: number }): Rect {
  const f = unit(sub(pose.target, pose.position));
  const r = unit(cross(f, [0, 1, 0]));
  const u = cross(r, f);
  const t = Math.tan(((FOV / 2) * Math.PI) / 180);
  const aspect = viewport.w / viewport.h;
  const { width, height } = BILLBOARD.panel;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [a, b] of [
    [-0.5, -0.5],
    [0.5, -0.5],
    [0.5, 0.5],
    [-0.5, 0.5],
  ]) {
    const d = sub(onBillboard([a * width, b * height, 0]), pose.position);
    const z = dot(d, f);
    const nx = dot(d, r) / (z * t * aspect);
    const ny = dot(d, u) / (z * t);
    const px = ((nx + 1) / 2) * viewport.w;
    const py = ((1 - ny) / 2) * viewport.h;
    x0 = Math.min(x0, px);
    y0 = Math.min(y0, py);
    x1 = Math.max(x1, px);
    y1 = Math.max(y1, py);
  }
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

/**
 * Where the contact content goes on a laptop: the panel's rect at the end of the ride, less a margin, and
 * the scale that fits the content's design size into it (centred). Null on a portrait or narrow screen, or
 * where the text would come out too small: there the form stays in the page under the billboard. It is
 * taken from the end pose, not the live camera, so the content never chases the camera.
 */
export function billboardFit(viewport: { w: number; h: number }): { rect: Rect; scale: number } | null {
  const { w, h } = viewport;
  if (w < 1024 || w / h < 1) return null;
  const panel = projectPanel(desiredCameraPose(1, w / h, false), viewport);
  const mx = panel.width * INSET;
  const my = panel.height * INSET;
  const scale = Math.min((panel.width - 2 * mx) / CONTACT_DESIGN.w, (panel.height - 2 * my) / CONTACT_DESIGN.h);
  if (scale < MIN_SCALE) return null;
  const width = CONTACT_DESIGN.w * scale;
  const height = CONTACT_DESIGN.h * scale;
  return { rect: { x: panel.x + (panel.width - width) / 2, y: panel.y + (panel.height - height) / 2, width, height }, scale };
}
