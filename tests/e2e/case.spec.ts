import { expect, test, type Page } from '@playwright/test';
import { gotoScene, progress, scrollTo, stop, switchLanguage, waitReady } from './helpers';

// Review Focus 2
test('a case opens over the scene, locks scrolling, and closes back to the same spot', async ({ page }) => {
  await gotoScene(page);
  await scrollTo(page, stop(0));
  const before = await progress(page);
  await page.locator('section#work').getByRole('link', { name: 'Open case' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { level: 2 })).toHaveText(/Gipper/, { timeout: 15_000 }); // dev compiles the case on first use
  await page.mouse.wheel(0, 1500);
  await page.waitForTimeout(600);
  expect(Math.abs((await progress(page)) - before)).toBeLessThan(0.01);
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/en$/, { timeout: 15_000 }); // a cold dev server compiles /en on the way back
  await expect(dialog).toHaveCount(0);
  expect(Math.abs((await progress(page)) - before)).toBeLessThan(0.01);
});

// Review Focus 3
test('switching language on a case keeps the case', async ({ page }) => {
  await gotoScene(page, '/en/work/altus');
  // the street's first frames compile its shaders and hold the page for seconds in dev; a click that lands
  // in them is answered only afterwards, so the switch is tried once the scene is up, as a visitor would
  await waitReady(page);
  await switchLanguage(page, 'RU');
  await expect(page).toHaveURL(/\/ru\/work\/altus$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(page.getByRole('dialog').getByRole('heading', { level: 2 })).toBeVisible();
});

test('an unknown case is a 404', async ({ page }) => {
  const res = await page.goto('/en/work/nope');
  expect(res?.status()).toBe(404);
});

test('gen-go links to its site and says the repo is private', async ({ page }) => {
  await page.goto('/en/work/gengo');
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { level: 2 })).toHaveText('gen-go', { timeout: 15_000 });
  await expect(dialog.getByRole('link', { name: 'Live site' })).toHaveAttribute('href', 'https://gen-go.ai/');
  await expect(dialog.getByRole('link', { name: 'Source code' })).toHaveCount(0);
  await expect(dialog.getByText('Private repo')).toBeVisible();
});

test('Speca.bike is marked as in development, Kolir tells a full case', async ({ page }) => {
  await page.goto('/en/work/moto');
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { level: 2 })).toHaveText('Speca.bike', { timeout: 15_000 });
  await expect(dialog.getByText('In development', { exact: true })).toBeVisible();
  await page.goto('/en/work/kolir');
  await expect(dialog.getByText('What I did')).toBeVisible({ timeout: 15_000 });
  await expect(dialog.getByText('Private repo')).toBeVisible();
});

/**
 * The switch-on actually on screen: the card animations (those with a clip-path) still in effect, and the
 * first keyframe of the newest one. A second one would mean a leftover from a discarded effect run.
 */
const firstFrame = (page: Page) =>
  page.getByRole('dialog').evaluate((el) => {
    const cards = el.getAnimations().filter((a) => (a.effect as KeyframeEffect | null)?.getKeyframes().some((k) => 'clipPath' in k));
    const k = (cards.at(-1)?.effect as KeyframeEffect | null)?.getKeyframes()[0] as Record<string, string> | undefined;
    return k ? { clip: k.clipPath ?? '', transform: k.transform ?? '', count: cards.length } : null;
  });
const insetTop = (clip: string) => parseFloat(/inset\(\s*([\d.]+)%/.exec(clip)?.[1] ?? '0');

test('a case switches on like a TV and switches off on close', async ({ page }) => {
  await gotoScene(page);
  await scrollTo(page, stop(0));
  const open = page.locator('section#work').getByRole('link', { name: 'Open case' });
  await open.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toHaveAttribute('data-crt', /opening|open/, { timeout: 15_000 });
  const first = await firstFrame(page);
  expect(first).not.toBeNull();
  expect(insetTop(first!.clip)).toBeGreaterThanOrEqual(45);
  expect(first!.count).toBe(1);
  // the duration is pinned in crt.test; a busy GPU can only delay the first frame of the animation
  await expect(dialog).toHaveAttribute('data-crt', 'open', { timeout: 6000 });
  // switched on, the card keeps its whole neon glow: nothing clips it any more
  await expect.poll(() => dialog.evaluate((el) => getComputedStyle(el).clipPath)).toBe('none');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveAttribute('data-crt', 'closing');
  await expect(page).toHaveURL(/\/en$/, { timeout: 15_000 });
  await expect(open).toBeFocused();
});

test('reduced motion: the case just appears', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await gotoScene(page, '/en/work/altus');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toHaveAttribute('data-crt', 'open', { timeout: 15_000 });
  const clips = await dialog.evaluate((el) =>
    el.getAnimations({ subtree: true }).filter((a) => (a.effect as KeyframeEffect | null)?.getKeyframes().some((k) => 'clipPath' in k)).length,
  );
  expect(clips).toBe(0);
});

test('a direct link opens with the same switch-on', async ({ page }) => {
  await gotoScene(page, '/en/work/altus');
  const dialog = page.getByRole('dialog');
  // the server's markup already says "opening": wait for the page to start the switch-on
  await expect.poll(() => firstFrame(page), { timeout: 15_000 }).not.toBeNull();
  expect(insetTop((await firstFrame(page))!.clip)).toBeGreaterThanOrEqual(45);
  // the duration is pinned in crt.test; a busy GPU can only delay the first frame of the animation
  await expect(dialog).toHaveAttribute('data-crt', 'open', { timeout: 6000 });
});

test("the case's tubes burn in Work's orange", async ({ page }) => {
  await gotoScene(page, '/en/work/devdigest');
  const dialog = page.getByRole('dialog');
  for (const tube of [dialog.getByRole('button', { name: 'Close' }), dialog.getByRole('link', { name: 'Source' })])
    expect(await tube.evaluate((el) => getComputedStyle(el).getPropertyValue('--c').trim())).toBe('#ff8a2a');
});

test('before the page wakes up, a case in the server markup is still a dark line, not a full card', async ({ page }) => {
  await gotoScene(page);
  const probe = (reduced: boolean) =>
    page.evaluate(async (r) => {
      const el = document.createElement('div');
      el.className = 'crt-card';
      el.dataset.crt = 'pending';
      document.body.appendChild(el);
      const s = getComputedStyle(el);
      const out = r ? s.opacity : s.clipPath;
      el.remove();
      return out;
    }, reduced);
  expect(await probe(false)).toMatch(/^inset\(49\.5%/);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await probe(true)).toBe('0');
});
