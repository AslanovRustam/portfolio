'use client';

import { useLocale } from 'next-intl';
import { rememberPlace } from '@/experience/place';
import { experienceStore, useExperience } from '@/experience/store';
import { hashFor } from '@/experience/workStops';
import { usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

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
