'use client';

import { useEffect, useState } from 'react';
import { experienceStore, useExperience } from '@/experience/store';
import { arcFor, speedFor } from './loaderGauge';

/** The tachometer: a 270° arc on a 240-unit dial, from bottom-left round to bottom-right. */
const C = 120;
const R = 96;
const START = 135;
const SWEEP = 270;
/** the red line: the last stretch of the arc */
const RED = 0.84;

/** A point on the dial, rounded: the server and the browser must write the same numbers into the SVG. */
const at = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return [Math.round((C + r * Math.cos(a)) * 100) / 100, Math.round((C + r * Math.sin(a)) * 100) / 100] as const;
};
const arc = (from: number, to: number, r: number) => {
  const [x0, y0] = at(START + SWEEP * from, r);
  const [x1, y1] = at(START + SWEEP * to, r);
  const large = SWEEP * (to - from) > 180 ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
};
const TICKS = Array.from({ length: 11 }, (_, i) => i / 10);

/**
 * A motorcycle's dash on blueprint paper while the street loads (spec §11): the digital speedometer counts
 * 0 → 100 with the load, the tachometer's arc fills up to its red line, and at 100 "GO" blinks while the
 * scene compiles; then the dash fades into the street. The load stays readable as text for screen readers.
 * Reduced motion keeps the digits and drops the moving arc. It sits under the title block, so the name
 * paints first, and hides once the scene has drawn its first frames.
 */
export default function Loader({ label, unit }: { label: string; unit: string }) {
  const ready = useExperience((s) => s.ready);
  const [speed, setSpeed] = useState(() => speedFor(experienceStore.getState().loadProgress));
  useEffect(() => experienceStore.subscribe((s) => setSpeed((prev) => speedFor(s.loadProgress, prev))), []);
  const go = speed >= 100;

  return (
    <div
      data-loader
      data-phase={go ? 'go' : 'load'}
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
      <div className="grid w-[min(320px,72vw)] justify-items-center text-[#7fe3ff]">
        <div className="relative aspect-square w-full">
          <svg aria-hidden="true" viewBox="0 0 240 240" className="absolute inset-0 h-full w-full drop-shadow-[0_0_6px_#7fe3ff99]">
            {/* the track, the red line and the ticks */}
            <path d={arc(0, 1, R)} fill="none" stroke="#7fe3ff" strokeOpacity="0.18" strokeWidth="10" strokeLinecap="round" />
            <path d={arc(RED, 1, R + 11)} fill="none" stroke="#ff3448" strokeWidth="3" strokeLinecap="round" />
            {TICKS.map((t) => {
              const [x0, y0] = at(START + SWEEP * t, R + 8);
              const [x1, y1] = at(START + SWEEP * t, R + 16);
              return <line key={t} x1={x0} y1={y0} x2={x1} y2={y1} stroke={t >= RED ? '#ff3448' : '#7fe3ff'} strokeWidth="2" />;
            })}
            {/* the lit arc */}
            <path
              data-arc-fill
              d={arc(0, 1, R)}
              pathLength={100}
              fill="none"
              stroke="#7fe3ff"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${(arcFor(speed) * 100).toFixed(2)} 100`}
              className="transition-[stroke-dasharray] duration-300 ease-out motion-reduce:hidden"
            />
          </svg>
          <div className="absolute inset-0 grid place-content-center justify-items-center">
            <span data-speed className="font-plate text-[clamp(3.5rem,13vw,5rem)] font-bold leading-none tabular-nums [text-shadow:0_0_14px_#7fe3ff]">
              {speed}
            </span>
            {go ? (
              <span aria-hidden="true" className="gauge-go mt-1 font-plate text-2xl font-bold tracking-widest text-[#3dff8f] [text-shadow:0_0_12px_#3dff8f]">
                GO
              </span>
            ) : (
              <span aria-hidden="true" className="mt-1 text-xs tracking-widest text-[#7fe3ff]/75">
                {unit}
              </span>
            )}
          </div>
        </div>
        <p role="status" className="-mt-4 text-xs text-[#7fe3ff]/80">
          {label} {Math.round(speed)}%
        </p>
      </div>
    </div>
  );
}
