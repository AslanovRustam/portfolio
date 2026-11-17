import { PROJECTS } from '@/content/projects';
import { activeSection, holdWindow, SECTIONS } from './sections';
import { progressForTrack, TRACK_FROM, TRACK_TO, trackProgress } from './panels';
import { stackStopProgress } from './stackStops';
import { contactLanding, type DiveView } from './diveStages';
import { aboutLanding } from './landings';
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

/** Share of the gap between stops a gesture has to travel to count as a step to the next project. */
export const STEP = 0.12;

/**
 * The stop a scroll that came to rest at q should settle on; null outside the Work track or on a stop.
 * Given where the visitor's gesture began (`from`), a gesture that travelled more than STEP of a gap goes
 * on to the next stop in its direction (one wheel notch moves one project); a smaller one, or a rest with
 * no gesture behind it, settles on the nearest stop.
 */
export function snapTarget(q: number, from?: number): number | null {
  if (q <= TRACK_FROM || q >= TRACK_TO) return null;
  const u = trackProgress(q) * last;
  let stop = Math.round(u);
  if (from !== undefined) {
    const moved = u - trackProgress(from) * last;
    if (Math.abs(moved) > STEP) stop = moved > 0 ? Math.ceil(u - 1e-9) : Math.floor(u + 1e-9);
  }
  const target = stopProgress(stop);
  return Math.abs(q - target) < 1e-6 ? null : target;
}

/**
 * Where a link to a section lands: Work opens on its first project, Stack on its first sign, About where its
 * text begins, Contact at the end of the road (the billboard with the form, the green light).
 */
export function sectionTarget(id: SectionId, dive?: DiveView, about?: { h: number; aboutPx: number }): number {
  if (id === 'work') return stopProgress(0);
  if (id === 'stack') return stackStopProgress(0);
  // the end of the road; where the window dives into the billboard's screen, where the dive ends (the form)
  if (id === 'contact') return dive ? contactLanding(dive) : 1;
  // About: where its first bill has come up the screen, once the page tells how long About is
  if (id === 'about' && about) return aboutLanding(about);
  return holdWindow(id)[0];
}

/** The hash that brings a visitor back to q: the section, and for Work the project (work-1…). */
export function hashFor(q: number): string | null {
  const section = activeSection(q);
  if (!section) return null;
  return section === 'work' ? `work-${stopAt(q) + 1}` : section;
}

/** Story progress a hash asks for, or null when it names nothing on the journey. */
export function parseHash(h: string, dive?: DiveView, about?: { h: number; aboutPx: number }): number | null {
  const stop = /^work-(\d+)$/.exec(h);
  if (stop) {
    const n = Number(stop[1]);
    return n >= 1 && n <= WORK_STOPS ? stopProgress(n - 1) : null;
  }
  const section = SECTIONS.find((s) => s.id === h);
  return section ? sectionTarget(section.id, dive, about) : null;
}
