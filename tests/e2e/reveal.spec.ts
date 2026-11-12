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
  // no intro half-turn and no partial turn near a boundary: the pole stays on WORK
  for (const p of [0.05, 0.36]) {
    await scrollTo(page, p);
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => window.__portfolio.probe('poleYaw') as number)).toBeCloseTo(0, 2);
  }
  await scrollTo(page, 0.48);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__portfolio.probe('poleYaw') as number)).toBeCloseTo(-Math.PI / 2, 2);
});
