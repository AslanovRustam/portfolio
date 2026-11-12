import { expect, test } from '@playwright/test';
import { gotoScene, scrollTo, waitReady } from './helpers';

test('pole faces each section and the light changes', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  for (const [p, yaw, lit] of [
    [0.26, 0, 'yellow'],
    [0.48, -Math.PI / 2, 'yellow'],
    [0.9, -1.5 * Math.PI, 'green'],
  ] as const) {
    await scrollTo(page, p);
    // polled, not a fixed wait: on a shared integrated GPU the damped turn can take several seconds
    await expect
      .poll(() => page.evaluate(() => window.__portfolio.probe('poleYaw') as number), { timeout: 10_000 })
      .toBeCloseTo(yaw, 1);
    await expect
      .poll(() => page.evaluate((k) => (window.__portfolio.probe('light') as Record<string, number>)[k], lit), {
        timeout: 10_000,
      })
      .toBeGreaterThan(3);
  }
});

// Review Focus 2
test('End key: no extra spins, lands on contact', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await page.keyboard.press('End');
  // sample the turn: it must never swing past CONTACT (no extra spins), and it must settle on it
  const samples: number[] = [];
  for (let i = 0; i < 60; i++) {
    samples.push(await page.evaluate(() => window.__portfolio.probe('poleYaw') as number));
    await page.waitForTimeout(100);
  }
  expect(Math.min(...samples)).toBeGreaterThanOrEqual(-1.5 * Math.PI - 0.05);
  expect(samples[samples.length - 1]).toBeCloseTo(-1.5 * Math.PI, 1);
});
