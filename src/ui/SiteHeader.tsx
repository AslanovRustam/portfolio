'use client';

import { activeSection } from '@/experience/choreography';
import type { SectionId } from '@/experience/signs';
import { CONTACTS } from '@/content/contacts';
import { useExperience } from '@/experience/store';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { scrollToProgress, scrollToSection } from '@/scroll/SmoothScroll';
import LanguageSwitch from './LanguageSwitch';

const NAV: readonly SectionId[] = ['work', 'about', 'stack', 'contact'];

interface Labels {
  work: string;
  about: string;
  stack: string;
  contact: string;
  cv: string;
  language: string;
}

const cell =
  'block px-3 py-2 transition-colors hover:text-[#ff7a1a] focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-2 focus-visible:outline-[#7fe3ff]';

/**
 * The plain-HTML twin of the signpost: the same five destinations for keyboards, screen readers and
 * recruiters who would rather not play. Styled as the strip along the top of a drawing sheet.
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
    <header
      data-ui
      className="fixed inset-x-0 top-0 z-30 flex items-start justify-between gap-2 p-3 text-xs text-[#e8f7ff] sm:p-6 sm:text-sm"
    >
      <Link
        href="/"
        scroll={false}
        onClick={() => scrollToProgress(0)}
        className={`${cell} hidden border border-[#7fe3ff]/40 bg-[#050507]/50 backdrop-blur-sm md:block`}
      >
        {name}
      </Link>
      <div className="flex flex-wrap justify-end gap-2">
        <nav className="border border-[#7fe3ff]/40 bg-[#050507]/50 backdrop-blur-sm">
          <ul className="flex divide-x divide-[#7fe3ff]/40">
            {NAV.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => go(id)}
                  aria-current={active === id ? 'true' : undefined}
                  className={`${cell} aria-[current]:text-[#ff7a1a]`}
                >
                  {labels[id]}
                </button>
              </li>
            ))}
            <li>
              <a href={CONTACTS.cv} download className={`${cell} text-[#1fd16a] hover:text-[#1fd16a]/80`}>
                {labels.cv}
              </a>
            </li>
          </ul>
        </nav>
        <div className="border border-[#7fe3ff]/40 bg-[#050507]/50 backdrop-blur-sm">
          <LanguageSwitch label={labels.language} />
        </div>
      </div>
    </header>
  );
}
