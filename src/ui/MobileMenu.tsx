'use client';

import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CONTACTS } from '@/content/contacts';
import type { SectionId } from '@/experience/signs';
import { neonStyle } from './neon';

const NAV: readonly SectionId[] = ['work', 'about', 'stack', 'contact'];

export interface MenuLabels extends Record<SectionId, string> {
  cv: string;
  menu: string;
  closeMenu: string;
}

/**
 * The phone's section menu. Three short orange tubes open it; the street goes dark behind it and the
 * sections and the CV light up one after another on a pole down the left, each in its sign's colour, the
 * open one underlined. A choice, the cross, Esc or the phone's back button put it away.
 */
export default function MobileMenu({
  labels,
  active,
  go,
}: {
  labels: MenuLabels;
  active: SectionId | null;
  go: (id: SectionId) => void;
}) {
  const [open, setOpen] = useState(false);
  const burger = useRef<HTMLButtonElement>(null);
  const first = useRef<HTMLButtonElement>(null);

  /**
   * Puts the menu away. Its history entry goes too (Back is not spent on a closed menu): stepped back over
   * on the cross or Esc, but only rewritten after a choice, so no popstate lands in the middle of the glide
   * to the chosen section.
   */
  const close = useCallback((refocus: boolean, choice = false) => {
    setOpen(false);
    const state = history.state as { mobileMenu?: boolean } | null;
    if (state?.mobileMenu) {
      if (choice) history.replaceState({ ...state, mobileMenu: false }, '');
      else history.back();
    }
    if (refocus) burger.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(true);
    };
    // the phone's back button closes the menu instead of leaving the page
    const onPop = () => {
      setOpen(false);
      burger.current?.focus();
    };
    // turned to a laptop-wide screen: the header's row of tubes takes over
    const wide = matchMedia('(min-width: 768px)');
    const onWide = () => wide.matches && close(false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('popstate', onPop);
    wide.addEventListener('change', onWide);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('popstate', onPop);
      wide.removeEventListener('change', onWide);
    };
  }, [open, close]);

  const show = () => {
    history.pushState({ ...(history.state as object | null), mobileMenu: true }, '');
    setOpen(true);
  };

  return (
    <>
      <button
        ref={burger}
        type="button"
        aria-label={labels.menu}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={show}
        className="neon burger"
        style={neonStyle('work')}
      >
        <i />
        <i />
        <i />
      </button>
      {open &&
        createPortal(
          <div role="dialog" aria-modal="true" aria-label={labels.menu} data-ui data-lenis-prevent className="mmenu">
            <button type="button" aria-label={labels.closeMenu} onClick={() => close(true)} className="neon mmenu-close" style={neonStyle('name')}>
              <span aria-hidden="true">✕</span>
            </button>
            <nav aria-label={labels.menu}>
              <ul className="mmenu-list">
                {NAV.map((id, i) => (
                  <li key={id}>
                    <button
                      ref={i === 0 ? first : undefined}
                      type="button"
                      aria-current={active === id ? 'true' : undefined}
                      onClick={() => {
                        close(false, true);
                        go(id);
                      }}
                      className="neon mmenu-item"
                      style={{ ...neonStyle(id), '--i': i } as CSSProperties}
                    >
                      {labels[id]}
                    </button>
                  </li>
                ))}
                <li>
                  <a href={CONTACTS.cv} download className="neon mmenu-item" style={{ ...neonStyle('cv'), '--i': NAV.length } as CSSProperties}>
                    {labels.cv}
                  </a>
                </li>
              </ul>
            </nav>
          </div>,
          document.body,
        )}
    </>
  );
}
