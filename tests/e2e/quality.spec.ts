import { expect, test } from '@playwright/test';
import { gotoScene, waitReady } from './helpers';

for (const [q, dpr] of [
  ['low', 1],
  ['high', 1.75],
] as const) {
  test(`?quality=${q} applies its tier`, async ({ page }) => {
    await gotoScene(page, `/en?quality=${q}`);
    await waitReady(page);
    await expect.poll(() => page.evaluate(() => window.__portfolio.state().tier)).toBe(q);
    // probe 'dpr' = gl.getPixelRatio(); R3F applies a numeric dpr as-is
    await expect.poll(() => page.evaluate(() => window.__portfolio.probe('dpr'))).toBe(dpr);
  });
}

test('?debug shows the perf panel', async ({ page }) => {
  await gotoScene(page, '/en?debug');
  await expect(page.locator('.r3f-perf, [class*="perf"]').first()).toBeVisible({ timeout: 30_000 });
});

test('post-processing is on and follows the tier', async ({ page }) => {
  await gotoScene(page, '/en?quality=high');
  await waitReady(page);
  await expect.poll(() => page.evaluate(() => window.__portfolio.probe('effects'))).toEqual(['ao', 'bloom', 'tonemap', 'smaa', 'noise', 'vignette']);
  await gotoScene(page, '/en?quality=low');
  await waitReady(page);
  await expect.poll(() => page.evaluate(() => window.__portfolio.probe('effects'))).toEqual(['bloom', 'tonemap', 'smaa', 'vignette']);
});
