import { ExtrudeGeometry, Path, Shape, ShapeGeometry } from 'three';
import type { SignDef } from '@/experience/signs';
import type { LightState } from '@/experience/store';

export const PLATE = { depth: 0.03, bevel: 0.008 } as const;

type Pt = [number, number];

/** Regular octagon on radius r with flat top and bottom edges (a STOP-sign silhouette). */
export function octagonPoints(r: number): Pt[] {
  return Array.from({ length: 8 }, (_, k) => {
    const a = Math.PI / 8 + (k * Math.PI) / 4;
    return [r * Math.cos(a), r * Math.sin(a)] as Pt;
  });
}

/** Arrow plate pointing to +x: a body w−tip long and a head `tip` long, h tall. */
export function arrowPoints(w: number, h: number, tip: number): Pt[] {
  const x0 = -w / 2;
  const x1 = w / 2 - tip;
  return [
    [x0, -h / 2],
    [x1, -h / 2],
    [w / 2, 0],
    [x1, h / 2],
    [x0, h / 2],
  ];
}

function polygon(pts: Pt[], into: Shape | Path = new Shape()) {
  into.moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) into.lineTo(x, y);
  into.closePath();
  return into;
}

function roundedRect(w: number, h: number, r: number, into: Shape | Path = new Shape()) {
  const x = -w / 2;
  const y = -h / 2;
  into.moveTo(x + r, y);
  into.lineTo(x + w - r, y);
  into.quadraticCurveTo(x + w, y, x + w, y + r);
  into.lineTo(x + w, y + h - r);
  into.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  into.lineTo(x + r, y + h);
  into.quadraticCurveTo(x, y + h, x, y + h - r);
  into.lineTo(x, y + r);
  into.quadraticCurveTo(x, y, x + r, y);
  return into;
}

export function roundedRectShape(w: number, h: number, r: number): Shape {
  return roundedRect(w, h, r) as Shape;
}

/** The sign's outline, `inset` metres inside its edge (0 = the plate itself). */
function outline(def: SignDef, inset: number, into: Shape | Path = new Shape()) {
  const w = def.width - 2 * inset;
  const h = def.height - 2 * inset;
  switch (def.shape) {
    case 'octagon':
      return polygon(octagonPoints(def.width / 2 - inset), into);
    case 'arrow':
      return polygon(arrowPoints(w, h, def.height * 0.6 - inset), into);
    case 'square':
      return roundedRect(w, h, 0.05, into);
    default:
      return roundedRect(w, h, 0.04, into);
  }
}

export function signShape(def: SignDef): Shape {
  return outline(def, 0) as Shape;
}

/**
 * Bevelled plate, centred on the origin, face towards +z. Material groups: 0 painted face,
 * 1 edges, 2 bare-metal back (three emits both lids in group 0, back lid first).
 */
export function signGeometry(def: SignDef): ExtrudeGeometry {
  const g = new ExtrudeGeometry(signShape(def), {
    depth: PLATE.depth,
    bevelEnabled: true,
    bevelSize: PLATE.bevel,
    bevelThickness: PLATE.bevel,
    bevelSegments: 3,
    curveSegments: 10,
  });
  g.center();
  const lids = g.groups.find((x) => x.materialIndex === 0);
  if (lids) {
    const half = lids.count / 2;
    g.groups = [
      { start: lids.start, count: half, materialIndex: 2 },
      { start: lids.start + half, count: half, materialIndex: 0 },
      ...g.groups.filter((x) => x !== lids),
    ];
  }
  return g;
}

/** The painted border ring a road sign carries just inside its edge. */
export function borderGeometry(def: SignDef): ShapeGeometry {
  const ring = outline(def, 0.025) as Shape;
  ring.holes.push(outline(def, 0.05, new Path()) as Path);
  return new ShapeGeometry(ring, 10);
}

/**
 * The outline as evenly spaced points (every `step` m) for a neon tube along the plate's edge. Dense,
 * even spacing keeps a closed Catmull-Rom spline tight to the corners instead of looping past them.
 */
export function neonOutline(def: SignDef, inset = 0.012, step = 0.02): Pt[] {
  const pts = (outline(def, inset) as Shape).getPoints(12);
  if (pts.length > 1 && pts[0].distanceTo(pts[pts.length - 1]) < 1e-6) pts.pop();
  const out: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const n = Math.max(1, Math.ceil(a.distanceTo(b) / step));
    for (let k = 0; k < n; k++) out.push([a.x + ((b.x - a.x) * k) / n, a.y + ((b.y - a.y) * k) / n]);
  }
  return out;
}

/** Clamp bands sit this far above and below a sign's centre. */
export function bandOffset(def: SignDef): number {
  return Math.max(def.height / 2 - 0.08, 0.06);
}

const ON = 6;
const OFF = 0.05;

export function lensIntensity(state: LightState): { red: number; yellow: number; green: number } {
  return {
    red: state === 'red' ? ON : OFF,
    yellow: state === 'yellow' ? ON : OFF,
    green: state === 'green' ? ON : OFF,
  };
}
