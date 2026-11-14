'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { STACK } from '@/content/stack';
import { experienceStore } from '@/experience/store';
import { getIcon } from '@/scene/stickers/icons';
import NeonBox from '../flow/NeonBox';
import { neonStyle } from '../neon';

const light = (key: string | null) => experienceStore.getState().setHighlight(key);

/** How far each blade hangs off true, like real signs on their brackets. */
const SWAY = [-1.2, 0.8, -0.5, 1, -0.9, 0.6];

/** A tool's logo from simple-icons (the same set the pole's stickers use), or a dot when it has none. */
function Logo({ slug }: { slug: string }) {
  const icon = getIcon(slug);
  if (!icon) return <span aria-hidden="true" className="blade-dot" />;
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="blade-logo">
      <path d={icon.path} />
    </svg>
  );
}

/**
 * Stack: each category is its own vertical blade sign on its own wall bracket, as wide as its longest line,
 * so nothing ever wraps. An item whose logo is stuck on the pole lights that sticker while it is under the
 * pointer or has keyboard focus.
 */
export default function StackSection() {
  const t = useTranslations('stack');
  return (
    <>
      <NeonBox id="stack">
        <h2 id="stack-title" className="flow-title">
          {t('title')}
        </h2>
        <p className="mt-4 max-w-[60ch] text-sm text-[#e8f7ff]/80">{t('lead')}</p>
      </NeonBox>
      <div className="blades" style={neonStyle('stack')}>
        {STACK.map((g, i) => (
          <div key={g.key} data-ui className="blade" style={{ '--sway': `${SWAY[i % SWAY.length]}deg` } as CSSProperties}>
            <span aria-hidden="true" className="blade-arm" />
            <h3 className="blade-title">
              <span data-line>{t(`groups.${g.key}`)}</span>
            </h3>
            <ul className="mt-1.5">
              {g.items.map((item) => {
                const sticker = item.sticker ?? null;
                return (
                  <li
                    key={item.label}
                    tabIndex={sticker ? 0 : undefined}
                    data-sticker={sticker ?? undefined}
                    onPointerEnter={sticker ? () => light(sticker) : undefined}
                    onPointerLeave={sticker ? () => light(null) : undefined}
                    onFocus={sticker ? () => light(sticker) : undefined}
                    onBlur={sticker ? () => light(null) : undefined}
                    className="blade-item"
                  >
                    <Logo slug={sticker ?? item.label.toLowerCase()} />
                    <span data-line>{item.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </>
  );
}
