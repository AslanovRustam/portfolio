'use client';

import { useEffect, useRef } from 'react';
import { experienceStore } from '@/experience/store';

/**
 * The drawing's title block: name, role and the cue to scroll, set in the lower-left corner like the
 * stamp of a technical drawing. It is server-rendered (the page's largest paint) and fades away as the
 * first scroll starts rendering the scene.
 */
export default function Hero({ name, role, line, cue }: { name: string; role: string; line: string; cue: string }) {
  const block = useRef<HTMLElement>(null);

  useEffect(() => {
    const apply = (p: number) => {
      const el = block.current;
      if (!el) return;
      const o = 1 - Math.min(1, Math.max(0, p / 0.05));
      el.style.opacity = String(o);
      el.style.pointerEvents = o > 0 ? '' : 'none';
    };
    apply(experienceStore.getState().progress);
    return experienceStore.subscribe((s) => apply(s.progress));
  }, []);

  return (
    <header
      ref={block}
      data-hero
      className="pointer-events-none fixed inset-x-4 bottom-4 z-10 text-[#e8f7ff] sm:inset-x-auto sm:bottom-8 sm:left-8"
    >
      <div className="border border-[#7fe3ff]/60 bg-[#0b1f38]/40 backdrop-blur-[2px]">
        <h1 className="border-b border-[#7fe3ff]/60 px-4 pb-2 pt-3 text-[clamp(2.25rem,7vw,7rem)] font-bold uppercase leading-[0.92] tracking-[-0.03em]">
          {name}
        </h1>
        <div className="grid grid-cols-[1fr_auto] text-sm sm:text-base">
          <p className="border-r border-[#7fe3ff]/60 px-4 py-2">{role}</p>
          <p className="px-4 py-2 text-[#7fe3ff]">
            {cue} <span aria-hidden="true">↓</span>
          </p>
        </div>
        <p className="max-w-[60ch] border-t border-[#7fe3ff]/60 px-4 py-2 text-xs text-[#e8f7ff]/80 sm:text-sm">{line}</p>
      </div>
    </header>
  );
}
