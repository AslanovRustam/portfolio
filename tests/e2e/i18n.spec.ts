import { expect, test } from '@playwright/test';
import { gotoScene, waitReady } from './helpers';

test('/ redirects to /en', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/en$/);
});

for (const [loc, role] of [
  ['ru', 'Front-end разработчик'],
  ['uk', 'Front-end розробник'],
] as const) {
  test(`/${loc} renders its language`, async ({ page }) => {
    await gotoScene(page, `/${loc}`);
    await expect(page.locator('html')).toHaveAttribute('lang', loc);
    await waitReady(page); // the hero comes once the street is there
    await expect(page.getByText(role)).toBeVisible();
  });
}

// Final review #4: the proxy runs on every page path, not only on /
test('an unprefixed path is redirected into the default locale', async ({ page }) => {
  await page.goto('/some-page');
  await expect(page).toHaveURL(/\/en\/some-page$/);
});
