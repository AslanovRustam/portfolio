import { activeSection } from './choreography';

const KEY = 'portfolio:place';
/** A place handed over by a language switch is used only by the page that loads right after it. */
const FRESH_MS = 15_000;

/** The language switch remembers exactly where the visitor is (story progress) for the new page. */
export function rememberPlace(q: number, now = Date.now()): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ q, at: now }));
  } catch {
    // no storage (private mode): the new page opens the section from its start
  }
}

/** The place last handed over, for React's development double run of an effect (it asks twice at once). */
let last: { q: number; at: number; taken: number } | null = null;
const REPEAT_MS = 1000;

/**
 * The remembered place, once, if it is fresh and inside the section the new page's hash names (target is
 * that hash's story progress); otherwise null and the page opens the section from its start.
 */
export function takePlace(target: number, now = Date.now()): number | null {
  try {
    let entry: { q: number; at: number } | null = null;
    const raw = sessionStorage.getItem(KEY);
    if (raw) {
      sessionStorage.removeItem(KEY);
      entry = JSON.parse(raw) as { q: number; at: number };
      last = { ...entry, taken: now };
    } else if (last && now - last.taken < REPEAT_MS) {
      entry = last;
    }
    if (!entry || typeof entry.q !== 'number' || now - entry.at > FRESH_MS) return null;
    return activeSection(entry.q) === activeSection(target) ? entry.q : null;
  } catch {
    return null;
  }
}
