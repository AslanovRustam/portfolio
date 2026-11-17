import { expect, test, type Locator, type Page } from '@playwright/test';
import en from '../../messages/en.json';
import { gotoScene, HOLD, progress, scrollTo, stackStop, stop, waitReady } from './helpers';

const next = (page: Page) => page.getByRole('button', { name: new RegExp(`^${en.nav.next}: `) });
const box = async (l: Locator) => (await l.boundingBox())!;
const overlaps = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

test('Next names the next section and takes you there, then leaves at Contact', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  // About lands where its first bill has come a third up the screen (M4 round 1): 0.7 of a screen into its piece
  const aboutLanding = await page.evaluate((from) => {
    const lengths = window.__portfolio.probe('journey') as number[];
    return from + ((0.7 * innerHeight) / lengths[3]) * 0.17;
  }, HOLD.about[0]);
  for (const [label, target] of [
    [en.nav.work, stop(0)],
    [en.nav.about, aboutLanding],
    [en.nav.stack, stackStop(0)],
    [en.nav.contact, 1],
  ] as const) {
    await expect(next(page)).toHaveText(new RegExp(`^${en.nav.next}: ${label}`));
    await next(page).click();
    await expect.poll(() => progress(page), { timeout: 10_000 }).toBeCloseTo(target, 2);
  }
  await expect(next(page)).toHaveCount(0);
});

test('on a laptop Next stays clear of the text column and the title block', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  expect(overlaps(await box(next(page)), await box(page.locator('header[data-hero]')))).toBe(false);
  // About's bills ride up through the whole screen; Stack's caption sits in the corner
  for (const p of [0.41, 0.45, 0.48, 0.52, 0.56, stackStop(2)]) {
    await scrollTo(page, p);
    const b = await box(next(page));
    const boxes = await page.locator('[data-flow] > .paper-poster, [data-flow] > .paper-bill, [data-flow] .nbox, section#stack').evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      }),
    );
    expect(boxes.filter((r) => overlaps(b, r)), `${p}`).toEqual([]);
  }
});

test('no Next over an open case', async ({ page }) => {
  await gotoScene(page, '/en/work/altus');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(next(page)).toHaveCount(0);
});

test('the hero no longer says Scroll', async ({ page }) => {
  await gotoScene(page);
  await expect(page.locator('header[data-hero]')).not.toContainText('Scroll');
});

test("the scrollbar wears the open section's colour", async ({ page }) => {
  await gotoScene(page);
  const accent = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
  await scrollTo(page, 0.48);
  await expect.poll(accent).toBe('#5fe1ff');
  await scrollTo(page, stackStop(2));
  await expect.poll(accent).toBe('#ff3448');
});
