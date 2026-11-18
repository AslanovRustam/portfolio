'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { useEffect } from 'react';
import type { DiveView } from '@/experience/diveStages';
import { pieceSpanPx, scrollFromStory, storyFromScroll } from '@/experience/journey';
import { takePlace } from '@/experience/place';
import { CONTACT_FROM } from '@/experience/sections';
import type { SectionId } from '@/experience/signs';
import { experienceStore } from '@/experience/store';
import { stackSnapTarget } from '@/experience/stackStops';
import { parseHash, sectionTarget, snapTarget } from '@/experience/workStops';
import { billboardFit } from '@/scene/billboard/fit';

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;
let trigger: ScrollTrigger | null = null;
let locked = false;
/** a scroll asked for while the page was locked (e.g. header nav over an open case), run on unlock */
let pending: { p: number; immediate: boolean } | null = null;
/** the page is moving because the site asked it to (a link, a jump, a snap): the snap leaves it alone */
let programmatic = false;
/** where a site-made glide is heading (story progress), while it is under way */
let heading: number | null = null;
/** story progress where the visitor's current scroll gesture began (the snap settles in its direction) */
let gestureFrom: number | null = null;
/** the section a link (header, menu, Next) is taking the visitor to, until they scroll themselves */
let arrival: SectionId | null = null;

/** Whether a link brought the visitor to section `id` (asked once: the answer is used up). */
export function takeArrival(id: SectionId): boolean {
  if (arrival !== id) return false;
  arrival = null;
  return true;
}

/** Page y of story progress q. */
function yForStory(q: number): number | null {
  if (!trigger) return null;
  return trigger.start + (trigger.end - trigger.start) * scrollFromStory(q);
}

/** Scrolls the page so the journey sits at story progress q (0..1). */
export function scrollToProgress(q: number, immediate = false): void {
  if (locked) {
    pending = { p: q, immediate };
    return;
  }
  const y = yForStory(q);
  if (!lenis || y === null) return;
  programmatic = true;
  gestureFrom = null;
  heading = immediate ? null : q;
  // the page may have just grown (a sent message, an error line): Lenis must not clamp to its old limit
  lenis.resize();
  lenis.scrollTo(y, {
    immediate,
    force: true,
    onComplete: () => {
      programmatic = false;
      heading = null;
    },
  });
}

/** Freezes the page under an overlay (case dialog): no wheel, touch or keyboard scrolling, no jump. */
export function lockScroll(on: boolean): void {
  locked = on;
  document.documentElement.style.overflow = on ? 'hidden' : '';
  if (on) lenis?.stop();
  else {
    lenis?.start();
    if (pending) {
      const { p, immediate } = pending;
      pending = null;
      scrollToProgress(p, immediate);
    }
  }
}

/**
 * This window as the dive sees it (M4 round 1), or undefined where the form goes into the billboard (or
 * there is no scene): Contact's links land where the dive ends, which depends on Contact's length.
 */
function diveView(): DiveView | undefined {
  const v = { w: innerWidth, h: innerHeight };
  const { webgl, reducedMotion } = experienceStore.getState();
  if (!webgl || billboardFit(v) !== null) return undefined;
  return { ...v, contactPx: pieceSpanPx('contact', innerHeight), still: reducedMotion };
}

/** About as this window lays it out: a link lands where its first bill has come up the screen. */
const aboutView = () => ({ h: innerHeight, aboutPx: pieceSpanPx('about', innerHeight) });

/** Scrolls to a section (Work: its first project); glides unless the visitor prefers reduced motion. */
export function scrollToSection(id: SectionId): void {
  arrival = id;
  scrollToProgress(sectionTarget(id, diveView(), aboutView()), experienceStore.getState().reducedMotion);
}

/** How long the page has to rest inside Work before it settles on the nearest project. */
const SNAP_IDLE_MS = 150;
const SNAP_GLIDE_S = 0.4;

