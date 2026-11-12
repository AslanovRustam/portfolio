import { useTranslations } from 'next-intl';
import TestHooks from '@/dev/TestHooks';
import SmoothScroll from '@/scroll/SmoothScroll';

export default function HomePage() {
  const t = useTranslations('hero');
  return (
    <main>
      <SmoothScroll />
      <TestHooks />
      <h1>{t('name')}</h1>
      <p>{t('role')}</p>
      {/* the scroll track the whole journey is measured against */}
      <div id="journey" style={{ height: '700svh' }} />
    </main>
  );
}
