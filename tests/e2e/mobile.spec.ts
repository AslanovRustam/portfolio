import { expect, test } from '@playwright/test';
import { gotoScene, progress, scrollTo } from './helpers';

// Review Focus 4
test('touch swipe advances progress on a phone, low tier, no errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await gotoScene(page);
  await expect.poll(() => page.evaluate(() => window.__portfolio.state().tier), { timeout: 30_000 }).toBe('low');
  const before = await progress(page);
  // a real finger swipe: synthesizeScrollGesture does not scroll in this Chromium setup, raw touch events do
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 200, y: 600 }] });
  for (let i = 1; i <= 10; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 200, y: 600 - i * 60 }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => progress(page)).toBeGreaterThan(before + 0.01);
  expect(errors).toEqual([]);
});

// Final review #5: turning the phone sideways keeps the visitor where they were
test('portrait → landscape keeps progress and section', async ({ page }) => {
  await gotoScene(page);
  await scrollTo(page, 0.6);
  const before = await progress(page);
  await page.setViewportSize({ width: 915, height: 412 });
  await page.waitForTimeout(1200);
  expect(Math.abs((await progress(page)) - before)).toBeLessThan(0.02);
  expect(await page.evaluate(() => window.__portfolio.section())).toBe('stack');
});
