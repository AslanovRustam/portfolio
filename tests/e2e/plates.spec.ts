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
