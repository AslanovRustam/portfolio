import { expect, test } from '@playwright/test';
import en from '../../messages/en.json';
import { gotoScene, progress, scrollTo, waitReady } from './helpers';

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
  await page.getByRole('button', { name: 'About' }).click();
  await expect.poll(() => progress(page), { timeout: 8000 }).toBeCloseTo(0.48, 1);
  await page.getByRole('link', { name: 'RU', exact: true }).click();
  await expect(page).toHaveURL(/\/ru(#about)?$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
});

test('each section panel shows only inside its window, and the scene steps aside', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  for (const [p, id] of [
    [0.26, 'work'],
    [0.48, 'about'],
    [0.695, 'stack'],
    [0.9, 'contact'],
  ] as const) {
    await scrollTo(page, p);
    await expect(page.locator(`section#${id}`)).toBeVisible();
    await expect
      .poll(() => page.evaluate((s) => window.__portfolio.probe(`panel:${s}`) as number, id))
      .toBeGreaterThan(0.95);
  }
  await expect
    .poll(() => page.evaluate(() => (window.__portfolio.probe('viewOffset') as { x: number }).x), { timeout: 8000 })
    .toBeGreaterThan(0.15);
  await scrollTo(page, 0.37); // a turn: no panel
  await expect(page.locator('section#about')).toBeHidden();
});

// Review Focus 1
test('HTML over a sign swallows the pointer: no sign hover, no sign click', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, 0.26);
  const { x, y } = (await page.evaluate(() => window.__portfolio.probe('signScreen:work'))) as { x: number; y: number };
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
  await expect.poll(() => progress(page), { timeout: 8000 }).toBeCloseTo(0.695, 1);
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
  await page.goto('/en');
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
  await page.locator('section#stack').getByText('React', { exact: true }).hover();
  await expect.poll(() => page.evaluate(() => window.__portfolio.probe('stickerGlow'))).toBe('react');
  await page.mouse.move(5, 5);
  await expect.poll(() => page.evaluate(() => window.__portfolio.probe('stickerGlow'))).toBeNull();
});

// final review: switching language mid-journey must not throw the visitor back to the blueprint
test('switching language keeps the visitor at the same section', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await page.getByRole('button', { name: 'About' }).click();
  await expect.poll(() => progress(page), { timeout: 8000 }).toBeCloseTo(0.48, 1);
  await page.getByRole('link', { name: 'RU', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 30_000 }).toBeGreaterThan(2000);
  await page.mouse.wheel(0, 100);
  await page.waitForTimeout(800);
  expect(await progress(page)).toBeCloseTo(0.48, 1);
});

// final review: a panel taller than its sheet must not trap the wheel
test('the wheel over a long panel scrolls it, then carries on along the street', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, 0.42);
  const box = (await page.locator('section#about').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let i = 0; i < 25; i++) {
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(60);
  }
  await expect.poll(() => progress(page), { timeout: 8000 }).toBeGreaterThan(0.5);
});
