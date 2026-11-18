'use client';

import { useEffect, useRef } from 'react';
import { GLITCH_MS, screenOn } from '@/experience/billboardScreen';
import { experienceStore } from '@/experience/store';
import { CONTACT_DESIGN } from '@/scene/billboard/fit';
import { neonStyle } from '../neon';
import ContactSection from './ContactSection';
import { useBillboardFit } from './useBillboardFit';

/**
 * Contact on a laptop: the form, the contacts and the lead fitted into the billboard's panel at the end of
 * the street, scaled from their design size to the panel's rect as the end pose projects it. The billboard
 * is a screen (M4 round 1): the content is on it only while the screen is on (the camera has stopped in
 * front of it), and every switch plays a short glitch; a switch during a glitch replaces it, so they never
 * pile up. Hidden and inert while off. Under reduced motion it is on from the start of Contact, with no
 * glitch. Elsewhere it renders nothing and the page carries Contact (in its flow, or in the dive).
 */
export default function ContactBillboard() {
  const fit = useBillboardFit();
  const el = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = el.current;
    if (!node || !fit) return;
    node.style.transform = `translate(${fit.rect.x}px, ${fit.rect.y}px) scale(${fit.scale})`;
    // the hints keep a readable size on the screen however small the billboard is drawn (globals.css)
    node.style.setProperty('--fit', String(fit.scale));
    let on: boolean | null = null;
    let timer = 0;
    const show = (v: boolean) => {
      node.style.visibility = v ? 'visible' : 'hidden';
      node.inert = !v;
    };
    const apply = () => {
      const { progress, reducedMotion, cameraAtBillboard } = experienceStore.getState();
      const want = screenOn(progress, reducedMotion, cameraAtBillboard);
      if (want === on) return;
      const first = on === null;
      on = want;
      node.dataset.screen = want ? 'on' : 'off';
      clearTimeout(timer);
      // the first state is where the page already was: no switch to play
      if (first || reducedMotion) {
        delete node.dataset.glitch;
        show(want);
        return;
      }
      // restart the glitch: the other switch's animation, if one runs, is replaced
      node.dataset.glitch = want ? 'on' : 'off';
      if (want) show(true);
      timer = window.setTimeout(() => {
        delete node.dataset.glitch;
        if (!want) show(false);
      }, GLITCH_MS);
    };
    apply();
    const unsubscribe = experienceStore.subscribe(apply);
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
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
      data-screen="off"
      className="screen-content fixed left-0 top-0 z-20 origin-top-left px-7 py-6"
      style={{ width: CONTACT_DESIGN.w, height: CONTACT_DESIGN.h, visibility: 'hidden', ...neonStyle('contact') }}
    >
      <ContactSection fitted />
    </section>
  );
}
