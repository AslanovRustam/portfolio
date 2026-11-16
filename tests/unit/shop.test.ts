import { expect, it } from 'vitest';
import { ROAD } from '@/scene/street/layout';
import { shopLayout } from '@/scene/shop/layout';
import { wallPose } from '@/scene/tvwall/camera';
import { screenRect, stopSlots, TV_MODELS, wallLayout } from '@/scene/tvwall/layout';

const shop = shopLayout();

it('every TV stands behind the glass, inside the shop window', () => {
  const { window: w } = shop;
  for (const slot of wallLayout()) {
    const r = screenRect(slot);
    // the screen is behind the glass, inside the shop
    expect(r.center[0]).toBeLessThan(w.glassX - 0.05);
    expect(r.center[0]).toBeGreaterThan(shop.facade.x0);
    // along the street, and in height, the whole set sits inside the window
    const half = (TV_MODELS[slot.model].size[0] * slot.scale) / 2;
    expect(slot.position[2] + half).toBeLessThanOrEqual(w.z0);
    expect(slot.position[2] - half).toBeGreaterThanOrEqual(w.z1);
    expect(slot.position[1]).toBeGreaterThanOrEqual(w.y0 - 0.01);
    expect(slot.position[1] + TV_MODELS[slot.model].size[1] * slot.scale).toBeLessThanOrEqual(w.y1);
  }
});

it('the camera looks at each TV from the street, through the glass', () => {
  const { window: w } = shop;
  stopSlots(wallLayout()).forEach((_, i) => {
    for (const aspect of [16 / 9, 0.46]) {
      const p = wallPose(i, aspect);
      expect(p.position[0], `stop ${i} at ${aspect}`).toBeGreaterThan(w.glassX + 0.3);
    }
  });
});

it('the building stands behind the sidewalk, never on it', () => {
  expect(shop.facade.x1).toBeLessThanOrEqual(-(ROAD.half + ROAD.sidewalk) + 0.01);
  expect(shop.window.glassX).toBeLessThanOrEqual(shop.facade.x1);
});

it('the shop sign over the window says WORK', () => {
  expect(shop.sign.text).toBe('WORK');
  expect(shop.sign.position[1]).toBeGreaterThan(shop.window.y1);
});
