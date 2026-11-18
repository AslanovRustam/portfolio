import { expect, test, type Page } from '@playwright/test';
import { gotoScene, switchLanguage, waitReady } from './helpers';

/** The intro's landing: the loader's sheet becomes the floor (src/experience/landing.ts). */
type Cam = { position: [number, number, number]; target: [number, number, number] };
const camera = (page: Page) => page.evaluate(() => window.__portfolio.probe('camera') as Cam);
const phase = (page: Page) => page.evaluate(() => (window.__portfolio.probe('landing') as { phase: string }).phase);
const planHeight = (vh: number) => (0.25 * vh) / (48 * Math.tan((17.5 * Math.PI) / 180));

test.use({ viewport: { width: 1440, height: 900 } });

test('after the loader the camera looks straight down at the floor from the plan height, then lands at the start', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  const c = await camera(page);
  expect(['armed', 'hold']).toContain(await phase(page));
  expect(Math.abs(c.position[0] - c.target[0])).toBeLessThan(0.05);
  expect(Math.abs(c.position[2] - c.target[2])).toBeLessThan(0.05);
  expect(c.position[1]).toBeGreaterThan(planHeight(900) - 0.3);
  expect(c.position[1]).toBeLessThan(planHeight(900) + 0.3);
  await expect.poll(() => phase(page), { timeout: 6000 }).toBe('done');
  // at rest at the start pose: low, beside the pole, looking at it
  const a = await camera(page);
  await page.waitForTimeout(300);
  const b = await camera(page);
  expect(Math.hypot(...a.position.map((v, i) => v - b.position[i]))).toBeLessThan(0.01);
  expect(b.position[1]).toBeLessThan(4.5);
  expect(b.target[1]).toBeGreaterThan(2);
});

test('a scroll during the landing hurries it to the scroll’s pose, with no jump', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  // the camera's height and the time, every frame, while the visitor scrolls in the middle of the landing
  await page.evaluate(() => {
    const w = window as unknown as { ys: [number, number][] };
    w.ys = [];
    const tick = (t: number) => {
      w.ys.push([t, (window.__portfolio.probe('camera') as { position: number[] }).position[1]]);
      if (w.ys.length < 300) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.waitForTimeout(1500);
  await page.mouse.move(720, 450);
  await page.mouse.wheel(0, 400);
  // hurried to its end, towards where the scroll goes
  await expect.poll(() => phase(page), { timeout: 4000 }).toBe('done');
  await expect.poll(() => page.evaluate(() => window.__portfolio.state().progress)).toBeGreaterThan(0);
  await page.waitForTimeout(1500);
  const ys = await page.evaluate(() => (window as unknown as { ys: [number, number][] }).ys);
  // speed over ≥ 100 ms windows: this callback and the scene's frame are not in step frame by frame
  const speeds: number[] = [];
  for (let i = 0; i < ys.length; i++) {
    const j = ys.findIndex(([t], k) => k > i && t - ys[i][0] >= 100);
    if (j > 0) speeds.push(Math.abs(ys[j][1] - ys[i][1]) / ((ys[j][0] - ys[i][0]) / 1000));
  }
  // the landing's own top speed: smootherstep's 1.875 over its drop in its 1.8 s; a scroll runs it 1.4× as fast
  const natural = (1.875 * (planHeight(900) - 3.6)) / 1.8;
  expect(Math.max(...speeds)).toBeLessThan(1.5 * natural);
});

test('no landing under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await gotoScene(page);
  await waitReady(page);
  expect(await phase(page)).toBe('off');
  expect((await camera(page)).position[1]).toBeLessThan(5);
});

test('no landing on a deep link', async ({ page }) => {
  await gotoScene(page, '/en#stack');
  await waitReady(page);
  expect(await phase(page)).toBe('off');
});

test('a language switch does not land again', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await expect.poll(() => phase(page), { timeout: 6000 }).toBe('done');
  await switchLanguage(page, 'RU');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await page.waitForTimeout(500);
  expect(await phase(page)).toBe('done');
  expect((await camera(page)).position[1]).toBeLessThan(4.5);
});

test('a stalled frame pauses the landing: the camera never leaps after it', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  // block the main thread for 400 ms in the middle of the move, recording the camera every frame
  const ys = await page.evaluate(
    () =>
      new Promise<[number, number][]>((resolve) => {
        const out: [number, number][] = [];
        const t0 = performance.now();
        let stalled = false;
        const tick = (t: number) => {
          out.push([t, (window.__portfolio.probe('camera') as { position: number[] }).position[1]]);
          if (!stalled && t - t0 > 1500) {
            stalled = true;
            const until = performance.now() + 400;
            while (performance.now() < until);
          }
          if (t - t0 < 3500) requestAnimationFrame(tick);
          else resolve(out);
        };
        requestAnimationFrame(tick);
      }),
  );
  const natural = (1.875 * (planHeight(900) - 3.6)) / 1.8;
  // no frame moves the camera further than 50 ms of the landing's top speed could (with slack)
  const steps = ys.slice(1).map(([, y], i) => Math.abs(y - ys[i][1]));
  expect(Math.max(...steps)).toBeLessThan(natural * 0.05 * 1.2);
});
