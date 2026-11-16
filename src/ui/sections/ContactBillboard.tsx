'use client';

import { useEffect, useRef } from 'react';
import { sectionPresence } from '@/experience/panels';
import { experienceStore } from '@/experience/store';
import { CONTACT_DESIGN } from '@/scene/billboard/fit';
import { neonStyle } from '../neon';
import ContactSection from './ContactSection';
import { useBillboardFit } from './useBillboardFit';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** the form comes onto the panel as the camera arrives at the billboard (route.ts: END_FROM 0.86) */
const IN: readonly [number, number] = [0.85, 0.87];

/**
 * Contact on a laptop: the form, the contacts and the lead fitted into the billboard's panel at the end of
 * the street, scaled from their design size to the panel's rect as the end pose projects it. Hidden (and
 * inert) until the camera arrives; under reduced motion, from the start of Contact (the camera is there at
 * once). Elsewhere it renders nothing and the page carries Contact in its flow.
 */
export default function ContactBillboard() {
  const fit = useBillboardFit();
  const el = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = el.current;
    if (!node || !fit) return;
    let last = -1;
    const apply = () => {
      const { progress, reducedMotion } = experienceStore.getState();
      const t = clamp01((progress - IN[0]) / (IN[1] - IN[0]));
      const v = reducedMotion ? sectionPresence(progress, 'contact') : t * t * (3 - 2 * t);
      if (v === last) return;
      last = v;
      const shown = v >= 0.01;
      const rise = reducedMotion ? 0 : (1 - v) * 16;
      node.style.opacity = String(v);
      node.style.transform = `translate(${fit.rect.x}px, ${fit.rect.y + rise}px) scale(${fit.scale})`;
      node.style.visibility = shown ? 'visible' : 'hidden';
      node.inert = !shown;
    };
    apply();
    return experienceStore.subscribe(apply);
  }, [fit]);

  if (!fit) return null;
  return (
    <section
      ref={el}
      id="contact"
      aria-labelledby="contact-title"
      data-ui
      data-section="contact"
      data-billboard=""
      className="fixed left-0 top-0 z-20 origin-top-left px-7 py-6"
      style={{ width: CONTACT_DESIGN.w, height: CONTACT_DESIGN.h, opacity: 0, visibility: 'hidden', ...neonStyle('contact') }}
    >
      <ContactSection fitted />
    </section>
  );
}
