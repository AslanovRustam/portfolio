import { expect, test, type Page } from '@playwright/test';
import { BILLBOARD } from '../../src/scene/billboard/layout';
import { shopLayout } from '../../src/scene/shop/layout';
import { gantryLayout } from '../../src/scene/stack/layout';
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
  // it flies in from beyond the right edge: wait for it to come to its place inside the frame
  await expect
    .poll(async () => {
      const x = (await pole(page))!.ndc[0];
      return x > 0.3 && x < 1;
    }, { timeout: 10_000 })
    .toBe(true);
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
  // the frame that applies the jump may come a moment after the scroll
  await expect.poll(async () => (await pole(page))?.mode, { timeout: 10_000 }).toBe('ride');
  await poleSettled(page);
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

// ── with every station built (Plan 4, Task 6) ─────────────────────────────────────────────────

type Box3D = { x: [number, number]; y: [number, number]; z: [number, number] };
const within = (p: number[], b: Box3D, m = 0) =>
  p[0] > b.x[0] - m && p[0] < b.x[1] + m && p[1] > b.y[0] - m && p[1] < b.y[1] + m && p[2] > b.z[0] - m && p[2] < b.z[1] + m;

// Review Focus 1
test('a fling through the whole ride stays on the street', async ({ page }) => {
  test.setTimeout(120_000);
  const shop = shopLayout().facade;
  const B = BILLBOARD.building;
  const G = gantryLayout();
  const solid: Record<string, Box3D> = {
    shop: { x: [shop.x0, shop.x1], y: [0, shop.height], z: [shop.z1, shop.z0] },
    building: { x: [B.x0, B.x1], y: [0, B.height], z: [B.z1, B.z0] },
    gantry: { x: [-G.postX, G.postX], y: [G.catwalk.y - 0.05, G.truss.top + 0.1], z: [G.truss.back, G.catwalk.z] },
  };
  // the pole's signs and light, from its foot up: in the frame they must not pass through the gantry's signs either
  const signs: Box3D = { x: [G.signs[0].position[0] - 1.2, G.signs[5].position[0] + 1.2], y: [G.signs[0].position[1] - 0.96, G.signs[0].position[1] + 0.96], z: [G.truss.front - 0.1, G.signs[0].position[2] + 0.05] };
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, 0.16);
  await page.mouse.move(720, 400);
  const samples: { p: number; camera: number[]; pole: number[] | null; seen: boolean }[] = [];
  let flinging = true;
  const fling = (async () => {
    for (let i = 0; i < 30; i++) {
      await page.mouse.wheel(0, 900);
      await page.waitForTimeout(60);
    }
    await page.waitForTimeout(4000);
    flinging = false;
  })();
  while (flinging) {
    samples.push(
      await page.evaluate(() => {
        const pole = window.__portfolio.probe('pole') as {
          world: number[] | null;
          visible: boolean;
          box: { x: number; y: number; width: number; height: number } | null;
        };
        const b = pole.visible ? pole.box : null;
        return {
          p: window.__portfolio.state().progress,
          camera: (window.__portfolio.probe('camera') as { position: number[] }).position,
          pole: pole.world,
          // drawn, and any of it on the screen
          seen: !!b && b.x < innerWidth && b.x + b.width > 0 && b.y < innerHeight && b.y + b.height > 0,
        };
      }),
    );
    await page.waitForTimeout(100);
  }
  await fling;
  expect(samples.at(-1)!.p).toBeGreaterThan(0.99);
  for (const s of samples) {
    for (const [name, box] of Object.entries(solid)) expect(within(s.camera, box, 0.15), `camera in the ${name} at ${s.p}: ${s.camera}`).toBe(false);
    // out of the frame the pole may pass anywhere (parked by the shop window, under the gantry): nobody sees it
    if (!s.pole || !s.seen) continue;
    // the pole stands from its foot to the top of its light, ~0.4 m about its axis
    for (const y of [0.5, 1.5, 2.5, 3.5, 4.5, 5.2]) {
      const at = [s.pole[0], s.pole[1] + y, s.pole[2]];
      for (const name of ['shop', 'building'] as const) expect(within(at, solid[name], 0.4), `pole in the ${name} at ${s.p}: ${at}`).toBe(false);
      expect(within(at, signs, 0.4), `pole through the gantry's signs at ${s.p}: ${at}`).toBe(false);
    }
  }
});

// Review Focus 2
for (const [w, h] of [
  [412, 915],
  [2560, 1080],
]) {
  test(`the pole never covers the text (${w}×${h})`, async ({ page }) => {
    test.setTimeout(150_000);
    await page.setViewportSize({ width: w, height: h });
    await gotoScene(page);
    await waitReady(page);
    const places: { p: number; text: string }[] = [
      { p: stop(3), text: 'section#work' },
      ...[0, 1, 2, 3, 4, 5].map((i) => ({ p: stackStop(i), text: 'section#stack' })),
      { p: 1, text: 'section#contact form' },
    ];
    for (const { p, text } of places) {
      await scrollTo(page, p);
      await poleSettled(page);
      const box = ((await pole(page)) as unknown as { box: { x: number; y: number; width: number; height: number } | null }).box;
      const t = (await page.locator(text).boundingBox())!;
      // a pole wholly off the screen covers nothing
      if (!box || box.x > w || box.x + box.width < 0) continue;
      const apart = box.x >= t.x + t.width || box.x + box.width <= t.x || box.y >= t.y + t.height || box.y + box.height <= t.y;
      expect(apart, `${text} at ${p}: pole ${JSON.stringify(box)} text ${JSON.stringify(t)}`).toBe(true);
    }
  });
}
