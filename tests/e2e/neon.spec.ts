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

test('the boxes blur the street behind them on a laptop', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, 0.44);
  expect(await page.locator('#about .nbox').first().evaluate((el) => getComputedStyle(el).backdropFilter)).toContain('blur');
});

test('keyboard focus shows on a tube even when it is the open section', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, 0.48);
  const about = page.getByRole('button', { name: 'About', exact: true });
  await expect(about).toHaveAttribute('aria-current', 'true');
  const unfocused = await about.evaluate((el) => getComputedStyle(el).outlineStyle);
  for (let i = 0; i < 8 && !(await about.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press('Tab');
  await expect(about).toBeFocused();
  const focused = await about.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(unfocused).toBe('none');
  expect(focused).not.toBe('none');
});

test('focus never hides under the header: the page keeps room for it when it scrolls to a focused element', async ({ page }) => {
  await gotoScene(page);
  const pad = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop));
  expect(pad).toBeGreaterThanOrEqual(120);
});

test('the name flickers by words and letters', async ({ page }) => {
  await gotoScene(page);
  const name = page.locator('header[data-ui]').getByRole('link', { name: 'Rustam Aslanov', exact: true });
  await expect(name).toBeVisible();
  const words = name.locator('.neon-word');
  await expect(words).toHaveCount(2);
  const delays = await words.evaluateAll((els) =>
    els.map((el) => ({ running: el.getAnimations().filter((a) => a instanceof CSSAnimation).length, delay: getComputedStyle(el).animationDelay })),
  );
  expect(delays.every((d) => d.running > 0)).toBe(true);
  expect(delays[0].delay).not.toBe(delays[1].delay);
  await expect(name.locator('.neon-letter')).toHaveCount(3);
  await name.hover();
  await expect.poll(() => flickers(name)).toBe(0);
});

test('on a laptop the sections stay tubes in a row; the languages hide in one tube, as on a phone', async ({ page }) => {
  await gotoScene(page);
  const header = page.locator('header[data-ui]');
  for (const n of ['Work', 'About', 'Stack', 'Contact']) await expect(header.getByRole('button', { name: n, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeHidden();
  const lang = header.getByRole('button', { name: /^EN, / });
  await expect(lang).toBeVisible();
  await expect(header.getByRole('link', { name: 'RU', exact: true })).toHaveCount(0);
  await lang.click();
  for (const l of ['EN', 'RU', 'UK']) await expect(header.locator('.lang-drop').getByRole('link', { name: l, exact: true })).toBeVisible();
  // it swings back up before it goes
  await page.keyboard.press('Escape');
  await expect(header.locator('.lang-drop')).toHaveAttribute('data-state', 'closing');
  await expect(header.locator('.lang-drop')).toHaveCount(0);
  await expect(lang).toBeFocused();
});
