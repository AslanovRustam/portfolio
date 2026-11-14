'use client';

import { useEffect, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useLanguageLinks } from './LanguageSwitch';
import { neonStyle } from './neon';

/**
 * The phone's language choice: one tube with the current language and a chevron. A tap swings a small blade
 * sign down from it with EN / RU / UK; a choice, a tap elsewhere or Esc puts it away.
 */
export default function LanguagePicker({ label }: { label: string }) {
  const links = useLanguageLinks();
  const current = links.find((l) => l.current) ?? links[0];
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const drop = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!drop.current?.contains(t) && !button.current?.contains(t)) setOpen(false);
    };
    // capture, so the picker answers first and a case under it never hears this Esc
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setOpen(false);
      button.current?.focus();
    };
    // turned to a laptop-wide screen: the row of tubes takes over
    const wide = matchMedia('(min-width: 48rem)');
    const onWide = () => wide.matches && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey, true);
    wide.addEventListener('change', onWide);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey, true);
      wide.removeEventListener('change', onWide);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={button}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`${current.locale.toUpperCase()}, ${label}`}
        onClick={() => setOpen((v) => !v)}
        className="neon gap-1.5 text-[15px]"
        style={neonStyle('lang')}
      >
        {current.locale.toUpperCase()}
        <span aria-hidden="true" className="lang-chevron" />
      </button>
      {open && (
        <div ref={drop} className="lang-drop" style={neonStyle('lang')}>
          <ul aria-label={label}>
            {links.map((l) => (
              <li key={l.locale}>
                <Link
                  href={l.href}
                  locale={l.locale}
                  hrefLang={l.locale}
                  lang={l.locale}
                  scroll={false}
                  aria-current={l.current ? 'true' : undefined}
                  onClick={() => {
                    l.remember();
                    setOpen(false);
                  }}
                  className="neon text-[17px]"
                  style={neonStyle('lang')}
                >
                  {l.locale.toUpperCase()}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
