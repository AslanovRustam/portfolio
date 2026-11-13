import { expect, test } from '@playwright/test';
import en from '../../messages/en.json';
import { gotoScene, progress, scrollTo, waitReady } from './helpers';

test('a case URL renders inside the same experience', async ({ page }) => {
  // canvas persistence across client navigation is pinned in work.spec, once cards exist to click
  await gotoScene(page, '/en/work/altus');
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 2, name: /altus/i })).toBeVisible();
});

test('each locale names its siblings for search engines', async ({ page }) => {
  await page.goto('/en');
  await expect(page.locator('link[rel="alternate"][hreflang="uk"]')).toHaveAttribute('href', /\/uk$/);
});

test('header nav scrolls to a section and the language switch keeps the path', async ({ page }) => {
  await gotoScene(page);
  await page.getByRole('button', { name: 'About' }).click();
  await expect.poll(() => progress(page), { timeout: 8000 }).toBeCloseTo(0.48, 1);
  await page.getByRole('link', { name: 'RU', exact: true }).click();
  await expect(page).toHaveURL(/\/ru$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
});

test('each section panel shows only inside its window, and the scene steps aside', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  for (const [p, id] of [
    [0.26, 'work'],
    [0.48, 'about'],
    [0.695, 'stack'],
    [0.9, 'contact'],
  ] as const) {
    await scrollTo(page, p);
    await expect(page.locator(`section#${id}`)).toBeVisible();
    await expect
      .poll(() => page.evaluate((s) => window.__portfolio.probe(`panel:${s}`) as number, id))
      .toBeGreaterThan(0.95);
  }
  await expect
    .poll(() => page.evaluate(() => (window.__portfolio.probe('viewOffset') as { x: number }).x), { timeout: 8000 })
    .toBeGreaterThan(0.15);
  await scrollTo(page, 0.37); // a turn: no panel
  await expect(page.locator('section#about')).toBeHidden();
});

// Review Focus 1
test('HTML over a sign swallows the pointer: no sign hover, no sign click', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, 0.26);
  const { x, y } = (await page.evaluate(() => window.__portfolio.probe('signScreen:work'))) as { x: number; y: number };
  await page.evaluate(
    ([px, py]) => {
      const d = document.createElement('div');
      d.setAttribute('data-ui', '');
      Object.assign(d.style, {
        position: 'fixed',
        left: `${px - 40}px`,
        top: `${py - 40}px`,
        width: '80px',
        height: '80px',
        zIndex: '50',
      });
      document.body.appendChild(d);
    },
    [x, y],
  );
  await page.mouse.move(x, y);
  await page.mouse.click(x, y);
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => document.body.style.cursor)).not.toBe('pointer');
  expect(await page.evaluate(() => window.__portfolio.state().hoveredSign)).toBeNull();
});

// Review Focus 5
test('a hash deep link opens its section, also without WebGL', async ({ page }) => {
  await page.goto('/en?webgl=0#stack');
  await page.waitForFunction(() => !!window.__portfolio);
  await expect.poll(() => progress(page), { timeout: 8000 }).toBeCloseTo(0.695, 1);
  await expect(page.locator('section#stack')).toBeVisible();
});

test('the hero carries the positioning line', async ({ page }) => {
  await gotoScene(page);
  await expect(page.locator('header[data-hero]')).toContainText(en.hero.line);
});
