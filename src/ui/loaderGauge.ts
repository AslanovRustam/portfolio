const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * The digital speedometer's reading for how much of the street has loaded (0–100 %): the whole part, 100
 * only once everything is in, never below the last reading (three's loading manager can step back when it
 * finds more to load).
 */
export function speedFor(loaded: number, previous = 0): number {
  const v = loaded >= 100 ? 100 : Math.min(99, Math.max(0, Math.floor(loaded)));
  return Math.max(previous, v);
}

/** How much of the tachometer's arc is lit at a speed (0–1): it sweeps a little ahead early, like an engine revving. */
export function arcFor(speed: number): number {
  return 1 - (1 - clamp01(speed / 100)) ** 1.4;
}
