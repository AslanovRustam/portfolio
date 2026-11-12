/**
 * Centres of the LEDs behind a signal lens: a hex grid (`pitch` px apart) clipped to a circle of
 * `radius` px in a `size`² canvas — the dotted look of a modern LED traffic light.
 */
export function ledLayout(size: number, pitch: number, radius: number): [number, number][] {
  const c = size / 2;
  const rowStep = (pitch * Math.sqrt(3)) / 2;
  const dots: [number, number][] = [];
  const rows = Math.ceil(radius / rowStep);
  for (let r = -rows; r <= rows; r++) {
    const y = c + r * rowStep;
    const offset = Math.abs(r) % 2 === 1 ? pitch / 2 : 0;
    const cols = Math.ceil(radius / pitch) + 1;
    for (let k = -cols; k <= cols; k++) {
      const x = c + k * pitch + offset;
      if (Math.hypot(x - c, y - c) <= radius) dots.push([x, y]);
    }
  }
  return dots;
}
