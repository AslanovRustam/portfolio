import { PROJECTS } from '@/content/projects';
import { activeSection, SECTIONS, sectionCenter } from './choreography';
import { progressForTrack, TRACK_FROM, TRACK_TO, trackProgress } from './panels';
import type { SectionId } from './signs';

/** One stop per project on the TV wall, then the "a small part / NDA" screen. */
export const WORK_STOPS = PROJECTS.length + 1;
/** Share of the gap on each side of a stop where the wall position holds still. */
export const DWELL = 0.2;

const last = WORK_STOPS - 1;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Story progress at which stop i sits square in the frame. */
export function stopProgress(i: number): number {
  return progressForTrack(clamp(i, 0, last) / last);
}

/** The stop nearest to story progress q (the first before Work, the last after it). */
export function stopAt(q: number): number {
  return Math.round(trackProgress(q) * last);
}

/**
 * Where along the wall the camera is, 0..WORK_STOPS−1: it holds still for a while around every stop and
 * eases across to the next one in between, so each project stands still long enough to be read.
 */
export function wallPosition(q: number): number {
  const u = trackProgress(q) * last;
  const k = Math.floor(u);
  if (k >= last) return last;
  return k + smoothstep(DWELL, 1 - DWELL, u - k);
}

/** The stop a scroll that came to rest at q should settle on; null outside the Work track or on a stop. */
export function snapTarget(q: number): number | null {
  if (q <= TRACK_FROM || q >= TRACK_TO) return null;
  const target = stopProgress(stopAt(q));
  return Math.abs(q - target) < 1e-6 ? null : target;
}

/** Where a link to a section lands: Work opens on its first project, the others on their centre. */
export function sectionTarget(id: SectionId): number {
  return id === 'work' ? stopProgress(0) : sectionCenter(id);
}

/** The hash that brings a visitor back to q: the section, and for Work the project (work-1…). */
export function hashFor(q: number): string | null {
  const section = activeSection(q);
  if (!section) return null;
  return section === 'work' ? `work-${stopAt(q) + 1}` : section;
}

/** Story progress a hash asks for, or null when it names nothing on the journey. */
export function parseHash(h: string): number | null {
  const stop = /^work-(\d+)$/.exec(h);
  if (stop) {
    const n = Number(stop[1]);
    return n >= 1 && n <= WORK_STOPS ? stopProgress(n - 1) : null;
  }
  const section = SECTIONS.find((s) => s.id === h);
  return section ? sectionTarget(section.id) : null;
}
