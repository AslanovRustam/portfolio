'use client';

import { useSyncExternalStore } from 'react';

/** A phone's width: below it Contact's form goes one field at a time (Plan 4c). */
const QUERY = '(max-width: 639.98px)';

function subscribe(changed: () => void): () => void {
  const m = matchMedia(QUERY);
  m.addEventListener('change', changed);
  return () => m.removeEventListener('change', changed);
}

/** Whether the window is phone-narrow; false on the server and while hydrating. */
export function useNarrow(): boolean {
  return useSyncExternalStore(subscribe, () => matchMedia(QUERY).matches, () => false);
}
