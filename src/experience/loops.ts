import type { Project } from '@/content/projects';
import type { Tier } from './store';

/** Where a project's live loop can play: on its TV in the wall, or in its case card. */
export type LoopPlace = 'wall' | 'case';

export interface LoopSources {
  webm: string;
  mp4: string;
  /** the loop's first frame, shown wherever the video is not */
  still: string;
}

export interface LoopEnv {
  place: LoopPlace;
  tier: Tier;
  reducedMotion: boolean;
  /** the visitor asked the browser to save data */
  saveData: boolean;
  /** ?loops=0 */
  disabled: boolean;
}

/**
 * Whether a loop may play here. Never under reduced motion, save-data or ?loops=0; on the wall not on the
 * low tier either (phones keep stills there), while the case card plays on every tier.
 */
export function loopAllowed(env: LoopEnv): boolean {
  if (env.reducedMotion || env.saveData || env.disabled) return false;
  return env.place === 'case' || env.tier !== 'low';
}

/** The loop's files, next to each other in /projects, or null for a project without a loop. */
export function loopSources(p: Project): LoopSources | null {
  if (!p.loop) return null;
  const base = `/projects/${p.slug}`;
  return { webm: `${base}.webm`, mp4: `${base}.mp4`, still: `${base}.webp` };
}

/** `?loops=0` switches every loop off (tests, the perf baseline, manual checks). */
export function loopsDisabled(search: string): boolean {
  return new URLSearchParams(search).get('loops') === '0';
}

/** The browser's save-data hint; false where it is unknown (most browsers, the server). */
export function saveDataOn(): boolean {
  if (typeof navigator === 'undefined') return false;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return connection?.saveData === true;
}
