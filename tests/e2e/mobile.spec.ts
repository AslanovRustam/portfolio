import { expect, test } from '@playwright/test';
import {
  billboard,
  eggInSight,
  gantry,
  gotoScene,
  HOLD,
  innerScrollers,
  insideTheScreen,
  poleFace,
  intoContact,
  progress,
  screenPicture,
  screenTube,
  scrollTo,
  stackStop,
  stop,
  switchLanguage,
  underSign,
  waitReady,
  within,
} from './helpers';

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
  // About lands where its first bill has come up the screen (M4 round 1), inside its stretch
  await expect.poll(() => progress(page), { timeout: 10_000 }).toBeGreaterThan(HOLD.about[0]);
  expect(await progress(page)).toBeLessThan(HOLD.about[1]);
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
  // the camera has dived into the billboard's screen: Contact's end rests inside its frame
  await insideTheScreen(page);
  const frame = (await screenTube(page).boundingBox())!;
  const last = (await page.locator('#journey section#contact [data-flow] > * > :last-child').boundingBox())!;
  expect(last.y + last.height).toBeLessThanOrEqual(frame.y + frame.height + 1);
});

test('Stack on a phone: the caption fits under its sign in every language, Next rises above it, the pole steps aside', async ({ page }) => {
  for (const l of ['en', 'ru', 'uk']) {
    await gotoScene(page, `/${l}`);
    await waitReady(page);
    for (const i of [0, 2, 5]) {
      await scrollTo(page, stackStop(i));
      await underSign(page, i);
      expect(await innerScrollers(page), `${l} ${i}`).toEqual([]);
      const vw = await page.evaluate(() => innerWidth);
      const vh = await page.evaluate(() => innerHeight);
      const caption = (await page.locator('section#stack').boundingBox())!;
      expect(caption.x).toBeGreaterThanOrEqual(0);
      expect(caption.x + caption.width).toBeLessThanOrEqual(vw + 1);
      // the sign above the caption, whole
      const [, b, , t] = (await gantry(page))!.signs[i].rect;
      expect(((1 - b) / 2) * vh, `${l} ${i}`).toBeLessThanOrEqual(caption.y);
      expect(((1 - t) / 2) * vh, `${l} ${i}`).toBeGreaterThan(0);
    }
  }
  const next = (await page.locator('.next-button').boundingBox())!;
  const caption = (await page.locator('section#stack').boundingBox())!;
  expect(next.y + next.height).toBeLessThanOrEqual(caption.y + 1);
  await expect.poll(async () => ((await page.evaluate(() => window.__portfolio.probe('pole'))) as { mode: string }).mode, { timeout: 10_000 }).toBe('parked');
});

test('a phone shows the progress tube and a centred Next from the first screen, clear of the title block and the Work caption', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page); // the tube and the Next button come once the street is there
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
  // About is paper bills and Contact the billboard's screen now; the captions' boxes are the glass ones
  expect(await page.locator('.nbox').first().evaluate((el) => getComputedStyle(el).backdropFilter)).toBe('none');
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

test('About on a phone: the bills take the width of the screen, the pole behind them', async ({ page }) => {
  await gotoScene(page);
  await page.locator('#about .paper-bill').first().scrollIntoViewIfNeeded();
  const vw = page.viewportSize()!.width;
  const widths = await page.locator('#about .paper-bill').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));
  expect(widths.length).toBe(5);
  for (const w of widths) expect(w).toBeGreaterThan(0.85 * vw);
});

test('on a phone the billboard carries the title and the form follows in the page', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, 1);
  await expect(page.locator('#journey section#contact form')).toHaveCount(1);
  await expect.poll(async () => (await billboard(page))?.title).toBe('Let’s go');
});

// M4 round 1, note 4: on a phone the camera dives into the billboard's screen
const contactByMenu = async (page: import('@playwright/test').Page) => {
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Contact', exact: true }).click();
};

