import { expect, test } from '@playwright/test';
import type { Locator } from '@playwright/test';
import { gotoScene, scrollTo, waitReady } from './helpers';

/** Running CSS animations (the flicker) in and under an element; transitions don't count. */
const flickers = (l: Locator, subtree = true) =>
  l.evaluate((el, sub) => el.getAnimations({ subtree: sub }).filter((a) => a instanceof CSSAnimation).length, subtree);

test('the active section is underlined and steady, the others flicker', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, 0.48);
  const about = page.getByRole('button', { name: 'About', exact: true });
  await expect(about).toHaveAttribute('aria-current', 'true');
  await expect.poll(() => about.evaluate((el) => getComputedStyle(el, '::after').opacity)).toBe('1');
  expect(await flickers(about)).toBe(0);
  const stack = page.getByRole('button', { name: 'Stack', exact: true });
  expect(await flickers(stack, false)).toBeGreaterThan(0);
  expect(await stack.evaluate((el) => getComputedStyle(el, '::after').opacity)).toBe('0');
});

test('hover steadies a tube', async ({ page }) => {
  await gotoScene(page);
  const stack = page.getByRole('button', { name: 'Stack', exact: true });
  expect(await flickers(stack)).toBeGreaterThan(0);
  await stack.hover();
  await expect.poll(() => flickers(stack)).toBe(0);
});

test('reduced motion: nothing in the header flickers', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await gotoScene(page);
  expect(await flickers(page.locator('header[data-ui]'))).toBe(0);
});

test('tubes are set in Oswald, with Cyrillic on /ru', async ({ page }) => {
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
