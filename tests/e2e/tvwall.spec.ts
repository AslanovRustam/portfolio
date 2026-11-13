import { expect, test, type Page } from '@playwright/test';
import { gotoScene, scrollTo, waitReady } from './helpers';

interface Wall {
  visible: boolean;
  loaded: boolean;
  levels: number[];
  streaks: number[];
  stops: { stop: number; ndc: [number, number] }[];
}
const wall = (page: Page) => page.evaluate(() => window.__portfolio.probe('wall') as Wall | undefined);

test('the wall is off on the blueprint, wakes in Work and sleeps after it', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await expect.poll(async () => (await wall(page))?.loaded, { timeout: 20_000 }).toBe(true);
  await scrollTo(page, 0.05);
  expect((await wall(page))!.visible).toBe(false);
  await scrollTo(page, 0.18);
  await expect.poll(async () => (await wall(page))!.levels[0], { timeout: 8000 }).toBeCloseTo(1, 1);
  // the wave reaches the fourth project a moment later
  await expect.poll(async () => (await wall(page))!.levels[3], { timeout: 4000 }).toBeCloseTo(0.25, 1);
  expect(Math.max(...(await wall(page))!.streaks)).toBeGreaterThan(0); // the lit wall glows on the road
  await scrollTo(page, 0.48);
  await expect.poll(async () => Math.max(...(await wall(page))!.levels)).toBe(0);
  expect(Math.max(...(await wall(page))!.streaks)).toBe(0);
});

// Review Focus 3
test('a wall whose models fail to load leaves the site working', async ({ page }) => {
  await page.route('**/models/tv/**', (r) => r.abort());
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, 0.18);
  await expect(page.locator('section#work')).toBeVisible();
  expect(await page.evaluate(() => window.__portfolio.state().webgl)).toBe(true);
});

test('the wall puts only its small pictures on the GPU', async ({ page, context }) => {
  const textures = (p: Page) => p.evaluate(() => window.__portfolio.probe('gpuTextures') as number);
  // the scene without the wall
  await page.route('**/models/tv/**', (r) => r.abort());
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, 0.18);
  await page.waitForTimeout(2500);
  const without = await textures(page);
  // and with it, every project screen drawn once
  const full = await context.newPage();
  await gotoScene(full);
  await waitReady(full);
  await expect.poll(async () => (await wall(full))?.loaded, { timeout: 20_000 }).toBe(true);
  for (const q of [0.18, 0.26, 0.32]) {
    await scrollTo(full, q);
    await full.waitForTimeout(1200);
  }
  const added = (await textures(full)) - without;
  console.log('wall textures', added);
  // 10 screen pictures (9 posters + NDA), the sets' maps (≤ 6) and the road streak: no full-size originals
  expect(added).toBeLessThanOrEqual(17);
});
