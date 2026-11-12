export interface AtlasRect {
  u: number;
  v: number;
  w: number;
  h: number;
}

/** Square cells of `cell` px packed row by row into a `size`² atlas, as 0..1 UV rects (v from the top). */
export function layoutAtlas(count: number, cell: number, size: number): AtlasRect[] {
  const cols = Math.floor(size / cell);
  const w = cell / size;
  return Array.from({ length: count }, (_, i) => ({
    u: (i % cols) * w,
    v: Math.floor(i / cols) * w,
    w,
    h: w,
  }));
}

/** Angle a sticker `width` metres wide wraps around a pole of `radius`. */
export function stickerArc(width: number, radius: number): number {
  return width / radius;
}
