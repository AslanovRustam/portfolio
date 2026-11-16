import { expect, it } from 'vitest';
import { gantrySignX, STATIONS } from '@/experience/route';
import { gantryLayout } from '@/scene/stack/layout';
import { ROAD, streetLayout } from '@/scene/street/layout';
import { skylineLayout } from '@/scene/street/skylineLayout';

const G = gantryLayout();

it('six signs side by side over the road, the posts beyond the sidewalks', () => {
  expect(G.signs).toHaveLength(6);
  G.signs.forEach((s, i) => {
    expect(s.position[0]).toBeCloseTo(gantrySignX(i), 9);
    expect(s.position[1]).toBe(STATIONS.gantry.y);
    expect(s.position[2]).toBe(STATIONS.gantry.z);
    expect(s.width).toBe(STATIONS.gantry.signW);
    expect(s.height).toBe(STATIONS.gantry.signH);
    if (i > 0) expect(s.position[0] - s.width / 2).toBeGreaterThan(G.signs[i - 1].position[0] + s.width / 2);
  });
  const outer = G.signs[5].position[0] + G.signs[5].width / 2;
  expect(G.postX).toBeGreaterThan(outer);
  expect(G.postX - G.postWidth / 2).toBeGreaterThan(ROAD.half + ROAD.sidewalk);
  // a lorry passes under it: the lowest part over the road (the catwalk under the signs) stands well clear
  expect(G.clearance).toBeGreaterThan(4.3);
});

it('nothing on the street stands in the way of the signs', () => {
  for (const l of streetLayout(5).lamps) expect(Math.abs(l.z - STATIONS.gantry.z), `lamp at z ${l.z}`).toBeGreaterThan(3);
  for (const b of skylineLayout(7).blocks) expect(Math.abs(b.x) - b.w / 2, `block at x ${b.x}`).toBeGreaterThan(G.postX + G.postWidth);
});
