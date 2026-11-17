import { expect, type Page } from '@playwright/test';

/** Opens the page and waits until the test hooks are installed. */
export async function gotoScene(page: Page, path = '/en'): Promise<void> {
  await page.goto(path);
  await page.waitForFunction(() => !!window.__portfolio, undefined, { timeout: 30_000 });
}

/** Jumps the page to scroll progress p and lets ScrollTrigger and the scene settle. */
export async function scrollTo(page: Page, p: number): Promise<void> {
  await page.evaluate((v) => window.__portfolio.scrollToProgress(v, true), p);
  await page.waitForTimeout(600);
}

export async function progress(page: Page): Promise<number> {
  return page.evaluate(() => window.__portfolio.state().progress);
}

/** Waits until the 3D scene has loaded and drawn its first frames. */
export async function waitReady(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__portfolio.state().ready, undefined, { timeout: 30_000 });
}

/** Story progress of Work stop i (0 = the first project, 9 = "a small part"). */
export function stop(i: number): number {
  return 0.18 + (0.14 / 9) * i;
}

/**
 * Story progress of Stack stop i (0..5, one green sign over the road each): a mirror of stackStopProgress()
 * in src/experience/stackStops.ts, pinned by tests/unit/stackStops.test.ts.
 */
export function stackStop(i: number): number {
  return 0.635 + (0.135 / 5) * i;
}

export interface GantryProbe {
  /** the sign the camera stands under */
  stop: number;
  /** the signs' titles as painted */
  titles: string[];
  /** each sign's centre on screen and its corners (left, bottom, right, top), NDC */
  signs: { ndc: [number, number]; rect: [number, number, number, number] }[];
}
export const gantry = (page: Page) => page.evaluate(() => window.__portfolio.probe('gantry') as GantryProbe | undefined);

/** Until the camera has come to rest under Stack sign i (it eases there; a long jump takes a few seconds). */
export async function underSign(page: Page, i: number): Promise<void> {
  await expect
    .poll(
      async () => {
        const a = (await gantry(page))!.signs[i];
        await page.waitForTimeout(300);
        const b = (await gantry(page))!.signs[i];
        const moved = Math.max(...a.rect.map((v, k) => Math.abs(v - b.rect[k])));
        return moved < 0.002 && Math.abs(b.ndc[0]) < 0.08;
      },
      { timeout: 15_000 },
    )
    .toBe(true);
}

export interface BillboardProbe {
  /** the billboard's panel on the page now (CSS px), as the live camera sees it */
  rect: { x: number; y: number; width: number; height: number };
  /** the neon title as painted */
  title: string;
  /** what it stands on: the catwalk's centre on the page (CSS px) */
  support: { catwalk: [number, number] };
}
export const billboard = (page: Page) => page.evaluate(() => window.__portfolio.probe('billboard') as BillboardProbe | undefined);

/**
 * Where each section's text rides past while the pole holds its sign (story progress): a mirror of
 * holdWindow() in src/experience/journey.ts, pinned by tests/unit/journey.test.ts.
 */
export const HOLD = { about: [0.395, 0.565], stack: [0.615, 0.775], contact: [0.86, 1] } as const;

/** Every element on the page that scrolls inside itself right now (overflow auto/scroll with more to show). */
export async function innerScrollers(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll('body *')]
      .filter((el) => /(auto|scroll)/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 1)
      .map((el) => `${el.tagName.toLowerCase()}#${el.id}.${String(el.className).slice(0, 40)}`),
  );
}

type Box = { x: number; y: number; width: number; height: number };
/** Whether box a lies inside box b (with some slack, px). */
export const within = (a: Box, b: Box, slack = 1) =>
  a.x >= b.x - slack && a.y >= b.y - slack && a.x + a.width <= b.x + b.width + slack && a.y + a.height <= b.y + b.height + slack;

/** The dive (M4 round 1): the neon frame along the window's edges once the camera is inside the screen. */
// (visible ones: after a language switch the old page stays in the DOM for a moment, hidden)
export const screenTube = (page: Page) => page.locator('[data-screen-tube]').filter({ visible: true });
/** The dive: the picture of the form on the billboard's screen while the camera arrives and dives. */
export const screenPicture = (page: Page) => page.locator('[data-screen-picture]').filter({ visible: true });

/**
 * Until the camera is inside the billboard's screen and Contact's content shows in its frame, the frame's
 * switch-on glitch played out (it shifts the frame for a moment). The dive's own section: a language switch
 * keeps the old page's for a moment.
 */
export async function insideTheScreen(page: Page): Promise<void> {
  await expect(page.locator('#journey section#contact[data-dive]')).toHaveAttribute('data-stage', 'inside', { timeout: 25_000 });
  await expect(screenTube(page)).toBeVisible();
  await expect(page.locator('[data-screen-frame]').filter({ visible: true })).not.toHaveAttribute('data-glitch', /.*/);
}

/** Story progress some px of scroll into Contact's piece (the last piece: story 0.86..1). */
export async function intoContact(page: Page, px: number): Promise<number> {
  const lengths = (await page.evaluate(() => window.__portfolio.probe('journey'))) as number[];
  return 0.86 + (px / lengths[lengths.length - 1]) * 0.14;
}

/** The pole's face in About (M4 round 1): a point on it 1.2 m up, on the page (px), and the pole's width there. */
export const poleFace = (page: Page) =>
  page.evaluate(() => (window.__portfolio.probe('pole') as { face: { x: number; pin: number; width: number } | null }).face);

/**
 * Scrolls `px` further through About and checks the pole's face and the first bill on the screen moved up by
 * as much (the bills are pasted on the pole): returns how far each moved.
 */
export async function scrollAbout(page: Page, px: number): Promise<{ pin: number; bill: number }> {
  const bill = page.locator('#about [data-flow] > :is(.paper-bill, .paper-poster)');
  const vh = await page.evaluate(() => innerHeight);
  const onScreen = async () => {
    const tops = await bill.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().top));
    return tops.findIndex((t) => t > 120 && t < vh - 120 - px);
  };
  const settled = async () => {
    const a = (await poleFace(page))!.pin;
    await page.waitForTimeout(250);
    return Math.abs((await poleFace(page))!.pin - a) < 0.5;
  };
  await expect.poll(settled, { timeout: 15_000 }).toBe(true);
  const i = await onScreen();
  expect(i, 'a bill on the screen with room to rise').toBeGreaterThanOrEqual(0);
  const pin0 = (await poleFace(page))!.pin;
  const y0 = (await bill.nth(i).boundingBox())!.y;
  const lengths = (await page.evaluate(() => window.__portfolio.probe('journey'))) as number[];
  const p0 = await progress(page);
  await scrollTo(page, p0 + (px / lengths[3]) * 0.17);
  await expect.poll(settled, { timeout: 15_000 }).toBe(true);
  return { pin: pin0 - (await poleFace(page))!.pin, bill: y0 - (await bill.nth(i).boundingBox())!.y };
}

/** Switches the language through the header's language tube and the sign it drops. */
export async function switchLanguage(page: Page, to: 'EN' | 'RU' | 'UK'): Promise<void> {
  const header = page.locator('header[data-ui]');
  await header.getByRole('button', { name: /^(EN|RU|UK), / }).click();
  await header.locator('.lang-drop').getByRole('link', { name: to, exact: true }).click();
}
