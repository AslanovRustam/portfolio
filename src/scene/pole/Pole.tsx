'use client';

import { useFrame } from '@react-three/fiber';
import { type ReactNode, useEffect, useRef } from 'react';
import type { Group } from 'three';
import { damp, poleYaw } from '@/experience/choreography';
import { POLE, SIGNS } from '@/experience/signs';
import { experienceStore } from '@/experience/store';
import { registerProbe } from '@/dev/sceneProbe';
import { usePoleMaterials } from './materials';
import Sign from './Sign';
import TrafficLight from './TrafficLight';

const BOLTS = [0, 1, 2, 3].map((i) => (i * Math.PI) / 2 + Math.PI / 4);

/** The signpost: scroll turns it (damped) so each section's sign faces the camera in turn. */
export default function Pole({ children }: { children?: ReactNode }) {
  const mats = usePoleMaterials();
  const group = useRef<Group>(null);

  useEffect(() => registerProbe('poleYaw', () => group.current?.rotation.y ?? Number.NaN), []);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const { progress, reducedMotion } = experienceStore.getState();
    g.rotation.y = damp(g.rotation.y, poleYaw(progress), reducedMotion ? Infinity : 2.5, dt);
  });

  const r = POLE.radius;
  return (
    <group ref={group} rotation-y={poleYaw(0)} name="pole">
      <mesh material={mats.pole} position-y={POLE.height / 2}>
        <cylinderGeometry args={[r, r * 1.06, POLE.height, 40]} />
      </mesh>
      <mesh material={mats.hardware} position-y={POLE.height + 0.01}>
        <sphereGeometry args={[r * 1.12, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {/* flange, base plate and anchor bolts */}
      <mesh material={mats.pole} position-y={0.07}>
        <cylinderGeometry args={[r * 1.5, r * 1.9, 0.14, 32]} />
      </mesh>
      <mesh material={mats.edge} position-y={0.018}>
        <cylinderGeometry args={[0.22, 0.23, 0.036, 6]} />
      </mesh>
      {BOLTS.map((a) => (
        <mesh key={a} material={mats.hardware} position={[Math.cos(a) * 0.16, 0.05, Math.sin(a) * 0.16]}>
          <cylinderGeometry args={[0.018, 0.018, 0.035, 6]} />
        </mesh>
      ))}
      {SIGNS.map((def) => (
        <Sign key={def.id} def={def} mats={mats} />
      ))}
      <TrafficLight mats={mats} />
      {children}
    </group>
  );
}
