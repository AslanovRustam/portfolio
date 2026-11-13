export type ProjectSlug =
  | 'gipper'
  | 'aslanair'
  | 'gengo'
  | 'moto'
  | 'altus'
  | 'aslan-can'
  | 'kolir'
  | 'tuti'
  | 'devdigest';

export interface Project {
  slug: ProjectSlug;
  featured: boolean;
  year: string;
  stack: readonly string[];
  links: { live?: string; repo?: string; site?: string };
  /** /projects/<slug>.webp, or null → blueprint placeholder card */
  poster: string | null;
  badge?: 'commercial' | 'course';
  /** a compact card that still opens a full case: task, what I did, result */
  detailed?: boolean;
  /** shown on the card and the case while the product is not finished */
  status?: 'in-development';
}

/** The work shown on the site, in the spec's order (§6.2): four featured cases, then compact cards. */
export const PROJECTS: readonly Project[] = [
  {
    slug: 'gipper',
    featured: true,
    year: '2025–2026',
    stack: ['React', 'MobX', 'Fabric.js', 'Skia / CanvasKit', 'HarfBuzz', 'Node.js', 'S3', 'Module Federation'],
    links: { site: 'https://www.gipper.com/' },
    poster: '/projects/gipper.webp',
    badge: 'commercial',
  },
  {
    slug: 'aslanair',
    featured: true,
    year: '2026',
    stack: ['React Three Fiber', 'drei', 'GSAP', 'Lenis', 'Blender', 'Playwright', 'Vitest'],
    links: { live: 'https://aslanair.vercel.app', repo: 'https://github.com/AslanovRustam/aslanair' },
    poster: '/projects/aslanair.webp',
  },
  {
    slug: 'gengo',
    featured: true,
    year: '2026',
    stack: ['Next.js 16', 'React 19', 'TypeScript', 'Supabase', 'TanStack Query', 'OpenAI', 'OpenRouter'],
    // the repository is private
    links: { live: 'https://gen-go.ai/' },
    poster: '/projects/gengo.webp',
    badge: 'commercial',
  },
  {
    slug: 'moto',
    featured: true,
    year: '2026',
    stack: ['Next.js', 'Payload CMS', 'Postgres'],
    // preview deploy; the repository is private
    links: { live: 'https://motoagregtor-motoaggregator-tlvw65-032779-2-24-123-177.sslip.io/' },
    poster: '/projects/moto.webp',
    badge: 'commercial',
    status: 'in-development',
  },
  {
    slug: 'altus',
    featured: false,
    year: '2026',
    stack: ['Vite', 'React', 'GSAP', 'Lenis'],
    links: { live: 'https://altus-liard.vercel.app', repo: 'https://github.com/AslanovRustam/altus' },
    poster: '/projects/altus.webp',
  },
  {
    slug: 'aslan-can',
    featured: false,
    year: '2025',
    stack: ['React Three Fiber', 'drei', 'GSAP', 'Prismic'],
    links: { live: 'https://aslan-can.vercel.app' },
    poster: '/projects/aslan-can.webp',
  },
  {
    slug: 'kolir',
    featured: false,
    year: '2026',
    stack: ['Next.js', 'Payload CMS', 'pdf-lib', 'sharp', 'Vercel'],
    // the repository is private
    links: { live: 'https://www.kolir.agency' },
    poster: '/projects/kolir.webp',
    badge: 'commercial',
    detailed: true,
  },
  {
    slug: 'tuti',
    featured: false,
    year: '2026',
    stack: ['Next.js 15', 'Tailwind 4', 'GitHub API', 'Python + Pillow'],
    links: { live: 'https://tuti-tau.vercel.app/' },
    poster: '/projects/tuti.webp',
    badge: 'commercial',
    detailed: true,
  },
  {
    slug: 'devdigest',
    featured: false,
    year: '2026',
    stack: ['Next.js 15', 'Fastify', 'Drizzle', 'Postgres + pgvector', 'OpenRouter', 'MCP', 'Zod'],
    links: { repo: 'https://github.com/AslanovRustam/dev-digest' },
    // a frame of the studio itself: it runs locally, there is no public page to capture
    poster: '/projects/devdigest.webp',
    badge: 'course',
    detailed: true,
  },
];

/** Commercial projects under NDA: named in one line each, never shown (from the résumé). */
export const NDA_KEYS = ['port', 'safety', 'social', 'architecture'] as const;

/** Commercial work whose code is not public: the case says so instead of linking a repository. */
export function repoIsPrivate(p: Project): boolean {
  return p.badge === 'commercial' && !p.links.repo;
}

export function projectBySlug(slug: string): Project | undefined {
  return PROJECTS.find((p) => p.slug === slug);
}
