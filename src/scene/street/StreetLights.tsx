'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  type InstancedMesh,
  type MeshBasicMaterial,
  Object3D,
  SRGBColorSpace,
} from 'three';
import { useNightEnv } from '../env';
import { globalReveal } from '../reveal/registry';
import { LAMP_COLOR, LAMP_HEIGHT, streetLayout } from './layout';

const LAMP_GLOW = new Color(LAMP_COLOR).multiplyScalar(6);
const CONE = { w: 2.6, h: LAMP_HEIGHT - 0.1 };

/** A soft cone of lamp light falling through the rain: bright under the head, gone at the ground. */
function coneTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  for (let y = 0; y < 256; y++) {
    const t = y / 255;
    const half = 6 + t * 58;
    const a = 0.55 * (1 - t) ** 1.6;
    const g = ctx.createLinearGradient(64 - half, 0, 64 + half, 0);
    g.addColorStop(0, 'rgba(255,190,120,0)');
    g.addColorStop(0.5, `rgba(255,190,120,${a})`);
    g.addColorStop(1, 'rgba(255,190,120,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y, 128, 1);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/**
 * Street lamps on both kerbs with cones of light in the rain, and neon signs on the facades behind
 * the pole. Pure emissive geometry (no real lights, no per-pixel light cost): bloom makes it glow and
 * the wet street stretches its reflections into long coloured streaks. It all switches on with the render.
 */
export default function StreetLights() {
  const { lamps, neons } = useMemo(() => streetLayout(5), []);
  const env = useNightEnv();
  const cone = useMemo(() => coneTexture(), []);
  const poles = useRef<InstancedMesh>(null);
  const heads = useRef<InstancedMesh>(null);
  const cones = useRef<InstancedMesh>(null);
  const signs = useRef<InstancedMesh>(null);
  const lit = useRef<(MeshBasicMaterial | null)[]>([]);

  useEffect(() => () => cone.dispose(), [cone]);

  useLayoutEffect(() => {
    const o = new Object3D();
    lamps.forEach((l, i) => {
      o.rotation.set(0, 0, 0);
      o.scale.set(1, 1, 1);
      o.position.set(l.x, LAMP_HEIGHT / 2, l.z);
      o.updateMatrix();
      poles.current!.setMatrixAt(i, o.matrix);
      const hx = l.x - l.side * 0.9;
      o.position.set(hx, LAMP_HEIGHT + 0.05, l.z);
      o.updateMatrix();
      heads.current!.setMatrixAt(i, o.matrix);
      o.position.set(hx, LAMP_HEIGHT - CONE.h / 2, l.z + 0.05);
      o.scale.set(CONE.w, CONE.h, 1);
      o.updateMatrix();
      cones.current!.setMatrixAt(i, o.matrix);
    });
    const c = new Color();
    neons.forEach((n, i) => {
      o.position.set(n.x, n.y, n.z);
      o.rotation.set(0, n.facing, 0);
      o.scale.set(n.w, n.h, 1);
      o.updateMatrix();
      signs.current!.setMatrixAt(i, o.matrix);
      signs.current!.setColorAt(i, c.set(n.color).multiplyScalar(n.power));
    });
    for (const m of [poles, heads, cones, signs]) m.current!.instanceMatrix.needsUpdate = true;
    if (signs.current!.instanceColor) signs.current!.instanceColor.needsUpdate = true;
  }, [lamps, neons]);

  useFrame(() => {
    const r = globalReveal();
    for (const m of lit.current) m?.color.setScalar(r);
  });

  return (
    <group name="street-lights">
      <instancedMesh ref={poles} args={[undefined, undefined, lamps.length]}>
        <cylinderGeometry args={[0.05, 0.07, LAMP_HEIGHT, 10]} />
        <meshStandardMaterial color="#1b1c20" metalness={0.8} roughness={0.5} envMap={env} envMapIntensity={0.4} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, lamps.length]}>
        <boxGeometry args={[0.7, 0.08, 0.22]} />
        <meshBasicMaterial ref={(m) => void (lit.current[0] = m)} color={LAMP_GLOW} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={cones} args={[undefined, undefined, lamps.length]} renderOrder={2}>
        <planeGeometry />
        <meshBasicMaterial
          ref={(m) => void (lit.current[1] = m)}
          map={cone}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </instancedMesh>
      <instancedMesh ref={signs} args={[undefined, undefined, neons.length]}>
        <planeGeometry />
        <meshBasicMaterial ref={(m) => void (lit.current[2] = m)} toneMapped={false} side={2} />
      </instancedMesh>
    </group>
  );
}
