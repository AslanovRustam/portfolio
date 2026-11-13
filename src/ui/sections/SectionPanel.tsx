'use client';

import { useEffect, useRef } from 'react';
import { registerProbe } from '@/dev/sceneProbe';
import { sectionPresence } from '@/experience/panels';
import type { SectionId } from '@/experience/signs';
import { experienceStore } from '@/experience/store';

const PLACE = {
  // wide screens: a column on the left (the scene steps right) or, for Work, a band along the bottom
  side: 'wide:inset-x-auto wide:left-6 wide:top-24 wide:bottom-6 wide:max-h-none wide:w-[min(40rem,40vw)]',
  bottom: 'wide:inset-x-6 wide:bottom-6 wide:max-h-[42svh]',
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
  layout: 'side' | 'bottom';
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
    // While more of it is below the fold, the bottom edge fades out (data-more) as a cue to scroll.
    const body = el.firstElementChild as HTMLElement | null;
    const fit = () => {
      if (!body) return;
      body.toggleAttribute('data-lenis-prevent', body.scrollHeight > body.clientHeight + 1);
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
      style={{ opacity: 0, visibility: 'hidden' }}
      className={`fixed inset-x-3 bottom-3 z-20 flex max-h-[46svh] flex-col border border-[#7fe3ff]/40 bg-[#050507]/75 text-[#e8f7ff] backdrop-blur-md will-change-[opacity,transform] ${PLACE[layout]}`}
    >
      <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7 data-[more]:[mask-image:linear-gradient(to_bottom,black_calc(100%-3rem),transparent)]">
        {children}
      </div>
    </section>
  );
}

/** A section heading in the panel's type scale. */
export function PanelTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-[clamp(1.75rem,3.2vw,3rem)] font-bold leading-none tracking-[-0.03em]">
      {children}
    </h2>
  );
}
