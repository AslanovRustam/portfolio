// Captures a poster for every project card from its live site: Chromium at 1440×900, a screenshot after
// the page has settled, then 1200 px wide WebP. Idempotent: existing posters are kept unless --force.
// Usage: npm run posters [-- --force] [-- --only=slug,slug]
import { mkdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { PROJECTS } from '../src/content/projects.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const force = process.argv.includes('--force');
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7).split(',');

/**
 * Per-site tweaks, so a poster shows the page rather than a cookie banner or a loader:
 * a longer settle time, a scroll position, or selectors to click first.
 */
const TWEAKS = {
  // the intro animation of the 3D cabin takes a while
  aslanair: { wait: 12_000 },
  'aslan-can': { wait: 10_000 },
  altus: { wait: 8_000 },
  // accept the cookie banners
  gengo: { click: ['button:has-text("Хорошо")'] },
  moto: { click: ['button:has-text("Прийняти")'] },
};

const exists = async (p) => !!(await stat(p).catch(() => null));

const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
let failed = 0;

for (const p of PROJECTS) {
  if (!p.poster || (only && !only.includes(p.slug))) continue;
  const out = join(root, 'public', p.poster);
  if (!force && (await exists(out))) {
    console.log(`skip ${p.slug} (exists)`);
    continue;
  }
  const url = p.links.live ?? p.links.site;
  const tweak = TWEAKS[p.slug] ?? {};
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
    for (const sel of tweak.click ?? []) await page.locator(sel).first().click({ timeout: 5_000 }).catch(() => {});
    if (tweak.scroll) await page.mouse.wheel(0, tweak.scroll);
    await page.waitForTimeout(tweak.wait ?? 6_000);
    const png = await page.screenshot({ type: 'png' });
    await mkdir(dirname(out), { recursive: true });
    await sharp(png).resize({ width: 1200 }).webp({ quality: 78 }).toFile(out);
    console.log(`ok   ${p.slug} ← ${url}`);
  } catch (e) {
    failed++;
    console.error(`fail ${p.slug} ← ${url}: ${e.message.split('\n')[0]}`);
  } finally {
    await page.close();
  }
}

await browser.close();
process.exit(failed ? 1 : 0);
