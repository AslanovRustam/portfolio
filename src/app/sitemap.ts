import type { MetadataRoute } from 'next';
import { PROJECTS } from '@/content/projects';
import { routing } from '@/i18n/routing';
import { languagePaths, siteUrl } from '@/i18n/site';

/** Home and every case, in every language, each naming its siblings (absolute URLs, as sitemaps want). */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const abs = (path: string) => new URL(path, base).href;
  const paths = ['', ...PROJECTS.map((p) => `/work/${p.slug}`)];
  return paths.flatMap((path) => {
    const languages = Object.fromEntries(Object.entries(languagePaths(path)).map(([l, p]) => [l, abs(p)]));
    return routing.locales.map((l) => ({ url: abs(`/${l}${path}`), alternates: { languages } }));
  });
}
