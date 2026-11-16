import { expect, test } from '@playwright/test';

for (const [l, line, back] of [
  ['en', '404 — there is no such road', 'Back to the street'],
  ['ru', '404 — такой дороги нет', 'На улицу'],
  ['uk', '404 — такої дороги немає', 'На вулицю'],
] as const) {
  test(`/${l}/nope answers 404: CRITICAL ERROR and the way back, in its language`, async ({ page }) => {
    const res = await page.goto(`/${l}/nope/deeper`);
    expect(res?.status()).toBe(404);
    await expect(page.getByText('CRITICAL ERROR')).toBeVisible();
    await expect(page.getByText(line)).toBeVisible();
    await expect(page.getByRole('link', { name: back })).toHaveAttribute('href', `/${l}`);
    await expect(page.locator('html')).toHaveAttribute('lang', l);
    // no 3D here
    await expect(page.locator('canvas')).toHaveCount(0);
  });
}

test('an unknown case is the same 404', async ({ page }) => {
  const res = await page.goto('/en/work/nope');
  expect(res?.status()).toBe(404);
  await expect(page.getByText('CRITICAL ERROR')).toBeVisible();
});

test('the way back goes to the street', async ({ page }) => {
  await page.goto('/en/nope');
  await page.getByRole('link', { name: 'Back to the street' }).click();
  await expect(page).toHaveURL(/\/en$/);
  await page.waitForFunction(() => !!window.__portfolio, undefined, { timeout: 30_000 });
});

test('the warning glitches, but not under reduced motion', async ({ page }) => {
  await page.goto('/en/nope');
  const sign = page.locator('.critical-glitch');
  await expect(sign).toHaveCount(1);
  expect(await sign.evaluate((el) => getComputedStyle(el).animationName)).toBe('critical-glitch');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await sign.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
});

test('the 404 renders without errors (besides its own 404 status)', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('status of 404')) errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/ru/nope');
  await expect(page.getByText('CRITICAL ERROR')).toBeVisible();
  await page.waitForTimeout(2000);
  expect(errors).toEqual([]);
});
