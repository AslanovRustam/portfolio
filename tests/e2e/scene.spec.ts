import { expect, test } from '@playwright/test';
import { gotoScene, scrollTo, waitReady } from './helpers';

test('canvas renders, is hidden from AT, becomes ready without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await gotoScene(page);
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.locator('[aria-hidden="true"] canvas, canvas[aria-hidden="true"]')).toHaveCount(1);
  await expect
    .poll(() => page.evaluate(() => window.__portfolio.state().ready), { timeout: 30_000 })
    .toBe(true);
  expect(errors).toEqual([]);
});

test('camera follows the choreography', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, 1);
  await page.waitForTimeout(2500);
  const cam = (await page.evaluate(() => window.__portfolio.probe('camera'))) as { position: number[] };
  expect(cam.position[1]).toBeCloseTo(4.6, 1);
});

test('the street gets wet as the scene renders', async ({ page }) => {
  await gotoScene(page);
  await expect
    .poll(() => page.evaluate(() => window.__portfolio.state().ready), { timeout: 30_000 })
    .toBe(true);
  expect(await page.evaluate(() => window.__portfolio.probe('wetness'))).toBeLessThan(0.05);
  await scrollTo(page, 0.3);
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => window.__portfolio.probe('wetness'))).toBeGreaterThan(0.95);
});
