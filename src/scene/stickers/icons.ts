// Named imports only: `import * as` pulled all ~3,500 simple-icons (≈2 MB gzip) into the scene chunk.
import {
  siBitbucket,
  siClaude,
  siContentful,
  siCss,
  siGit,
  siGithub,
  siGitlab,
  siGreensock,
  siHtml5,
  siJavascript,
  siMobx,
  siN8n,
  siNestjs,
  siNextdotjs,
  siNodedotjs,
  siPayloadcms,
  siPrismic,
  siReact,
  siRedux,
  siSanity,
  siSass,
  siTailwindcss,
  siThreedotjs,
  siTypescript,
} from 'simple-icons';

interface SimpleIcon {
  title: string;
  slug: string;
  hex: string;
  path: string;
}

const bySlug = new Map<string, SimpleIcon>(
  [
    siHtml5,
    siCss,
    siSass,
    siTailwindcss,
    siJavascript,
    siTypescript,
    siReact,
    siNextdotjs,
    siRedux,
    siMobx,
    siNodedotjs,
    siNestjs,
    siPrismic,
    siContentful,
    siSanity,
    siPayloadcms,
    siThreedotjs,
    siGreensock,
    siGit,
    siGithub,
    siGitlab,
    siBitbucket,
    siN8n,
    siClaude,
  ].map((i) => [i.slug, i]),
);

/** A brand logo from simple-icons (CC0 data; brand marks belong to their owners). */
export function getIcon(slug: string): { title: string; path: string; hex: string } | null {
  const i = bySlug.get(slug);
  return i ? { title: i.title, path: i.path, hex: `#${i.hex}` } : null;
}
