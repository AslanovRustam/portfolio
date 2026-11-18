import type { Metadata } from 'next';
import { JetBrains_Mono, Oswald } from 'next/font/google';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { pageMeta } from '@/i18n/site';
import '../globals.css';

const mono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin', 'cyrillic'],
});

/** The street-plate face: condensed and heavy like Anton on the signs, but with Cyrillic (Anton has none). */
const plate = Oswald({
  variable: '--font-oswald',
  subsets: ['latin', 'cyrillic'],
  weight: ['500', '600', '700'],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'meta' });
  return pageMeta({ locale, path: '', title: t('title'), description: t('description'), siteName: t('name') });
}

export default async function LocaleLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  return (
    <html lang={locale} className={`${mono.variable} ${plate.variable} antialiased`}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
