import { expect, test } from '@playwright/test';
import { gotoScene, scrollTo, waitReady } from './helpers';

test('canvas renders, is hidden from AT, becomes ready without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  // uncaught exceptions (e.g. inside a post-processing pass every frame) never reach the console listener
  page.on('pageerror', (e) => errors.push(e.message));
  await gotoScene(page);
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.locator('[aria-hidden="true"] canvas, canvas[aria-hidden="true"]')).toHaveCount(1);
  await expect
    .poll(() => page.evaluate(() => window.__portfolio.state().ready), { timeout: 30_000 })
    .toBe(true);
  await page.waitForTimeout(1500);
  expect(errors).toEqual([]);
});

for (const q of ['high', 'medium', 'low'] as const) {
  test(`?quality=${q} renders frames without exceptions`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await gotoScene(page, `/en?quality=${q}`);
    await waitReady(page);
    await page.waitForTimeout(1500);
    expect(errors).toEqual([]);
  });
}

test('the camera rides to the end of the street', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, 1);
  const camera = () => page.evaluate(() => (window.__portfolio.probe('camera') as { position: number[] }).position);
  // the end of the ride (route.ts): before the billboard, far down the road from the pole
  await expect.poll(async () => (await camera())[2], { timeout: 10_000 }).toBeCloseTo(-44, 0);
  expect((await camera())[1]).toBeCloseTo(4.2, 1);
});

test('the street gets wet as the scene renders', async ({ page }) => {
  await gotoScene(page);
  await expect
    .poll(() => page.evaluate(() => window.__portfolio.state().ready), { timeout: 30_000 })
    .toBe(true);
  expect(await page.evaluate(() => window.__portfolio.probe('wetness'))).toBeLessThan(0.05);
  await scrollTo(page, 0.3);
  await expect
    .poll(() => page.evaluate(() => window.__portfolio.probe('wetness') as number), { timeout: 10_000 })
    .toBeGreaterThan(0.95);
});
