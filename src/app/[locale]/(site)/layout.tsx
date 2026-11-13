import { useTranslations } from 'next-intl';
import HooksMount from '@/dev/HooksMount';
import SmoothScroll from '@/scroll/SmoothScroll';
import ExperienceGate from '@/ui/ExperienceGate';
import Hero from '@/ui/Hero';
import SiteHeader from '@/ui/SiteHeader';

/**
 * The persistent experience: scene, scroll, header and sections. It wraps both the home page and the
 * case pages, so opening /work/<slug> only adds an overlay and never remounts the canvas.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations();
  return (
    <>
      <ExperienceGate
        loaderLabel={t('loader.label')}
        fallbackTitle={t('fallback.title')}
        fallbackBody={t('fallback.body')}
      />
      <SiteHeader
        name={t('hero.name')}
        labels={{
          work: t('nav.work'),
          about: t('nav.about'),
          stack: t('nav.stack'),
          contact: t('nav.contact'),
          cv: t('nav.cv'),
          language: t('nav.language'),
        }}
      />
      <main className="relative z-10">
        <SmoothScroll />
        <HooksMount />
        <Hero name={t('hero.name')} role={t('hero.role')} cue={t('hero.cue')} />
        {/* the scroll track the whole journey is measured against; clicks pass through to the scene */}
        <div id="journey" className="pointer-events-none" style={{ height: '1100svh' }} />
      </main>
      {children}
    </>
  );
}
