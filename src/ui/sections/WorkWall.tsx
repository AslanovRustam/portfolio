'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { NDA_KEYS, PROJECTS, repoIsPrivate } from '@/content/projects';
import { experienceStore } from '@/experience/store';
import { stopAt, stopProgress } from '@/experience/workStops';
import { Link, useRouter } from '@/i18n/navigation';
import { scrollToProgress } from '@/scroll/SmoothScroll';
import { neonStyle } from '../neon';
import { PanelTitle } from './SectionPanel';

const two = (n: number) => String(n).padStart(2, '0');

/**
 * The caption beside the TV wall: which project the camera stands in front of, what it is, and the way
 * into its case; numbered neon tubes below jump straight to any project (and walk them from the keyboard).
 * It re-renders only when the stop changes. A click on a lit TV in the scene arrives here as a request
 * to open that project's case.
 */
export default function WorkWall() {
  const t = useTranslations();
  const router = useRouter();
  const [stop, setStop] = useState(() => stopAt(experienceStore.getState().progress));

  useEffect(() => experienceStore.subscribe((s) => setStop(stopAt(s.progress))), []);

  useEffect(
    () =>
      experienceStore.subscribe((s) => {
        if (!s.pendingCase) return;
        const slug = s.pendingCase;
        s.requestCase(null);
        router.push(`/work/${slug}`, { scroll: false });
      }),
    [router],
  );

  const project = PROJECTS[stop];
  const go = (i: number) => scrollToProgress(stopProgress(i), experienceStore.getState().reducedMotion);

  return (
    <div>
      <PanelTitle id="work-title">{t('work.title')}</PanelTitle>
      <div aria-live="polite" className="min-h-[8.5rem]">
        {project ? (
          <>
            <p className="flow-label">
              {two(stop + 1)} / {two(PROJECTS.length)}
            </p>
            <h3 className="mt-1 font-plate text-[clamp(1.6rem,2.4vw,2.2rem)] font-bold leading-none">
              {t(`projects.${project.slug}.title`)}
            </h3>
            <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#e8f7ff]/75">
              <span>{t(`projects.${project.slug}.kind`)}</span>
              <span className="text-[#7fe3ff]">{project.year}</span>
              {project.badge && <span className="text-[#ff9a4a]">{t(`work.${project.badge}`)}</span>}
              {project.status === 'in-development' && <span className="text-[#ffd23f]">{t('work.inDevelopment')}</span>}
              {repoIsPrivate(project) && <span className="text-[#e8f7ff]/55">{t('work.private')}</span>}
            </p>
            <p className="mt-2 line-clamp-2 max-w-[56ch] text-sm leading-snug text-[#e8f7ff]/85 sm:line-clamp-none">
              {t(`projects.${project.slug}.summary`)}
            </p>
            <Link
              href={`/work/${project.slug}`}
              scroll={false}
              prefetch
              className="neon -ml-1.5 mt-1 text-[15px] sm:text-base"
              style={neonStyle('work')}
            >
              {t('work.open')}
            </Link>
          </>
        ) : (
          <>
            <h3 className="font-plate text-xl font-bold leading-tight">{t('work.more')}</h3>
            <p className="flow-label mt-3">{t('work.ndaTitle')}</p>
            <ul className="mt-1 space-y-0.5 text-sm text-[#e8f7ff]/80">
              {NDA_KEYS.map((k) => (
                <li key={k}>{t(`work.nda.${k}`)}</li>
              ))}
            </ul>
          </>
        )}
      </div>
      <nav aria-label={t('work.pager')} className="flow-rule mt-2 border-t pt-1">
        <ul className="flex flex-wrap">
          {PROJECTS.map((p, i) => (
            <li key={p.slug}>
              <button
                type="button"
                onClick={() => go(i)}
                aria-label={t(`projects.${p.slug}.title`)}
                aria-current={i === stop ? 'true' : undefined}
                className="neon min-w-[2.05rem] px-0.5 text-[13px] sm:min-w-11 sm:px-1 sm:text-[15px]"
                style={neonStyle('work')}
              >
                {two(i + 1)}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      {/*
        Every case, as links in the page for screen readers and crawlers: the caption only links the
        current one. Out of the tab order: sighted keyboard users have the pager and "Open case".
      */}
      <nav aria-label={t('work.title')} className="sr-only">
        <ul>
          {PROJECTS.map((p) => (
            <li key={p.slug}>
              <Link href={`/work/${p.slug}`} scroll={false} tabIndex={-1}>
                {t(`projects.${p.slug}.title`)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
