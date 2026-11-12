import { expect, test } from '@playwright/test';

test('/ redirects to /en', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/en$/);
});

for (const [loc, role] of [
  ['ru', 'Front-end разработчик'],
  ['uk', 'Front-end розробник'],
] as const) {
  test(`/${loc} renders its language`, async ({ page }) => {
    await page.goto(`/${loc}`);
    await expect(page.locator('html')).toHaveAttribute('lang', loc);
    await expect(page.getByText(role)).toBeVisible();
  });
}
