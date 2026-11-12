import { expect, test } from '@playwright/test';
import { gotoScene, scrollTo, waitReady } from './helpers';

test('scene starts as blueprint and is fully rendered after the intro', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  expect(await page.evaluate(() => window.__portfolio.probe('reveal'))).toBeLessThan(0.01);
  await scrollTo(page, 0.2);
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => window.__portfolio.probe('reveal'))).toBeCloseTo(1, 2);
});

test('reduced motion shows the rendered scene at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await gotoScene(page);
  await waitReady(page);
  await expect.poll(() => page.evaluate(() => window.__portfolio.probe('reveal'))).toBe(1);
  await scrollTo(page, 0.48);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__portfolio.probe('poleYaw') as number)).toBeCloseTo(-Math.PI / 2, 2);
});
