import { partRange, PART_ORDER } from '../pole/parts';
import { makeRevealUniforms, type RevealUniforms } from './revealMaterial';

/**
 * One set of reveal uniforms per part (light, each sign, pole, base): every material of a part shares
 * them, and RevealDriver writes them once per frame.
 */
const parts = new Map<string, RevealUniforms>();
let global = 0;

export function revealUniforms(part: string): RevealUniforms {
  let u = parts.get(part);
  if (!u) {
    u = makeRevealUniforms(PART_ORDER.indexOf(part) * 3.17 + 1, partRange(part));
    parts.set(part, u);
  }
  return u;
}

export function revealParts(): ReadonlyMap<string, RevealUniforms> {
  return parts;
}

/** The damped, scene-wide reveal 0..1 (street wetness, city lights and the lamp follow it). */
export function globalReveal(): number {
  return global;
}

export function setGlobalReveal(v: number): void {
  global = v;
}
