'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useCallback, useEffect, useRef } from 'react';
import { projectBySlug, repoIsPrivate, type ProjectSlug } from '@/content/projects';
import { useRouter } from '@/i18n/navigation';
import { lockScroll } from '@/scroll/SmoothScroll';
import { plateStyle } from '../plates';
import { BlueprintPoster } from './ProjectCard';

const LINK_KEYS = ['live', 'site', 'repo'] as const;

/**
 * A project's case, opened over the street at /[locale]/work/<slug>. The page underneath is frozen
 * while it is open; the close button, Esc and a click on the backdrop all return to the same spot.
 */
export default function CaseOverlay({ slug }: { slug: ProjectSlug }) {
  const t = useTranslations();
  const router = useRouter();
  const dialog = useRef<HTMLDivElement>(null);
  const project = projectBySlug(slug)!;
  const k = (key: string) => `projects.${slug}.${key}`;

  const close = useCallback(() => router.push('/', { scroll: false }), [router]);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const main = document.querySelector('main');
    lockScroll(true);
    main?.setAttribute('inert', '');
    dialog.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      main?.removeAttribute('inert');
      lockScroll(false);
      opener?.focus?.({ preventScroll: true });
    };
  }, [close]);

  return (
    <div
      data-ui
      className="fixed inset-0 z-[25] flex items-start justify-center bg-[#050507]/70 px-3 pb-3 pt-28 backdrop-blur-sm sm:px-6 sm:pb-6 sm:pt-24 wide:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="case-title"
        tabIndex={-1}
        data-lenis-prevent
        style={plateStyle('work')}
        className="board flex max-h-full w-full max-w-6xl flex-col overflow-hidden text-[#e8f7ff]"
      >
        {/* the band stays on top while the case scrolls, so Close is always in reach */}
        <div data-board-head className="board-head flex shrink-0 items-start justify-between gap-4 px-5 pb-4 pt-9 sm:px-8">
          <h2 id="case-title" className="text-[clamp(1.9rem,4vw,3.4rem)] leading-none normal-case">
            {t(k('title'))}
          </h2>
          <button type="button" onClick={close} className="plate plate-sm shrink-0">
            {t('case.close')}
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain">
          <div className="grid gap-6 p-5 sm:p-8 wide:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] wide:gap-10">
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
                <h3 className="board-label">{t('case.links')}</h3>
                <ul className="mt-2 flex flex-wrap items-center gap-2">
                  {LINK_KEYS.filter((l) => project.links[l]).map((l) => (
                    <li key={l}>
                      <a href={project.links[l]} target="_blank" rel="noopener" className="plate plate-sm plate-sign">
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
                {project.badge && <span className="text-[#ff9a4a]">{t(`work.${project.badge}`)}</span>}
                {project.status === 'in-development' && <span className="text-[#ffd23f]">{t('work.inDevelopment')}</span>}
              </p>
              {project.featured || project.detailed ? (
                <dl className="mt-5 space-y-5 text-sm leading-relaxed sm:text-[15px]">
                  {(['problem', 'did', 'result'] as const).map((part) => (
                    <div key={part}>
                      <dt className="board-label">{t(`case.${part}`)}</dt>
                      <dd className="mt-1 max-w-[62ch] text-[#e8f7ff]/90">{t(k(part))}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="mt-5 max-w-[62ch] text-sm leading-relaxed text-[#e8f7ff]/90 sm:text-[15px]">
                  {t(k('summary'))}
                </p>
              )}
              <h3 className="board-label mt-6">{t('case.stack')}</h3>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {project.stack.map((item) => (
                  <li key={item} className="plate plate-sm plate-plain">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <span aria-hidden="true" className="board-rule" />
      </div>
    </div>
  );
}
