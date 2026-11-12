'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { Color, type FogExp2 } from 'three';
import { damp, partReveal, revealProgress } from '@/experience/choreography';
import { experienceStore } from '@/experience/store';
import { registerProbe } from '@/dev/sceneProbe';
import { PART_ORDER } from '../pole/parts';
import { globalReveal, revealParts, setGlobalReveal } from './registry';
import { backgroundAt } from './revealMath';

const bg = new Color();

/** Advances the blueprint → render transition: per-part uniforms, background and fog colour. */
export default function RevealDriver() {
  const scene = useThree((s) => s.scene);

  useEffect(() => registerProbe('reveal', () => globalReveal()), []);

  useFrame((_, dt) => {
    const { progress, reducedMotion } = experienceStore.getState();
    const target = reducedMotion ? 1 : revealProgress(progress);
    const r = damp(globalReveal(), target, reducedMotion ? Infinity : 6, dt);
    setGlobalReveal(r > 0.9995 ? 1 : r);
    for (const [part, u] of revealParts()) {
      u.uReveal.value = partReveal(globalReveal(), PART_ORDER.indexOf(part), PART_ORDER.length);
    }
    bg.set(backgroundAt(globalReveal()));
    if (scene.background instanceof Color) scene.background.copy(bg);
    if (scene.fog) (scene.fog as FogExp2).color.copy(bg);
  });

  return null;
}
