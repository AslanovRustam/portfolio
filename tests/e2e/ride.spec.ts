import { expect, test, type Page } from '@playwright/test';
import { gotoScene, progress, scrollTo, stackStop, stop, waitReady } from './helpers';

interface PoleProbe {
  /** the pole's middle on screen, NDC */
  ndc: [number, number];
  /** the traffic light on screen, NDC */
  lightNdc: [number, number];
  mode: 'start' | 'ride' | 'parked' | 'centre';
  light: 'off' | 'red' | 'yellow' | 'green';
}
const pole = (page: Page) => page.evaluate(() => window.__portfolio.probe('pole') as PoleProbe | undefined);
const camera = (page: Page) => page.evaluate(() => (window.__portfolio.probe('camera') as { position: number[] }).position);

/** Until the riding pole has come to rest beside the camera (it eases in; a busy GPU slows the easing). */
async function poleSettled(page: Page) {
  await expect
    .poll(
      async () => {
        const a = (await pole(page))!.ndc;
        await page.waitForTimeout(300);
        const b = (await pole(page))!.ndc;
        return Math.hypot(a[0] - b[0], a[1] - b[1]);
      },
      { timeout: 15_000 },
    )
    .toBeLessThan(0.002);
}

test('after the intro the pole rides on the right', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, 0.7);
  await expect.poll(async () => (await pole(page))?.mode, { timeout: 10_000 }).toBe('ride');
  await expect.poll(async () => (await pole(page))!.ndc[0], { timeout: 10_000 }).toBeGreaterThan(0.3);
  expect((await pole(page))!.ndc[0]).toBeLessThan(1);
});

test('its signs still lead to their sections', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, 0.72);
  await poleSettled(page);
  // aim at where its STACK sign is, until the pointer is on it
  await expect
    .poll(
      async () => {
        const { x, y } = (await page.evaluate(() => window.__portfolio.probe('signScreen:stack'))) as { x: number; y: number };
        await page.mouse.move(x, y);
        await page.waitForTimeout(200);
        return page.evaluate(() => window.__portfolio.state().hoveredSign);
      },
      { timeout: 15_000 },
    )
    .toBe('stack');
  // click where the sign is now (the pole may still be settling)
  const { x, y } = (await page.evaluate(() => window.__portfolio.probe('signScreen:stack'))) as { x: number; y: number };
  await page.mouse.click(x, y);
  // Stack opens on its first sign
  await expect.poll(() => progress(page), { timeout: 6000 }).toBeCloseTo(stackStop(0), 2);
});

test('in Work the pole steps aside', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, stop(4));
  await expect.poll(async () => (await pole(page))?.mode, { timeout: 10_000 }).toBe('parked');
  await expect.poll(async () => (await pole(page))!.ndc[0], { timeout: 10_000 }).toBeGreaterThan(1);
});

test('the light is green in the final frame', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, 1);
  await expect.poll(async () => (await pole(page))?.light, { timeout: 10_000 }).toBe('green');
  await expect
    .poll(async () => {
      const [x, y] = (await pole(page))!.lightNdc;
      return Math.abs(x) < 1 && Math.abs(y) < 1;
    }, { timeout: 10_000 })
    .toBe(true);
});

// Review Focus 4
test('reduced motion: the pole stands still on the right', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, 0.7);
  const a = (await pole(page))!.ndc;
  await page.waitForTimeout(500);
  const b = (await pole(page))!.ndc;
  expect(b[0]).toBeCloseTo(a[0], 4);
  expect(b[1]).toBeCloseTo(a[1], 4);
  expect(a[0]).toBeGreaterThan(0.3);
  // the camera stands at Stack's station pose (route.ts: ~0, 3.4, −33)
  const at = await camera(page);
  expect(at[2]).toBeCloseTo(-33, 0);
  expect(at[1]).toBeCloseTo(3.4, 1);
});
