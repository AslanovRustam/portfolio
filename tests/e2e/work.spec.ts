import { expect, test, type Page } from '@playwright/test';
import { gotoScene, progress, scrollTo, stop, waitReady } from './helpers';

interface Wall {
  loaded: boolean;
  stops: { stop: number; ndc: [number, number] }[];
}

async function wallReady(page: Page) {
  await gotoScene(page);
  await waitReady(page);
  await page.waitForFunction(() => (window.__portfolio.probe('wall') as Wall | undefined)?.loaded, undefined, { timeout: 30_000 });
}

/** Viewport pixel of stop i's screen centre. */
async function screenAt(page: Page, i: number) {
  const { stops } = (await page.evaluate(() => window.__portfolio.probe('wall'))) as Wall;
  const [x, y] = stops[i].ndc;
  const vp = page.viewportSize()!;
  return { x: ((x + 1) / 2) * vp.width, y: ((1 - y) / 2) * vp.height };
}

test('each stop captions its project; the last one is "a small part"', async ({ page }) => {
  await wallReady(page);
  for (const [i, name] of [
    [0, 'Gipper'],
    [3, 'Speca.bike'],
    [8, 'DevDigest'],
  ] as const) {
    await scrollTo(page, stop(i));
    await expect(page.locator('section#work h3')).toHaveText(name);
  }
  await scrollTo(page, stop(9));
  await expect(page.getByText(/small part/i)).toBeVisible();
});

test('the pager jumps to a project from the keyboard', async ({ page }) => {
  await wallReady(page);
  await scrollTo(page, stop(0));
  await page.getByRole('button', { name: 'Kolir' }).focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => progress(page), { timeout: 6000 }).toBeCloseTo(stop(6), 3);
});

// Review Focus 4
test('clicking the lit TV opens its case; closing returns to the same stop', async ({ page }) => {
  await wallReady(page);
  await scrollTo(page, stop(2));
  await page.waitForTimeout(1500); // the camera settles in front of the set
  const { x, y } = await screenAt(page, 2);
  await page.mouse.click(x, y);
  await expect(page).toHaveURL(/\/en\/work\/gengo$/, { timeout: 15_000 });
  await expect(page.getByRole('dialog').getByRole('heading', { level: 2 })).toHaveText('gen-go', { timeout: 15_000 });
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/en$/, { timeout: 15_000 });
  expect(await progress(page)).toBeCloseTo(stop(2), 3);
});

// Review Focus 1
test('HTML over a TV keeps the pointer: no hover, no case', async ({ page }) => {
  await wallReady(page);
  await scrollTo(page, stop(0));
  await page.waitForTimeout(1500);
  const { x, y } = await screenAt(page, 0);
  await page.evaluate(
    ([px, py]) => {
      const d = document.createElement('div');
      d.setAttribute('data-ui', '');
      Object.assign(d.style, { position: 'fixed', left: `${px - 40}px`, top: `${py - 40}px`, width: '80px', height: '80px', zIndex: '50' });
      document.body.appendChild(d);
    },
    [x, y],
  );
  await page.mouse.move(x, y);
  await page.mouse.click(x, y);
  await page.waitForTimeout(600);
  await expect(page).toHaveURL(/\/en$/);
  expect(await page.evaluate(() => window.__portfolio.state().hoveredScreen)).toBeNull();
});

// Review Focus 5
test('switching language at a stop keeps the stop', async ({ page }) => {
  await wallReady(page);
  await scrollTo(page, stop(4));
  await page.getByRole('link', { name: 'RU', exact: true }).click();
  await expect(page).toHaveURL(/\/ru#work-5$/);
  await expect.poll(() => progress(page), { timeout: 10_000 }).toBeCloseTo(stop(4), 3);
});

test('without WebGL the card strip lists every project and slides to "a small part"', async ({ page }) => {
  await page.goto('/en?webgl=0#work');
  await page.waitForFunction(() => !!window.__portfolio);
  await expect(page.locator('section#work li a')).toHaveCount(9);
  await scrollTo(page, 0.33);
  await expect(page.getByText(/small part/i)).toBeVisible();
  expect(await page.evaluate(() => window.__portfolio.probe('track') as number)).toBeLessThan(-200);
});
