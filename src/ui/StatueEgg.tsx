'use client';

import { useTranslations } from 'next-intl';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { experienceStore, useExperience } from '@/experience/store';
import { lockScroll } from '@/scroll/SmoothScroll';

/** The showcase's tube: a cold white, like light on marble. */
const FRAME = { '--c': '#dcefff' } as CSSProperties;
/** as long as the billboard's switch-on glitch (globals.css, screen-on) */
const GLITCH_MS = 700;

/**
 * The secret (M6): the Mentor's showcase, opened by the marble sticker on the pole (PoleStickers). A neon
 * case over the street with the statue and its plaque; the image is only fetched once it opens. While it is
 * open the page is frozen and inert, so focus stays inside; Esc, the cross and a click outside close it,
 * and focus goes back where it was. Without WebGL there is no pole, and no showcase.
 */
export default function StatueEgg() {
  const open = useExperience((s) => s.eggOpen && s.webgl);
  return open ? <Showcase /> : null;
}

function Showcase() {
  const t = useTranslations('egg');
  const root = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [failed, setFailed] = useState(false);
  const close = () => experienceStore.getState().setEggOpen(false);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const me = root.current;
    // everything else on the page goes inert: Tab can only reach the showcase
    const others = [...document.body.children].filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el !== me && !el.inert,
    );
    for (const el of others) el.inert = true;
    lockScroll(true);
    closeButton.current?.focus({ preventScroll: true });
    const f = frame.current;
    let timer = 0;
    if (f && !experienceStore.getState().reducedMotion) {
      f.dataset.glitch = 'on';
      timer = window.setTimeout(() => delete f.dataset.glitch, GLITCH_MS);
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key !== 'Tab' || !f) return;
      // the rest of the page is inert, but Tab would still leave for the browser's own bar: go round instead
      const stops = [...f.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])')];
      if (!stops.length) return;
      const first = stops[0];
      const last = stops[stops.length - 1];
      const at = document.activeElement;
      if (e.shiftKey ? at === first || !f.contains(at) : at === last || !f.contains(at)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(timer);
      for (const el of others) el.inert = false;
      lockScroll(false);
      opener?.focus?.({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <div
      ref={root}
      data-ui
      data-egg
      className="egg-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={frame}
        data-egg-frame
        role="dialog"
        aria-modal="true"
        aria-labelledby="egg-title"
        className="egg-frame nbox"
        style={FRAME}
      >
        <button ref={closeButton} type="button" aria-label={t('close')} onClick={close} className="egg-close neon" style={FRAME}>
          ×
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element -- one fixed-size picture, fetched on open only */}
        <img
          src="/egg/mentor.webp"
          // raw: ICU would read the `</>` in it as a tag
          alt={t.raw('alt') as string}
          width={667}
          height={1000}
          decoding="async"
          onError={() => setFailed(true)}
          className="egg-statue"
          style={failed ? { visibility: 'hidden' } : undefined}
        />
        <div className="egg-plaque">
          <h2 id="egg-title" className="egg-title">
            {t('title')}
          </h2>
          <p className="egg-line">{t('line')}</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
