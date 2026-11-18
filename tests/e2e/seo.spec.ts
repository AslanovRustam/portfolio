import { expect, test } from '@playwright/test';
import en from '../../messages/en.json';
import ru from '../../messages/ru.json';
import { CONTACTS } from '../../src/content/contacts';

/** Link previews and search engines (M6): every URL absolute, every page naming itself in its language. */

const href = (page: import('@playwright/test').Page, sel: string) => page.locator(sel).first().getAttribute('href');
const meta = (page: import('@playwright/test').Page, attr: 'property' | 'name', key: string) =>
  page.locator(`meta[${attr}="${key}"]`).first().getAttribute('content');

test('the home page names its own canonical, every language and x-default, as absolute URLs', async ({ page }) => {
  await page.goto('/ru');
  expect(await href(page, 'link[rel="canonical"]')).toMatch(/^https?:\/\/[^/]+\/ru$/);
  for (const [lang, end] of [
    ['en', '/en'],
    ['ru', '/ru'],
    ['uk', '/uk'],
    ['x-default', '/en'],
  ])
    expect(await href(page, `link[rel="alternate"][hreflang="${lang}"]`)).toMatch(new RegExp(`^https?://[^/]+${end}$`));
});

test('Open Graph and Twitter tags in the page’s language', async ({ page }) => {
  await page.goto('/ru');
  expect(await meta(page, 'property', 'og:title')).toBe(ru.meta.title);
  expect(await meta(page, 'property', 'og:description')).toBe(ru.meta.description);
  expect(await meta(page, 'property', 'og:locale')).toBe('ru_RU');
  expect(await meta(page, 'property', 'og:type')).toBe('website');
  expect(await meta(page, 'property', 'og:site_name')).toBe(ru.meta.name);
  expect(await meta(page, 'property', 'og:url')).toMatch(/^https?:\/\/[^/]+\/ru$/);
  expect(await meta(page, 'name', 'twitter:card')).toBe('summary_large_image');
});

test('a case page names itself, not the home page', async ({ page }) => {
  await page.goto('/uk/work/gipper');
  expect(await href(page, 'link[rel="canonical"]')).toMatch(/\/uk\/work\/gipper$/);
  expect(await meta(page, 'property', 'og:url')).toMatch(/\/uk\/work\/gipper$/);
  expect(await href(page, 'link[rel="alternate"][hreflang="en"]')).toMatch(/\/en\/work\/gipper$/);
  expect(await href(page, 'link[rel="alternate"][hreflang="x-default"]')).toMatch(/\/en\/work\/gipper$/);
});

// final review: a case's own openGraph replaced the layout's, and with it the preview image
test('a shared case link unfurls with the preview image of its language', async ({ page, request }) => {
  await page.goto('/uk/work/gipper');
  const og = await meta(page, 'property', 'og:image');
  expect(og).toMatch(/^https?:\/\/[^/]+\/uk\/opengraph-image/);
  expect(await meta(page, 'name', 'twitter:image')).toBe(og);
  const res = await request.get(new URL(og!).pathname + new URL(og!).search, { maxRedirects: 0 });
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toBe('image/png');
});

test('the home page carries a Person in JSON-LD without the email', async ({ page }) => {
  await page.goto('/ru');
  const raw = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(raw).not.toContain(CONTACTS.email);
  const person = JSON.parse(raw!);
  expect(person['@type']).toBe('Person');
  expect(person.name).toBe(ru.meta.name);
  expect(person.alternateName).toBe(en.meta.name);
  expect(person.jobTitle).toBe(ru.meta.role);
  expect(person.sameAs).toHaveLength(3);
});

// ——— the preview image, sitemap and robots ———

const png = (b: Buffer) => ({ width: b.readUInt32BE(16), height: b.readUInt32BE(20), sig: b.subarray(1, 4).toString() });

test('each language’s preview image is a 1200×630 PNG', async ({ page, request }) => {
  const bodies: Buffer[] = [];
  for (const lang of ['en', 'ru', 'uk']) {
    await page.goto(`/${lang}`);
    const url = await meta(page, 'property', 'og:image');
    expect(url).toMatch(/^https?:\/\//);
    expect(await meta(page, 'property', 'og:image:width')).toBe('1200');
    // the absolute URL names the production host; fetch the same path from this server
    const res = await request.get(new URL(url!).pathname + new URL(url!).search, { maxRedirects: 0 });
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toBe('image/png');
    const body = await res.body();
    expect(png(body)).toEqual({ width: 1200, height: 630, sig: 'PNG' });
    bodies.push(body);
  }
  expect(bodies[0].equals(bodies[1])).toBe(false);
});

test('sitemap lists the home and every case in three languages, with alternates', async ({ request }) => {
  const { PROJECTS } = await import('../../src/content/projects');
  const res = await request.get('/sitemap.xml', { maxRedirects: 0 });
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('xml');
  const xml = await res.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  for (const l of ['en', 'ru', 'uk']) {
    expect(locs.some((u) => new RegExp(`^https?://[^/]+/${l}$`).test(u))).toBe(true);
    for (const p of PROJECTS) expect(locs.some((u) => u.endsWith(`/${l}/work/${p.slug}`))).toBe(true);
  }
  expect(locs.every((u) => /^https?:\/\//.test(u))).toBe(true);
  expect(xml).toContain('hreflang="uk"');
  expect(xml).toContain('hreflang="x-default"');
});

test('robots allows everything and points at the sitemap', async ({ request }) => {
  const res = await request.get('/robots.txt', { maxRedirects: 0 });
  expect(res.status()).toBe(200);
  const txt = await res.text();
  expect(txt).toMatch(/Allow: \/\s/);
  expect(txt).toMatch(/Sitemap: https?:\/\/[^/]+\/sitemap\.xml/);
});
