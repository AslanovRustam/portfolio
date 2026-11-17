'use client';

import { useEffect, useRef } from 'react';
import { aboutCloseUp, billsWidth } from '@/experience/aboutPole';
import { pieceSpanPx } from '@/experience/journey';
import { sectionPresence } from '@/experience/panels';
import { POLE } from '@/experience/signs';
import { experienceStore } from '@/experience/store';

const TAN = Math.tan(((35 / 2) * Math.PI) / 180);

/**
 * About close to the pole on a laptop (M4 round 1, spec §6): the street on either side of the pole, out of
 * focus — blurred where the GPU affords it, darkened everywhere. A phone needs none: the pole fills its width.
 */
export default function AboutBackdrop() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = () => {
      const { progress, webgl } = experienceStore.getState();
      const w = innerWidth;
      const h = innerHeight;
      const wide = w >= 1024 && w / h >= 1;
      const v = webgl && wide ? sectionPresence(progress, 'about') : 0;
      el.style.opacity = String(v);
      el.style.visibility = v > 0.001 ? 'visible' : 'hidden';
      if (v <= 0.001) return;
      const { distance } = aboutCloseUp({ w, h, aboutPx: pieceSpanPx('about', h), billsPx: billsWidth(w, h) });
      el.style.setProperty('--pole', `${(2 * POLE.radius * (h / 2)) / (distance * TAN)}px`);
    };
    apply();
    const off = experienceStore.subscribe(apply);
    addEventListener('resize', apply);
    return () => {
      off();
      removeEventListener('resize', apply);
    };
  }, []);
  return (
    <div ref={ref} aria-hidden="true" data-about-backdrop="" className="pointer-events-none fixed inset-0 z-[5]" style={{ visibility: 'hidden' }}>
      <div className="about-strip left-0" />
      <div className="about-strip right-0" />
    </div>
  );
}
