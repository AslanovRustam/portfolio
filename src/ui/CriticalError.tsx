import { Link } from '@/i18n/navigation';
import { neonStyle } from './neon';

/**
 * A dead end (spec §11): a black screen, a red warning triangle and CRITICAL ERROR glitching (short shifts
 * and drop-outs, under three flashes a second, still under reduced motion), the line saying there is no such
 * road, and a neon link back to the street. No 3D.
 */
export default function CriticalError({ line, back }: { line: string; back: string }) {
  return (
    <main className="grid min-h-svh place-items-center bg-black px-6 py-16 text-center">
      <div className="grid justify-items-center gap-7">
        <div className="critical-glitch grid justify-items-center gap-4 text-[#ff2a2a]">
          <svg aria-hidden="true" viewBox="0 0 120 106" className="w-[min(170px,38vw)] drop-shadow-[0_0_14px_#ff2a2a]">
            <path d="M60 7 L113 99 H7 Z" fill="none" stroke="currentColor" strokeWidth="7" strokeLinejoin="round" />
            <rect x="55" y="38" width="10" height="34" rx="3" fill="currentColor" />
            <circle cx="60" cy="84" r="6" fill="currentColor" />
          </svg>
          <p className="font-plate text-[clamp(2.4rem,9vw,5rem)] font-bold leading-none tracking-wide [text-shadow:0_0_18px_#ff2a2a]">
            CRITICAL ERROR
          </p>
        </div>
        <h1 className="text-base text-[#e8f7ff]/85">{line}</h1>
        <Link href="/" className="neon text-lg" style={neonStyle('about')}>
          {back}
        </Link>
      </div>
    </main>
  );
}
