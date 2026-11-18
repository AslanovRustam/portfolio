import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { PROJECTS, projectBySlug } from '@/content/projects';
import { routing } from '@/i18n/routing';
import { pageMeta } from '@/i18n/site';
import CaseOverlay from '@/ui/sections/CaseOverlay';

export function generateStaticParams() {
  return PROJECTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<'/[locale]/work/[slug]'>): Promise<Metadata> {
  const { locale, slug } = await params;
  const project = projectBySlug(slug);
  if (!project || !hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale });
  return pageMeta({
    locale,
    path: `/work/${project.slug}`,
    title: `${t(`projects.${project.slug}.title`)} — ${t('meta.name')}`,
    description: t(`projects.${project.slug}.summary`),
    siteName: t('meta.name'),
  });
}

async function Case({ params }: Pick<PageProps<'/[locale]/work/[slug]'>, 'params'>) {
  const { slug } = await params;
  const project = projectBySlug(slug);
  if (!project) notFound();
  return <CaseOverlay slug={project.slug} />;
}

/**
 * A project's case: the overlay over the persistent street from the (site) layout. The slug is URL
 * data, so it is read behind Suspense and the route's shell stays shared by every case link.
 */
export default function CasePage({ params }: PageProps<'/[locale]/work/[slug]'>) {
  return (
    <Suspense
      // the street dims at once; the case content follows (prerendered, so in production it is instant)
      fallback={<div data-ui aria-hidden="true" className="fixed inset-0 z-[25] bg-[#050507]/70 backdrop-blur-sm" />}
    >
      <Case params={params} />
    </Suspense>
  );
}
