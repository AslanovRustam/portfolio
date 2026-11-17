import { activeSection, lightState } from '@/experience/choreography';
import type { SectionId } from '@/experience/signs';
import { experienceStore, type ExperienceState, type LightState } from '@/experience/store';
import { scrollToProgress, scrollToSection } from '@/scroll/SmoothScroll';
import { readProbe } from './sceneProbe';

export interface PortfolioHooks {
  state(): ExperienceState;
  light(): LightState;
  section(): SectionId | null;
  probe(name: string): unknown;
  scrollToProgress(p: number, immediate?: boolean): void;
  /** as a section link does it (the header, the menu, Next) */
  scrollToSection(id: SectionId): void;
}

declare global {
  interface Window {
    __portfolio: PortfolioHooks;
  }
}

export const testHooksEnabled = process.env.NEXT_PUBLIC_TEST_HOOKS === '1';

/** Exposes the store and scene probes to Playwright. Only when NEXT_PUBLIC_TEST_HOOKS=1. */
export function installTestHooks(): void {
  if (!testHooksEnabled) return;
  window.__portfolio = {
    state: () => experienceStore.getState(),
    light: () => lightState(experienceStore.getState().progress),
    section: () => activeSection(experienceStore.getState().progress),
    probe: readProbe,
    scrollToProgress,
    scrollToSection,
  };
}
