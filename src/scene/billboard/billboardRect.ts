import { type Camera, PerspectiveCamera, Vector3 } from 'three';
import type { Rect } from '../tvwall/screenRects';
import { endPose, FOV } from './fit';
import { BILLBOARD, onBillboard } from './layout';

const corner = new Vector3();

/** Where the billboard's panel lies on the page as this (live) camera sees it: its corners projected into the canvas rect. */
export function billboardRect(camera: Camera, canvas: Rect): Rect {
  const { width, height } = BILLBOARD.panel;
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
    corner.set(...onBillboard([u * width, v * height, 0])).project(camera);
    const px = canvas.x + ((corner.x + 1) / 2) * canvas.width;
    const py = canvas.y + ((1 - corner.y) / 2) * canvas.height;
    x0 = Math.min(x0, px);
    y0 = Math.min(y0, py);
    x1 = Math.max(x1, px);
    y1 = Math.max(y1, py);
  }
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

/** The camera as it stands at the end of the ride on a screen of this aspect. */
export function endCamera(aspect: number): PerspectiveCamera {
  const pose = endPose(aspect);
  const cam = new PerspectiveCamera(FOV, aspect, 0.1, 200);
  cam.position.set(...pose.position);
  cam.lookAt(new Vector3(...pose.target));
  cam.updateMatrixWorld();
  return cam;
}
