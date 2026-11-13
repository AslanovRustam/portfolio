import { expect, test } from '@playwright/test';
import { gotoScene, progress, scrollTo, stop } from './helpers';

// Review Focus 2
test('a case opens over the scene, locks scrolling, and closes back to the same spot', async ({ page }) => {
  await gotoScene(page);
  await scrollTo(page, stop(0));
  const before = await progress(page);
  await page.locator('section#work').getByRole('link', { name: 'Open case' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { level: 2 })).toHaveText(/Gipper/, { timeout: 15_000 }); // dev compiles the case on first use
  await page.mouse.wheel(0, 1500);
  await page.waitForTimeout(600);
  expect(Math.abs((await progress(page)) - before)).toBeLessThan(0.01);
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/en$/, { timeout: 15_000 }); // a cold dev server compiles /en on the way back
  await expect(dialog).toHaveCount(0);
  expect(Math.abs((await progress(page)) - before)).toBeLessThan(0.01);
});

// Review Focus 3
test('switching language on a case keeps the case', async ({ page }) => {
  await page.goto('/en/work/altus');
  await page.getByRole('link', { name: 'RU', exact: true }).click();
  await expect(page).toHaveURL(/\/ru\/work\/altus$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(page.getByRole('dialog').getByRole('heading', { level: 2 })).toBeVisible();
});

test('an unknown case is a 404', async ({ page }) => {
  const res = await page.goto('/en/work/nope');
  expect(res?.status()).toBe(404);
});

test('gen-go links to its site and says the repo is private', async ({ page }) => {
  await page.goto('/en/work/gengo');
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { level: 2 })).toHaveText('gen-go', { timeout: 15_000 });
  await expect(dialog.getByRole('link', { name: 'Live site' })).toHaveAttribute('href', 'https://gen-go.ai/');
  await expect(dialog.getByRole('link', { name: 'Source code' })).toHaveCount(0);
  await expect(dialog.getByText('Private repo')).toBeVisible();
});

test('Speca.bike is marked as in development, Kolir tells a full case', async ({ page }) => {
  await page.goto('/en/work/moto');
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { level: 2 })).toHaveText('Speca.bike', { timeout: 15_000 });
  await expect(dialog.getByText('In development', { exact: true })).toBeVisible();
  await page.goto('/en/work/kolir');
  await expect(dialog.getByText('What I did')).toBeVisible({ timeout: 15_000 });
  await expect(dialog.getByText('Private repo')).toBeVisible();
});
