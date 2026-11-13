'use client';

import { useEffect, useRef } from 'react';
import { registerProbe } from '@/dev/sceneProbe';
import { sectionPresence } from '@/experience/panels';
import type { SectionId } from '@/experience/signs';
import { experienceStore } from '@/experience/store';
import { plateStyle } from '../plates';

const PLACE = {
  // wide screens: a column on the left (the scene steps right) or, for Work, a band along the bottom
  side: 'wide:inset-x-auto wide:left-6 wide:top-24 wide:bottom-6 wide:max-h-none wide:w-[min(40rem,40vw)]',
  bottom: 'wide:inset-x-6 wide:bottom-6 wide:max-h-[42svh]',
  // the caption beside the TV wall: a bottom sheet on phones, a board in the lower-left corner on wide screens
  caption: 'wide:inset-x-auto wide:left-6 wide:bottom-6 wide:max-h-[60svh] wide:w-[min(34rem,40vw)]',
} as const;

/**
 * The HTML half of a section: a fixed sheet that appears while the pole holds that section's sign to
 * the camera and is gone (hidden and inert) during the turns. Presence comes from the store by
 * subscription, so scrolling never re-renders React.
 */
export default function SectionPanel({
  id,
  layout,
  labelledBy,
  children,
}: {
  id: SectionId;
  layout: keyof typeof PLACE;
  labelledBy: string;
  children: React.ReactNode;
}) {
  const panel = useRef<HTMLElement>(null);
  const presence = useRef(-1);

  useEffect(() => {
    const el = panel.current;
    if (!el) return;
    const apply = () => {
      const { progress, reducedMotion } = experienceStore.getState();
      const v = sectionPresence(progress, id);
      if (v === presence.current) return;
      presence.current = v;
      const shown = v >= 0.01;
      el.style.opacity = String(v);
      el.style.transform = reducedMotion ? '' : `translate3d(0, ${(1 - v) * 24}px, 0)`;
      el.style.visibility = shown ? 'visible' : 'hidden';
      el.inert = !shown;
    };
    apply();
    const unsubscribe = experienceStore.subscribe(apply);
    const unprobe = registerProbe(`panel:${id}`, () => Math.max(0, presence.current));

    // Content taller than the sheet scrolls natively inside it; otherwise the wheel keeps driving the
    // journey through Lenis.
    // Content taller than the sheet scrolls inside it (Lenis allowNestedScroll hands the wheel back to
    // the journey at its end). While more is below, the bottom edge fades out (data-more) as a cue.
    const body = el.firstElementChild as HTMLElement | null;
    const fit = () => {
      if (!body) return;
      body.toggleAttribute('data-more', body.scrollTop + body.clientHeight < body.scrollHeight - 2);
    };
    const ro = new ResizeObserver(fit);
    if (body) {
      ro.observe(body);
      if (body.firstElementChild) ro.observe(body.firstElementChild);
      body.addEventListener('scroll', fit, { passive: true });
    }
    fit();

    return () => {
      unsubscribe();
      unprobe();
      ro.disconnect();
      body?.removeEventListener('scroll', fit);
    };
  }, [id]);

  return (
    <section
      ref={panel}
      id={id}
      aria-labelledby={labelledBy}
      data-ui
      data-section={id}
      style={{ opacity: 0, visibility: 'hidden', ...plateStyle(id) }}
      className={`board fixed inset-x-3 bottom-3 z-20 flex max-h-[46svh] flex-col overflow-hidden text-[#e8f7ff] will-change-[opacity,transform] ${PLACE[layout]}`}
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-7 sm:pb-7 data-[more]:[mask-image:linear-gradient(to_bottom,black_calc(100%-3rem),transparent)]">
        {children}
      </div>
      <span aria-hidden="true" className="board-rule" />
    </section>
  );
}

/**
 * The board's title band, in the colours of the section's sign. It runs edge to edge across the top of
 * the board and stays put while a long board scrolls under it.
 */
export function PanelTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <div data-board-head className="board-head sticky top-0 z-[1] -mx-5 mb-5 px-5 pb-3 pt-8 sm:-mx-7 sm:px-7 sm:pt-9">
      <h2 id={id} className="text-[clamp(1.6rem,2.8vw,2.6rem)] leading-none">
        {children}
      </h2>
    </div>
  );
}
