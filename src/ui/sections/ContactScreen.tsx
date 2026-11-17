'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { GLITCH_MS, screenOn } from '@/experience/billboardScreen';
import { activeSection } from '@/experience/choreography';
import { DIVE, diveScale, diveStage, pinDiveHeight } from '@/experience/dive';
import { pieceSpanPx } from '@/experience/journey';
import { onScreenRect } from '@/experience/liveScreen';
import { experienceStore } from '@/experience/store';
import { BILLBOARD } from '@/scene/billboard/layout';
import type { Rect } from '@/scene/tvwall/screenRects';
import { NEON, neonStyle } from '../neon';
import { useContactMode } from './useContactMode';
import { useNarrow } from './useNarrow';

/** The frame's tube runs this far from the window's top: under the header (px). */
const TOP = 64;
const INSET = DIVE.frameInset;
/** the content sits this far inside the frame's tube (px), in the page and in its picture alike */
const PAD = 16;
const MAT = '#050508';

/** A switch's glitch on an element: restarted, and cleared once it has played. */
function glitch(el: HTMLElement, kind: 'on' | 'off', done?: () => void): number {
  delete el.dataset.glitch;
  void el.offsetWidth; // a fresh start for the animation, even when the same kind was running
  el.dataset.glitch = kind;
  return window.setTimeout(() => {
    delete el.dataset.glitch;
    done?.();
  }, GLITCH_MS);
}

/**
 * The dive into the billboard's screen, the page's part (M4 round 1, spec §5), wherever the form does not fit
 * into the billboard. While the camera rests in front of the switched-on screen and drives into it, a
 * picture of the form's first screen (decorative: the lead, the fields, the Send sign) sits on the panel
 * where the live camera sees it, growing with it. Once the panel fills the window a neon frame lights along
 * its edges, under the header, and Contact's own content — in the page's flow, so focus, the on-screen
 * keyboard and selection behave as everywhere — shows inside it; black mats outside the tube hide it
 * beyond the frame. Scrolling back hands over the other way. Under reduced motion the frame is lit for all
 * of Contact and the content starts at its top. Renders nothing elsewhere.
 */
