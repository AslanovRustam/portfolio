import { expect, test, type Page } from '@playwright/test';
import { gotoScene } from './helpers';

// The case card plays its project's live loop over its still (Plan 3, Task 5).

const caseVideo = (page: Page) => page.getByRole('dialog').locator('video');

async function openAltusCase(page: Page) {
  await gotoScene(page, '/en/work/altus');
  await expect(page.getByRole('dialog').getByRole('heading', { level: 2 })).toHaveText('ALTUS', { timeout: 15_000 });
}

test('a case plays its loop, muted, over its still', async ({ page }) => {
  await openAltusCase(page);
  const video = caseVideo(page);
  await expect(video).toHaveCount(1);
  await expect(video).toHaveAttribute('poster', '/projects/altus.webp');
  await expect(video).toHaveAttribute('aria-hidden', 'true');
  expect(await video.evaluate((v: HTMLVideoElement) => v.muted && v.loop)).toBe(true);
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime), { timeout: 10_000 }).toBeGreaterThan(0.5);
});

test('reduced motion shows the still in the case', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openAltusCase(page);
  await page.waitForTimeout(1500);
  await expect(caseVideo(page)).toHaveCount(0);
  await expect(page.getByRole('dialog').locator('img').first()).toBeVisible();
});

test('save-data shows the still in the case', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true }));
  await openAltusCase(page);
  await page.waitForTimeout(1500);
  await expect(caseVideo(page)).toHaveCount(0);
  await expect(page.getByRole('dialog').locator('img').first()).toBeVisible();
});

// Review Focus 2, in the case
test('a case loop that fails to load leaves the still', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route(/\/projects\/altus\.(webm|mp4)/, (r) => r.abort());
  await openAltusCase(page);
  await expect(caseVideo(page)).toHaveCount(0, { timeout: 10_000 });
  await expect(page.getByRole('dialog').locator('img').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('the no-WebGL card strip shows stills only', async ({ page }) => {
  await page.goto('/en?webgl=0#work');
  await expect(page.locator('section#work img').first()).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('section#work video')).toHaveCount(0);
});
