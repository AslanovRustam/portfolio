'use client';

import { useEffect, useState } from 'react';
import { experienceStore, useExperience } from '@/experience/store';
import { percentFor } from './loaderGauge';
import { logLines } from './loaderLog';

/**
 * A neon sign while the street loads (M4 round 1, spec §7; after Rustam's first pin), in the blueprint's
 * colours the street starts from: a double neon frame of its line's cyan on its gridded paper, the label in
 * its tubes ("Rendering", "Загрузка", "Завантаження"), the percent and a bar in brackets, filled bright and
 * dotted where it is still to go; in the corner a log of the files
 * the scene has loaded. At 100 the frame blinks while the scene compiles, then the sign goes out like
 * switched-off neon and the street is there. Screen readers hear the label and the percent. Reduced motion:
 * no blink, no flicker, a fade. It sits under the title block, so the name paints first, and hides once the
 * scene has drawn its first frames.
 */
export default function Loader({ label }: { label: string }) {
  const ready = useExperience((s) => s.ready);
  const [shown, setShown] = useState(() => {
    const s = experienceStore.getState();
    return { pct: percentFor(s.loadProgress), items: s.loadItems };
  });
  useEffect(
    () =>
      experienceStore.subscribe((s) =>
        setShown((prev) => {
          const pct = percentFor(s.loadProgress, prev.pct);
          return pct === prev.pct && s.loadItems === prev.items ? prev : { pct, items: s.loadItems };
        }),
      ),
    [],
  );
  const { pct, items } = shown;
  const phase = ready ? 'off' : pct >= 100 ? 'compile' : 'load';

  return (
    <div
      data-loader
      data-phase={phase}
      aria-hidden={ready}
      className="loader-sign fixed inset-0 z-[5] grid place-items-center"
      style={{ '--c': 'var(--blueprint-line)', '--cyan': 'var(--blueprint-line)' } as React.CSSProperties}
    >
      <pre data-loader-log aria-hidden="true" className="loader-log hidden sm:block">
        {logLines(items, pct, 7).join('\n')}
      </pre>
      <pre aria-hidden="true" className="loader-log sm:hidden">
        {logLines(items, pct, 3).join('\n')}
      </pre>
      <div className="loader-frame">
        <p aria-hidden="true" className="loader-title">
          {label}
        </p>
        <p aria-hidden="true" data-percent className="loader-pct">
          {pct}%
        </p>
        <div aria-hidden="true" className="loader-bar">
          <span>[</span>
          <span className="loader-track">
            <span className="loader-fill" style={{ width: `${pct}%` }} />
          </span>
          <span>]</span>
        </div>
      </div>
      <p role="status" className="sr-only">
        {label} {pct}%
      </p>
    </div>
  );
}
