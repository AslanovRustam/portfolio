import { expect, test } from '@playwright/test';
import { gotoScene, HOLD, progress, scrollTo, waitReady } from './helpers';

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

// Final review #5: a shorter window clamps scrollY before ScrollTrigger re-measures
test('halving the window height near the end keeps progress and section', async ({ page }) => {
  await gotoScene(page);
  await scrollTo(page, 0.9);
  await page.setViewportSize({ width: 1440, height: 400 });
  await page.waitForTimeout(1000);
  expect(Math.abs((await progress(page)) - 0.9)).toBeLessThan(0.02);
  expect(await page.evaluate(() => window.__portfolio.section())).toBe('contact');
});

const GAP = 0.14 / 9;

test('a scroll that stops between two Work stops settles on the nearest one', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, 0.18 + GAP * 3.3);
  await page.mouse.move(720, 300);
  await page.mouse.wheel(0, 1); // a real (non-programmatic) scroll event, then rest
  await expect.poll(() => progress(page), { timeout: 4000 }).toBeCloseTo(0.18 + GAP * 3, 3);
});

// Review Focus 2
test('a header jump across Work is not bent by the snap', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await page.getByRole('button', { name: 'About', exact: true }).click();
  // About lands where its first bill has come up the screen (M4 round 1): wherever that is, it stays there
  await expect.poll(() => progress(page), { timeout: 8000 }).toBeGreaterThan(HOLD.about[0]);
  await page.waitForTimeout(1500);
  const landed = await progress(page);
  expect(landed).toBeLessThan(HOLD.about[1]);
  await page.waitForTimeout(800);
  expect(await progress(page)).toBeCloseTo(landed, 3);
});

test('Work in the header lands on the first project', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await page.getByRole('button', { name: 'Work', exact: true }).click();
  await expect.poll(() => progress(page), { timeout: 8000 }).toBeCloseTo(0.18, 3);
});

test('#work-5 opens the fifth project', async ({ page }) => {
  await gotoScene(page, '/en#work-5'); // a fresh page: a hash-only goto would not remount
  await waitReady(page);
  await expect.poll(() => progress(page), { timeout: 8000 }).toBeCloseTo(0.18 + GAP * 4, 3);
});

test('one wheel notch inside Work moves on to the next project', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, 0.18 + GAP * 3);
  await page.mouse.move(720, 300);
  await page.mouse.wheel(0, 100); // one notch: about a third of the gap between projects
  await expect.poll(() => progress(page), { timeout: 5000 }).toBeCloseTo(0.18 + GAP * 4, 3);
  await page.waitForTimeout(800);
  expect(await progress(page)).toBeCloseTo(0.18 + GAP * 4, 3);
});

// Review Focus 2, inside Work: a site-made scroll that ends between two projects stays there
test('a programmatic scroll between two stops is not pulled onto either', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, 0.18 + GAP * 3.3);
  await page.waitForTimeout(800);
  expect(await progress(page)).toBeCloseTo(0.18 + GAP * 3.3, 3);
});
