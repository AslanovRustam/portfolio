import type { MetadataRoute } from 'next';
import { siteUrl } from '@/i18n/site';

/** Everything is open to crawlers; the sitemap lists the pages in every language. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: new URL('/sitemap.xml', siteUrl()).href,
  };
}
