'use client';

import { useSyncExternalStore } from 'react';
import { useExperience } from '@/experience/store';
import { billboardFit } from '@/scene/billboard/fit';

type Fit = ReturnType<typeof billboardFit>;

let cache: { key: string; fit: Fit } | null = null;
/** The fit for the window as it is now; the same object until the window's size changes. */
function snapshot(): Fit {
  const key = `${innerWidth}x${innerHeight}`;
  if (cache?.key !== key) cache = { key, fit: billboardFit({ w: innerWidth, h: innerHeight }) };
  return cache.fit;
}
function subscribe(changed: () => void): () => void {
  addEventListener('resize', changed);
  return () => removeEventListener('resize', changed);
}
const serverSnapshot = (): Fit => null;

/**
 * Whether the contact form goes into the billboard's panel (a laptop with the 3D scene: where, and at what
 * scale) or stays in the page (null: a phone, a small window, no WebGL). It changes with the window's size.
 */
export function useBillboardFit(): Fit {
  const webgl = useExperience((s) => s.webgl);
  const fit = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  return webgl ? fit : null;
}
