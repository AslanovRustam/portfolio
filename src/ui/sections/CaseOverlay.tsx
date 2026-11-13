'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useCallback, useEffect, useRef } from 'react';
import { projectBySlug, type ProjectSlug } from '@/content/projects';
import { useRouter } from '@/i18n/navigation';
import { lockScroll } from '@/scroll/SmoothScroll';
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
        className="relative max-h-full w-full max-w-6xl overflow-y-auto overscroll-contain border border-[#7fe3ff]/40 bg-[#050507] text-[#e8f7ff] outline-none"
      >
        <div className="grid gap-6 p-5 pt-16 sm:p-8 sm:pt-16 wide:pt-8 wide:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] wide:gap-10">
          <div className="space-y-4">
            <div className="relative aspect-[16/10] overflow-hidden border border-[#7fe3ff]/30">
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
              <h3 className="text-xs text-[#7fe3ff]">{t('case.links')}</h3>
              <ul className="mt-2 flex flex-wrap gap-2 text-sm">
                {LINK_KEYS.filter((l) => project.links[l]).map((l) => (
                  <li key={l}>
                    <a
                      href={project.links[l]}
                      target="_blank"
                      rel="noopener"
                      className="block border border-[#7fe3ff]/40 px-3 py-1.5 transition-colors hover:border-[#ff7a1a] hover:text-[#ff7a1a] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#7fe3ff]"
                    >
                      {t(`work.${l}`)}
                    </a>
                  </li>
                ))}
                {!project.links.repo && project.badge === 'commercial' && (
                  <li className="px-3 py-1.5 text-[#e8f7ff]/50">{t('work.private')}</li>
                )}
              </ul>
            </div>
          </div>

          <div className="min-w-0">
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#e8f7ff]/70">
              <span>{t(k('kind'))}</span>
              <span className="text-[#7fe3ff]">{project.year}</span>
              {project.badge && <span className="text-[#ff7a1a]">{t(`work.${project.badge}`)}</span>}
            </p>
            <h2 id="case-title" className="mt-2 text-[clamp(2rem,4.5vw,3.75rem)] font-bold leading-none tracking-[-0.03em]">
              {t(k('title'))}
            </h2>
            {project.featured ? (
              <dl className="mt-6 space-y-5 text-sm leading-relaxed sm:text-[15px]">
                {(['problem', 'did', 'result'] as const).map((part) => (
                  <div key={part}>
                    <dt className="text-xs text-[#7fe3ff]">{t(`case.${part}`)}</dt>
                    <dd className="mt-1 max-w-[62ch] text-[#e8f7ff]/90">{t(k(part))}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-6 max-w-[62ch] text-sm leading-relaxed text-[#e8f7ff]/90 sm:text-[15px]">
                {t(k('summary'))}
              </p>
            )}
            <h3 className="mt-6 text-xs text-[#7fe3ff]">{t('case.stack')}</h3>
            <ul className="mt-2 flex flex-wrap gap-1.5 text-xs">
              {project.stack.map((s) => (
                <li key={s} className="border border-[#e8f7ff]/20 px-2 py-1">
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <button
          type="button"
          onClick={close}
          className="absolute right-3 top-3 border border-[#7fe3ff]/40 bg-[#050507] px-3 py-1.5 text-sm transition-colors hover:border-[#ff7a1a] hover:text-[#ff7a1a] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#7fe3ff]"
        >
          {t('case.close')}
        </button>
      </div>
    </div>
  );
}
