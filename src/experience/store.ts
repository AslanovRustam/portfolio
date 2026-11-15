import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type { ProjectSlug } from '@/content/projects';
import type { Rect } from '@/scene/tvwall/screenRects';
import type { SignId } from './signs';

export type LightState = 'off' | 'red' | 'yellow' | 'green';
export type Tier = 'high' | 'medium' | 'low';

export interface ExperienceState {
  /** scroll progress through the journey, 0..1 */
  progress: number;
  tier: Tier;
  reducedMotion: boolean;
  /** the scene has compiled and drawn its first frames */
  ready: boolean;
  hoveredSign: SignId | null;
  /** false once the page decided to show the fallback instead of the canvas */
  webgl: boolean;
  /** share of 3D assets loaded, 0..100 (drives the loader) */
  loadProgress: number;
  /** sticker key lit by the Stack panel (a chip under the pointer or focus) */
  highlight: string | null;
  /** a contact message was just sent: the green light pulses for a moment */
  celebrate: boolean;
  /** the Work stop whose TV is under the pointer */
  hoveredScreen: number | null;
  /** a TV in the scene asked to open this project's case (the HTML layer routes it) */
  pendingCase: ProjectSlug | null;
  /** where on the page the clicked TV's screen was: the case switches on out of it */
  caseOrigin: Rect | null;
  /** a project's case is open over the street (the wall's loop pauses under it) */
  caseOpen: boolean;
  setProgress(p: number): void;
  setTier(t: Tier): void;
  setReducedMotion(v: boolean): void;
  setReady(v: boolean): void;
  setHoveredSign(id: SignId | null): void;
  setWebgl(v: boolean): void;
  setLoadProgress(v: number): void;
  setHighlight(key: string | null): void;
  setCelebrate(v: boolean): void;
  setHoveredScreen(stop: number | null): void;
  /** ask for a case (from a TV: with its screen rect); null clears the request and keeps the origin */
  requestCase(slug: ProjectSlug | null, origin?: Rect | null): void;
  /** the origin for the case that is opening, once: it is cleared as it is read */
  takeCaseOrigin(): Rect | null;
  setCaseOpen(on: boolean): void;
}

export const experienceStore = createStore<ExperienceState>()((set, get) => ({
  progress: 0,
  tier: 'high',
  reducedMotion: false,
  ready: false,
  hoveredSign: null,
  webgl: true,
  loadProgress: 0,
  highlight: null,
  celebrate: false,
  hoveredScreen: null,
  pendingCase: null,
  caseOrigin: null,
  caseOpen: false,
  setProgress: (p) => set({ progress: Math.min(1, Math.max(0, p)) }),
  setTier: (tier) => set({ tier }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setReady: (ready) => set({ ready }),
  setHoveredSign: (hoveredSign) => set({ hoveredSign }),
  setWebgl: (webgl) => set({ webgl }),
  setCaseOpen: (caseOpen) => set({ caseOpen }),
  setLoadProgress: (loadProgress) => set({ loadProgress }),
  setHighlight: (highlight) => set({ highlight }),
  setCelebrate: (celebrate) => set({ celebrate }),
  setHoveredScreen: (hoveredScreen) => set({ hoveredScreen }),
  requestCase: (slug, origin) => set(slug ? { pendingCase: slug, caseOrigin: origin ?? null } : { pendingCase: null }),
  takeCaseOrigin: () => {
    const o = get().caseOrigin;
    if (o) set({ caseOrigin: null });
    return o;
  },
}));

export function useExperience<T>(selector: (s: ExperienceState) => T): T {
  return useStore(experienceStore, selector);
}