test('at the billboard a phone shows a picture of the form on the switched-on screen; the form itself waits', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  const h = await page.evaluate(() => innerHeight);
  await scrollTo(page, await intoContact(page, 0.1 * h));
  await expect(screenPicture(page)).toBeVisible({ timeout: 20_000 });
  const panel = (await billboard(page))!.rect;
  expect(within((await screenPicture(page).boundingBox())!, panel, 2)).toBe(true);
  await expect(page.locator('section#contact form')).toBeHidden();
  expect(await page.locator('#journey section#contact').evaluate((e) => (e as HTMLElement).inert)).toBe(true);
  await expect(screenTube(page)).toBeHidden();
});

test('after the dive the form scrolls inside the screen’s neon frame, the frame still, nothing scrolling inside itself', async ({ page }) => {
  // a short phone: the form is taller than the frame, so there is something to scroll
  await page.setViewportSize({ width: 412, height: 600 });
  await gotoScene(page);
  await waitReady(page);
  await contactByMenu(page);
  await insideTheScreen(page);
  const { width: vw, height: vh } = page.viewportSize()!;
  const frame = (await screenTube(page).boundingBox())!;
  const header = (await page.locator('header[data-ui]').boundingBox())!;
  expect(frame.x).toBeGreaterThanOrEqual(4);
  expect(frame.x).toBeLessThanOrEqual(20);
  expect(vw - frame.x - frame.width).toBeGreaterThanOrEqual(4);
  expect(vw - frame.x - frame.width).toBeLessThanOrEqual(20);
  expect(vh - frame.y - frame.height).toBeGreaterThanOrEqual(4);
  expect(vh - frame.y - frame.height).toBeLessThanOrEqual(20);
  expect(frame.y).toBeGreaterThanOrEqual(header.y + header.height);
  const form = page.locator('section#contact form');
  await expect(form).toBeVisible();
  expect(within((await form.getByLabel('Name').boundingBox())!, frame)).toBe(true);
  // the page scrolls on to its end, the form rides up inside the frame by as much
  const y0 = (await form.boundingBox())!.y;
  const s0 = await page.evaluate(() => scrollY);
  await scrollTo(page, 1);
  const moved = (await page.evaluate(() => scrollY)) - s0;
  expect(moved).toBeGreaterThan(40);
  await expect.poll(async () => Math.abs(y0 - (await form.boundingBox())!.y - moved)).toBeLessThan(2);
  expect(await screenTube(page).boundingBox()).toEqual(frame);
  expect(await innerScrollers(page)).toEqual([]);
});

test('back at the billboard the frame goes out and the form is put away', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await contactByMenu(page);
  await insideTheScreen(page);
  await scrollTo(page, 0.861);
  await expect(screenTube(page)).toBeHidden({ timeout: 10_000 });
  await expect(page.locator('section#contact form')).toBeHidden();
  expect(await page.locator('#journey section#contact').evaluate((e) => (e as HTMLElement).inert)).toBe(true);
});

test('#contact and a language switch land at the start of the form inside the frame', async ({ page }) => {
  await gotoScene(page, '/en#contact');
  await waitReady(page);
  await insideTheScreen(page);
  const frame = (await screenTube(page).boundingBox())!;
  const en = (await page.locator('#journey section#contact').getByText(/^Tell me about a role/).boundingBox())!;
  expect(en.y).toBeGreaterThan(frame.y);
  expect(en.y).toBeLessThan(frame.y + 80);
  await switchLanguage(page, 'RU');
  await expect(page).toHaveURL(/\/ru/);
  await waitReady(page);
  await insideTheScreen(page);
  const ru = (await page.locator('#journey section#contact').getByText(/^Расскажите о вакансии/).boundingBox())!;
  expect(ru.y).toBeGreaterThan(frame.y);
  expect(ru.y).toBeLessThan(frame.y + 80);
});

