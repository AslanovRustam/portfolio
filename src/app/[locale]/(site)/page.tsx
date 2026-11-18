import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { personJsonLd } from '@/i18n/site';

/**
 * The home route shows no overlay: the experience itself lives in the (site) layout. It carries Rustam as a
 * schema.org Person for search engines (JSON-LD, `<` escaped as the Next.js guide does).
 */
/** `<` as the six characters of its JSON escape, so no `</script>` can end the tag early */
const LT = `${String.fromCharCode(92)}u003c`;

export default async function HomePage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return null;
  const t = await getTranslations({ locale, namespace: 'meta' });
  const person = personJsonLd({ locale, name: t('name'), altName: t('altName'), role: t('role') });
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(person).replace(/</g, LT) }}
    />
  );
}
