import { expect, test } from '@playwright/test';
import { gotoScene, scrollTo } from './helpers';

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
