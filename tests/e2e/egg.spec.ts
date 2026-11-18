import { expect, test } from '@playwright/test';
import { egg, eggInSight, gotoScene, HOLD, scrollTo, waitReady } from './helpers';

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
