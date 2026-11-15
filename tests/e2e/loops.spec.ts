import { expect, test, type Page } from '@playwright/test';
import { gotoScene, scrollTo, stop, waitReady } from './helpers';

interface WallLoop {
  loaded: boolean;
  /** the stop whose loop is on its screen, and the video's time */
  loop: { stop: number; time: number } | null;
  /** live video elements behind the wall */
  videos: number;
}
const wall = (page: Page) => page.evaluate(() => window.__portfolio.probe('wall') as WallLoop | undefined);
const ALTUS = 4;
const TUTI = 7;

async function wallReady(page: Page, path = '/en') {
  await gotoScene(page, path);
  await waitReady(page);
  await page.waitForFunction(() => (window.__portfolio.probe('wall') as { loaded?: boolean } | undefined)?.loaded, undefined, {
    timeout: 30_000,
  });
}

async function playingAt(page: Page, i: number) {
  await scrollTo(page, stop(i));
  await expect.poll(async () => (await wall(page))?.loop?.stop, { timeout: 15_000 }).toBe(i);
}

/** Nothing plays at ALTUS's stop for 3 s. */
async function staysStill(page: Page) {
  await scrollTo(page, stop(ALTUS));
  await page.waitForTimeout(3000);
  const w = (await wall(page))!;
  expect(w.loop).toBeNull();
  expect(w.videos).toBe(0);
}

test('the current stop plays its loop and its neighbours keep their stills', async ({ page }) => {
  await wallReady(page);
  await playingAt(page, ALTUS);
  const t0 = (await wall(page))!.loop!.time;
  await page.waitForTimeout(1200);
  const w = (await wall(page))!;
  expect(w.loop!.stop).toBe(ALTUS);
  expect(w.loop!.time).not.toBeCloseTo(t0, 1); // the picture moves
  expect(w.videos).toBe(1); // one video for the whole wall
});

test('leaving Work stops the loop', async ({ page }) => {
  await wallReady(page);
  await playingAt(page, ALTUS);
  await scrollTo(page, 0.48);
  await expect.poll(async () => (await wall(page))!.loop).toBeNull();
  expect((await wall(page))!.videos).toBe(0);
});

// Review Focus 1
test('a fast sweep across the stops keeps one video at most', async ({ page }) => {
  await wallReady(page);
  await scrollTo(page, stop(0));
  for (let i = 0; i <= TUTI; i++) {
    await page.evaluate((p) => window.__portfolio.scrollToProgress(p, true), stop(i));
    await page.waitForTimeout(150);
    expect((await wall(page))!.videos).toBeLessThanOrEqual(1);
  }
  await expect.poll(async () => (await wall(page))?.loop?.stop, { timeout: 15_000 }).toBe(TUTI);
});

// Review Focus 2
test('a loop that fails to load leaves the still', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route(/\/projects\/altus\.(webm|mp4)/, (r) => r.abort());
  await wallReady(page);
  await staysStill(page);
  expect(errors).toEqual([]);
});

// Review Focus 3
test('refused autoplay leaves the still', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('autoplay refused', 'NotAllowedError'));
  });
  await wallReady(page);
  await staysStill(page);
  expect(errors).toEqual([]);
});

// Review Focus 4
test("an open case pauses the wall's loop", async ({ page }) => {
  await wallReady(page);
  await playingAt(page, ALTUS);
  await page.locator('section#work').getByRole('link', { name: 'Open case' }).click();
  await expect(page.getByRole('dialog').getByRole('heading', { level: 2 })).toBeVisible({ timeout: 15_000 });
  await expect.poll(async () => (await wall(page))!.loop).toBeNull();
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/en$/, { timeout: 15_000 });
  await expect.poll(async () => (await wall(page))?.loop?.stop, { timeout: 15_000 }).toBe(ALTUS);
});

// Review Focus 5
test("a drop to the low tier stops the wall's loop", async ({ page }) => {
  await wallReady(page);
  await playingAt(page, ALTUS);
  await page.evaluate(() => window.__portfolio.state().setTier('low'));
  await expect.poll(async () => (await wall(page))!.loop).toBeNull();
  expect((await wall(page))!.videos).toBe(0);
});

test('the low tier keeps stills on the wall', async ({ page }) => {
  await wallReady(page, '/en?quality=low');
  await staysStill(page);
});

test('reduced motion keeps stills on the wall', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await wallReady(page);
  await staysStill(page);
});

test('save-data keeps stills on the wall', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true }));
  await wallReady(page);
  await staysStill(page);
});

test('?loops=0 keeps stills on the wall', async ({ page }) => {
  await wallReady(page, '/en?loops=0');
  await staysStill(page);
});

test('the first load asks for no video', async ({ page }) => {
  const videos: string[] = [];
  page.on('request', (r) => /\.(webm|mp4)(\?|$)/.test(r.url()) && videos.push(r.url()));
  await wallReady(page);
  await page.waitForTimeout(2000);
  expect(videos).toEqual([]);
});
