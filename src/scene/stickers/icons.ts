import * as icons from 'simple-icons';

interface SimpleIcon {
  title: string;
  slug: string;
  hex: string;
  path: string;
}

const bySlug = new Map<string, SimpleIcon>(
  Object.values(icons as Record<string, unknown>)
    .filter((v): v is SimpleIcon => typeof v === 'object' && v !== null && 'slug' in v && 'path' in v)
    .map((v) => [v.slug, v]),
);

/** A brand logo from simple-icons (CC0 data; brand marks belong to their owners). */
export function getIcon(slug: string): { title: string; path: string; hex: string } | null {
  const i = bySlug.get(slug);
  return i ? { title: i.title, path: i.path, hex: `#${i.hex}` } : null;
}
