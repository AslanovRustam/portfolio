import { expect, test, type Page } from '@playwright/test';
import { gotoScene, HOLD, innerScrollers, insideTheScreen, progress, screenTube, scrollTo, stackStop, stop, switchLanguage, waitReady } from './helpers';

const firstBox = (page: Page, id: string) => page.locator(`#${id} [data-flow] > *`).first();
const yaw = (page: Page) => page.evaluate(() => window.__portfolio.probe('poleYaw') as number);
const lengths = (page: Page) => page.evaluate(() => window.__portfolio.probe('journey') as number[]);
/** The pole's yaw while it holds the ABOUT sign to the camera (signs.ts: about faces π/2). */
const ABOUT_YAW = -Math.PI / 2;

test('no inner scroll anywhere on the home page, in every language', async ({ page }) => {
  test.setTimeout(180_000);
  for (const l of ['en', 'ru', 'uk']) {
    await gotoScene(page, `/${l}`);
    await waitReady(page);
    for (const p of [stop(3), 0.48, stackStop(2), 0.9, 1]) {
      await scrollTo(page, p);
      expect(await innerScrollers(page), `${l} @ ${p}`).toEqual([]);
    }
  }
});

test('section text rides the page scroll while the sign holds', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, HOLD.about[0] + 0.02);
  await expect.poll(() => yaw(page), { timeout: 8000 }).toBeCloseTo(ABOUT_YAW, 3);
  const top0 = (await firstBox(page, 'about').boundingBox())!.y;
  await scrollTo(page, HOLD.about[0] + 0.08);
  await expect.poll(async () => top0 - (await firstBox(page, 'about').boundingBox())!.y).toBeGreaterThan(100);
  await page.waitForTimeout(1500);
  expect(await yaw(page)).toBeCloseTo(ABOUT_YAW, 3);
});

test('a header link lands where the text begins, with the first box on screen', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await page.getByRole('button', { name: 'About', exact: true }).click();
  await expect.poll(() => progress(page), { timeout: 8000 }).toBeCloseTo(HOLD.about[0], 2);
  const box = (await firstBox(page, 'about').boundingBox())!;
  const vh = page.viewportSize()!.height;
  expect(box.y).toBeGreaterThan(0);
  expect(box.y).toBeLessThan(vh);
});

test('the last box has left before the pole turns', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, HOLD.about[1]);
  const vh = page.viewportSize()!.height;
  const bottoms = await page.locator('#about .paper-bill').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().bottom));
  expect(bottoms.length).toBeGreaterThan(0);
  for (const b of bottoms) expect(b).toBeLessThan(0.2 * vh);
});

test("where Contact rides the page (no WebGL), it ends with its last box resting low on the screen", async ({ page }) => {
  for (const size of [
    { width: 1000, height: 700 },
    { width: 1000, height: 900 },
  ]) {
    await page.setViewportSize(size);
    await page.goto('/en?webgl=0');
    await page.waitForFunction(() => !!window.__portfolio);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect
      .poll(async () => {
        const last = (await page.locator('#contact .nbox').last().boundingBox())!;
        return last.y + last.height;
      })
      .toBeGreaterThan(0.85 * size.height);
    const last = (await page.locator('#contact .nbox').last().boundingBox())!;
    expect(last.y + last.height, `${size.height}`).toBeLessThanOrEqual(size.height);
  }
});

// M4 round 1: a window too small for the form on the billboard dives into its screen instead
test('where the camera dives into the screen, Contact ends inside the frame', async ({ page }) => {
  for (const size of [
    { width: 1000, height: 700 },
    { width: 1000, height: 900 },
  ]) {
    await page.setViewportSize(size);
    await gotoScene(page);
    await waitReady(page);
    await scrollTo(page, 1);
    await insideTheScreen(page);
    const frame = (await screenTube(page).boundingBox())!;
    const last = (await page.locator('#journey section#contact [data-flow] > * > :last-child').boundingBox())!;
    expect(last.y + last.height, `${size.height}`).toBeLessThanOrEqual(frame.y + frame.height);
    expect(last.y, `${size.height}`).toBeGreaterThan(frame.y);
  }
});

