'use client';

import { useEffect, useRef } from 'react';
import { activeSection, INTRO_END } from '@/experience/choreography';
import type { SectionId } from '@/experience/signs';
import { CONTACTS } from '@/content/contacts';
import { experienceStore, useExperience } from '@/experience/store';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { scrollToProgress, scrollToSection } from '@/scroll/SmoothScroll';
import LanguageSwitch from './LanguageSwitch';
import { flicker, neonStyle } from './neon';
import NeonText from './NeonText';

const NAV: readonly SectionId[] = ['work', 'about', 'stack', 'contact'];

interface Labels {
  work: string;
  about: string;
  stack: string;
  contact: string;
  cv: string;
  language: string;
}

const tube = 'neon neon-flicker text-[13px] sm:text-[15px] lg:text-[17px]';

/**
 * The plain-HTML twin of the signpost: the same five destinations for keyboards, screen readers and
 * recruiters who would rather not play, as neon tubes in the colours of their signs. Now and then a tube
 * dips like tired neon; the open section's tube burns steady and underlined. On a phone the name and the
 * languages share the top row and the sections run below.
 */
export default function SiteHeader({ name, labels }: { name: string; labels: Labels }) {
  const active = useExperience((s) => activeSection(s.progress));
  const pathname = usePathname();
  const router = useRouter();
  const fade = useRef<HTMLDivElement>(null);

  // the dark band under the header arrives with the street; the blueprint keeps its clean top
  useEffect(() => {
    const apply = (p: number) => {
      if (fade.current) fade.current.style.opacity = String(Math.min(1, Math.max(0, (p - INTRO_END / 2) / (INTRO_END / 2))));
    };
    apply(experienceStore.getState().progress);
    return experienceStore.subscribe((s) => apply(s.progress));
  }, []);

  // over an open case, a destination closes it first; the scroll waits for the page to unlock
  const go = (id: SectionId) => {
    if (pathname !== '/') router.push('/', { scroll: false });
    scrollToSection(id);
  };
  return (
    <>
      <div ref={fade} aria-hidden="true" className="top-fade" style={{ opacity: 0 }} />
      <header
        data-ui
        className="fixed inset-x-0 top-0 z-30 grid grid-cols-[1fr_auto] items-center gap-x-2 px-2 pt-1 sm:px-5 sm:pt-3 md:flex md:justify-between"
      >
        <Link
          href="/"
          scroll={false}
          onClick={() => scrollToProgress(0)}
          className="neon justify-self-start text-lg font-semibold sm:text-xl lg:text-2xl"
          style={neonStyle('name')}
        >
          <NeonText text={name} dead={3} />
        </Link>
        <nav className="col-span-2 md:order-2 md:col-span-1 md:ml-auto">
          <ul className="flex flex-wrap items-center">
            {NAV.map((id, i) => (
              <li key={id} className="flex items-center">
                {i > 0 && <span aria-hidden="true" className="neon-dot" />}
                <button
                  type="button"
                  onClick={() => go(id)}
                  aria-current={active === id ? 'true' : undefined}
                  className={tube}
                  style={{ ...neonStyle(id), ...flicker(i) }}
                >
                  {id === 'stack' ? <NeonText text={labels.stack} dead={labels.stack.length - 1} /> : labels[id]}
                </button>
              </li>
            ))}
            <li className="flex items-center">
              <span aria-hidden="true" className="neon-dot" />
              <a href={CONTACTS.cv} download className={tube} style={{ ...neonStyle('cv'), ...flicker(4) }}>
                {labels.cv}
              </a>
            </li>
          </ul>
        </nav>
        <div className="row-start-1 md:order-3 md:ml-3">
          <LanguageSwitch label={labels.language} />
        </div>
      </header>
    </>
  );
}
