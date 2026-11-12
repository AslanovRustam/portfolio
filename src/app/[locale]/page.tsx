import { useTranslations } from 'next-intl';
import Hero from '@/ui/Hero';
import HooksMount from '@/dev/HooksMount';
import SmoothScroll from '@/scroll/SmoothScroll';
import ExperienceGate from '@/ui/ExperienceGate';

export default function HomePage() {
  const t = useTranslations();
  return (
    <>
      <ExperienceGate
        loaderLabel={t('loader.label')}
        fallbackTitle={t('fallback.title')}
        fallbackBody={t('fallback.body')}
      />
      <main className="relative z-10">
        <SmoothScroll />
        <HooksMount />
        <Hero name={t('hero.name')} role={t('hero.role')} cue={t('hero.cue')} />
        {/* the scroll track the whole journey is measured against; clicks pass through to the scene */}
        <div id="journey" className="pointer-events-none" style={{ height: '700svh' }} />
      </main>
    </>
  );
}
