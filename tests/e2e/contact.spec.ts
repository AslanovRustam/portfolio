import { expect, test, type Page } from '@playwright/test';
import { billboard, gotoScene, progress, scrollTo, waitReady } from './helpers';

type Box = { x: number; y: number; width: number; height: number };
const inside = (a: Box, b: Box, slack = 1) =>
  a.x >= b.x - slack && a.y >= b.y - slack && a.x + a.width <= b.x + b.width + slack && a.y + a.height <= b.y + b.height + slack;

/**
 * Scrolls into Contact and waits for its form: on a laptop the billboard's screen switches on only once
 * the camera has come to rest in front of it (M4 round 1).
 */
async function toTheForm(page: Page, p: number) {
  await scrollTo(page, p);
  await expect(page.locator('section#contact form')).toBeVisible({ timeout: 20_000 });
}

/** Until the camera has come to rest at the end (the panel stops moving on the screen). */
async function atRest(page: Page) {
  await expect
    .poll(
      async () => {
        const a = (await billboard(page))!.rect;
        await page.waitForTimeout(300);
        const b = (await billboard(page))!.rect;
        return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.width - b.width)) < 0.5;
      },
      { timeout: 20_000 },
    )
    .toBe(true);
}


test('the form validates, then sends (json transport in tests)', async ({ page }) => {
  await gotoScene(page);
  await scrollTo(page, 0.9);
  const form = page.locator('section#contact form');
  await form.getByRole('button', { name: 'Send' }).click();
  await expect(form.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true');
  await page.waitForTimeout(3200); // the human-speed guard
  await form.getByLabel('Name').fill('Ann');
  await form.getByLabel('Email').fill('ann@example.com');
  await form.getByLabel('Message').fill('Hello, I have a front-end role for you.');
  await form.getByRole('button', { name: 'Send' }).click();
  await expect(page.locator('section#contact')).toContainText(/sent|thanks/i);
  await expect.poll(() => page.evaluate(() => window.__portfolio.state().celebrate)).toBe(true);
  await expect(form.getByLabel('Name')).toHaveValue('');
  // the emptied form's sign goes dark again
  await expect(form.getByRole('button', { name: 'Send' })).toHaveAttribute('data-ready', 'false');
  // and the street goes up to the green light
  await expect.poll(() => progress(page), { timeout: 8000 }).toBeGreaterThan(0.995);
});

// Review Focus 4 (final review): a failed request must not crash the site or lose the message
test('a failed request keeps the message and offers email and Telegram', async ({ page }) => {
  await gotoScene(page);
  await scrollTo(page, 0.9);
  await page.route('**/en', (route) =>
    route.request().method() === 'POST' ? route.fulfill({ status: 500, body: 'down' }) : route.continue(),
  );
  const form = page.locator('section#contact form');
  await page.waitForTimeout(3200);
  await form.getByLabel('Name').fill('Ann');
  await form.getByLabel('Email').fill('ann@example.com');
  await form.getByLabel('Message').fill('Hello, I have a front-end role for you.');
  await form.getByRole('button', { name: 'Send' }).click();
  await expect(form.getByRole('alert')).toContainText('aslanovrg@gmail.com');
  await expect(form.getByLabel('Message')).toHaveValue('Hello, I have a front-end role for you.');
  await expect(page.locator('canvas')).toHaveCount(1);
});

test('the honeypot is not a field that autofill would fill', async ({ page }) => {
  await page.goto('/en?webgl=0#contact');
  const form = page.locator('section#contact form');
  await expect(form.locator('input[name="company"]')).toHaveCount(0);
  await expect(form.locator('input[tabindex="-1"]')).toHaveAttribute('data-1p-ignore', '');
});

// Review Focus 5
test('contacts and CV are there, also without WebGL', async ({ page }) => {
  await page.goto('/en?webgl=0#contact');
  const c = page.locator('section#contact');
  await expect(c.getByRole('link', { name: /Telegram/ })).toHaveAttribute('href', 'https://t.me/AslanovRustam');
  await expect(c.getByRole('link', { name: /CV/ })).toHaveAttribute('href', '/cv/rustam-aslanov-cv.pdf');
});

test('the Send sign stays dark until the form is valid, and a press on it shows what is missing', async ({ page }) => {
  await gotoScene(page);
  await toTheForm(page, 0.9);
  const form = page.locator('section#contact form');
  const send = form.getByRole('button', { name: 'Send' });
  await expect(send).toHaveAttribute('data-ready', 'false');
  await expect(send).not.toHaveAttribute('disabled', /.*/);
  const hint = page.getByText('Fill in all three fields and the sign lights up.');
  await expect(hint).toBeVisible();
  await send.click();
  await expect(form.getByLabel('Name')).toHaveAttribute('aria-invalid', 'true');
  await form.getByLabel('Name').fill('Ann');
  await form.getByLabel('Email').fill('ann@example.com');
  await expect(send).toHaveAttribute('data-ready', 'false');
  await form.getByLabel('Message').fill('Hello, I have a front-end role for you.');
  await expect(send).toHaveAttribute('data-ready', 'true');
  await expect(hint).toBeHidden();
});

// Review Focus 4
test('keyboard focus reaches the contact links', async ({ page }) => {
  await gotoScene(page);
  // the end state of the focus ring, not its 0.2 s fade
  await page.addStyleTag({ content: '*, *::after { transition: none !important; }' });
  await toTheForm(page, 0.9);
  await page.locator('section#contact form').getByLabel('Message').focus();
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    if ((await page.evaluate(() => document.activeElement?.textContent ?? '')).includes('Telegram')) break;
  }
  const telegram = page.locator('section#contact').getByRole('link', { name: /Telegram/ });
  await expect(telegram).toBeFocused();
  await expect(telegram).toBeInViewport();
  // a neon tube shows focus with its lit underline
  await expect(telegram).toHaveClass(/(^| )neon( |$)/);
  await expect.poll(() => telegram.evaluate((el) => getComputedStyle(el, '::after').opacity)).toBe('1');
});

