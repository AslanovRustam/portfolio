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
    <ul aria-label={label} className="flex divide-x divide-[#7fe3ff]/40">
      {routing.locales.map((l) => (
        <li key={l}>
          <Link
            href={href}
            locale={l}
            hrefLang={l}
            lang={l}
            scroll={false}
            aria-current={l === current ? 'true' : undefined}
            className="block px-2.5 py-2 text-[#e8f7ff]/60 transition-colors hover:text-[#e8f7ff] focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-2 focus-visible:outline-[#7fe3ff] aria-[current]:text-[#7fe3ff]"
          >
            {l.toUpperCase()}
          </Link>
        </li>
      ))}
    </ul>
  );
}
