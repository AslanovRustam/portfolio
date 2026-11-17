/**
 * The loader's percent from three's loading manager: whole numbers that never go back (the manager can
 * find more to load and step back), and 100 only once everything is in.
 */
export function percentFor(loaded: number, previous = 0): number {
  const v = loaded >= 100 ? 100 : Math.min(99, Math.max(0, Math.floor(loaded)));
  return Math.max(previous, v);
}
