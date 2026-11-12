import { expect, test } from '@playwright/test';
import { gotoScene, progress, scrollTo } from './helpers';

test('scrolling to the end reaches progress 1 and green', async ({ page }) => {
  await gotoScene(page);
  await page.keyboard.press('End');
  await expect.poll(() => progress(page), { timeout: 5000 }).toBeGreaterThan(0.99);
  expect(await page.evaluate(() => window.__portfolio.light())).toBe('green');
});

test('scrollToProgress lands on the section centre', async ({ page }) => {
  await gotoScene(page);
  await page.evaluate(() => window.__portfolio.scrollToProgress(0.48, true));
  await expect.poll(() => progress(page)).toBeCloseTo(0.48, 2);
  expect(await page.evaluate(() => window.__portfolio.section())).toBe('about');
});

// Review Focus 1
test('resize mid-scroll keeps progress', async ({ page }) => {
  await gotoScene(page);
  await scrollTo(page, 0.5);
  await page.setViewportSize({ width: 900, height: 700 });
  await page.waitForTimeout(800);
  expect(Math.abs((await progress(page)) - 0.5)).toBeLessThan(0.02);
});

// Review Focus 3
test('reload starts at the top', async ({ page }) => {
  await gotoScene(page);
  await scrollTo(page, 0.6);
  await page.reload();
  await page.waitForFunction(() => !!window.__portfolio);
  expect(await progress(page)).toBeLessThan(0.005);
});

test('reduced motion: no glide', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await gotoScene(page);
  await expect.poll(() => page.evaluate(() => window.__portfolio.state().reducedMotion)).toBe(true);
});
