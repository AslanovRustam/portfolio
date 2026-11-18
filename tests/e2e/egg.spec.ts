import { expect, test } from '@playwright/test';
import en from '../../messages/en.json';
import ru from '../../messages/ru.json';
import uk from '../../messages/uk.json';
import { egg, eggInSight, gotoScene, HOLD, scrollTo, switchLanguage, waitReady } from './helpers';

/** The secret (M6): a marble sticker on the pole, seen as the camera reaches it in About, opens the Mentor. */
test.use({ viewport: { width: 1440, height: 900 } });

for (const lang of ['en', 'ru', 'uk'] as const) {
  test(`the statue sticker shows uncovered as the camera reaches the pole (${lang})`, async ({ page }) => {
    await gotoScene(page, `/${lang}`);
    await waitReady(page);
    expect(await eggInSight(page)).not.toBeNull();
  });
}

test('hovering the statue sticker lights it and shows a pointer; clicking it opens the showcase', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  const at = (await eggInSight(page))!;
  await page.mouse.move(at.x, at.y);
  await expect.poll(() => page.evaluate(() => window.__portfolio.probe('stickerGlow'))).toBe('statue');
  await expect.poll(() => page.evaluate(() => document.body.style.cursor)).toBe('pointer');
  await page.mouse.click(at.x, at.y);
  await expect.poll(() => page.evaluate(() => window.__portfolio.state().eggOpen)).toBe(true);
});

test('a click on the sticker through HTML opens nothing', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  // as the camera goes down the pole the sticker rises under the header (and on a phone under the bills)
  let covered: { x: number; y: number } | null = null;
  for (let p = HOLD.about[0]; p < HOLD.about[0] + 0.06 && !covered; p += 0.003) {
    await scrollTo(page, p);
    await page.waitForTimeout(400);
    covered = await page.evaluate(() => {
      const e = window.__portfolio.probe('egg') as { rect: { x: number; y: number; width: number; height: number } } | null;
      if (!e) return null;
      const { x, y, width: w, height: h } = e.rect;
      for (let i = 1; i < 6; i++)
        for (let j = 1; j < 6; j++) {
          const px = x + (w * i) / 6;
          const py = y + (h * j) / 6;
          if (py < 0 || py > innerHeight) continue;
          if (document.elementFromPoint(px, py)?.closest('[data-ui]')) return { x: px, y: py };
        }
      return null;
    });
  }
  expect(covered, 'HTML over the sticker').not.toBeNull();
  await page.mouse.click(covered!.x, covered!.y);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__portfolio.state().eggOpen)).toBe(false);
  expect(await egg(page)).not.toBeNull();
});

// ——— The showcase (opened through the store where a test is not about the sticker) ———

const CAPTION = {
  en: { title: 'The Mentor', line: 'Has been reviewing pull requests since antiquity.' },
  ru: { title: 'Наставник', line: 'Ревьюит пулл-реквесты с античных времён.' },
  // the apostrophe uk.json uses everywhere (U+2019)
  uk: { title: 'Наставник', line: 'Рев’юїть пул-реквести з античних часів.' },
} as const;

const open = (page: import('@playwright/test').Page) => page.evaluate(() => window.__portfolio.state().setEggOpen(true));
const showcase = (page: import('@playwright/test').Page) => page.getByRole('dialog').filter({ visible: true });

test('the statue image is not requested until the showcase opens', async ({ page }) => {
  const asked: string[] = [];
  page.on('request', (r) => asked.push(r.url()));
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, HOLD.about[0]);
  await page.waitForTimeout(500);
  expect(asked.filter((u) => u.endsWith('/egg/mentor.webp'))).toHaveLength(0);
  await open(page);
  await expect.poll(() => asked.filter((u) => u.endsWith('/egg/mentor.webp')).length).toBe(1);
});

for (const lang of ['en', 'ru', 'uk'] as const)
  test(`the showcase shows the frame, the statue and the caption in the page’s language (${lang})`, async ({ page }) => {
    const messages = { en, ru, uk }[lang];
    await gotoScene(page, `/${lang}`);
    await waitReady(page);
    await open(page);
    const dialog = page.getByRole('dialog', { name: CAPTION[lang].title });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog.getByText(CAPTION[lang].line, { exact: true })).toBeVisible();
    await expect(dialog.getByRole('img')).toHaveAttribute('alt', messages.egg.alt);
    await expect(dialog.getByRole('img')).toBeVisible();
  });

test('Esc, the close button and a click outside each close it, and focus comes back', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  const opener = page.locator('header[data-ui]').getByRole('button', { name: 'About' });
  for (const how of ['Escape', 'button', 'outside'] as const) {
    await opener.focus();
    await open(page);
    await expect(showcase(page)).toBeVisible();
    await expect(showcase(page).getByRole('button', { name: 'Close' })).toBeFocused();
    if (how === 'Escape') await page.keyboard.press('Escape');
    if (how === 'button') await showcase(page).getByRole('button', { name: 'Close' }).click();
    if (how === 'outside') await page.mouse.click(8, 450);
    await expect(showcase(page)).toHaveCount(0);
    expect(await page.evaluate(() => window.__portfolio.state().eggOpen)).toBe(false);
    await expect(opener).toBeFocused();
  }
});

test('Tab stays inside the showcase', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await open(page);
  await expect(showcase(page)).toBeVisible();
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);
  }
});

test('the page does not scroll while it is open', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, HOLD.about[0] + 0.02);
  const p0 = await page.evaluate(() => window.__portfolio.state().progress);
  await open(page);
  await expect(showcase(page)).toBeVisible();
  await page.mouse.move(720, 450);
  await page.mouse.wheel(0, 800);
  await page.keyboard.press('PageDown');
  await page.keyboard.press('Space');
  await page.waitForTimeout(800);
  expect(Math.abs((await page.evaluate(() => window.__portfolio.state().progress)) - p0)).toBeLessThan(0.001);
  await page.keyboard.press('Escape');
  await expect(showcase(page)).toHaveCount(0);
  await page.mouse.wheel(0, 800);
  await expect.poll(() => page.evaluate(() => window.__portfolio.state().progress)).toBeGreaterThan(p0 + 0.002);
});

test('it switches on with a glitch, and without one under reduced motion', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await open(page);
  await expect(page.locator('[data-egg-frame]').filter({ visible: true })).toHaveAttribute('data-glitch', 'on');
  await page.keyboard.press('Escape');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  const frame = page.locator('[data-egg-frame]').filter({ visible: true });
  await expect(frame).toBeVisible();
  expect(await frame.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
});

test('after a language switch the sticker opens one visible showcase', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await switchLanguage(page, 'RU');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await open(page);
  await expect(showcase(page)).toHaveCount(1);
  await expect(page.getByRole('dialog', { name: CAPTION.ru.title })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(showcase(page)).toHaveCount(0);
  expect(await page.evaluate(() => (document.activeElement as HTMLElement | null)?.checkVisibility?.() ?? true)).toBe(true);
});

test('a failed image still leaves the caption and the close button', async ({ page }) => {
  await page.route('**/egg/mentor.webp', (r) => r.abort());
  await gotoScene(page);
  await waitReady(page);
  await open(page);
  const dialog = showcase(page);
  await expect(dialog.getByText(CAPTION.en.title)).toBeVisible();
  await expect(dialog.getByText(CAPTION.en.line)).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeVisible();
  await expect(dialog.getByRole('img')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(showcase(page)).toHaveCount(0);
});

test('without WebGL there is no showcase', async ({ page }) => {
  await gotoScene(page, '/en?webgl=0');
  await open(page);
  await page.waitForTimeout(500);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
