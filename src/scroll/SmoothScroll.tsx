'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { useEffect } from 'react';
import { sectionCenter } from '@/experience/choreography';
import type { SectionId } from '@/experience/signs';
import { experienceStore } from '@/experience/store';

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;
let trigger: ScrollTrigger | null = null;

/** Scrolls the page so the journey sits at progress p (0..1). */
export function scrollToProgress(p: number, immediate = false): void {
  if (!lenis || !trigger) return;
  const y = trigger.start + (trigger.end - trigger.start) * Math.min(1, Math.max(0, p));
  lenis.scrollTo(y, { immediate, force: true });
}

/** Scrolls to a section's centre; glides unless the visitor prefers reduced motion. */
export function scrollToSection(id: SectionId): void {
  scrollToProgress(sectionCenter(id), experienceStore.getState().reducedMotion);
}

/** Lenis smooth scroll + one ScrollTrigger over #journey that writes progress into the store. */
export default function SmoothScroll() {
  useEffect(() => {
    // a reload always starts at the blueprint, never half-rendered
    history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    ScrollTrigger.clearScrollMemory('manual');
    // the mobile address bar collapsing must not re-measure the journey mid-swipe
    ScrollTrigger.config({ ignoreMobileResize: true });

    const instance = new Lenis({ autoRaf: false });
    lenis = instance;
    const raf = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    instance.on('scroll', ScrollTrigger.update);

    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const followMotion = () => {
      instance.options.lerp = motion.matches ? 1 : 0.1;
      instance.options.smoothWheel = !motion.matches;
      experienceStore.getState().setReducedMotion(motion.matches);
    };
    followMotion();
    motion.addEventListener('change', followMotion);

    const st = ScrollTrigger.create({
      trigger: '#journey',
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => experienceStore.getState().setProgress(self.progress),
    });
    trigger = st;

    // a resize re-measures the journey: keep the visitor at the same progress, not the same pixel
    let saved = 0;
    const onRefreshInit = () => {
      saved = experienceStore.getState().progress;
    };
    const onRefresh = () => {
      scrollToProgress(saved, true);
      experienceStore.getState().setProgress(saved);
    };
    ScrollTrigger.addEventListener('refreshInit', onRefreshInit);
    ScrollTrigger.addEventListener('refresh', onRefresh);

    return () => {
      ScrollTrigger.removeEventListener('refreshInit', onRefreshInit);
      ScrollTrigger.removeEventListener('refresh', onRefresh);
      motion.removeEventListener('change', followMotion);
      gsap.ticker.remove(raf);
      st.kill();
      instance.destroy();
      if (lenis === instance) lenis = null;
      if (trigger === st) trigger = null;
    };
  }, []);

  return null;
}
