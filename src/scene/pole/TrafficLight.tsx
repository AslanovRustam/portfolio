'use client';

import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Color, DoubleSide, MeshStandardMaterial, type PointLight } from 'three';
import { damp, lightState } from '@/experience/choreography';
import { POLE } from '@/experience/signs';
import { experienceStore } from '@/experience/store';
import { registerProbe } from '@/dev/sceneProbe';
import { lensIntensity } from './geometry';
import { HOUSING, LIGHT_FACING, LIGHT_Y } from './lightMount';
import type { usePoleMaterials } from './materials';

type Mats = ReturnType<typeof usePoleMaterials>;
type Lens = 'red' | 'yellow' | 'green';

const LENSES: readonly { id: Lens; y: number; color: string }[] = [
  { id: 'red', y: 0.29, color: '#ff2d2d' },
  { id: 'yellow', y: 0, color: '#ffc21a' },
  { id: 'green', y: -0.29, color: '#12d65a' },
];
const Z = POLE.radius + HOUSING.d / 2 + 0.02;

/** A yellow pedestrian-style signal on top of the pole: progress shown as red → yellow → green. */
export default function TrafficLight({ mats }: { mats: Mats }) {
  const housing = useMemo(() => mats.face('#f2b31b', 0.03, 1), [mats]);
  const lensMats = useMemo(
    () =>
      Object.fromEntries(
        LENSES.map((l) => [
          l.id,
          new MeshStandardMaterial({
            color: new Color(l.color).multiplyScalar(0.12),
            emissive: new Color(l.color),
            emissiveIntensity: 0.05,
            roughness: 0.35,
            metalness: 0,
            envMap: mats.env,
            envMapIntensity: 0.9,
          }),
        ]),
      ) as Record<Lens, MeshStandardMaterial>,
    [mats],
  );
  const visorMat = useMemo(() => {
    const m = mats.hardware.clone();
    m.side = DoubleSide;
    return m;
  }, [mats]);
  const live = useRef(lensMats);
  useEffect(() => {
    live.current = lensMats;
  }, [lensMats]);
  const glow = useRef<PointLight>(null);
  const applied = useRef({ red: 0.05, yellow: 0.05, green: 0.05 });

  useEffect(() => registerProbe('light', () => ({ ...applied.current })), []);
  useEffect(
    () => () => {
      housing.dispose();
      visorMat.dispose();
      for (const m of Object.values(lensMats)) m.dispose();
    },
    [housing, visorMat, lensMats],
  );

  useFrame((_, dt) => {
    const target = lensIntensity(lightState(experienceStore.getState().progress));
    for (const l of LENSES) {
      applied.current[l.id] = damp(applied.current[l.id], target[l.id], 6, dt);
      live.current[l.id].emissiveIntensity = applied.current[l.id];
    }
    const brightest = LENSES.reduce((a, b) => (applied.current[b.id] > applied.current[a.id] ? b : a));
    if (glow.current) {
      glow.current.color.set(brightest.color);
      glow.current.intensity = applied.current[brightest.id] * 0.9;
    }
  });

  return (
    <group position-y={LIGHT_Y} rotation-y={LIGHT_FACING} name="traffic-light">
      <mesh material={mats.hardware} position-z={(POLE.radius + Z - HOUSING.d / 2) / 2}>
        <boxGeometry args={[0.1, 0.5, Z - HOUSING.d / 2 - POLE.radius + 0.02]} />
      </mesh>
      <RoundedBox args={[HOUSING.w, HOUSING.h, HOUSING.d]} radius={0.035} smoothness={4} position-z={Z} material={housing} />
      {LENSES.map((l) => (
        <group key={l.id} position={[0, l.y, Z + HOUSING.d / 2]}>
          <mesh material={lensMats[l.id]} position-z={0.003}>
            <circleGeometry args={[0.092, 40]} />
          </mesh>
          <mesh material={mats.hardware} position-z={0.004}>
            <torusGeometry args={[0.097, 0.011, 8, 40]} />
          </mesh>
          {/* the hood above each lens */}
          <mesh material={visorMat} position={[0, 0.02, 0.08]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.11, 0.11, 0.16, 28, 1, true, -Math.PI / 2, Math.PI]} />
          </mesh>
        </group>
      ))}
      {/* below the housing: colours the pole and the wet street, no hotspot on the glass */}
      <pointLight ref={glow} intensity={0} distance={6} decay={2} position={[0, -0.9, Z + 0.35]} />
    </group>
  );
}
