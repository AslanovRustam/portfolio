'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { STACK } from '@/content/stack';
import { STACK_STOPS, stackStopAt, stackStopProgress } from '@/experience/stackStops';
import { experienceStore } from '@/experience/store';
import { getIcon } from '@/scene/stickers/icons';
import { scrollToProgress } from '@/scroll/SmoothScroll';
import { neonStyle } from '../neon';
import { PanelTitle } from './SectionPanel';

const two = (n: number) => String(n).padStart(2, '0');
const light = (key: string | null) => experienceStore.getState().setHighlight(key);

/** A tool's logo from simple-icons (the same set the pole's stickers use), or a dot when it has none. */
function Logo({ slug }: { slug: string }) {
  const icon = getIcon(slug);
  if (!icon) return <span aria-hidden="true" className="stack-dot" />;
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="stack-logo">
      <path d={icon.path} />
    </svg>
  );
}

/** One tool; one whose sticker is on the pole lights it while pointed at or focused, and lets go when it leaves. */
function Tool({ label, sticker }: { label: string; sticker: string | null }) {
  useEffect(
    () => () => {
      // the caption moved on to the next sign under a still pointer: no pointerleave comes
      if (sticker && experienceStore.getState().highlight === sticker) light(null);
    },
    [sticker],
  );
  return (
    <li
      tabIndex={sticker ? 0 : undefined}
      data-sticker={sticker ?? undefined}
      onPointerEnter={sticker ? () => light(sticker) : undefined}
      onPointerLeave={sticker ? () => light(null) : undefined}
      onFocus={sticker ? () => light(sticker) : undefined}
      onBlur={sticker ? () => light(null) : undefined}
      className="stack-item"
    >
      <Logo slug={sticker ?? label.toLowerCase()} />
      {label}
    </li>
  );
}

/**
 * The caption under the sign the camera stands beneath: the category and its tools as text (the sign in
 * the scene is a picture), numbered neon tubes below to go to any sign. It re-renders only when the sign
 * changes. The whole stack is in the page for screen readers and search engines too.
 */
export default function StackCaption() {
  const t = useTranslations('stack');
  const [stop, setStop] = useState(() => stackStopAt(experienceStore.getState().progress));
  useEffect(() => experienceStore.subscribe((s) => setStop(stackStopAt(s.progress))), []);
  const group = STACK[stop];
  const go = (i: number) => scrollToProgress(stackStopProgress(i), experienceStore.getState().reducedMotion);
  return (
    <div>
      <PanelTitle id="stack-title">{t('title')}</PanelTitle>
      {/* the stickers are on the pole, which steps out of a phone's frame here */}
      <p className="-mt-1 mb-2 hidden max-w-[48ch] text-xs text-[#e8f7ff]/70 wide:block">{t('lead')}</p>
      <div aria-live="polite">
        <p className="flow-label">
          {two(stop + 1)} / {two(STACK_STOPS)}
        </p>
        <h3 className="mt-1 font-plate text-[clamp(1.35rem,2vw,1.8rem)] font-bold leading-none">{t(`groups.${group.key}`)}</h3>
        <ul key={group.key} className="mt-2 grid min-h-[6.6rem] grid-cols-2 content-start gap-x-3 sm:min-h-[3.3rem] sm:grid-cols-4">
          {group.items.map((item) => (
            <Tool key={item.label} label={item.label} sticker={item.sticker ?? null} />
          ))}
        </ul>
      </div>
      <nav aria-label={t('pager')} className="flow-rule mt-2 border-t pt-1">
        <ul className="flex flex-wrap">
          {STACK.map((g, i) => (
            <li key={g.key}>
              <button
                type="button"
                onClick={() => go(i)}
                aria-label={t(`groups.${g.key}`)}
                aria-current={i === stop ? 'true' : undefined}
                className="neon min-w-[2.05rem] px-0.5 text-[13px] sm:min-w-11 sm:px-1 sm:text-[15px]"
                style={neonStyle('stack')}
              >
                {two(i + 1)}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <ul className="sr-only">
        {STACK.map((g) => (
          <li key={g.key}>
            {t(`groups.${g.key}`)}: {g.items.map((i) => i.label).join(', ')}
          </li>
        ))}
      </ul>
    </div>
  );
}
