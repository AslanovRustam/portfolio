'use client';

import { useLocale } from 'next-intl';
import { useExperience } from '@/experience/store';
import { hashFor } from '@/experience/workStops';
import { Link, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { flicker, neonStyle } from './neon';

/**
 * EN / RU / UK: the same page in another language, as small neon tubes; the current one burns steady and
 * underlined. A case stays open across the switch, and the section (in Work, the project) the visitor is
 * at travels along as a hash, so the street picks up where it was.
 */
export default function LanguageSwitch({ label }: { label: string }) {
  const current = useLocale();
  const pathname = usePathname();
  const hash = useExperience((s) => hashFor(s.progress));
  const href = hash ? `${pathname}#${hash}` : pathname;
  return (
    <ul aria-label={label} className="flex">
      {routing.locales.map((l, i) => (
        <li key={l}>
          <Link
            href={href}
            locale={l}
            hrefLang={l}
            lang={l}
            scroll={false}
            aria-current={l === current ? 'true' : undefined}
            className="neon neon-flicker text-[13px] sm:text-[15px] lg:text-[17px]"
            style={{ ...neonStyle('lang'), ...flicker(i + 7) }}
          >
            {l.toUpperCase()}
          </Link>
        </li>
      ))}
    </ul>
  );
}