test('the message field keeps its size', async ({ page }) => {
  await page.goto('/en?webgl=0#contact');
  const message = page.locator('section#contact form').getByLabel('Message');
  await expect(message).toHaveCSS('resize', 'none');
});

test('a contact link or the CV takes the street up to the green light', async ({ page }) => {
  await gotoScene(page);
  await scrollTo(page, 0.9);
  // clicked where it is (a real click would first scroll it into view, near the end of the page)
  await page.locator('section#contact').getByRole('button', { name: 'Copy email' }).evaluate((el) => (el as HTMLElement).click());
  await expect.poll(() => progress(page), { timeout: 8000 }).toBeGreaterThan(0.995);
  await scrollTo(page, 0.9);
  const popup = page.waitForEvent('popup');
  await page.locator('section#contact').getByRole('link', { name: /Telegram/ }).evaluate((el) => (el as HTMLElement).click());
  await (await popup).close();
  await expect.poll(() => progress(page), { timeout: 8000 }).toBeGreaterThan(0.995);
});

// ── the billboard at the end of the street (Plan 4, Task 6) ───────────────────────────────────

test('at the end on a laptop the form is fitted into the billboard, the green light beside it', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, 1);
  await atRest(page);
  const panel = (await billboard(page))!.rect;
  const c = page.locator('section#contact');
  for (const part of [c.locator('form'), c.getByText(/^Tell me about a role/), c.getByRole('link', { name: /Telegram/ })]) {
    await expect(part).toBeVisible();
    const box = (await part.boundingBox())!;
    expect(inside(box, panel), `${JSON.stringify(box)} in ${JSON.stringify(panel)}`).toBe(true);
  }
  // the form is the billboard's, not a box riding the page
  await expect(page.locator('#journey section#contact')).toHaveCount(0);
  const pole = (await page.evaluate(() => window.__portfolio.probe('pole'))) as { lightNdc: [number, number]; light: string };
  expect(pole.light).toBe('green');
  expect(Math.abs(pole.lightNdc[0])).toBeLessThan(1);
  expect(Math.abs(pole.lightNdc[1])).toBeLessThan(1);
});

// M4 round 1, note 1: the billboard hung in the air
test('at the end on a laptop the billboard’s catwalk is in the frame, under the panel', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, 1);
  await atRest(page);
  const { rect, support } = (await billboard(page))!;
  const [x, y] = support.catwalk;
  expect(x).toBeGreaterThan(0);
  expect(x).toBeLessThan(1440);
  expect(y).toBeGreaterThan(rect.y + rect.height);
  expect(y).toBeLessThan(800);
});

// M4 round 1, note 2: the billboard is a screen, empty while the camera drives in
test('the billboard’s screen stays empty while the camera drives in and switches on once it stops', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  const screen = page.locator('section[data-billboard]');
  await scrollTo(page, 0.855);
  await page.waitForTimeout(400);
  await expect(screen).toBeHidden();
  expect(await screen.evaluate((e) => (e as HTMLElement).inert)).toBe(true);
  await scrollTo(page, 1);
  await expect(screen).toHaveAttribute('data-screen', 'on');
  await expect(screen).toBeVisible({ timeout: 1500 });
  expect(await screen.evaluate((e) => (e as HTMLElement).inert)).toBe(false);
  await scrollTo(page, 0.855);
  await expect(screen).toHaveAttribute('data-screen', 'off');
  await expect(screen).toBeHidden({ timeout: 1500 });
});

