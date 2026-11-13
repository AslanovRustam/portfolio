import { expect, test } from '@playwright/test';
import { gotoScene, scrollTo, waitReady } from './helpers';

test('nav plates are navy, the active one wears its sign colour', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, 0.48);
  const about = page.getByRole('button', { name: 'About', exact: true });
  await expect(about).toHaveCSS('background-color', 'rgb(17, 17, 17)');
  await expect(page.getByRole('button', { name: 'Stack', exact: true })).toHaveCSS('background-color', 'rgb(23, 52, 95)');
  await scrollTo(page, 0.18);
  await expect(page.getByRole('button', { name: 'Work', exact: true })).toHaveCSS('background-color', 'rgb(255, 122, 26)');
});

test('plates are set in Oswald, with Cyrillic on /ru', async ({ page }) => {
  await gotoScene(page, '/ru');
  await expect(page.getByRole('button', { name: 'Обо мне', exact: true })).toHaveCSS('font-family', /Oswald/);
  const cyrillic = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].some(
      // browsers write the Cyrillic block as U+400-45F, without the leading zero
      (f) => /Oswald/.test(f.family) && f.status === 'loaded' && /U\+0?400/i.test(f.unicodeRange),
    );
  });
  expect(cyrillic).toBe(true);
});

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
