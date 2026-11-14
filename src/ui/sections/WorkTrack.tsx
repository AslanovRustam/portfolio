'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { NDA_KEYS, PROJECTS } from '@/content/projects';
import { registerProbe } from '@/dev/sceneProbe';
import { progressForTrack, trackProgress } from '@/experience/panels';
import { experienceStore } from '@/experience/store';
import { scrollToProgress } from '@/scroll/SmoothScroll';
import ProjectCard from './ProjectCard';
import { PanelTitle } from './SectionPanel';

/**
 * The Work band without WebGL (no TV wall to show): a horizontal track of project cards that slides
 * with the scroll, ending on the "small part" tile with the NDA list. Positioned from the store by
 * subscription; under reduced motion it steps card by card instead of gliding.
 */
export default function WorkTrack() {
  const t = useTranslations();
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLOListElement>(null);
  const x = useRef(0);

  useEffect(() => {
    const vp = viewport.current;
    const tr = track.current;
    if (!vp || !tr) return;
    let max = 0;
    let stops: number[] = [];

    const apply = () => {
      const { progress, reducedMotion } = experienceStore.getState();
      let shift = trackProgress(progress) * max;
      if (reducedMotion && stops.length) {
        shift = stops.reduce((best, s) => (Math.abs(s - shift) < Math.abs(best - shift) ? s : best), 0);
      }
      if (-shift === x.current) return;
      x.current = -shift;
      tr.style.transform = `translate3d(${-shift}px, 0, 0)`;
    };
    const measure = () => {
      max = Math.max(0, tr.scrollWidth - vp.clientWidth);
      stops = Array.from(tr.children, (c) => Math.min(max, (c as HTMLElement).offsetLeft));
      x.current = Number.NaN; // force a re-apply with the new geometry
      apply();
    };

    // Keyboard focus on a card that is off the visible part of the track scrolls the journey to it.
    const onFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      const item = target.closest('li');
      vp.scrollLeft = 0; // the browser may have scrolled the clipped viewport itself
      // only keyboard focus: a mouse click on a half-visible card must not move the journey
      if (!item || max <= 0 || !target.matches(':focus-visible')) return;
      // a card already in view stays put (focus coming back from a closed case lands here too)
      const card = item.getBoundingClientRect();
      const view = vp.getBoundingClientRect();
      if (card.left >= view.left - 1 && card.right <= view.right + 1) return;
      scrollToProgress(progressForTrack(Math.min(max, item.offsetLeft) / max));
    };

    const ro = new ResizeObserver(measure);
    ro.observe(vp);
    ro.observe(tr);
    measure();
    const unsubscribe = experienceStore.subscribe(apply);
    const unprobe = registerProbe('track', () => x.current);
    tr.addEventListener('focusin', onFocus);
    return () => {
      ro.disconnect();
      unsubscribe();
      unprobe();
      tr.removeEventListener('focusin', onFocus);
    };
  }, []);

  return (
    <div className="flex h-full flex-col">
      <PanelTitle id="work-title">{t('work.title')}</PanelTitle>
      <p className="mb-4 max-w-[60ch] text-xs text-[#e8f7ff]/75 sm:text-sm">{t('work.lead')}</p>
      <div ref={viewport} className="overflow-hidden">
        <ol
          ref={track}
          className="relative flex h-[clamp(10.5rem,24svh,16rem)] gap-3 will-change-transform"
        >
          {PROJECTS.map((p) => (
            <li
              key={p.slug}
              className={`h-full shrink-0 ${p.featured ? 'w-[clamp(18rem,36vw,34rem)]' : 'w-[clamp(13rem,20vw,19rem)]'}`}
            >
              <ProjectCard
                project={p}
                copy={{
                  title: t(`projects.${p.slug}.title`),
                  kind: t(`projects.${p.slug}.kind`),
                  badge: p.badge ? t(`work.${p.badge}`) : undefined,
                  status: p.status === 'in-development' ? t('work.inDevelopment') : undefined,
                }}
              />
            </li>
          ))}
          <li className="flex h-full w-[clamp(15rem,24vw,22rem)] shrink-0 flex-col justify-between rounded-[8px] border border-dashed border-[#ff8a2a]/50 p-4">
            <p className="text-base font-bold leading-snug sm:text-lg">{t('work.more')}</p>
            <div>
              <p className="flow-label">{t('work.ndaTitle')}</p>
              <ul className="mt-1 space-y-0.5 text-xs text-[#e8f7ff]/70">
                {NDA_KEYS.map((k) => (
                  <li key={k}>{t(`work.nda.${k}`)}</li>
                ))}
              </ul>
            </div>
          </li>
        </ol>
      </div>
    </div>
  );
}
