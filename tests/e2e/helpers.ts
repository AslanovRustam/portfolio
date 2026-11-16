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

/**
 * Where each section's text rides past while the pole holds its sign (story progress): a mirror of
 * holdWindow() in src/experience/journey.ts, pinned by tests/unit/journey.test.ts.
 */
export const HOLD = { about: [0.395, 0.565], stack: [0.615, 0.775], contact: [0.825, 1] } as const;

/** Every element on the page that scrolls inside itself right now (overflow auto/scroll with more to show). */
export async function innerScrollers(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll('body *')]
      .filter((el) => /(auto|scroll)/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 1)
      .map((el) => `${el.tagName.toLowerCase()}#${el.id}.${String(el.className).slice(0, 40)}`),
  );
}

/** Switches the language through the header's language tube and the sign it drops. */
export async function switchLanguage(page: Page, to: 'EN' | 'RU' | 'UK'): Promise<void> {
  const header = page.locator('header[data-ui]');
  await header.getByRole('button', { name: /^(EN|RU|UK), / }).click();
  await header.locator('.lang-drop').getByRole('link', { name: to, exact: true }).click();
}
