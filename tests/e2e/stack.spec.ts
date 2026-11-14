import { expect, test, type Page } from '@playwright/test';
import { gotoScene, scrollTo, swungIn, waitReady } from './helpers';

/** Labels (blade headings and items) that broke onto a second line. */
const multiLine = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('#stack .blade [data-line]')]
      .filter((s) => s.getClientRects().length > 1)
      .map((s) => s.textContent),
  );

test('every blade line is one line, at 1440 px, in every language', async ({ page }) => {
  for (const l of ['en', 'ru', 'uk']) {
    await gotoScene(page, `/${l}`);
    await scrollTo(page, 0.695);
    expect(await page.locator('#stack .blade [data-line]').count(), l).toBeGreaterThan(30);
    expect(await multiLine(page), l).toEqual([]);
  }
  await expect(page.locator('#stack .blade')).toHaveCount(6);
});

test('each category hangs on its own bracket', async ({ page }) => {
  await gotoScene(page);
  const blades = page.locator('#stack .blade');
  await expect(blades).toHaveCount(6);
  for (let i = 0; i < 6; i++) await expect(blades.nth(i).locator('.blade-arm')).toHaveCount(1);
});

test('a blade item with a sticker lights it on the pole', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, 0.695);
  const react = page.locator('#stack .blade').getByText('React', { exact: true });
  await react.scrollIntoViewIfNeeded();
  await swungIn(react);
  await react.hover();
  await expect.poll(() => page.evaluate(() => window.__portfolio.state().highlight)).toBe('react');
});
