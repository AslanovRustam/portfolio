'use client';

import { useEffect, useRef } from 'react';
import { activeSection } from '@/experience/choreography';
import { nextSection } from '@/experience/next';
import type { SectionId } from '@/experience/signs';
import { experienceStore, useExperience } from '@/experience/store';
import { usePathname } from '@/i18n/navigation';
import { scrollToSection } from '@/scroll/SmoothScroll';
import { flicker, neonStyle } from './neon';

/** Fixed HTML at the bottom of the screen that the button must never cover. */
const OBSTACLES = ['header[data-hero]', 'section#work', 'section#stack'];
const GAP = 12;

/**
 * "Next: About ↓" — one tube at the bottom of the screen that names the way on and takes the visitor
 * there; it is also the hint that the page scrolls. It wears the colour of the section it leads to (the
 * blueprint's blue on the first screen), rises above the title block and the Work and Stack captions when
 * they share its column, and is gone at Contact (the road ends) and over an open case.
 */
export default function NextButton({ prefix, labels }: { prefix: string; labels: Record<SectionId, string> }) {
  const next = useExperience((s) => nextSection(s.progress));
  const blueprint = useExperience((s) => activeSection(s.progress) === null);
  const pathname = usePathname();
  const button = useRef<HTMLButtonElement>(null);
  const shown = next !== null && pathname === '/';

  useEffect(() => {
    if (!shown) return;
    const place = () => {
      const el = button.current;
      if (!el) return;
      const me = el.getBoundingClientRect();
      let bottom = 16;
      for (const sel of OBSTACLES) {
        const o = document.querySelector<HTMLElement>(sel);
        if (!o) continue;
        const cs = getComputedStyle(o);
        if (cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) continue;
        const r = o.getBoundingClientRect();
        if (r.width === 0 || r.top >= innerHeight || r.right <= me.left || r.left >= me.right) continue;
        bottom = Math.max(bottom, innerHeight - r.top + GAP);
      }
      el.style.bottom = `calc(${Math.round(bottom)}px + env(safe-area-inset-bottom))`;
    };
    let frame = 0;
    const schedule = () => {
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0;
          place();
        });
    };
    place();
    const unsubscribe = experienceStore.subscribe(schedule);
    addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      unsubscribe();
      removeEventListener('resize', schedule);
    };
  }, [shown]);

  if (!shown) return null;
  return (
    <>
      <div aria-hidden="true" className="next-fade" />
      <button
        ref={button}
        type="button"
        data-ui
        onClick={() => scrollToSection(next)}
        className="next-button neon neon-flicker text-[15px] sm:text-[17px]"
        style={{ ...neonStyle(blueprint ? 'blueprint' : next), ...flicker(6) }}
      >
        {prefix}: {labels[next]}
        <span aria-hidden="true" className="next-arrow">
          ↓
        </span>
      </button>
    </>
  );
}
