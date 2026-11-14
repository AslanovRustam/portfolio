import { NEON } from '@/ui/neon';
import { activeSection } from './choreography';
import type { SectionId } from './signs';

const ORDER: readonly SectionId[] = ['work', 'about', 'stack', 'contact'];

/** Where "Next" leads from story progress q: Work from the blueprint, then section by section; nothing after Contact. */
export function nextSection(q: number): SectionId | null {
  const here = activeSection(q);
  if (!here) return 'work';
  return ORDER[ORDER.indexOf(here) + 1] ?? null;
}

/** The colour of the open section's sign (the blueprint's blue before Work): the scrollbar and the phone's progress tube wear it. */
export function accentFor(q: number): string {
  return NEON[activeSection(q) ?? 'blueprint'];
}
