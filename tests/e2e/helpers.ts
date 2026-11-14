import type { Page } from '@playwright/test';

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
