'use client';

import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { type ReactNode, useEffect, useRef } from 'react';
import { registerProbe } from '@/dev/sceneProbe';
import { DEFAULT_SVH, journeyLengths, lengthsFromLayout, PIECE_IDS, type PieceId, setJourneyLengths } from '@/experience/journey';

const spacer = (id: PieceId) => (
  <div key={id} data-piece={id} aria-hidden="true" style={{ height: `${DEFAULT_SVH[id]}svh` }} />
);

/**
 * The scroll track the whole journey is measured against: the intro, the Work stops and the turns as fixed
 * stretches, and the three sections whose text rides past in between. Whenever a section's height changes
 * (fonts, language, width) the pieces are measured again and ScrollTrigger re-reads them; SmoothScroll
 * keeps the visitor at the same story progress across that refresh.
 */
export default function JourneyTrack({ about, stack, contact }: { about: ReactNode; stack: ReactNode; contact: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const measure = () => {
      const pieces = PIECE_IDS.map((id) => el.querySelector<HTMLElement>(`:scope > [data-piece="${id}"]`));
      if (pieces.some((p) => !p)) return;
      // the trigger runs from the track's top at the top of the screen to its bottom at the bottom; a
      // layout that measured nothing keeps the lengths in use (a throw here would wedge ScrollTrigger)
      const lengths = lengthsFromLayout(
        pieces.map((p) => p!.offsetHeight),
        el.offsetHeight,
        innerHeight,
      );
      if (lengths) setJourneyLengths(lengths);
    };
    const remeasure = () => {
      measure();
      ScrollTrigger.refresh();
    };
    measure();
    const ro = new ResizeObserver(remeasure);
    for (const s of el.querySelectorAll(':scope > section[data-piece]')) ro.observe(s);
    let alive = true;
    document.fonts?.ready.then(() => alive && remeasure());
    ScrollTrigger.addEventListener('refreshInit', measure);
    const unprobe = registerProbe('journey', () => [...journeyLengths()]);
    return () => {
      alive = false;
      ro.disconnect();
      ScrollTrigger.removeEventListener('refreshInit', measure);
      unprobe();
    };
  }, []);

  return (
    <div id="journey" ref={root} className="pointer-events-none relative">
      {spacer('intro')}
      {spacer('work')}
      {spacer('toAbout')}
      {about}
      {spacer('toStack')}
      {stack}
      {spacer('toContact')}
      {contact}
    </div>
  );
}
