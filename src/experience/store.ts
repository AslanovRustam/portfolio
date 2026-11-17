import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type { ProjectSlug } from '@/content/projects';
import type { Rect } from '@/scene/tvwall/screenRects';
import { itemName } from '@/ui/loaderLog';
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
  /** the files the scene has loaded, by folder and name, the last few (the loader's log) */
  loadItems: readonly string[];
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
  /** the damped camera has come to rest where the ride stops at the billboard (its screen waits for that) */
  cameraAtBillboard: boolean;
  setProgress(p: number): void;
  setTier(t: Tier): void;
  setReducedMotion(v: boolean): void;
  setReady(v: boolean): void;
  setHoveredSign(id: SignId | null): void;
  setWebgl(v: boolean): void;
  setLoadProgress(v: number): void;
  /** a file is in (three's loading manager reports it done) */
  pushLoadItem(url: string): void;
  setHighlight(key: string | null): void;
  setCelebrate(v: boolean): void;
  setHoveredScreen(stop: number | null): void;
  /** ask for a case (from a TV: with its screen rect); null clears the request and keeps the origin */
  requestCase(slug: ProjectSlug | null, origin?: Rect | null): void;
  /** the origin for the case that is opening, once: it is cleared as it is read */
  takeCaseOrigin(): Rect | null;
  setCaseOpen(on: boolean): void;
  setCameraAtBillboard(v: boolean): void;
}

export const experienceStore = createStore<ExperienceState>()((set, get) => ({
  progress: 0,
  tier: 'high',
  reducedMotion: false,
  ready: false,
  hoveredSign: null,
  webgl: true,
  loadProgress: 0,
  loadItems: [],
  highlight: null,
  celebrate: false,
  hoveredScreen: null,
  pendingCase: null,
  caseOrigin: null,
  caseOpen: false,
  cameraAtBillboard: false,
  setProgress: (p) => set({ progress: Math.min(1, Math.max(0, p)) }),
  setTier: (tier) => set({ tier }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setReady: (ready) => set({ ready }),
  setHoveredSign: (hoveredSign) => set({ hoveredSign }),
  setWebgl: (webgl) => set({ webgl }),
  setCaseOpen: (caseOpen) => set({ caseOpen }),
  setCameraAtBillboard: (cameraAtBillboard) => set({ cameraAtBillboard }),
  setLoadProgress: (loadProgress) => set({ loadProgress }),
  pushLoadItem: (url) => set({ loadItems: [...get().loadItems, itemName(url)].slice(-12) }),
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