export default function ContactScreen() {
  const mode = useContactMode();
  const narrow = useNarrow();
  const t = useTranslations('contact');
  const picture = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const pic = picture.current;
    const fr = frame.current;
    if (mode !== 'dive' || !pic || !fr) return;
    // Contact's section in the journey: the track may lay it out a render after this window turned to the
    // dive, so it is looked up as it is needed
    let found: HTMLElement | null = null;
    const contact = () => {
      if (!found?.isConnected) {
        found = document.querySelector<HTMLElement>('#journey section#contact');
        if (found) found.dataset.dive = '';
      }
      return found;
    };

    let rect: Rect | null = null;
    // the height Contact is laid out for: a turn re-lays it out, a phone's address bar does not
    let layout = { w: 0, h: 0 };
    let on: boolean | null = null;
    let inside: boolean | null = null;
    let picTimer = 0;
    let frameTimer = 0;

    const show = (el: HTMLElement, v: boolean) => {
      el.style.visibility = v ? 'visible' : 'hidden';
    };
    const update = () => {
      const section = contact();
      if (!section) return;
      const { progress, reducedMotion, cameraAtBillboard } = experienceStore.getState();
      const w = innerWidth;
      const h = innerHeight;
      // a turn changes the width; a keyboard or an address bar only the height, and must not move the form
      if (w !== layout.w) layout = { w, h };
      pinDiveHeight(layout.h);
      // the first box reaches the frame's top a little past the dive's end (or at once, with no dive)
      const entry = (reducedMotion ? 0 : ((DIVE.arriveSvh + DIVE.diveSvh + DIVE.backSvh) * layout.h) / 100) + TOP + PAD;
      section.style.setProperty('--entry', `${Math.round(entry)}px`);
      // Contact is the last piece: the page scrolls only its height less a screen, and that must hold the
      // whole dive, however short the content is
      section.style.minHeight = `${Math.ceil(entry - TOP - PAD + layout.h + 2)}px`;

      const { stage } = diveStage(progress, { w, h, contactPx: pieceSpanPx('contact', h) });
      const lit = screenOn(progress, reducedMotion, cameraAtBillboard);
      // the frame lights once the panel really fills the window (the damped camera may still be driving in)
      const covers = !rect || (rect.x <= 1 && rect.y <= 1 && rect.x + rect.width >= w - 1 && rect.y + rect.height >= h - 1);
      const nowInside = reducedMotion ? activeSection(progress) === 'contact' : lit && stage === 'inside' && covers;
      const showPicture = !reducedMotion && lit && !nowInside;

      // what the page shows: inside only once the frame is lit (the scroll may be there before the camera)
      section.dataset.stage = nowInside ? 'inside' : stage === 'inside' ? 'dive' : stage;
      // inside the screen its own mat darkens the top: the header's fade would dim the content's first lines
      document.documentElement.toggleAttribute('data-in-screen', nowInside);
      section.inert = !nowInside;

      const wasInside = inside;
      if (nowInside !== inside) {
        const first = inside === null;
        inside = nowInside;
        clearTimeout(frameTimer);
        show(fr, nowInside);
        if (nowInside && !first && !reducedMotion) frameTimer = glitch(fr, 'on');
        else delete fr.dataset.glitch;
      }
      if (showPicture !== on) {
        const first = on === null;
        on = showPicture;
        clearTimeout(picTimer);
        delete pic.dataset.glitch;
        if (showPicture) {
          show(pic, true);
          // the screen switching on plays its glitch; coming back out of the frame just hands over
          if (!first && !reducedMotion && !wasInside) picTimer = glitch(pic, 'on');
        } else if (!first && !reducedMotion && !lit) {
          picTimer = glitch(pic, 'off', () => show(pic, false));
        } else show(pic, false);
      }
      if (showPicture && rect) {
        // the picture is the frame's content window pinned to the panel's centre, at the panel's scale now
        const s = rect.width / BILLBOARD.panel.width / diveScale(h, w / h);
        const W = w;
        const H = h - TOP - INSET;
        const cx = rect.x + rect.width / 2;
        const cy = rect.y + rect.height / 2 + ((TOP - INSET) / 2) * s;
        pic.style.width = `${W}px`;
        pic.style.height = `${H}px`;
        pic.style.transform = `translate(${cx - (W / 2) * s}px, ${cy - (H / 2) * s}px) scale(${s})`;
      }
    };

    const offRect = onScreenRect((r) => {
      rect = r;
      update();
    });
    const offStore = experienceStore.subscribe(update);
    addEventListener('resize', update);
    update();
    return () => {
      offRect();
      offStore();
      removeEventListener('resize', update);
      clearTimeout(picTimer);
      clearTimeout(frameTimer);
      pinDiveHeight(null);
      document.documentElement.removeAttribute('data-in-screen');
      const section = found;
      if (!section) return;
      section.inert = false;
      delete section.dataset.dive;
      delete section.dataset.stage;
      section.style.removeProperty('--entry');
      section.style.minHeight = '';
    };
  }, [mode]);

  if (mode !== 'dive') return null;
  return (
    <>
      <div
        ref={picture}
        data-screen-picture=""
        aria-hidden="true"
        inert
        className="screen-content pointer-events-none fixed left-0 top-0 z-[25] origin-top-left overflow-hidden"
        style={{ visibility: 'hidden', ...neonStyle('contact') }}
      >
        {/* laid out as the content in the frame: centred, as wide as the page's column at most */}
        <div className="mx-auto space-y-7" style={{ maxWidth: 'calc(40rem + 48px)', padding: `${PAD}px 24px` }}>
          <p className="text-sm leading-relaxed text-[#e8f7ff]/85">{t('lead')}</p>
          {narrow ? (
            // a phone's form starts at its first step
            <div className="space-y-4">
              <p className="nstep-count">1 / 3</p>
              <div>
                <span className="nfield-label">{t('name')}</span>
                <div className="nfield" style={{ height: 48 }} />
              </div>
              <div className="flex">
                <span className="nsend ml-auto" data-ready="true">
                  {t('next')} →
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {(['name', 'email', 'message'] as const).map((k) => (
                <div key={k}>
                  <span className="nfield-label">{t(k)}</span>
                  <div className="nfield" style={{ height: k === 'message' ? 110 : 42 }} />
                </div>
              ))}
              <span className="nsend">{t('send')}</span>
            </div>
          )}
        </div>
      </div>
      <div ref={frame} data-screen-frame="" aria-hidden="true" className="pointer-events-none fixed inset-0 z-[25]" style={{ visibility: 'hidden' }}>
        <div className="absolute inset-x-0 top-0" style={{ height: TOP, background: MAT }} />
        <div className="absolute inset-x-0 bottom-0" style={{ height: INSET, background: MAT }} />
        <div className="absolute left-0" style={{ top: TOP, bottom: INSET, width: INSET, background: MAT }} />
        <div className="absolute right-0" style={{ top: TOP, bottom: INSET, width: INSET, background: MAT }} />
        <div
          data-screen-tube=""
          className="screen-content absolute rounded-[3px] border-2"
          style={{
            top: TOP,
            right: INSET,
            bottom: INSET,
            left: INSET,
            borderColor: NEON.contact,
            boxShadow: `0 0 8px ${NEON.contact}, inset 0 0 12px ${NEON.contact}55`,
          }}
        />
      </div>
    </>
  );
}
