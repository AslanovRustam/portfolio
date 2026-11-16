'use client';

import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { type ReactNode, useEffect, useRef } from 'react';
import { registerProbe } from '@/dev/sceneProbe';
import { DEFAULT_SVH, journeyLengths, lengthsFromLayout, PIECE_IDS, type PieceId, setJourneyLengths } from '@/experience/journey';
import { useBillboardFit } from '../sections/useBillboardFit';

const spacer = (id: PieceId, svh = DEFAULT_SVH[id]) => (
  <div key={id} data-piece={id} aria-hidden="true" style={{ height: `${svh}svh` }} />
);

/**
 * Contact's piece when the form is on the billboard: its scroll (the last piece's length is its height
 * less a screen) is the short way from the gantry to the billboard and the rest at the end.
 */
const CONTACT_ON_BILLBOARD_SVH = 100 + 45;

/**
 * The scroll track the whole journey is measured against: the intro, the Work and Stack stops and the turns
 * as fixed stretches, and the sections whose text rides past in between (About; Contact where its form is
 * not on the billboard). Whenever a section's height changes
 * (fonts, language, width) the pieces are measured again and ScrollTrigger re-reads them; SmoothScroll
 * keeps the visitor at the same story progress across that refresh.
 */
export default function JourneyTrack({ about, contact }: { about: ReactNode; contact: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  // on a laptop the form is on the billboard (ContactBillboard) and Contact's piece is a fixed stretch
  const onBillboard = useBillboardFit() !== null;

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
    // ScrollTrigger defers a refresh while the page is scrolling; the lengths are measured on its
    // refreshInit, so they never run ahead of the trigger's range
    const remeasure = () => ScrollTrigger.refresh();
    measure();
    // the pieces changed (Contact moved onto the billboard or back): ScrollTrigger reads them again
    remeasure();
    const ro = new ResizeObserver(remeasure);
    for (const s of el.querySelectorAll(':scope > section[data-piece]')) ro.observe(s);
    let alive = true;
    document.fonts?.ready.then(() => alive && remeasure());
    ScrollTrigger.addEventListener('refreshInit', measure);
    const unprobe = registerProbe('journey', () => [...journeyLengths()]);

    // About's poster and bills swing in as they reach the screen (and again after leaving it)
    const swing = new IntersectionObserver(
      (entries) => {
        for (const e of entries) (e.target as HTMLElement).dataset.swing = e.isIntersecting ? 'in' : 'out';
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    for (const t of el.querySelectorAll('#about [data-flow] > .paper-poster, #about [data-flow] > .paper-bill')) swing.observe(t);

    return () => {
      alive = false;
      swing.disconnect();
      ro.disconnect();
      ScrollTrigger.removeEventListener('refreshInit', measure);
      unprobe();
    };
  }, [onBillboard]);

  return (
    <div id="journey" ref={root} className="pointer-events-none relative">
      {spacer('intro')}
      {spacer('work')}
      {spacer('toAbout')}
      {about}
      {spacer('toStack')}
      {spacer('stack')}
      {spacer('toContact')}
      {onBillboard ? spacer('contact', CONTACT_ON_BILLBOARD_SVH) : contact}
    </div>
  );
}
