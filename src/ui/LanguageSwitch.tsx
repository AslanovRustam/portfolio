'use client';

import { useLocale } from 'next-intl';
import { rememberPlace } from '@/experience/place';
import { experienceStore, useExperience } from '@/experience/store';
import { hashFor } from '@/experience/workStops';
import { Link, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { flicker, neonStyle } from './neon';

/**
 * The same page in each language: a case stays open across the switch; the section (in Work, the project)
 * travels along as a hash, and `remember` hands the exact place inside it over to the new page.
 */
export function useLanguageLinks() {
  const current = useLocale();
  const pathname = usePathname();
  const hash = useExperience((s) => hashFor(s.progress));
  const href = hash ? `${pathname}#${hash}` : pathname;
  return routing.locales.map((locale) => ({
    locale,
    href,
    current: locale === current,
    remember: () => rememberPlace(experienceStore.getState().progress),
  }));
}

/**
 * EN / RU / UK as small neon tubes in a row (laptops); the current one burns steady and underlined. On
 * phones the header shows LanguagePicker instead.
 */
export default function LanguageSwitch({ label }: { label: string }) {
  const links = useLanguageLinks();
  return (
    <ul aria-label={label} className="flex">
      {links.map((l, i) => (
        <li key={l.locale}>
          <Link
            href={l.href}
            locale={l.locale}
            hrefLang={l.locale}
            lang={l.locale}
            scroll={false}
            aria-current={l.current ? 'true' : undefined}
            onClick={l.remember}
            className="neon neon-flicker text-[13px] sm:text-[15px] lg:text-[17px]"
            style={{ ...neonStyle('lang'), ...flicker(i + 7) }}
          >
            {l.locale.toUpperCase()}
          </Link>
        </li>
      ))}
    </ul>
  );
}
