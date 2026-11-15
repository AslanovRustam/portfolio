'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useCallback, useEffect, useRef } from 'react';
import { projectBySlug, repoIsPrivate, type ProjectSlug } from '@/content/projects';
import { activeSection } from '@/experience/choreography';
import { experienceStore } from '@/experience/store';
import { stopAt } from '@/experience/workStops';
import { useRouter } from '@/i18n/navigation';
import { type Rect, screenRectFor } from '@/scene/tvwall/screenRects';
import { lockScroll } from '@/scroll/SmoothScroll';
import { neonStyle } from '../neon';
import { crtClose, crtOpen } from './crt';
import { BlueprintPoster } from './ProjectCard';

const LINK_KEYS = ['live', 'site', 'repo'] as const;

/** Where the case switches on from: the clicked TV, else the TV of the stop in view, else the middle. */
function origin() {
  const s = experienceStore.getState();
  const clicked = s.takeCaseOrigin();
  if (clicked) return clicked;
  if (s.webgl && activeSection(s.progress) === 'work') return screenRectFor(stopAt(s.progress));
  return null;
}

/**
 * A project's case, opened over the street at /[locale]/work/<slug>, as an old TV screen in Work's neon:
 * it switches on out of the set that was clicked (a line, then the picture, then a flicker of signal) and
 * collapses to a line and a dot when it closes. The page underneath is frozen while it is open; the close
 * button, Esc and a click on the backdrop all return to the same spot.
 */
export default function CaseOverlay({ slug }: { slug: ProjectSlug }) {
  const t = useTranslations();
  const router = useRouter();
  const dialog = useRef<HTMLDivElement>(null);
  const closing = useRef(false);
  // read once per case: React's development double-run of the effect must not lose the clicked TV
  const from = useRef<Rect | null | undefined>(undefined);
  const project = projectBySlug(slug)!;
  const k = (key: string) => `projects.${slug}.${key}`;

  const close = useCallback(async () => {
    const el = dialog.current;
    if (closing.current) return;
    closing.current = true;
    if (el) {
      el.dataset.crt = 'closing';
      await crtClose(el, experienceStore.getState().reducedMotion);
    }
    router.push('/', { scroll: false });
  }, [router]);

  useEffect(() => {
    const el = dialog.current;
    const opener = document.activeElement as HTMLElement | null;
    const main = document.querySelector('main');
    lockScroll(true);
    experienceStore.getState().setCaseOpen(true);
    main?.setAttribute('inert', '');
    el?.focus();
    let alive = true;
    let running: Animation[] = [];
    if (el) {
      if (from.current === undefined) from.current = origin();
      el.dataset.crt = 'opening';
      running = crtOpen(el, from.current, experienceStore.getState().reducedMotion);
      Promise.all(running.map((a) => a.finished))
        .then(() => {
          if (alive && !closing.current) el.dataset.crt = 'open';
        })
        .catch(() => {});
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') void close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      alive = false;
      // a discarded run must leave nothing on the card for the next one to measure or fight
      for (const a of running) a.cancel();
      window.removeEventListener('keydown', onKey);
      main?.removeAttribute('inert');
      experienceStore.getState().setCaseOpen(false);
      lockScroll(false);
      opener?.focus?.({ preventScroll: true });
    };
  }, [close]);

  return (
    <div
      data-ui
      className="fixed inset-0 z-[25] flex items-start justify-center bg-[#050507]/70 px-3 pb-3 pt-28 backdrop-blur-sm sm:px-6 sm:pb-6 sm:pt-24 wide:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) void close();
      }}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="case-title"
        tabIndex={-1}
        data-lenis-prevent
        data-crt="pending"
        style={neonStyle('work')}
        className="crt-card flex max-h-full w-full max-w-6xl flex-col outline-none"
      >
        <div data-crt-content className="flex min-h-0 flex-1 flex-col">
          {/* the head stays on top while the case scrolls, so Close is always in reach */}
          <div className="flex shrink-0 items-center justify-between gap-4 px-5 pb-2 pt-5 sm:px-8 sm:pt-6">
            <h2 id="case-title" className="crt-title text-[clamp(1.9rem,4vw,3.4rem)] leading-none">
              {t(k('title'))}
            </h2>
            <button
              type="button"
              onClick={() => void close()}
              className="neon shrink-0 text-[15px] sm:text-base"
              style={neonStyle('work')}
            >
              {t('case.close')}
            </button>
          </div>
          <div className="crt-body min-h-0 overflow-y-auto overscroll-contain">
            <div className="grid gap-6 p-5 pt-3 sm:p-8 sm:pt-4 wide:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] wide:gap-10">
              <div className="space-y-4">
                <div className="relative aspect-[16/10] overflow-hidden rounded-[6px] shadow-[0_0_0_1px_rgb(0_0_0/0.6)]">
                  {project.poster ? (
                    <Image
                      src={project.poster}
                      alt=""
                      fill
                      loading="eager"
                      sizes="(min-width: 1024px) 50vw, 100vw"
                      className="object-cover object-top"
                    />
                  ) : (
                    <BlueprintPoster title={t(k('title'))} />
                  )}
                </div>
                <div>
                  <h3 className="flow-label">{t('case.links')}</h3>
                  <ul className="-mx-1 mt-1 flex flex-wrap items-center">
                    {LINK_KEYS.filter((l) => project.links[l]).map((l) => (
                      <li key={l}>
                        <a
                          href={project.links[l]}
                          target="_blank"
                          rel="noopener"
                          className="neon text-[15px] sm:text-base"
                          style={neonStyle('work')}
                        >
                          {t(`work.${l}`)}
                        </a>
                      </li>
                    ))}
                    {repoIsPrivate(project) && <li className="px-1 text-sm text-[#e8f7ff]/60">{t('work.private')}</li>}
                  </ul>
                </div>
              </div>

              <div className="min-w-0">
                <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#e8f7ff]/75">
                  <span>{t(k('kind'))}</span>
                  <span className="text-[#7fe3ff]">{project.year}</span>
                  {project.badge && <span className="text-[#ffb27a]">{t(`work.${project.badge}`)}</span>}
                  {project.status === 'in-development' && <span className="text-[#ffd23f]">{t('work.inDevelopment')}</span>}
                </p>
                {project.featured || project.detailed ? (
                  <dl className="mt-5 space-y-5 text-sm leading-relaxed sm:text-[15px]">
                    {(['problem', 'did', 'result'] as const).map((part) => (
                      <div key={part}>
                        <dt className="flow-label">{t(`case.${part}`)}</dt>
                        <dd className="mt-1 max-w-[62ch] text-[#e8f7ff]/90">{t(k(part))}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="mt-5 max-w-[62ch] text-sm leading-relaxed text-[#e8f7ff]/90 sm:text-[15px]">
                    {t(k('summary'))}
                  </p>
                )}
                <h3 className="flow-label mt-6">{t('case.stack')}</h3>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {project.stack.map((item) => (
                    <li key={item} className="crt-chip">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
