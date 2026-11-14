import { expect, test } from '@playwright/test';
import { gotoScene, scrollTo, waitReady } from './helpers';

test('each panel is a board whose head band wears its sign colour', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  for (const [p, id, bg] of [
    [0.48, 'about', 'rgb(17, 17, 17)'],
    [0.695, 'stack', 'rgb(216, 38, 43)'],
    [0.9, 'contact', 'rgb(216, 38, 43)'],
  ] as const) {
    await scrollTo(page, p);
    await expect(page.locator(`section#${id} [data-board-head]`)).toHaveCSS('background-color', bg);
  }
  await expect(page.getByRole('button', { name: 'Send' })).toHaveCSS('background-color', 'rgb(28, 122, 60)');
  await page.goto('/en/work/altus');
  await expect(page.getByRole('dialog').locator('[data-board-head]')).toHaveCSS('background-color', 'rgb(255, 122, 26)', {
    timeout: 15_000,
  });
});
