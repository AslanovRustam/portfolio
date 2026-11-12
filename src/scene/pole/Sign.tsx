'use client';

import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  CatmullRomCurve3,
  Color,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type PointLight,
  TubeGeometry,
  Vector3,
} from 'three';
import { POLE, type SignDef } from '@/experience/signs';
import EdgesOverlay from '../reveal/EdgesOverlay';
import { revealUniforms } from '../reveal/registry';
import { applyReveal } from '../reveal/revealMaterial';
import { neonFlicker } from '../reveal/revealMath';
import { bandOffset, borderGeometry, neonOutline, PLATE, signGeometry, signProxyGeometry } from './geometry';
import type { usePoleMaterials } from './materials';

type Mats = ReturnType<typeof usePoleMaterials>;

/** Neon tube colour per sign; CV stays plain painted metal (green is saved for the finale). */
const NEON: Partial<Record<SignDef['id'], string>> = {
  work: '#ffb070',
  about: '#7fe3ff',
  stack: '#ff4d4d',
  contact: '#ff5a1f',
};

const FONT = '/fonts/Anton-Regular.woff';
const FRONT = PLATE.depth / 2 + PLATE.bevel;
/** Plate centre sits this far in front of the pole axis, on its facing direction. */
export const MOUNT = POLE.radius + 0.035 + FRONT;
const NEON_LIGHT = 1.4;

function labelSize(def: SignDef) {
  if (def.shape === 'octagon') return 0.25;
  if (def.shape === 'square') return 0.21;
  return def.height * 0.6;
}

/**
 * One street sign: a bevelled painted plate with grunge, an optional painted border, an Anton label,
 * a neon tube along its edge with a coloured light that rims the pole and spills on the wet street,
 * and the clamp bands that hold it to the pole. It renders out of its blueprint with its own part of
 * the reveal, and its neon switches on with a stutter once the plate is done.
 */
export default function Sign({ def, mats }: { def: SignDef; mats: Mats }) {
  const neon = NEON[def.id];
  const u = revealUniforms(def.id);
  const plate = useMemo(() => signGeometry(def), [def]);
  const proxy = useMemo(() => signProxyGeometry(def), [def]);
  const border = useMemo(() => (def.border ? borderGeometry(def) : null), [def]);
  const tube = useMemo(() => {
    if (!neon) return null;
    const pts = neonOutline(def).map(([x, y]) => new Vector3(x, y, 0));
    return new TubeGeometry(new CatmullRomCurve3(pts, true, 'centripetal'), pts.length * 2, 0.009, 8, true);
  }, [def, neon]);

  const own = useMemo(
    () => ({
      face: applyReveal(mats.face(def.color, def.id === 'about' ? 0.02 : 0.12), u),
      edge: applyReveal(mats.edge.clone(), u),
      hardware: applyReveal(mats.hardware.clone(), u),
      border: def.border
        ? applyReveal(
            new MeshStandardMaterial({
              color: def.border,
              emissive: new Color(def.border),
              emissiveIntensity: 0.25,
              roughness: 0.6,
            }),
            u,
          )
        : null,
      text: applyReveal(
        new MeshStandardMaterial({
          color: def.textColor,
          emissive: new Color(def.textColor),
          emissiveIntensity: 0.4,
          roughness: 0.5,
        }),
        u,
      ),
      neon: neon ? new MeshBasicMaterial({ color: new Color(neon).multiplyScalar(3), toneMapped: false }) : null,
    }),
    [mats, def, neon, u],
  );
  const live = useRef(own);
  useEffect(() => {
    live.current = own;
  }, [own]);
  const light = useRef<PointLight>(null);
  const neonBase = useMemo(() => (neon ? new Color(neon).multiplyScalar(3) : null), [neon]);

  useEffect(
    () => () => {
      for (const d of [plate, proxy, border, tube, ...Object.values(own)]) d?.dispose();
    },
    [plate, proxy, border, tube, own],
  );

  useFrame((state) => {
    const on = neonFlicker(u.uReveal.value, state.clock.elapsedTime);
    const m = live.current.neon;
    if (m && neonBase) {
      m.color.copy(neonBase).multiplyScalar(on);
      m.visible = on > 0;
    }
    if (light.current) light.current.intensity = NEON_LIGHT * on;
  });

  const bandY = bandOffset(def);
  const labelX = def.shape === 'arrow' ? -def.height * 0.3 : 0;
  const bracketLength = MOUNT - FRONT - POLE.radius + 0.01;

  return (
    <group position-y={def.y} rotation-y={def.facing} name={`sign-${def.id}`}>
      {/* clamp bands around the pole and the brackets to the plate */}
      {[bandY, -bandY].map((y) => (
        <group key={y} position-y={y}>
          <mesh material={own.hardware}>
            <cylinderGeometry args={[POLE.radius + 0.008, POLE.radius + 0.008, 0.035, 24]} />
          </mesh>
          <mesh material={own.hardware} position-z={(POLE.radius + MOUNT - FRONT) / 2}>
            <boxGeometry args={[0.05, 0.03, bracketLength]} />
          </mesh>
        </group>
      ))}
      <group position-z={MOUNT} rotation-z={def.tilt}>
        <mesh geometry={plate} material={[own.face, own.edge, own.edge]} />
        <EdgesOverlay geometry={proxy} part={def.id} threshold={30} />
        {border && own.border && <mesh geometry={border} material={own.border} position-z={FRONT + 0.0015} />}
        <Text
          font={FONT}
          fontSize={labelSize(def)}
          letterSpacing={0.03}
          anchorX="center"
          anchorY="middle"
          position={[labelX, 0, FRONT + 0.003]}
          material={own.text}
        >
          {def.label}
        </Text>
        {tube && own.neon && <mesh geometry={tube} material={own.neon} position-z={FRONT + 0.012} />}
        {/* under the plate's front edge: spills down the pole and onto the street, never onto a neighbour's face */}
        {neon && (
          <pointLight
            ref={light}
            color={neon}
            intensity={0}
            distance={2.6}
            decay={2}
            position={[0, -def.height / 2 - 0.1, 0.12]}
          />
        )}
      </group>
    </group>
  );
}
