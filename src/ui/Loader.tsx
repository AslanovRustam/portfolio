'use client';

import { useExperience } from '@/experience/store';

/**
 * Blueprint paper while the scene loads: a dimension line that draws itself as assets arrive, and the
 * percentage written on it. It sits under the title block, so the name paints first, and hides once the
 * scene has compiled and drawn its first frames.
 */
export default function Loader({ label }: { label: string }) {
  const ready = useExperience((s) => s.ready);
  const loaded = useExperience((s) => s.loadProgress);
  const pct = Math.round(loaded);

  return (
    <div
      data-loader
      aria-hidden={ready}
      className="fixed inset-0 z-[5] grid place-items-center bg-[#0b1f38] transition-[opacity,visibility] duration-700"
      style={{
        opacity: ready ? 0 : 1,
        visibility: ready ? 'hidden' : 'visible',
        backgroundImage:
          'linear-gradient(#24486f55 1px, transparent 1px), linear-gradient(90deg, #24486f55 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      <div className="w-[min(420px,80vw)] text-[#7fe3ff]" role="status">
        <div className="mb-2 flex justify-between text-xs">
          <span>{label}</span>
          <span>{pct}%</span>
        </div>
        {/* a dimension line: end ticks and a stroke drawn to the loaded share */}
        <div className="relative h-3">
          <span className="absolute left-0 top-0 h-3 w-px bg-[#7fe3ff]" />
          <span className="absolute right-0 top-0 h-3 w-px bg-[#7fe3ff]/50" />
          <span
            className="absolute left-0 top-1/2 h-px bg-[#7fe3ff] transition-[width] duration-300"
            style={{ width: `${Math.max(2, pct)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
