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