test('the journey re-measures when a section grows, and keeps the place', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, 0.48);
  const before = await lengths(page);
  // the column grows by the new block and one gap between boxes
  const grown = await page.evaluate(() => {
    const flow = document.querySelector<HTMLElement>('#about [data-flow]')!;
    const h0 = flow.offsetHeight;
    const d = document.createElement('div');
    d.style.height = '600px';
    flow.appendChild(d);
    return flow.offsetHeight - h0;
  });
  expect(grown).toBeGreaterThanOrEqual(600);
  await expect.poll(async () => (await lengths(page))[3] - before[3]).toBeGreaterThan(grown - 2);
  expect((await lengths(page))[3] - before[3]).toBeLessThan(grown + 2);
  await expect.poll(() => progress(page)).toBeCloseTo(0.48, 2);
});

test('the measured pieces add up to the scroll track', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  const { sum, range } = await page.evaluate(() => {
    const ls = window.__portfolio.probe('journey') as number[];
    const el = document.getElementById('journey')!;
    const pieces = [...el.querySelectorAll<HTMLElement>(':scope > [data-piece]')];
    // each piece starts where the measured lengths before it end
    const starts = pieces.map((p) => p.offsetTop);
    let at = 0;
    const off: number[] = [];
    ls.forEach((l, i) => {
      off.push(Math.abs(starts[i] - at));
      at += l;
    });
    return { sum: Math.max(...off), range: ls.reduce((a, b) => a + b, 0) - (el.offsetHeight - innerHeight) };
  });
  expect(sum).toBeLessThan(2);
  expect(Math.abs(range)).toBeLessThan(2);
});

// Review Focus 1
test('the empty part of a section lets the signs be hovered', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  // the start of About: the ABOUT sign above the poster (further on, the bills are pasted over the pole)
  await scrollTo(page, HOLD.about[0]);
  // the pole and camera ease into place: aim at where the sign is now, until the pointer is on it
  await expect
    .poll(
      async () => {
        const { x, y } = (await page.evaluate(() => window.__portfolio.probe('signScreen:about'))) as { x: number; y: number };
        await page.mouse.move(x, y);
        await page.waitForTimeout(200);
        return page.evaluate(() => window.__portfolio.state().hoveredSign);
      },
      { timeout: 15_000 },
    )
    .toBe('about');
});

// Review Focus 2
test('a resize inside About keeps the place', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, 0.48);
  await page.setViewportSize({ width: 800, height: 800 });
  await expect.poll(() => progress(page), { timeout: 8000 }).toBeCloseTo(0.48, 2);
  expect(await page.evaluate(() => window.__portfolio.section())).toBe('about');
});

// Review Focus 5 (spec §6.1: the language switch keeps the place inside the section)
test('the language switch keeps the place inside the section', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, 0.48);
  await switchLanguage(page, 'RU');
  await expect(page).toHaveURL(/\/ru#about$/);
  await expect.poll(() => progress(page), { timeout: 30_000 }).toBeCloseTo(0.48, 2);
});

test('without WebGL every section is still there', async ({ page }) => {
  await page.goto('/en?webgl=0');
  await page.waitForFunction(() => !!window.__portfolio);
  for (const id of ['about', 'contact']) {
    const box = firstBox(page, id);
    await box.scrollIntoViewIfNeeded();
    await expect(box).toBeInViewport();
  }
  // Stack is a caption fixed at the bottom of the screen while its stretch of the page goes by
  await page.evaluate((p) => window.__portfolio.scrollToProgress(p, true), stackStop(1));
  await expect(page.locator('section#stack')).toBeInViewport();
  await expect(page.locator('section#stack').getByRole('heading', { level: 3 })).toHaveText('State');
});

