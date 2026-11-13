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
