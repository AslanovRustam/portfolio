'use client';

import { useEffect, useRef } from 'react';
import { registerProbe } from '@/dev/sceneProbe';
import { sectionPresence } from '@/experience/panels';
import type { SectionId } from '@/experience/signs';
import { experienceStore } from '@/experience/store';
import { neonStyle } from '../neon';

const PLACE = {
  // the strip of cards without WebGL: a band along the bottom on wide screens
  bottom: 'wide:inset-x-6 wide:bottom-6',
  // the caption beside the TV wall: a bottom sheet on phones, a box in the lower-left corner on wide screens
  caption: 'wide:inset-x-auto wide:left-6 wide:bottom-6 wide:w-[min(34rem,40vw)]',
  // the caption under the gantry's sign: the same, wider and lower, so it stays below the sign it captions
  sign: 'wide:inset-x-auto wide:left-6 wide:bottom-6 wide:w-[min(46rem,56vw)]',
} as const;

/**
 * Work's and Stack's HTML: a neon box fixed on the screen while the camera walks the TV wall or the signs,
 * gone (hidden and inert) outside its section. It never scrolls inside. Presence comes from the store by
 * subscription, so scrolling never re-renders React. (About and Contact ride the page flow instead:
 * src/ui/flow/SectionFlow.tsx.)
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
    return () => {
      unsubscribe();
      unprobe();
    };
  }, [id]);

  return (
    <section
      ref={panel}
      id={id}
      aria-labelledby={labelledBy}
      data-ui
      data-section={id}
      style={{ opacity: 0, visibility: 'hidden', ...neonStyle(id) }}
      className={`nbox fixed inset-x-3 bottom-3 z-20 px-5 pb-5 pt-4 will-change-[opacity,transform] sm:px-6 ${PLACE[layout]}`}
    >
      {children}
    </section>
  );
}

/**
 * The panel's title: it names the section for screen readers (and the page's outline) but is not shown —
 * on the street the shop's WORK sign and the gantry say it (gate M4 round 2: the neon title looked out of place).
 */
export function PanelTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="sr-only">
      {children}
    </h2>
  );
}
