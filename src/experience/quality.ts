import { INTRO_END } from './sections';
import type { Tier } from './store';

export interface TierSettings {
  dpr: number;
  reflectorResolution: number;
  ao: boolean;
  aoHalfRes: boolean;
  bloom: boolean;
  noise: boolean;
  particles: number;
}

/** DPR never above 1.75 (spec §11). N8AO half-res stays off: its multi-target shim throws every frame on three 0.187. */
export const TIER: Record<Tier, TierSettings> = {
  high: { dpr: 1.75, reflectorResolution: 1024, ao: true, aoHalfRes: false, bloom: true, noise: true, particles: 600 },
  medium: { dpr: 1.25, reflectorResolution: 512, ao: false, aoHalfRes: false, bloom: true, noise: false, particles: 300 },
  low: { dpr: 1, reflectorResolution: 256, ao: false, aoHalfRes: false, bloom: true, noise: false, particles: 120 },
};

/**
 * The intro (the pole up close, the whole lit street behind it) fills the GPU more than any other stretch:
 * on the integrated GPU it ran a vsync step over budget at 1.25 (34.7 ms), at 1.15 it is back in (27.8).
 * Plan 5 measured it; only medium drops, and only until the intro ends.
 */
export const INTRO_DPR = 1.15;

/** The pixel ratio to draw story progress p at, on this tier. */
export function dprFor(tier: Tier, p: number): number {
  const base = TIER[tier].dpr;
  return tier === 'medium' && p < INTRO_END ? Math.min(base, INTRO_DPR) : base;
}

export interface DeviceProbe {
  renderer: string;
  maxTouchPoints: number;
  minScreenSide: number;
  deviceMemory?: number;
  hardwareConcurrency: number;
}

const TIERS: readonly Tier[] = ['high', 'medium', 'low'];

export function pickTier(probe: DeviceProbe, override: Tier | null): Tier {
  if (override) return override;
  if (/swiftshader|llvmpipe|software/i.test(probe.renderer)) return 'low';
  if (probe.maxTouchPoints > 0 && probe.minScreenSide < 900) return 'low';
  if ((probe.deviceMemory !== undefined && probe.deviceMemory <= 4) || probe.hardwareConcurrency <= 4) return 'medium';
  if (/intel|uhd|iris|mali|adreno/i.test(probe.renderer) && !/arc/i.test(probe.renderer)) return 'medium';
  return 'high';
}

export function qualityOverride(search: string): Tier | null {
  const q = new URLSearchParams(search).get('quality');
  return TIERS.includes(q as Tier) ? (q as Tier) : null;
}

export function stepDown(t: Tier): Tier {
  return t === 'high' ? 'medium' : 'low';
}

/** True when the median frame time is slower than ~45 fps. */
export function slowDevice(frameTimesMs: number[]): boolean {
  if (frameTimesMs.length === 0) return false;
  const sorted = [...frameTimesMs].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] > 22;
}

export interface FrameSample {
  /** seconds (clock time) */
  now: number;
  dtMs: number;
  /** the scene is ready and fully rendered (the blueprint's discarded fragments are cheap and lie) */
  settled: boolean;
  hidden: boolean;
}

/**
 * Collects `frames` frame times starting `wait` s after the scene settles, then returns its verdict
 * once ('slow' | 'ok'); null otherwise. A hidden tab's throttled frames restart the count.
 */
export function createFrameSampler({ wait, frames }: { wait: number; frames: number }) {
  let since: number | null = null;
  const times: number[] = [];
  let done = false;
  return {
    push(f: FrameSample): 'slow' | 'ok' | null {
      if (done || !f.settled) return null;
      if (f.hidden) {
        since = null;
        times.length = 0;
        return null;
      }
      since ??= f.now;
      if (f.now - since < wait) return null;
      times.push(f.dtMs);
      if (times.length < frames) return null;
      done = true;
      return slowDevice(times) ? 'slow' : 'ok';
    },
  };
}

export { forcedNoWebGL, supportsWebGL2 } from './webgl';