test("About's bills swing in as they reach the screen", async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, HOLD.about[0] + 0.005);
  const vh = page.viewportSize()!.height;
  const bills = page.locator('#about [data-flow] > .paper-bill');
  const state = () =>
    bills.evaluateAll((els, h) => els.map((el) => ({ swing: (el as HTMLElement).dataset.swing, top: el.getBoundingClientRect().top, below: el.getBoundingClientRect().top > h })), vh);
  const hidden = (await state()).filter((b) => b.below);
  expect(hidden.length).toBeGreaterThan(0);
  expect(hidden.every((b) => b.swing === 'out')).toBe(true);
  // further on, the bills that were below have reached the screen and swung in
  await scrollTo(page, HOLD.about[0] + 0.06);
  await expect.poll(async () => (await state()).filter((b) => !b.below && b.top > 0).every((b) => b.swing === 'in')).toBe(true);
  expect((await state()).filter((b) => !b.below && b.top > 0).length).toBeGreaterThan(0);
  const name = await page.locator('#about .paper-bill[data-swing="in"]').first().evaluate((el) => getComputedStyle(el).animationName);
  expect(name).toBe('swing-in');
});

// ── the About poster (Plan 3, Task 6) ─────────────────────────────────────────────────────────

test("About opens with Rustam's poster, named in the page's language", async ({ page }) => {
  for (const [path, alt] of [
    ['/en', 'Rustam Aslanov'],
    ['/ru', 'Рустам Асланов'],
    ['/uk', 'Рустам Асланов'],
  ] as const) {
    await page.goto(path);
    const first = page.locator('#about [data-flow] > *').first();
    await expect(first).toHaveClass(/paper-poster/);
    await expect(first.locator('img')).toHaveAttribute('alt', alt);
  }
  // the layout width: the tilt widens the bounding box on purpose
  const width = await page.locator('#about .paper-poster').evaluate((el) => (el as HTMLElement).offsetWidth);
  expect(width).toBeLessThanOrEqual(300);
  expect(width).toBeGreaterThan(150);
});

test('the poster swings in like the boxes', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  const poster = page.locator('#about .paper-poster');
  await expect(poster).toHaveAttribute('data-swing', 'out');
  await page.getByRole('button', { name: 'About', exact: true }).click();
  await expect.poll(() => poster.getAttribute('data-swing'), { timeout: 8000 }).toBe('in');
});

test('reduced motion: the poster is simply there', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, HOLD.about[0] + 0.01);
  const poster = page.locator('#about .paper-poster');
  await expect(poster).toBeVisible();
  expect(await poster.evaluate((el) => [getComputedStyle(el).opacity, getComputedStyle(el).animationName])).toEqual(['1', 'none']);
});

// ── About: paper bills on the pole (Plan 4, Task 4) ───────────────────────────────────────────

test('About is paper bills pasted over the pole: the poster, then the lead, the story, the path, the education, the languages', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, HOLD.about[0] + 0.04);
  const items = page.locator('#about [data-flow] > *');
  await expect(items.first()).toHaveClass(/paper-poster/);
  const bills = page.locator('#about [data-flow] > .paper-bill');
  await expect(bills).toHaveCount(5);
  await expect(page.locator('#about .nbox')).toHaveCount(0);
  // the camera has the pole in the middle of the frame, and the bills hang over it
  const poleX = await page.evaluate(() => {
    const [x] = (window.__portfolio.probe('pole') as { ndc: [number, number] }).ndc;
    return ((x + 1) / 2) * innerWidth;
  });
  const vw = page.viewportSize()!.width;
  for (const box of await bills.evaluateAll((els) => els.map((el) => el.getBoundingClientRect()))) {
    expect(Math.abs(box.x + box.width / 2 - poleX)).toBeLessThan(0.25 * vw);
  }
});

test('reduced motion: the bills are simply there', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await gotoScene(page);
  await scrollTo(page, HOLD.about[0] + 0.01);
  const bills = await page.locator('#about .paper-bill').evaluateAll((els) => els.map((el) => [getComputedStyle(el).opacity, getComputedStyle(el).animationName]));
  expect(bills.length).toBe(5);
  for (const [o, a] of bills) expect([o, a]).toEqual(['1', 'none']);
});
