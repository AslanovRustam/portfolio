import { expect, test } from '@playwright/test';
import { gotoScene, HOLD, innerScrollers, progress, scrollTo, stop } from './helpers';

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

test('the phone header: the name on the left, one language tube and the menu on the right', async ({ page }) => {
  await gotoScene(page);
  const header = page.locator('header[data-ui]');
  const name = (await header.getByRole('link', { name: 'Rustam Aslanov', exact: true }).boundingBox())!;
  const lang = header.getByRole('button', { name: /^EN/ });
  const menu = header.getByRole('button', { name: 'Menu', exact: true });
  await expect(lang).toHaveAttribute('aria-haspopup', /.+/);
  const l = (await lang.boundingBox())!;
  const m = (await menu.boundingBox())!;
  expect(name.x + name.width).toBeLessThanOrEqual(l.x);
  expect(l.x + l.width).toBeLessThanOrEqual(m.x + 1);
  await expect(header.getByRole('button', { name: 'Work', exact: true })).toBeHidden();
  const small = await header.locator('a, button').evaluateAll((els) =>
    els
      .filter((el) => (el as HTMLElement).offsetParent !== null)
      .map((el) => ({ t: el.textContent, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width < 44 || r.height < 44)
      .map(({ t, r }) => `${t} ${Math.round(r.width)}×${Math.round(r.height)}`),
  );
  expect(small).toEqual([]);
});

test('the language picker drops the three languages and switches', async ({ page }) => {
  await gotoScene(page);
  const header = page.locator('header[data-ui]');
  await header.getByRole('button', { name: /^EN/ }).click();
  const links = header.locator('.lang-drop a');
  await expect(links).toHaveCount(3);
  await expect(links.first()).toBeVisible();
  await expect(header.locator('.lang-drop a[aria-current="true"]')).toHaveText('EN');
  await header.locator('.lang-drop').getByRole('link', { name: 'RU', exact: true }).click();
  await expect(page).toHaveURL(/\/ru/, { timeout: 15_000 });
});

test('the menu lights the sections and takes you there', async ({ page }) => {
  await gotoScene(page);
  await scrollTo(page, stop(0));
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  for (const n of ['Work', 'About', 'Stack', 'Contact']) await expect(dialog.getByRole('button', { name: n, exact: true })).toBeVisible();
  await expect(dialog.getByRole('link', { name: 'CV', exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Work', exact: true })).toHaveAttribute('aria-current', 'true');
  await dialog.getByRole('button', { name: 'About', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(() => progress(page), { timeout: 10_000 }).toBeCloseTo(HOLD.about[0], 2);
});

test('Esc closes the menu and the picker, and focus goes back to their buttons', async ({ page }) => {
  await gotoScene(page);
  const menuButton = page.getByRole('button', { name: 'Menu', exact: true });
  await menuButton.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(menuButton).toBeFocused();
  const lang = page.locator('header[data-ui]').getByRole('button', { name: /^EN/ });
  await lang.click();
  await expect(page.locator('.lang-drop a').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.lang-drop a')).toHaveCount(0);
  await expect(lang).toBeFocused();
});

// Review Focus 2
test('turning the phone with the menu open brings back the laptop header, nothing stuck open', async ({ page }) => {
  await gotoScene(page);
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.setViewportSize({ width: 915, height: 412 });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('header[data-ui]').getByRole('button', { name: 'Work', exact: true })).toBeVisible();
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

test('blades fit a phone: one line each and inside the screen', async ({ page }) => {
  for (const l of ['en', 'ru', 'uk']) {
    await gotoScene(page, `/${l}`);
    await scrollTo(page, 0.695);
    const { wrapped, overflow } = await page.evaluate(() => ({
      wrapped: [...document.querySelectorAll('#stack .blade [data-line]')]
        .filter((s) => s.getClientRects().length > 1)
        .map((s) => s.textContent),
      overflow: [...document.querySelectorAll('#stack .blade')]
        .filter((b) => b.getBoundingClientRect().right > innerWidth + 1)
        .map((b) => b.querySelector('h3')?.textContent),
    }));
    expect(wrapped, l).toEqual([]);
    expect(overflow, l).toEqual([]);
    expect(await page.locator('#stack .blade').count(), l).toBe(6);
  }
});

test('a phone shows the progress tube and a centred Next from the first screen, clear of the title block and the Work caption', async ({ page }) => {
  await gotoScene(page);
  const tube = page.locator('.progress-tube');
  await expect(tube).toBeVisible();
  const h0 = (await tube.boundingBox())!.height;
  const nextBtn = page.getByRole('button', { name: /^Next: / });
  const b = (await nextBtn.boundingBox())!;
  const vw = await page.evaluate(() => innerWidth);
  expect(Math.abs(b.x + b.width / 2 - vw / 2)).toBeLessThan(vw * 0.1);
  expect(b.width).toBeGreaterThanOrEqual(44);
  expect(b.height).toBeGreaterThanOrEqual(44);
  const hero = (await page.locator('header[data-hero]').boundingBox())!;
  expect(b.y + b.height <= hero.y || hero.y + hero.height <= b.y).toBe(true);
  await scrollTo(page, 0.18);
  await expect.poll(async () => (await tube.boundingBox())!.height).toBeGreaterThan(h0);
  await page.waitForTimeout(800);
  const nb = (await nextBtn.boundingBox())!;
  const caption = (await page.locator('section#work').boundingBox())!;
  expect(nb.y + nb.height <= caption.y || caption.y + caption.height <= nb.y).toBe(true);
});

test('the Work caption fits a phone without scrolling', async ({ page }) => {
  await gotoScene(page);
  for (let i = 0; i < 10; i++) {
    await scrollTo(page, stop(i));
    expect(await innerScrollers(page), `stop ${i}`).toEqual([]);
  }
});

test('the Work pager keeps its nine numbers on one row, down to a 390 px phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoScene(page);
  await scrollTo(page, stop(0));
  const ys = await page.locator('section#work nav button').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
  expect(ys).toHaveLength(9);
  expect(new Set(ys).size).toBe(1);
});

test('a phone (low tier) keeps the boxes unblurred', async ({ page }) => {
  await gotoScene(page);
  await expect.poll(() => page.evaluate(() => window.__portfolio.state().tier), { timeout: 30_000 }).toBe('low');
  expect(await page.locator('#about .nbox').first().evaluate((el) => getComputedStyle(el).backdropFilter)).toBe('none');
});

test('Esc over an open case closes only the menu', async ({ page }) => {
  await gotoScene(page, '/en/work/altus');
  const caseDialog = page.locator('[role="dialog"][data-crt]');
  // the case is fully on (it listens for Esc from then on)
  await expect(caseDialog).toHaveAttribute('data-crt', 'open', { timeout: 15_000 });
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  const menu = page.getByRole('dialog', { name: 'Menu' });
  await expect(menu).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await page.waitForTimeout(800);
  // the case did not even start to switch off
  await expect(caseDialog).not.toHaveAttribute('data-crt', 'closing');
  await expect(page).toHaveURL(/\/en\/work\/altus$/);
});

test('the open menu keeps the keyboard inside it', async ({ page }) => {
  await gotoScene(page);
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  const menu = page.getByRole('dialog', { name: 'Menu' });
  await expect(menu).toBeVisible();
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]')), `tab ${i}`).toBe(true);
  }
});

test('choices leave no dead history behind, and focus goes back to the menu button', async ({ page }) => {
  await gotoScene(page);
  const burger = page.getByRole('button', { name: 'Menu', exact: true });
  for (const n of ['About', 'Stack']) {
    await burger.click();
    await page.getByRole('dialog', { name: 'Menu' }).getByRole('button', { name: n, exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Menu' })).toHaveCount(0);
    await expect(burger).toBeFocused();
  }
  await page.goBack();
  await expect(page).not.toHaveURL(/localhost:3200\/en/);
});

test('the page under the open menu stays put', async ({ page }) => {
  await gotoScene(page);
  await scrollTo(page, 0.48);
  const before = await progress(page);
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible();
  for (let i = 0; i < 3; i++) await page.mouse.wheel(0, 600);
  await page.keyboard.press('PageDown');
  await page.waitForTimeout(800);
  expect(Math.abs((await progress(page)) - before)).toBeLessThan(0.002);
});

test('the language sign swings back up before it goes', async ({ page }) => {
  await gotoScene(page);
  const lang = page.locator('header[data-ui]').getByRole('button', { name: /^EN, / });
  await lang.click();
  await expect(page.locator('.lang-drop a').first()).toBeVisible();
  await lang.click();
  await expect(page.locator('.lang-drop')).toHaveAttribute('data-state', 'closing');
  await expect(page.locator('.lang-drop')).toHaveCount(0);
});

test('a case plays its live loop on a phone too (the wall keeps stills on the low tier)', async ({ page }) => {
  await gotoScene(page, '/en/work/altus');
  const video = page.getByRole('dialog').locator('video');
  await expect(video).toHaveCount(1, { timeout: 15_000 });
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime), { timeout: 10_000 }).toBeGreaterThan(0.5);
});
