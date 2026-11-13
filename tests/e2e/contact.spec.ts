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
});

// Review Focus 5
test('contacts and CV are there, also without WebGL', async ({ page }) => {
  await page.goto('/en?webgl=0#contact');
  const c = page.locator('section#contact');
  await expect(c.getByRole('link', { name: /Telegram/ })).toHaveAttribute('href', 'https://t.me/AslanovRustam');
  await expect(c.getByRole('link', { name: /CV/ })).toHaveAttribute('href', '/cv/rustam-aslanov-cv.pdf');
});
