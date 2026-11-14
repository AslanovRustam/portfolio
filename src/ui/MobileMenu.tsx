'use client';

import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CONTACTS } from '@/content/contacts';
import type { SectionId } from '@/experience/signs';
import { neonStyle } from './neon';

const NAV: readonly SectionId[] = ['work', 'about', 'stack', 'contact'];
/** Keys that would scroll the page under the open menu. */
const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);

export interface MenuLabels extends Record<SectionId, string> {
  cv: string;
  menu: string;
  closeMenu: string;
}

/**
 * The phone's section menu. Three short orange tubes open it; the street goes dark behind it and the
 * sections and the CV light up one after another on a pole down the left, each in its sign's colour, the
 * open one underlined. A choice, the cross or Esc put it away. While it is open it is the only thing on
 * the page: everything else is inert, the page does not scroll, and Esc closes the menu, not what is under it.
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
  const dialog = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLButtonElement>(null);
  /** focus goes back to the menu button once the page is live again */
  const refocus = useRef(false);

  const close = () => {
    refocus.current = true;
    setOpen(false);
  };

  useEffect(() => {
    if (open) return;
    if (refocus.current) burger.current?.focus();
    refocus.current = false;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // the rest of the page is out of reach: no tabbing or swiping into what the menu covers
    const others = [...document.body.children].filter((el): el is HTMLElement => el instanceof HTMLElement && el !== dialog.current);
    const wasInert = others.map((el) => el.inert);
    for (const el of others) el.inert = true;
    first.current?.focus();

    // capture, so the menu answers first and a case under it never hears this Esc
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        refocus.current = true;
        setOpen(false);
      } else if (e.key === 'Tab') {
        // the keyboard goes round inside the menu
        const items = [...(dialog.current?.querySelectorAll<HTMLElement>('button, a[href]') ?? [])];
        const at = items.indexOf(document.activeElement as HTMLElement);
        const next = e.shiftKey ? (at <= 0 ? items.length - 1 : at - 1) : at === items.length - 1 ? 0 : at + 1;
        e.preventDefault();
        items[next]?.focus();
      } else if (SCROLL_KEYS.has(e.key)) e.preventDefault();
    };
    const onWheel = (e: WheelEvent) => e.preventDefault();
    // turned to a laptop-wide screen: the header's row of tubes takes over
    const wide = matchMedia('(min-width: 48rem)');
    const onWide = () => wide.matches && setOpen(false);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('wheel', onWheel, { capture: true, passive: false });
    wide.addEventListener('change', onWide);
    return () => {
      others.forEach((el, i) => (el.inert = wasInert[i]));
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('wheel', onWheel, { capture: true });
      wide.removeEventListener('change', onWide);
    };
  }, [open]);

  return (
    <>
      <button
        ref={burger}
        type="button"
        aria-label={labels.menu}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="neon burger"
        style={neonStyle('work')}
      >
        <i />
        <i />
        <i />
      </button>
      {open &&
        createPortal(
          <div ref={dialog} role="dialog" aria-modal="true" aria-label={labels.menu} data-ui data-lenis-prevent className="mmenu">
            <button type="button" aria-label={labels.closeMenu} onClick={close} className="neon mmenu-close" style={neonStyle('name')}>
              <span aria-hidden="true">✕</span>
            </button>
            <ul className="mmenu-list">
              {NAV.map((id, i) => (
                <li key={id}>
                  <button
                    ref={i === 0 ? first : undefined}
                    type="button"
                    aria-current={active === id ? 'true' : undefined}
                    onClick={() => {
                      close();
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
          </div>,
          document.body,
        )}
    </>
  );
}
