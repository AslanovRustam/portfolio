'use client';

import { useEffect, useRef } from 'react';
import { aboutCloseUp, billsWidth } from '@/experience/aboutPole';
import { pieceSpanPx } from '@/experience/journey';
import { sectionPresence } from '@/experience/panels';
import { POLE } from '@/experience/signs';
import { experienceStore } from '@/experience/store';

const TAN = Math.tan(((35 / 2) * Math.PI) / 180);

/**
 * About close to the pole (M4 round 1, spec §6): the street on either side of the pole, out of focus —
 * blurred where the GPU affords it, darkened everywhere — wherever the pole is narrower than the window (a
 * portrait phone's pole fills it).
 */
export default function AboutBackdrop() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let last = '';
    const apply = () => {
      const { progress, webgl } = experienceStore.getState();
      // outside About (and its turns) nothing changes: skip the work, as this runs on every scroll step
      const key = `${progress}:${webgl}:${innerWidth}x${innerHeight}`;
      if (key === last) return;
      last = key;
      const w = innerWidth;
      const h = innerHeight;
      const presence = webgl ? sectionPresence(progress, 'about') : 0;
      const { distance } = aboutCloseUp({ w, h, aboutPx: pieceSpanPx('about', h), billsPx: billsWidth(w, h) });
      const pole = (2 * POLE.radius * (h / 2)) / (distance * TAN);
      const v = pole < w ? presence : 0;
      // written only when they change
      const opacity = String(v);
      const visibility = v > 0.001 ? 'visible' : 'hidden';
      if (el.style.opacity !== opacity) el.style.opacity = opacity;
      if (el.style.visibility !== visibility) el.style.visibility = visibility;
      const polePx = `${pole}px`;
      if (v > 0.001 && el.style.getPropertyValue('--pole') !== polePx) el.style.setProperty('--pole', polePx);
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
