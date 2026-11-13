'use client';

import { useLocale } from 'next-intl';
import { useExperience } from '@/experience/store';
import { hashFor } from '@/experience/workStops';
import { Link, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

/**
 * EN / RU / UK: the same page in another language. A case stays open across the switch, and the
 * section (in Work, the project) the visitor is at travels along as a hash, so the street picks up
 * where it was.
 */
export default function LanguageSwitch({ label }: { label: string }) {
  const current = useLocale();
  const pathname = usePathname();
  const hash = useExperience((s) => hashFor(s.progress));
  const href = hash ? `${pathname}#${hash}` : pathname;
  return (
    <ul aria-label={label} className="flex gap-1">
      {routing.locales.map((l) => (
        <li key={l}>
          <Link
            href={href}
            locale={l}
            hrefLang={l}
            lang={l}
            scroll={false}
            aria-current={l === current ? 'true' : undefined}
            className={`plate px-2.5 text-[13px] sm:text-sm lg:text-[15px] ${l === current ? 'plate-inverse' : ''}`}
          >
            {l.toUpperCase()}
          </Link>
        </li>
      ))}
    </ul>
  );
}
