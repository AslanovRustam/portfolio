import { useTranslations } from 'next-intl';

export default function HomePage() {
  const t = useTranslations('hero');
  return (
    <main>
      <h1>{t('name')}</h1>
      <p>{t('role')}</p>
    </main>
  );
}
