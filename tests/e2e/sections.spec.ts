import { expect, test } from '@playwright/test';
import { gotoScene, progress } from './helpers';

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
