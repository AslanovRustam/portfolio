import { expect, test } from '@playwright/test';
import { gotoScene, progress, scrollTo, waitReady } from './helpers';

test('hovering a sign shows a pointer, clicking it scrolls to its section', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, 0.2);
  await page.waitForTimeout(2000);
  const { x, y } = (await page.evaluate(() => window.__portfolio.probe('signScreen:work'))) as { x: number; y: number };
  await page.mouse.move(x, y);
  await expect.poll(() => page.evaluate(() => document.body.style.cursor)).toBe('pointer');
  await page.mouse.click(x, y);
  // Work opens on its first project (Plan 2b)
  await expect.poll(() => progress(page), { timeout: 4000 }).toBeCloseTo(0.18, 3);
});

test('hero is visible at the top and gone after the intro starts', async ({ page }) => {
  await gotoScene(page);
  await expect(page.getByRole('heading', { level: 1, name: 'Rustam Aslanov' })).toBeVisible();
  await scrollTo(page, 0.1);
  await expect(page.locator('[data-hero]')).toHaveCSS('opacity', '0');
});

test('loader goes away when the scene is ready', async ({ page }) => {
  await page.goto('/en');
  // present while the scene loads (an absent element would pass toBeHidden trivially)
  await expect(page.locator('[data-loader]')).toHaveCount(1);
  await expect(page.locator('[data-loader]')).toBeHidden({ timeout: 30_000 });
});

test('?webgl=0 shows the fallback and no canvas', async ({ page }) => {
  await page.goto('/en?webgl=0');
  await expect(page.locator('[data-fallback]')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
});

// Review Focus 5
test('context loss swaps to the fallback', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await page.evaluate(() =>
    document.querySelector('canvas')!.getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext(),
  );
  await expect(page.locator('[data-fallback]')).toBeVisible({ timeout: 5000 });
});

// Final review #1: with WebGL2 the first paint must never say "needs WebGL2"
test('server HTML carries the loader, never the fallback', async ({ request }) => {
  const html = await (await request.get('/en')).text();
  expect(html).toContain('data-loader');
  expect(html).not.toContain('data-fallback');
});

// Final review #7: a failed asset load falls back, it never takes the page down
test('a scene asset that fails to load swaps to the fallback, the page lives on', async ({ page }) => {
  await page.route('**/hdri/**', (route) => route.abort());
  await page.goto('/en');
  await expect(page.locator('[data-fallback]')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('heading', { level: 1, name: 'Rustam Aslanov' })).toBeVisible();
});
