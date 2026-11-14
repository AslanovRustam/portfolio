'use client';

import { useEffect, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { neonStyle } from './neon';
import { useLanguageLinks } from './useLanguageLinks';

type Phase = 'closed' | 'open' | 'closing';

/**
 * The language choice, on every screen: one tube with the current language and a chevron. A tap swings a
 * small blade sign down from it with EN / RU / UK; a choice, a tap elsewhere or Esc swings it back up and
 * away (at once under reduced motion).
 */
export default function LanguagePicker({ label }: { label: string }) {
  const links = useLanguageLinks();
  const current = links.find((l) => l.current) ?? links[0];
  const [phase, setPhase] = useState<Phase>('closed');
  const button = useRef<HTMLButtonElement>(null);
  const drop = useRef<HTMLDivElement>(null);
  const open = phase === 'open';

  const close = (refocus: boolean) => {
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    setPhase((p) => (p === 'open' ? (still ? 'closed' : 'closing') : p));
    if (refocus) button.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!drop.current?.contains(t) && !button.current?.contains(t)) close(false);
    };
    // capture, so the picker answers first and a case under it never hears this Esc
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      close(true);
    };
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey, true);
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
        onClick={() => (open ? close(false) : setPhase('open'))}
        className="neon gap-1.5 text-[15px] lg:text-[17px]"
        style={neonStyle('lang')}
      >
        {current.locale.toUpperCase()}
        <span aria-hidden="true" className="lang-chevron" />
      </button>
      {phase !== 'closed' && (
        <div
          ref={drop}
          data-state={phase}
          className="lang-drop"
          style={neonStyle('lang')}
          onAnimationEnd={(e) => {
            if (e.animationName === 'lang-swing-out') setPhase('closed');
          }}
        >
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
                    close(false);
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
