import { expect, test, type Page } from '@playwright/test';
import en from '../../messages/en.json';
import ru from '../../messages/ru.json';
import { STACK } from '../../src/content/stack';
import { gantry, gotoScene, progress, scrollTo, stackStop, underSign, waitReady } from './helpers';

const caption = (page: Page) => page.locator('section#stack');

test('each sign over the road has its caption: the category and its tools, as text', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  for (let i = 0; i < STACK.length; i++) {
    await scrollTo(page, stackStop(i));
    const group = STACK[i];
    await expect(caption(page)).toBeVisible();
    await expect(caption(page).getByRole('heading', { level: 3 })).toHaveText(en.stack.groups[group.key]);
    for (const item of group.items) await expect(caption(page).getByText(item.label, { exact: true })).toBeVisible();
    // the camera stands square under its sign
    await expect.poll(async () => (await gantry(page))?.stop).toBe(i);
    await underSign(page, i);
    const y = (await gantry(page))!.signs[i].ndc[1];
    expect(y).toBeGreaterThan(-0.25);
    expect(y).toBeLessThan(0.6);
  }
  await expect(page.locator('.blade')).toHaveCount(0);
});

for (const [w, h] of [
  [1440, 900],
  [1280, 720],
]) {
  test(`the caption never covers the sign it captions (${w}×${h})`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await gotoScene(page);
    await waitReady(page);
    for (const i of [0, 2, 5]) {
      await scrollTo(page, stackStop(i));
      await underSign(page, i);
      const [l, b, r, t] = (await gantry(page))!.signs[i].rect;
      // the sign in CSS px
      const sign = { x0: ((l + 1) / 2) * w, x1: ((r + 1) / 2) * w, y0: ((1 - t) / 2) * h, y1: ((1 - b) / 2) * h };
      const box = (await caption(page).boundingBox())!;
      const apart = box.x >= sign.x1 || box.x + box.width <= sign.x0 || box.y >= sign.y1 || box.y + box.height <= sign.y0;
      expect(apart, `sign ${i}: ${JSON.stringify(sign)} caption ${JSON.stringify(box)}`).toBe(true);
      // and the sign is whole in the frame, below the header
      expect(sign.y0).toBeGreaterThan(70);
    }
  });
}

test('a tool in the caption lights its sticker on the pole, by pointer and by keyboard', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, stackStop(0));
  await caption(page).getByText('React', { exact: true }).hover();
  await expect.poll(() => page.evaluate(() => window.__portfolio.state().highlight)).toBe('react');
  await scrollTo(page, stackStop(1));
  await caption(page).locator('[data-sticker="mobx"]').focus();
  await expect.poll(() => page.evaluate(() => window.__portfolio.state().highlight)).toBe('mobx');
});

test('the numbered tubes take the camera to any sign', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, stackStop(0));
  const pager = caption(page).getByRole('navigation');
  await pager.getByRole('button', { name: en.stack.groups.tools }).click();
  await expect.poll(() => progress(page), { timeout: 8000 }).toBeCloseTo(stackStop(4), 3);
  await expect(caption(page).getByRole('heading', { level: 3 })).toHaveText(en.stack.groups.tools);
  await expect(pager.getByRole('button', { name: en.stack.groups.tools })).toHaveAttribute('aria-current', 'true');
});

test('a scroll that stops between two signs settles on the nearest one', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, stackStop(2) + (stackStop(1) - stackStop(0)) * 0.3);
  await page.mouse.move(720, 300);
  await page.mouse.wheel(0, 1); // a real (non-programmatic) scroll event, then rest
  await expect.poll(() => progress(page), { timeout: 4000 }).toBeCloseTo(stackStop(2), 3);
});

test('/ru captions the signs in Russian', async ({ page }) => {
  await gotoScene(page, '/ru');
  await waitReady(page);
  await scrollTo(page, stackStop(2));
  await expect(caption(page).getByRole('heading', { level: 3 })).toHaveText(ru.stack.groups.motion);
});

// Review Focus 3
test('a deep link to Stack lands on its first sign', async ({ page }) => {
  await page.goto('/en#stack');
  await page.waitForFunction(() => !!window.__portfolio, undefined, { timeout: 30_000 });
  await expect.poll(() => progress(page), { timeout: 15_000 }).toBeCloseTo(stackStop(0), 2);
  await expect(caption(page).getByRole('heading', { level: 3 })).toHaveText(en.stack.groups.frontend);
});
