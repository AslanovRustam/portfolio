'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { SpotLight } from 'three';
import { globalReveal } from './reveal/registry';

const LAMP = 650;

/**
 * Night light: a warm sodium street lamp off-screen that pools on the wet street, and a faint sky fill.
 * No back light: on wet ground it turns every puddle into a milky glare. Image-based light comes per
 * material (see env.ts); the signs bring their own neon, which also rims the pole. The lamp comes on
 * as the blueprint renders into the street.
 */
export default function Lighting() {
  const lamp = useRef<SpotLight>(null);
  useFrame(() => {
    if (lamp.current) lamp.current.intensity = LAMP * globalReveal();
  });
  return (
    <>
      <fogExp2 attach="fog" args={['#050507', 0.034]} />
      <spotLight
        ref={lamp}
        position={[6.5, 9, 4]}
        angle={0.55}
        penumbra={0.85}
        intensity={0}
        distance={40}
        decay={2}
        color="#ffb36b"
      />
      <hemisphereLight args={['#1a2236', '#050507', 0.35]} />
      {/*
        The light of the TV wall's current screen. TvWall moves, colours and dims it; it lives here from
        the first frame, at zero, so the wall arriving later never changes the light count (and never
        recompiles every material in the scene).
      */}
      <pointLight name={WALL_LIGHT} intensity={0} distance={4.5} decay={2} />
    </>
  );
}

/** Name of the TV wall's screen light, for TvWall to find it. */
export const WALL_LIGHT = 'tv-wall-light';
