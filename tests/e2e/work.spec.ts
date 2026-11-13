import { expect, test } from '@playwright/test';
import { gotoScene, scrollTo, waitReady } from './helpers';

test('the work track slides through all projects and ends on "a small part"', async ({ page }) => {
  await gotoScene(page);
  await scrollTo(page, 0.19);
  await expect(page.getByRole('link', { name: /Gipper/ })).toBeVisible();
  await scrollTo(page, 0.33);
  await expect(page.getByText(/small part/i)).toBeVisible();
  expect(await page.evaluate(() => window.__portfolio.probe('track') as number)).toBeLessThan(-200);
});

test('a card opens its case over the scene by client navigation', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await page.evaluate(() => document.querySelector('canvas')!.setAttribute('data-mark', 'same'));
  await scrollTo(page, 0.19); // the start of the track: the first card is on screen
  await page.getByRole('link', { name: /Gipper/ }).click();
  await expect(page).toHaveURL(/\/en\/work\/gipper$/);
  await expect(page.locator('canvas[data-mark="same"]')).toHaveCount(1);
});

test('keyboard focus on a card clipped off the track brings it into view', async ({ page }) => {
  await gotoScene(page);
  await scrollTo(page, 0.19);
  await page.getByRole('link', { name: /TUTI/ }).focus();
  await expect.poll(() => page.evaluate(() => window.__portfolio.state().progress), { timeout: 8000 }).toBeGreaterThan(0.25);
});