// Review Focus 5: reduced motion, Contact from the header menu
test('under reduced motion the menu’s Contact lands inside the lit frame, with no glitch', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await gotoScene(page);
  await waitReady(page);
  await page.evaluate(() => {
    new MutationObserver(() => {
      if (document.querySelector('[data-glitch]')) (window as unknown as { glitched: boolean }).glitched = true;
    }).observe(document.body, { attributes: true, subtree: true, attributeFilter: ['data-glitch'] });
  });
  await contactByMenu(page);
  await insideTheScreen(page);
  const frame = (await screenTube(page).boundingBox())!;
  const lead = (await page.locator('#journey section#contact').getByText(/^Tell me about a role/).boundingBox())!;
  expect(lead.y).toBeGreaterThan(frame.y);
  expect(lead.y).toBeLessThan(frame.y + 80);
  expect(await page.evaluate(() => !!(window as unknown as { glitched?: boolean }).glitched)).toBe(false);
});

// M4 round 1, note 3: on a phone the pole fills the screen's width in About
test('in About a phone is right at the pole: it is wider than the screen', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, 0.48);
  const vw = page.viewportSize()!.width;
  await expect.poll(async () => (await poleFace(page))?.width ?? 0, { timeout: 15_000 }).toBeGreaterThanOrEqual(vw);
});

// Plan 4c, A: the form in the screen stays in reach on a phone
test('the form’s fields on a phone are 16 px and at least 48 px tall: iOS does not zoom the page in', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await page.evaluate(() => window.__portfolio.scrollToSection('contact'));
  await insideTheScreen(page);
  // the visitor's fields (not the honeypot, off-screen for bots)
  const fields = page.locator('#journey section#contact form').locator('.nfield:visible');
  expect(await fields.count()).toBeGreaterThan(0);
  for (const f of await fields.all()) {
    const [size, height] = await f.evaluate((el) => [getComputedStyle(el).fontSize, el.getBoundingClientRect().height]);
    expect(size).toBe('16px');
    expect(height).toBeGreaterThanOrEqual(48);
  }
});

test('a little scroll up inside the screen keeps the form there', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await page.evaluate(() => window.__portfolio.scrollToSection('contact'));
  await insideTheScreen(page);
  const p = await progress(page);
  const lengths = (await page.evaluate(() => window.__portfolio.probe('journey'))) as number[];
  await scrollTo(page, p - (60 / lengths[lengths.length - 1]) * 0.14);
  await page.waitForTimeout(800);
  await expect(page.locator('#journey section#contact')).toHaveAttribute('data-stage', 'inside');
  await expect(page.locator('#journey section#contact form')).toBeVisible();
});

// Review Focus 2: the keyboard up (a phone's covers ~45 % of the screen without resizing the page): the form's
// button can be scrolled up into the part of the screen the keyboard leaves
test('with the keyboard up the form’s button can be brought above its edge', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await page.evaluate(() => window.__portfolio.scrollToSection('contact'));
  await insideTheScreen(page);
  const vh = page.viewportSize()!.height;
  await scrollTo(page, 1);
  await page.waitForTimeout(800);
  await expect(page.locator('#journey section#contact')).toHaveAttribute('data-stage', 'inside');
  const button = page.locator('#journey section#contact form button[type="submit"]');
  const box = (await button.boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(0.55 * vh);
  expect(box.y).toBeGreaterThan(64);
});

// the form in the screen on a phone
const contactForm = (page: import('@playwright/test').Page) => page.locator('#journey section#contact[data-dive] form');

// M4 round 2: a phone gets the whole form, as a tablet does, not one field at a time
test('a phone fills the whole form at once: name, email and message, then Send', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await page.evaluate(() => window.__portfolio.scrollToSection('contact'));
  await insideTheScreen(page);
  const form = contactForm(page);
  for (const label of ['Name', 'Email', 'Message']) await expect(form.getByLabel(label)).toBeVisible();
  await expect(form.getByRole('button', { name: 'Send' })).toBeVisible();
  await expect(form.getByRole('button', { name: 'Next' })).toHaveCount(0);
  await expect(form.getByText('1 / 3')).toHaveCount(0);
});

