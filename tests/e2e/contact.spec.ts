import { expect, test, type Page } from '@playwright/test';
import { billboard, gotoScene, progress, scrollTo, waitReady } from './helpers';

type Box = { x: number; y: number; width: number; height: number };
const inside = (a: Box, b: Box, slack = 1) =>
  a.x >= b.x - slack && a.y >= b.y - slack && a.x + a.width <= b.x + b.width + slack && a.y + a.height <= b.y + b.height + slack;

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
  await scrollTo(page, 0.9);
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
  await scrollTo(page, 0.9);
  // the end state of the focus ring, not its 0.2 s fade
  await page.addStyleTag({ content: '*, *::after { transition: none !important; }' });
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
