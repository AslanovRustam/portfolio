'use client';

import { useEffect } from 'react';
import { accentFor } from '@/experience/next';
import { experienceStore } from '@/experience/store';

/**
 * Writes the open section's colour (--accent: the scrollbar and the phone's progress tube wear it) and the
 * quality tier (data-tier, for effects only the strongest tier can afford) onto <html>. Renders nothing.
 */
export default function ScrollAccent() {
  useEffect(() => {
    const root = document.documentElement;
    let accent = '';
    let tier = '';
    const apply = ({ progress, tier: t }: { progress: number; tier: string }) => {
      const a = accentFor(progress);
      if (a !== accent) root.style.setProperty('--accent', (accent = a));
      if (t !== tier) root.dataset.tier = tier = t;
    };
    apply(experienceStore.getState());
    return experienceStore.subscribe(apply);
  }, []);
  return null;
}
