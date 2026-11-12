import { useTranslations } from 'next-intl';
import HooksMount from '@/dev/HooksMount';
import SmoothScroll from '@/scroll/SmoothScroll';

export default function HomePage() {
  const t = useTranslations('hero');
  return (
    <main>
      <SmoothScroll />
      <HooksMount />
      <h1>{t('name')}</h1>
      <p>{t('role')}</p>
      {/* the scroll track the whole journey is measured against */}
      <div id="journey" style={{ height: '700svh' }} />
    </main>
  );
}
