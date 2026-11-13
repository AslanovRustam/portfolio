import { expect, it } from 'vitest';
import { SIGNS } from '@/experience/signs';
import { arrowPoints, celebrateBoost, lensIntensity, octagonPoints, signGeometry } from '@/scene/pole/geometry';

it('octagon: 8 points on radius r with a flat top', () => {
  const pts = octagonPoints(0.45);
  expect(pts).toHaveLength(8);
  for (const [x, y] of pts) expect(Math.hypot(x, y)).toBeCloseTo(0.45, 6);
  const top = [...pts].sort((a, b) => b[1] - a[1]).slice(0, 2);
  expect(top[0][1]).toBeCloseTo(top[1][1], 6);
});

it('arrow points right and fits its box', () => {
  const pts = arrowPoints(1.5, 0.42, 0.25);
  expect(pts).toHaveLength(5);
  expect(Math.max(...pts.map((p) => p[0]))).toBeCloseTo(0.75, 6);
  expect(Math.min(...pts.map((p) => p[0]))).toBeCloseTo(-0.75, 6);
  expect(Math.max(...pts.map((p) => p[1]))).toBeCloseTo(0.21, 6);
});

it('sign geometry is a bevelled plate', () => {
  const g = signGeometry(SIGNS.find((s) => s.id === 'about')!);
  g.computeBoundingBox();
  const b = g.boundingBox!;
  expect(b.max.z - b.min.z).toBeCloseTo(0.03 + 2 * 0.008, 3);
  expect(b.max.x - b.min.x).toBeCloseTo(1.4 + 2 * 0.008, 2);
});

it('sign geometry splits face, edge and bare-metal back into material groups', () => {
  const g = signGeometry(SIGNS.find((s) => s.id === 'contact')!);
  const byIndex = (i: number) => g.groups.filter((x) => x.materialIndex === i);
  expect(byIndex(0)).toHaveLength(1); // painted face
  expect(byIndex(1).length).toBeGreaterThan(0); // edges
  expect(byIndex(2)).toHaveLength(1); // back
  expect(byIndex(0)[0].count).toBe(byIndex(2)[0].count);
  // the face group's triangles sit on the +z side
  const pos = g.getAttribute('position');
  const index = g.getIndex();
  const v = index ? index.getX(byIndex(0)[0].start) : byIndex(0)[0].start;
  expect(pos.getZ(v)).toBeGreaterThan(0);
});

it('one lens on per state', () => {
  expect(lensIntensity('off')).toEqual({ red: 0.05, yellow: 0.05, green: 0.05 });
  expect(lensIntensity('red')).toEqual({ red: 6, yellow: 0.05, green: 0.05 });
  expect(lensIntensity('green')).toEqual({ red: 0.05, yellow: 0.05, green: 6 });
});

it('a sent message makes the green lens pulse brighter than its steady glow', () => {
  const samples = Array.from({ length: 200 }, (_, i) => celebrateBoost(i * 0.017));
  for (const v of samples) {
    expect(v).toBeGreaterThanOrEqual(1);
    expect(v).toBeLessThanOrEqual(2.2);
  }
  expect(Math.max(...samples) - Math.min(...samples)).toBeGreaterThan(0.8);
});
