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

    let holding = false;
    const st = ScrollTrigger.create({
      trigger: '#journey',
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        if (!holding) experienceStore.getState().setProgress(self.progress);
      },
    });
    trigger = st;

    // A resize re-measures the journey: keep the visitor at the same progress, not the same pixel.
    // The snapshot is taken on the resize itself (resize steps run before scroll steps): by the time
    // ScrollTrigger refreshes ~200 ms later, a shorter page may already have clamped scrollY and pushed
    // a wrong progress through onUpdate, so until that refresh lands onUpdate is ignored.
    let saved = 0;
    let lastWidth = innerWidth;
    let release: ReturnType<typeof setTimeout> | undefined;
    const coarse = matchMedia('(pointer: coarse)');
    const onResize = () => {
      const widthChanged = innerWidth !== lastWidth;
      lastWidth = innerWidth;
      // a phone's address bar only changes the height, and ignoreMobileResize skips that refresh
      if (!widthChanged && coarse.matches) return;
      if (!holding) saved = experienceStore.getState().progress;
      holding = true;
      clearTimeout(release);
      release = setTimeout(() => {
        holding = false;
      }, 1000);
    };
    const onRefreshInit = () => {
      if (!holding) saved = experienceStore.getState().progress;
    };
    const onRefresh = () => {
      scrollToProgress(saved, true);
      experienceStore.getState().setProgress(saved);
      holding = false;
      clearTimeout(release);
    };
    window.addEventListener('resize', onResize);
    ScrollTrigger.addEventListener('refreshInit', onRefreshInit);
    ScrollTrigger.addEventListener('refresh', onRefresh);

    return () => {
      window.removeEventListener('resize', onResize);
      clearTimeout(release);
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
