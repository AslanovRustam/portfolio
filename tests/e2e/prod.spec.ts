// The production build: largest contentful paint and a clean console. Run: npm run prod
import { expect, test } from '@playwright/test';

test('production page paints fast and runs clean', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));

  const scripts: Promise<number>[] = [];
  page.on('requestfinished', (r) => {
    if (r.resourceType() === 'script') scripts.push(r.sizes().then((s) => s.responseBodySize));
  });

  await page.goto('/en');
  const lcp = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let value = 0;
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) value = e.startTime;
        }).observe({ type: 'largest-contentful-paint', buffered: true });
        setTimeout(() => resolve(value), 3000);
      }),
  );
  console.log('lcp', lcp);
  expect(lcp).toBeGreaterThan(0);
  expect(lcp).toBeLessThanOrEqual(2500);
  await expect(page.locator('canvas')).toHaveCount(1, { timeout: 20_000 });
  await page.waitForTimeout(4000);
  expect(errors).toEqual([]);

  // Final review #2: everything the page downloads as JavaScript, compressed, scene chunk included
  const jsBytes = (await Promise.all(scripts)).reduce((a, b) => a + b, 0);
  console.log('js bytes', jsBytes);
  expect(jsBytes).toBeLessThanOrEqual(1_600_000);
});

// Final review #7, in production (no dev overlay): a failed scene asset must leave a working page
test('a scene asset that fails in production falls back, the hero stays', async ({ page }) => {
  await page.route('**/hdri/**', (route) => route.abort());
  await page.route('**/fonts/**', (route) => route.abort());
  await page.goto('/en');
  await expect(page.locator('[data-fallback]')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('heading', { level: 1, name: 'Rustam Aslanov' })).toBeVisible();
});
