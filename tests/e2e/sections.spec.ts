import { expect, test } from '@playwright/test';
import en from '../../messages/en.json';
import { gotoScene, HOLD, progress, scrollTo, stop, swungIn, switchLanguage, waitReady } from './helpers';

test('a case URL renders inside the same experience', async ({ page }) => {
  // canvas persistence across client navigation is pinned in work.spec, once cards exist to click
  await gotoScene(page, '/en/work/altus');
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 2, name: /altus/i })).toBeVisible();
});

test('each locale names its siblings for search engines', async ({ page }) => {
  await page.goto('/en');
  await expect(page.locator('link[rel="alternate"][hreflang="uk"]')).toHaveAttribute('href', /\/uk$/);
});

test('header nav scrolls to a section and the language switch keeps the path', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page); // a click inside the scene's first, shader-compiling frames is answered seconds late
  await page.getByRole('button', { name: 'About' }).click();
  await expect.poll(() => progress(page), { timeout: 8000 }).toBeCloseTo(HOLD.about[0], 2);
  await switchLanguage(page, 'RU');
  await expect(page).toHaveURL(/\/ru(#about)?$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
});

test('the Work caption shows only in Work, and the scene steps aside in About', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, stop(0));
  await expect(page.locator('section#work')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.__portfolio.probe('panel:work') as number))
    .toBeGreaterThan(0.95);
  await scrollTo(page, 0.48);
  await expect(page.locator('section#work')).toBeHidden();
  await expect
    .poll(() => page.evaluate(() => (window.__portfolio.probe('viewOffset') as { x: number }).x), { timeout: 8000 })
    .toBeGreaterThan(0.15);
});

// Review Focus 1
test('HTML over a sign swallows the pointer: no sign hover, no sign click', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  // in Work the camera faces the TV wall; the ABOUT sign faces it in About
  await scrollTo(page, 0.48);
  const { x, y } = (await page.evaluate(() => window.__portfolio.probe('signScreen:about'))) as { x: number; y: number };
  await page.evaluate(
    ([px, py]) => {
      const d = document.createElement('div');
      d.setAttribute('data-ui', '');
      Object.assign(d.style, {
        position: 'fixed',
        left: `${px - 40}px`,
        top: `${py - 40}px`,
        width: '80px',
        height: '80px',
        zIndex: '50',
      });
      document.body.appendChild(d);
    },
    [x, y],
  );
  await page.mouse.move(x, y);
  await page.mouse.click(x, y);
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => document.body.style.cursor)).not.toBe('pointer');
  expect(await page.evaluate(() => window.__portfolio.state().hoveredSign)).toBeNull();
});

// Review Focus 5
test('a hash deep link opens its section, also without WebGL', async ({ page }) => {
  await page.goto('/en?webgl=0#stack');
  await page.waitForFunction(() => !!window.__portfolio);
  await expect.poll(() => progress(page), { timeout: 8000 }).toBeCloseTo(HOLD.stack[0], 2);
  await expect(page.locator('section#stack')).toBeVisible();
});

test('the hero carries the positioning line', async ({ page }) => {
  await gotoScene(page);
  await expect(page.locator('header[data-hero]')).toContainText(en.hero.line);
});

test('the hero line sits on one line on a laptop and a desktop, in every locale', async ({ page }) => {
  for (const size of [
    { width: 1280, height: 720 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(size);
    for (const l of ['en', 'ru', 'uk']) {
      await page.goto(`/${l}`);
      const lines = await page.locator('header[data-hero] p').last().evaluate((el) => {
        const s = getComputedStyle(el);
        const h = el.clientHeight - parseFloat(s.paddingTop) - parseFloat(s.paddingBottom);
        return Math.round(h / parseFloat(s.lineHeight));
      });
      expect(lines, `${l} at ${size.width}`).toBe(1);
    }
  }
});

test('header buttons show the hand cursor', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page); // the header comes once the street is there
  for (const name of ['Work', 'About', 'Stack', 'Contact'])
    await expect(page.getByRole('button', { name, exact: true })).toHaveCSS('cursor', 'pointer');
});

test('About lists the work path and, apart, the education', async ({ page }) => {
  await gotoScene(page);
  await scrollTo(page, 0.48);
  const about = page.locator('section#about');
  await expect(about.getByRole('heading', { level: 2 })).toBeVisible();
  // Rustam's order (gate round 1): Clickable, GoIT mentoring, then sales
  const path = about.locator('ol[data-path] > li');
  await expect(path).toHaveCount(4);
  await expect(path.nth(0)).toContainText(/Since 2023.*Team lead at Clickable Agency/);
  await expect(path.nth(1)).toContainText(/2021–2023.*Front-end developer at Clickable Agency/);
  await expect(path.nth(2)).toContainText(/Since 2022.*React mentor at GoIT/);
  await expect(path.nth(3)).toContainText(/2007–2021.*Sales at Henkel/);
  await expect(about.getByRole('heading', { name: 'Education' })).toBeVisible();
  const school = about.locator('ol[data-education] > li');
  await expect(school).toHaveCount(2);
  await expect(school.nth(0)).toContainText(/2020–2021.*Full Stack course at GoIT/);
  await expect(school.nth(1)).toContainText(/2002–2007.*Popov Odesa National Academy of Telecommunications/);
});

test('hovering a stack chip lights its sticker on the pole', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, 0.695);
  const react = page.locator('section#stack').getByText('React', { exact: true });
  await swungIn(react);
  await react.hover();
  await expect.poll(() => page.evaluate(() => window.__portfolio.probe('stickerGlow'))).toBe('react');
  await page.mouse.move(5, 5);
  await expect.poll(() => page.evaluate(() => window.__portfolio.probe('stickerGlow'))).toBeNull();
});

// final review: switching language mid-journey must not throw the visitor back to the blueprint
test('switching language keeps the visitor at the same section', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await page.getByRole('button', { name: 'About' }).click();
  await expect.poll(() => progress(page), { timeout: 8000 }).toBeCloseTo(HOLD.about[0], 2);
  await switchLanguage(page, 'RU');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  // the new page glides back to the place; a wheel during that glide would take over from it, so the
  // visitor's own scroll comes once the page has landed
  await expect.poll(() => progress(page), { timeout: 30_000 }).toBeCloseTo(HOLD.about[0], 2);
  await page.mouse.wheel(0, 100);
  await page.waitForTimeout(800);
  expect(await progress(page)).toBeCloseTo(HOLD.about[0], 1);
});

// the wheel over About's text is the page's wheel: it carries on along the street
test("the wheel over a section's text carries on along the street", async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, 0.42);
  const box = (await page.locator('#about .nbox').first().boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, Math.max(box.y + 20, 120));
  for (let i = 0; i < 25; i++) {
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(60);
  }
  await expect.poll(() => progress(page), { timeout: 8000 }).toBeGreaterThan(0.5);
});
