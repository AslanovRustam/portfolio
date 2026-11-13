'use client';

import { activeSection } from '@/experience/choreography';
import type { SectionId } from '@/experience/signs';
import { CONTACTS } from '@/content/contacts';
import { useExperience } from '@/experience/store';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { scrollToProgress, scrollToSection } from '@/scroll/SmoothScroll';
import LanguageSwitch from './LanguageSwitch';
import { plateStyle } from './plates';

const NAV: readonly SectionId[] = ['work', 'about', 'stack', 'contact'];

interface Labels {
  work: string;
  about: string;
  stack: string;
  contact: string;
  cv: string;
  language: string;
}

const navPlate = 'plate plate-sign text-[13px] sm:text-sm lg:text-[15px]';

/**
 * The plain-HTML twin of the signpost: the same five destinations for keyboards, screen readers and
 * recruiters who would rather not play, as enamel street plates. The plate of the section whose sign
 * faces the camera takes that sign's colours.
 */
export default function SiteHeader({ name, labels }: { name: string; labels: Labels }) {
  const active = useExperience((s) => activeSection(s.progress));
  const pathname = usePathname();
  const router = useRouter();
  // over an open case, a destination closes it first; the scroll waits for the page to unlock
  const go = (id: SectionId) => {
    if (pathname !== '/') router.push('/', { scroll: false });
    scrollToSection(id);
  };
  return (
    <header data-ui className="fixed inset-x-0 top-0 z-30 flex items-start justify-between gap-2 p-3 sm:p-6">
      <Link
        href="/"
        scroll={false}
        onClick={() => scrollToProgress(0)}
        className="plate plate-lg hidden md:inline-flex"
      >
        {name}
      </Link>
      <div className="flex flex-wrap items-start justify-end gap-x-3 gap-y-2">
        <nav>
          <ul className="flex flex-wrap justify-end gap-1.5">
            {NAV.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => go(id)}
                  aria-current={active === id ? 'true' : undefined}
                  className={navPlate}
                  style={plateStyle(id)}
                >
                  {labels[id]}
                </button>
              </li>
            ))}
            <li>
              <a href={CONTACTS.cv} download className={navPlate} style={plateStyle('cv')}>
                {labels.cv}
              </a>
            </li>
          </ul>
        </nav>
        <LanguageSwitch label={labels.language} />
      </div>
    </header>
  );
}