// a fast scroll runs ahead of the camera: the screen waits for the panel to stop, not for the scroll
test('a fast scroll to the end switches the screen on only once the panel has stopped moving', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, 0.8);
  await page.waitForTimeout(2500);
  await page.mouse.move(700, 400);
  const atSwitch = page.evaluate(
    () =>
      new Promise<{ width: number }>((resolve) => {
        const el = document.querySelector<HTMLElement>('section[data-billboard]')!;
        new MutationObserver(() => {
          if (el.dataset.screen === 'on') resolve((window.__portfolio.probe('billboard') as { rect: { width: number } }).rect);
        }).observe(el, { attributes: true });
      }),
  );
  for (let i = 0; i < 30; i++) {
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(40);
  }
  const at = await atSwitch;
  await atRest(page);
  const end = (await billboard(page))!.rect;
  expect(Math.abs(at.width - end.width) / end.width).toBeLessThan(0.02);
});

// Review Focus 2: a fling across the arrival and straight back
test('a fling to the end and straight back leaves the screen off, no glitch left running', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, 0.7);
  await page.evaluate(async () => {
    window.__portfolio.scrollToProgress(1, true);
    await new Promise((r) => setTimeout(r, 120));
    window.__portfolio.scrollToProgress(0.8, true);
  });
  const screen = page.locator('section[data-billboard]');
  await expect(screen).toHaveAttribute('data-screen', 'off');
  await expect(screen).not.toHaveAttribute('data-glitch', /.*/, { timeout: 1500 });
  await expect(screen).toBeHidden();
});

test('under reduced motion the screen is on as Contact begins, with no glitch', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await gotoScene(page);
  await waitReady(page);
  const screen = page.locator('section[data-billboard]');
  await screen.evaluate((e) => {
    new MutationObserver(() => {
      if (e.hasAttribute('data-glitch')) (window as unknown as { glitched: boolean }).glitched = true;
    }).observe(e, { attributes: true });
  });
  await scrollTo(page, 0.82);
  await expect(screen).toBeVisible({ timeout: 1500 });
  await scrollTo(page, 1);
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => !!(window as unknown as { glitched?: boolean }).glitched)).toBe(false);
});

test('the billboard says it in the page’s language', async ({ page }) => {
  await gotoScene(page, '/ru');
  await waitReady(page);
  await expect.poll(async () => (await billboard(page))?.title).toBe('Поехали');
});

// Review Focus 5
test('a resize at the end fits the form again, or puts it back in the page, with what was typed', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, 1);
  await atRest(page);
  await page.locator('section#contact form').getByLabel('Message').fill('Hello from a big screen');
  await page.setViewportSize({ width: 1280, height: 720 });
  await atRest(page);
  const panel = (await billboard(page))!.rect;
  const form = (await page.locator('section#contact form').boundingBox())!;
  expect(inside(form, panel), `${JSON.stringify(form)} in ${JSON.stringify(panel)}`).toBe(true);
  expect(await progress(page)).toBeGreaterThan(0.99);
  // too small a window for the panel: the form is back in the page, still at the end, still holding the text
  await page.setViewportSize({ width: 900, height: 700 });
  const inPage = page.locator('#journey section#contact form');
  await expect(inPage).toHaveCount(1);
  await expect(inPage.getByLabel('Message')).toHaveValue('Hello from a big screen');
  await expect.poll(() => progress(page), { timeout: 8000 }).toBeGreaterThan(0.99);
});

// final review: a form that moved (billboard ↔ page) restarted its fill timer, and a message sent within
// three seconds of the move was taken for a bot's and silently dropped
test('a message sent right after the form moved counts the time since the form first opened', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, 1);
  await atRest(page);
  const billboardForm = page.locator('section#contact form');
  await billboardForm.getByLabel('Name').fill('Ann');
  await billboardForm.getByLabel('Email').fill('ann@example.com');
  await billboardForm.getByLabel('Message').fill('Hello, I have a front-end role for you.');
  await page.waitForTimeout(3200);
  await page.setViewportSize({ width: 900, height: 700 });
  const inPage = page.locator('#journey section#contact form');
  await expect(inPage.getByLabel('Message')).toHaveValue('Hello, I have a front-end role for you.');
  const posted = page.waitForRequest((r) => r.method() === 'POST');
  await inPage.getByRole('button', { name: 'Send' }).click();
  const body = (await posted).postData() ?? '';
  const elapsed = Number(/name="[^"]*elapsed"\r\n\r\n(\d+)/.exec(body)?.[1]);
  expect(elapsed).toBeGreaterThanOrEqual(3000);
  await expect(page.locator('section#contact')).toContainText(/sent|thanks/i);
});
