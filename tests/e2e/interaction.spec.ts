import { expect, test } from '@playwright/test';
import { gotoScene, progress, scrollTo, waitReady } from './helpers';

test('hovering a sign shows a pointer, clicking it scrolls to its section', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  // the end of the intro: the pole still at its spot, its WORK arrow turned to the camera (on the ride it
  // steps out of the frame as the camera turns to the TVs)
  await scrollTo(page, 0.14);
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
  await waitReady(page); // the hero comes once the street is there
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

test('the loader is a speedometer: the speed climbs with the load, GO at 100, then the street', async ({ page }) => {
  await page.goto('/en');
  const loader = page.locator('[data-loader]');
  const speed = loader.locator('[data-speed]');
  await expect(speed).toBeVisible();
  await expect(loader.locator('[data-arc-fill]')).toBeVisible();
  // screen readers hear the load as before
  await expect(loader.getByRole('status')).toContainText(/Rendering \d+%/);
  // the needle never goes back
  let last = 0;
  while ((await loader.getAttribute('data-phase')) !== 'go' && !(await page.evaluate(() => window.__portfolio?.state().ready))) {
    const v = Number(await speed.textContent());
    expect(v).toBeGreaterThanOrEqual(last);
    last = v;
    await page.waitForTimeout(100);
  }
  await expect(loader).toHaveAttribute('data-phase', 'go', { timeout: 30_000 });
  await expect(speed).toHaveText('100');
  await expect(loader.getByText('GO', { exact: true })).toHaveCount(1);
  await page.waitForFunction(() => window.__portfolio?.state().ready, undefined, { timeout: 30_000 });
  await expect(loader).toBeHidden();
});

test('reduced motion: the loader keeps its digits and drops the moving arc', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/en');
  const loader = page.locator('[data-loader]');
  await expect(loader.locator('[data-speed]')).toBeVisible();
  await expect(loader.locator('[data-arc-fill]')).toBeHidden();
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

// M3 gate: while the scene loads, the loader is all there is — nothing to press before the street is there
test('while the scene loads only the loader shows, then the header, hero and Next button come', async ({ page }) => {
  // hold the scene's environment back, so the loading lasts long enough to look at
  await page.route('**/hdri/**', async (route) => {
    await new Promise((r) => setTimeout(r, 4000));
    await route.continue();
  });
  await page.goto('/en');
  await expect(page.locator('[data-loader]')).toBeVisible();
  for (const sel of ['header[data-ui]', '[data-hero]', '.next-button', '.progress-tube']) await expect(page.locator(sel), sel).toBeHidden();
  await expect(page.locator('[data-loader]')).toBeHidden({ timeout: 30_000 });
  await expect(page.locator('header[data-ui]')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Rustam Aslanov' })).toBeVisible();
  await expect(page.locator('.next-button')).toBeVisible();
});

test.describe('without scripts', () => {
  test.use({ javaScriptEnabled: false });
  test('the header and the hero are simply there', async ({ page }) => {
    await page.goto('/en');
    await expect(page.locator('header[data-ui]')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Rustam Aslanov' })).toBeVisible();
  });
});
