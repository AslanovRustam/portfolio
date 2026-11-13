import { expect, test, type Page } from '@playwright/test';
import { gotoScene, scrollTo, waitReady } from './helpers';

interface Wall {
  visible: boolean;
  loaded: boolean;
  levels: number[];
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
  await scrollTo(page, 0.48);
  await expect.poll(async () => Math.max(...(await wall(page))!.levels)).toBe(0);
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
