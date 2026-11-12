import { useTranslations } from 'next-intl';
import HooksMount from '@/dev/HooksMount';
import SmoothScroll from '@/scroll/SmoothScroll';
import ExperienceGate from '@/ui/ExperienceGate';

export default function HomePage() {
  const t = useTranslations('hero');
  return (
    <>
      <ExperienceGate />
      <main className="relative z-10">
        <SmoothScroll />
        <HooksMount />
        <h1>{t('name')}</h1>
        <p>{t('role')}</p>
        {/* the scroll track the whole journey is measured against; clicks pass through to the scene */}
        <div id="journey" className="pointer-events-none" style={{ height: '700svh' }} />
      </main>
    </>
  );
}
