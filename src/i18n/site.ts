import type { Metadata } from 'next';
import { CONTACTS } from '@/content/contacts';
import { type Locale, routing } from './routing';

type Env = Record<string, string | undefined>;

/**
 * Where the site lives, for every absolute URL it gives out (canonical, hreflang, Open Graph, sitemap):
 * NEXT_PUBLIC_SITE_URL if set, else the production URL Vercel puts in every build (a custom domain is
 * picked up by itself), else the local dev server.
 */
export function siteUrl(env: Env = process.env): URL {
  if (env.NEXT_PUBLIC_SITE_URL) return new URL(env.NEXT_PUBLIC_SITE_URL);
  if (env.VERCEL_PROJECT_PRODUCTION_URL) return new URL(`https://${env.VERCEL_PROJECT_PRODUCTION_URL}`);
  return new URL('http://localhost:3000');
}

/** Open Graph's names for the site's languages. */
export const OG_LOCALE: Readonly<Record<Locale, string>> = { en: 'en_US', ru: 'ru_RU', uk: 'uk_UA' };

/** The same page in every language, x-default on English: paths relative to siteUrl(). */
export function languagePaths(path: string): Record<string, string> {
  return { ...Object.fromEntries(routing.locales.map((l) => [l, `/${l}${path}`])), 'x-default': `/en${path}` };
}

/**
 * A page's metadata in one language: its own canonical, the same page in every language with x-default on
 * English, Open Graph and a large Twitter card. `path` is '' for home, '/work/<slug>' for a case.
 */
export function pageMeta(o: {
  locale: Locale;
  path: string;
  title: string;
  description: string;
  siteName: string;
  /**
   * The preview image, for a page below the one whose opengraph-image file draws it: Next merges metadata
   * shallowly, so a page's own openGraph replaces the layout's, image and all.
   */
  image?: { url: string; alt: string };
}): Metadata {
  const at = (l: Locale) => `/${l}${o.path}`;
  return {
    metadataBase: siteUrl(),
    title: o.title,
    description: o.description,
    alternates: {
      canonical: at(o.locale),
      languages: languagePaths(o.path),
    },
    openGraph: {
      type: 'website',
      url: at(o.locale),
      title: o.title,
      description: o.description,
      siteName: o.siteName,
      locale: OG_LOCALE[o.locale],
      alternateLocale: routing.locales.filter((l) => l !== o.locale).map((l) => OG_LOCALE[l]),
      ...(o.image && { images: [{ url: o.image.url, width: 1200, height: 630, alt: o.image.alt }] }),
    },
    twitter: { card: 'summary_large_image', title: o.title, description: o.description },
  };
}

/** Rustam as a schema.org Person, for search engines: the name as the page spells it, never the email. */
export function personJsonLd(o: { locale: Locale; name: string; altName: string; role: string }): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: o.name,
    alternateName: o.altName,
    jobTitle: o.role,
    url: new URL(`/${o.locale}`, siteUrl()).href,
    sameAs: [CONTACTS.linkedin, CONTACTS.github, CONTACTS.telegram],
  };
}
