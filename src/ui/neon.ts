import type { CSSProperties } from 'react';
import type { SignId } from '@/experience/signs';

export type NeonId = SignId | 'name' | 'lang' | 'blueprint';

/**
 * The tube colour of everything neon on the page. A section takes its sign's colour from the pole;
 * Contact is raspberry because red already belongs to Stack (Rustam approved it on the mockups).
 */
export const NEON: Readonly<Record<NeonId, string>> = {
  work: '#ff8a2a',
  about: '#5fe1ff',
  stack: '#ff3448',
  contact: '#ff45b5',
  cv: '#3dff8f',
  name: '#ff4fb0',
  lang: '#c9d6ff',
  blueprint: '#7fe3ff',
};

/** The colour a `.neon`, `.nbox` or blade reads, as a `style` prop. */
export function neonStyle(id: NeonId): CSSProperties {
  return { '--c': NEON[id] } as CSSProperties;
}

/**
 * When the i-th tube dips: once every 8–16 s, each tube on its own beat. Deterministic, so the server
 * and the browser render the same markup.
 */
export function flicker(i: number): CSSProperties {
  const period = 8 + ((i * 37) % 9);
  const delay = (i * 2.3) % 8;
  return { '--flicker-period': `${period}s`, '--flicker-delay': `-${delay.toFixed(1)}s` } as CSSProperties;
}
