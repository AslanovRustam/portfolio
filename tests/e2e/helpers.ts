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
