import { expect, test } from '@playwright/test';
import { gotoScene, innerScrollers, progress, scrollTo } from './helpers';

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

test('the header on a phone: name and language above, sections below, every tube at least 44×44', async ({ page }) => {
  await gotoScene(page);
  const header = page.locator('header[data-ui]');
  const name = await header.getByRole('link', { name: /Rustam Aslanov/i }).boundingBox();
  const lang = await header.getByRole('link', { name: 'EN', exact: true }).boundingBox();
  const work = await header.getByRole('button', { name: 'Work', exact: true }).boundingBox();
  expect(name && lang && work).toBeTruthy();
  expect(Math.abs(name!.y + name!.height / 2 - (lang!.y + lang!.height / 2))).toBeLessThan(8);
  expect(name!.x).toBeLessThan(lang!.x); // the name on the left, the languages on the right
  expect(work!.y).toBeGreaterThan(name!.y + name!.height / 2);
  const small = await header.locator('a, button').evaluateAll((els) =>
    els
      .map((el) => ({ t: el.textContent, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width < 44 || r.height < 44)
      .map(({ t, r }) => `${t} ${Math.round(r.width)}×${Math.round(r.height)}`),
  );
  expect(small).toEqual([]);
});

test('a phone has no inner scroll either', async ({ page }) => {
  await gotoScene(page);
  for (const p of [0.48, 0.695, 0.9]) {
    await scrollTo(page, p);
    expect(await innerScrollers(page), `@ ${p}`).toEqual([]);
  }
});

// Review Focus 3
test('the end of the page on a phone', async ({ page }) => {
  await gotoScene(page);
  await scrollTo(page, 0.95);
  const cdp = await page.context().newCDPSession(page);
  for (let k = 0; k < 6; k++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 200, y: 700 }] });
    for (let i = 1; i <= 10; i++)
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 200, y: 700 - i * 50 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(300);
  }
  await expect.poll(() => progress(page), { timeout: 8000 }).toBeGreaterThan(0.995);
  const vh = await page.evaluate(() => innerHeight);
  const last = (await page.locator('#contact .nbox').last().boundingBox())!;
  expect(last.y + last.height).toBeLessThanOrEqual(vh + 1);
});
