import { expect, it } from 'vitest';
import { CONTACTS } from '@/content/contacts';
import { pageMeta, personJsonLd, siteUrl } from '@/i18n/site';

it('the site URL comes from NEXT_PUBLIC_SITE_URL, else Vercel’s production URL, else localhost', () => {
  expect(siteUrl({ NEXT_PUBLIC_SITE_URL: 'https://a.dev' }).origin).toBe('https://a.dev');
  expect(siteUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'b.vercel.app' }).origin).toBe('https://b.vercel.app');
  expect(siteUrl({ NEXT_PUBLIC_SITE_URL: 'https://a.dev', VERCEL_PROJECT_PRODUCTION_URL: 'b.vercel.app' }).origin).toBe(
    'https://a.dev',
  );
  expect(siteUrl({}).origin).toBe('http://localhost:3000');
});

it('a page names its own canonical, every language and x-default, and Open Graph in its language', () => {
  const m = pageMeta({ locale: 'ru', path: '/work/gipper', title: 'T', description: 'D', siteName: 'Рустам Асланов' });
  expect(m.alternates?.canonical).toBe('/ru/work/gipper');
  expect(m.alternates?.languages).toEqual({
    en: '/en/work/gipper',
    ru: '/ru/work/gipper',
    uk: '/uk/work/gipper',
    'x-default': '/en/work/gipper',
  });
  const og = m.openGraph as Record<string, unknown>;
  expect(og.locale).toBe('ru_RU');
  expect(og.alternateLocale).toEqual(['en_US', 'uk_UA']);
  expect(og.url).toBe('/ru/work/gipper');
  expect(og.type).toBe('website');
  expect(og.siteName).toBe('Рустам Асланов');
  expect((m.twitter as Record<string, unknown>).card).toBe('summary_large_image');
  expect(pageMeta({ locale: 'en', path: '', title: 'T', description: 'D', siteName: 'S' }).alternates?.canonical).toBe('/en');
});

it('the Person in JSON-LD has both spellings, the role and the profiles, never the email', () => {
  const p = personJsonLd({ locale: 'uk', name: 'Рустам Асланов', altName: 'Rustam Aslanov', role: 'Front-end розробник' });
  expect(p['@type']).toBe('Person');
  expect(p.name).toBe('Рустам Асланов');
  expect(p.alternateName).toBe('Rustam Aslanov');
  expect(p.jobTitle).toBe('Front-end розробник');
  expect(p.url).toBe('http://localhost:3000/uk');
  expect(p.sameAs).toEqual([CONTACTS.linkedin, CONTACTS.github, CONTACTS.telegram]);
  expect(JSON.stringify(p)).not.toContain(CONTACTS.email);
  expect(JSON.stringify(p)).not.toContain('@gmail');
});

it('a page below the preview image’s own carries it in Open Graph', () => {
  const m = pageMeta({ locale: 'uk', path: '/work/gipper', title: 'T', description: 'D', siteName: 'S', image: { url: '/uk/opengraph-image', alt: 'A' } });
  expect((m.openGraph as { images: unknown }).images).toEqual([{ url: '/uk/opengraph-image', width: 1200, height: 630, alt: 'A' }]);
  expect((pageMeta({ locale: 'uk', path: '', title: 'T', description: 'D', siteName: 'S' }).openGraph as { images?: unknown }).images).toBeUndefined();
});
