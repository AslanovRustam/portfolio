const BLUEPRINT = [0x0b, 0x1f, 0x38];
const NIGHT = [0x05, 0x05, 0x07];

/** Scene background: blueprint blue at reveal 0 → night black at 1 (spec palette). */
export function backgroundAt(reveal: number): string {
  const t = Math.min(1, Math.max(0, reveal));
  const hex = BLUEPRINT.map((a, i) => Math.round(a + (NIGHT[i] - a) * t).toString(16).padStart(2, '0'));
  return `#${hex.join('')}`;
}

const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/**
 * Neon tube brightness 0..1 for a sign whose render is at `partReveal`: dark until the sign is ~90 %
 * rendered, then a short stutter like a starter kicking in, then steady once fully rendered.
 */
export function neonFlicker(partReveal: number, time: number): number {
  if (partReveal >= 1) return 1;
  if (partReveal < 0.86) return 0;
  const k = (partReveal - 0.86) / 0.14;
  const step = Math.floor(time * 18);
  return hash(step) < 0.35 + k * 0.5 ? 0.6 + 0.4 * hash(step + 7) : 0;
}