/** Lenis smooth scroll + one ScrollTrigger over #journey that writes progress into the store. */
export default function SmoothScroll() {
  useEffect(() => {
    // a reload always starts at the blueprint, never half-rendered
    history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    experienceStore.getState().setProgress(0); // a remount (language switch) must not keep the old spot
    ScrollTrigger.clearScrollMemory('manual');
    // the mobile address bar collapsing must not re-measure the journey mid-swipe
    ScrollTrigger.config({ ignoreMobileResize: true });

    // a panel taller than its sheet scrolls natively, then the wheel carries on along the journey
    const instance = new Lenis({ autoRaf: false, allowNestedScroll: true });
    lenis = instance;
    if (locked) instance.stop(); // a case opened by a direct link locked the page before Lenis existed
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
        if (!holding) experienceStore.getState().setProgress(storyFromScroll(self.progress));
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
    // In Contact, the last piece, a re-measure while the visitor is inside the billboard's screen (the form's
    // content grew or shrank: a step, an error line, a status) keeps them as far into the piece as they were,
    // in px: the same share of a longer piece would move them out of the screen (Plan 4c). Only when the lengths
    // in use were measured in this window's width with the form in the same place: after a resize, or the form
    // moving between the billboard and the screen, the old lengths say nothing about the new piece, and the
    // story progress is kept as above.
    const contactPiece = () =>
      [...document.querySelectorAll<HTMLElement>('#journey section#contact')].find((e) => e.getClientRects().length > 0);
    const layoutKey = () => `${innerWidth}:${contactPiece()?.hasAttribute('data-dive') ? 'screen' : 'board'}`;
    /** the layout the lengths in use were measured in, and Contact's length among them (px) */
    let measuredIn = '';
    let contactSpan = 0;
    let tail: number | null = null;
    const onRefreshInit = () => {
      if (holding) {
        tail = null;
        return;
      }
      saved = experienceStore.getState().progress;
      const inside = contactPiece()?.dataset.stage === 'inside';
      tail =
        inside && layoutKey() === measuredIn && saved >= CONTACT_FROM
          ? ((saved - CONTACT_FROM) / (1 - CONTACT_FROM)) * contactSpan
          : null;
    };
    const onRefresh = () => {
      measuredIn = layoutKey();
      contactSpan = pieceSpanPx('contact', innerHeight);
      // a site-made glide under way (a contact link heading for the green light) carries on to its end
      if (programmatic && heading !== null) {
        const to = heading;
        holding = false;
        clearTimeout(release);
        scrollToProgress(to);
        return;
      }
      const at = tail === null ? saved : Math.min(1, CONTACT_FROM + (tail / contactSpan) * (1 - CONTACT_FROM));
      tail = null;
      scrollToProgress(at, true);
      experienceStore.getState().setProgress(at);
      holding = false;
      clearTimeout(release);
    };
    window.addEventListener('resize', onResize);
    ScrollTrigger.addEventListener('refreshInit', onRefreshInit);
    ScrollTrigger.addEventListener('refresh', onRefresh);

    // Inside Work (and among Stack's signs) a scroll that comes to rest between two stops settles on one. Only the
    // visitor's own scrolling counts: any wheel, touch or key hands control back from a site-made scroll.
    let snapTimer: ReturnType<typeof setTimeout> | undefined;
    const settle = () => {
      if (programmatic || locked || holding || instance.isTouching) return;
      if (instance.isScrolling) {
        snapTimer = setTimeout(settle, SNAP_IDLE_MS); // still gliding or coasting
        return;
      }
      const q = experienceStore.getState().progress;
      const target = snapTarget(q, gestureFrom ?? undefined) ?? stackSnapTarget(q, gestureFrom ?? undefined);
      gestureFrom = null;
      const y = target === null ? null : yForStory(target);
      if (y === null) return;
      const reduced = experienceStore.getState().reducedMotion;
      programmatic = true;
      instance.scrollTo(y, {
        immediate: reduced,
        duration: SNAP_GLIDE_S,
        force: true,
        onComplete: () => {
          programmatic = false;
        },
      });
    };
    const onLenisScroll = () => {
      clearTimeout(snapTimer);
      if (!programmatic) snapTimer = setTimeout(settle, SNAP_IDLE_MS);
    };
    const onVisitorInput = () => {
      programmatic = false;
      arrival = null;
      gestureFrom ??= experienceStore.getState().progress;
    };
    instance.on('scroll', onLenisScroll);
    for (const type of ['wheel', 'touchstart', 'keydown'] as const)
      window.addEventListener(type, onVisitorInput, { capture: true, passive: true });

    // A deep link (/en#stack, /en#work-5) opens its place once there is something to look at: when the
    // scene is ready, or straight away on the no-WebGL fallback, which never becomes ready.
    // after a language switch, the exact place inside that section (the text is longer or shorter now)
    const hash = location.hash.slice(1);
    const hashed = parseHash(hash, diveView(), aboutView());
    const placed = hashed === null ? null : takePlace(hashed);
    let stopDeepLink = () => {};
    if (hashed !== null) {
      const go = (s: { ready: boolean; webgl: boolean }) => {
        if (!s.ready && s.webgl) return false;
        // asked again now that the page has measured itself: the dive's landing depends on Contact's length
        scrollToProgress(placed ?? parseHash(hash, diveView(), aboutView()) ?? hashed, experienceStore.getState().reducedMotion);
        return true;
      };
      if (!go(experienceStore.getState())) {
        stopDeepLink = experienceStore.subscribe((s) => {
          if (go(s)) stopDeepLink();
        });
      }
    }

    return () => {
      stopDeepLink();
      clearTimeout(snapTimer);
      for (const type of ['wheel', 'touchstart', 'keydown'] as const)
        window.removeEventListener(type, onVisitorInput, { capture: true });
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
