'use client';

import { useSyncExternalStore } from 'react';
import { experienceStore } from '@/experience/store';
import { billboardFit } from '@/scene/billboard/fit';

/**
 * Where Contact lives in this window (M4 round 1): on the billboard's screen (a laptop the form fits), in
 * the screen the camera dives into (a phone, a small or squarish window), or in the page (no WebGL).
 */
export type ContactMode = 'billboard' | 'dive' | 'page';

let cache: { key: string; mode: ContactMode } | null = null;
function snapshot(): ContactMode {
  const { webgl } = experienceStore.getState();
  const key = `${innerWidth}x${innerHeight}:${webgl}`;
  if (cache?.key !== key)
    cache = { key, mode: !webgl ? 'page' : billboardFit({ w: innerWidth, h: innerHeight }) ? 'billboard' : 'dive' };
  return cache.mode;
}
function subscribe(changed: () => void): () => void {
  addEventListener('resize', changed);
  const off = experienceStore.subscribe(changed);
  return () => {
    removeEventListener('resize', changed);
    off();
  };
}
/** the server (and hydration) renders Contact in the page; the window decides once it is there */
const serverSnapshot = (): ContactMode => 'page';

export function useContactMode(): ContactMode {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
