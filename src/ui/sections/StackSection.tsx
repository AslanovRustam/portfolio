'use client';

import { useTranslations } from 'next-intl';
import { STACK } from '@/content/stack';
import { experienceStore } from '@/experience/store';
import { PanelTitle } from './SectionPanel';

const light = (key: string | null) => experienceStore.getState().setHighlight(key);

/**
 * The Stack panel: the tools, grouped. A chip whose logo is stuck on the pole lights that sticker while
 * it is under the pointer or has keyboard focus.
 */
export default function StackSection() {
  const t = useTranslations('stack');
  return (
    <div className="space-y-5">
      <PanelTitle id="stack-title">{t('title')}</PanelTitle>
      <p className="max-w-[60ch] text-sm text-[#e8f7ff]/80">{t('lead')}</p>
      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        {STACK.map((g) => (
          <div key={g.key}>
            <h3 className="board-label">{t(`groups.${g.key}`)}</h3>
            <ul className="mt-2 flex flex-wrap gap-1.5">
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
                    className="plate plate-sm plate-plain data-[sticker]:cursor-pointer data-[sticker]:hover:[--plate-bg:var(--sign-bg)] data-[sticker]:focus-visible:[--plate-bg:var(--sign-bg)]"
                  >
                    {item.label}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
