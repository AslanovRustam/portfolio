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

// M4 round 1, note 5: a neon sign while the street loads, after Rustam's first pin
test('the loader is a neon sign: its label, the percent climbing, a log of the files, then the street', async ({ page }) => {
  for (const [path, label] of [
    ['/en', 'Rendering'],
    ['/ru', 'Загрузка'],
    ['/uk', 'Завантаження'],
  ] as const) {
    await page.goto(path);
    const loader = page.locator('[data-loader]');
    await expect(loader.locator('.loader-title')).toHaveText(label);
    // screen readers hear the label and the percent
    await expect(loader.getByRole('status')).toContainText(new RegExp(`${label} \\d+%`));
    // the percent never goes back
    let last = 0;
    while ((await loader.getAttribute('data-phase')) === 'load') {
      const v = Number((await loader.locator('[data-percent]').textContent())?.replace('%', ''));
      expect(v).toBeGreaterThanOrEqual(last);
      last = v;
      await page.waitForTimeout(100);
    }
    // the log names what came in
    if (path === '/en') {
      const log = (await loader.locator('[data-loader-log]').textContent()) ?? '';
      expect(log.split('\n').length).toBeGreaterThanOrEqual(2);
      expect(log).toMatch(/^\{ scene/);
    }
    await page.waitForFunction(() => window.__portfolio?.state().ready, undefined, { timeout: 30_000 });
    await expect(loader).toHaveAttribute('data-phase', 'off');
    await expect(loader).toBeHidden({ timeout: 5000 });
  }
});

// gate M4 round 1: the loader in pink before a blue blueprint looked like two sites — it is the blueprint's sign
test('the loader is drawn in the blueprint’s colours: its paper, its grid and its line', async ({ page }) => {
  await page.goto('/en');
  const colours = await page.evaluate(() => {
    const probe = document.createElement('div');
    document.body.append(probe);
    const resolve = (v: string) => {
      probe.style.color = `var(${v})`;
      return getComputedStyle(probe).color;
    };
    const out = { paper: resolve('--blueprint'), line: resolve('--blueprint-line') };
    probe.remove();
    return out;
  });
  const loader = page.locator('[data-loader]');
  await expect(loader).toBeVisible();
  const seen = await loader.evaluate((el) => {
    const sign = getComputedStyle(el);
    const frame = getComputedStyle(el.querySelector('.loader-frame')!);
    const log = getComputedStyle(el.querySelector('.loader-log')!);
    return { background: sign.backgroundColor, image: sign.backgroundImage, frame: frame.borderTopColor, log: log.color };
  });
  expect(seen.background).toBe(colours.paper);
  expect(seen.image).toContain('linear-gradient');
  expect(seen.frame).toBe(colours.line);
  expect(seen.log).not.toMatch(/rgba?\(255, 90, 122/);
});

test('reduced motion: the sign neither blinks nor flickers out', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/en');
  const frame = page.locator('[data-loader] .loader-frame');
  await expect(frame).toBeVisible();
  await page.waitForFunction(() => window.__portfolio?.state().ready, undefined, { timeout: 30_000 });
  expect(await frame.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
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