// M4 round 2: as the frame lights, the text is near its top, not a third of the screen down
test('while the frame is lit, Contact’s text never sits far below its top', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await page.evaluate(() => window.__portfolio.scrollToSection('contact'));
  await insideTheScreen(page);
  const vh = page.viewportSize()!.height;
  const lengths = (await page.evaluate(() => window.__portfolio.probe('journey'))) as number[];
  const len = lengths[lengths.length - 1];
  const land = await progress(page);
  const section = page.locator('#journey section#contact');
  const lead = section.getByText(/^Tell me about a role/);
  let worst = 0;
  // scroll back from the landing until the camera leaves the screen
  for (let back = 0.03; back < 0.6; back += 0.03) {
    await scrollTo(page, land - ((back * vh) / len) * 0.14);
    if ((await section.getAttribute('data-stage')) !== 'inside') break;
    const frame = await screenTube(page).boundingBox();
    if (!frame) break;
    worst = Math.max(worst, (await lead.boundingBox())!.y - frame.y);
  }
  expect(worst).toBeGreaterThan(0);
  expect(worst).toBeLessThanOrEqual(0.15 * vh + 24);
});

// M4 round 2: at the page's end the content reaches down the frame, no half a screen of black under it (the
// room left is what the keyboard test above needs to bring Send above a phone's keyboard)
test('at the end of the page the screen’s content leaves under a third of the frame empty under it', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await page.evaluate(() => window.__portfolio.scrollToSection('contact'));
  await insideTheScreen(page);
  await scrollTo(page, 1);
  await page.waitForTimeout(800);
  await expect(page.locator('#journey section#contact')).toHaveAttribute('data-stage', 'inside');
  const vh = page.viewportSize()!.height;
  const frame = (await screenTube(page).boundingBox())!;
  const content = (await page.locator('#journey section#contact [data-ui]').first().boundingBox())!;
  expect(frame.y + frame.height - (content.y + content.height)).toBeLessThanOrEqual(0.3 * vh);
});

// inside the screen, Contact's content growing below the visitor (a status line, an error) must not move it
test('content growing under the visitor inside the screen leaves the screen where it is', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await page.evaluate(() => window.__portfolio.scrollToSection('contact'));
  await insideTheScreen(page);
  const lead = page.locator('#journey section#contact').getByText(/^Tell me about a role/);
  const y0 = (await lead.boundingBox())!.y;
  await page.evaluate(() => {
    const block = document.createElement('div');
    block.style.height = '300px';
    document.querySelector('#journey section#contact [data-flow]')!.append(block);
  });
  await page.waitForTimeout(1500);
  await expect(page.locator('#journey section#contact')).toHaveAttribute('data-stage', 'inside');
  expect(Math.abs((await lead.boundingBox())!.y - y0)).toBeLessThan(3);
});

// The secret (M6): the marble sticker shows uncovered as the camera reaches the pole, and a tap opens it
for (const size of [null, { width: 390, height: 844 }] as const)
  for (const lang of ['en', 'ru', 'uk'] as const)
    test(`a phone${size ? ` ${size.width}×${size.height}` : ''} sees the statue sticker uncovered and a tap opens it (${lang})`, async ({ page }) => {
      if (size) await page.setViewportSize(size);
      await gotoScene(page, `/${lang}`);
      await waitReady(page);
      const at = await eggInSight(page);
      expect(at, 'the sticker whole and uncovered at least once').not.toBeNull();
      await page.touchscreen.tap(at!.x, at!.y);
      await expect.poll(() => page.evaluate(() => window.__portfolio.state().eggOpen)).toBe(true);
    });
