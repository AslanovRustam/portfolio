'use client';

import { Text } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import { CatmullRomCurve3, Color, MeshBasicMaterial, MeshStandardMaterial, TubeGeometry, Vector3 } from 'three';
import { POLE, type SignDef } from '@/experience/signs';
import { borderGeometry, neonOutline, PLATE, signGeometry } from './geometry';
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

function labelSize(def: SignDef) {
  if (def.shape === 'octagon') return 0.25;
  if (def.shape === 'square') return 0.21;
  return def.height * 0.6;
}

/**
 * One street sign: a bevelled painted plate with grunge, an optional painted border, an Anton label,
 * a neon tube along its edge with a coloured light that rims the pole and spills on the wet street,
 * and the clamp bands that hold it to the pole.
 */
export default function Sign({ def, mats }: { def: SignDef; mats: Mats }) {
  const neon = NEON[def.id];
  const plate = useMemo(() => signGeometry(def), [def]);
  const border = useMemo(() => (def.border ? borderGeometry(def) : null), [def]);
  const tube = useMemo(() => {
    if (!neon) return null;
    const pts = neonOutline(def).map(([x, y]) => new Vector3(x, y, 0));
    return new TubeGeometry(new CatmullRomCurve3(pts, true, 'centripetal'), pts.length * 2, 0.009, 8, true);
  }, [def, neon]);

  const faceMat = useMemo(() => mats.face(def.color, def.id === 'about' ? 0.02 : 0.12), [mats, def]);
  const borderMat = useMemo(
    () => new MeshStandardMaterial({ color: def.border, emissive: new Color(def.border), emissiveIntensity: 0.25, roughness: 0.6 }),
    [def],
  );
  const textMat = useMemo(
    () => new MeshStandardMaterial({ color: def.textColor, emissive: new Color(def.textColor), emissiveIntensity: 0.4, roughness: 0.5 }),
    [def],
  );
  const neonMat = useMemo(
    () => (neon ? new MeshBasicMaterial({ color: new Color(neon).multiplyScalar(3), toneMapped: false }) : null),
    [neon],
  );

  useEffect(
    () => () => {
      for (const d of [plate, border, tube, faceMat, borderMat, textMat, neonMat]) d?.dispose();
    },
    [plate, border, tube, faceMat, borderMat, textMat, neonMat],
  );

  const bandY = Math.max(def.height / 2 - 0.08, 0.06);
  const labelX = def.shape === 'arrow' ? -def.height * 0.3 : 0;

  return (
    <group position-y={def.y} rotation-y={def.facing} name={`sign-${def.id}`}>
      {/* clamp bands around the pole and the brackets to the plate */}
      {[bandY, -bandY].map((y) => (
        <group key={y} position-y={y}>
          <mesh material={mats.hardware}>
            <cylinderGeometry args={[POLE.radius + 0.008, POLE.radius + 0.008, 0.035, 24]} />
          </mesh>
          <mesh material={mats.hardware} position-z={(POLE.radius + MOUNT - FRONT) / 2}>
            <boxGeometry args={[0.05, 0.03, MOUNT - FRONT - POLE.radius + 0.01]} />
          </mesh>
        </group>
      ))}
      <group position-z={MOUNT} rotation-z={def.tilt}>
        <mesh geometry={plate} material={[faceMat, mats.edge, mats.edge]} />
        {border && <mesh geometry={border} material={borderMat} position-z={FRONT + 0.0015} />}
        <Text
          font={FONT}
          fontSize={labelSize(def)}
          letterSpacing={0.03}
          anchorX="center"
          anchorY="middle"
          position={[labelX, 0, FRONT + 0.003]}
          material={textMat}
        >
          {def.label}
        </Text>
        {tube && neonMat && <mesh geometry={tube} material={neonMat} position-z={FRONT + 0.012} />}
        {/* under the plate's front edge: spills down the pole and onto the street, never onto a neighbour's face */}
        {neon && (
          <pointLight color={neon} intensity={1.4} distance={2.6} decay={2} position={[0, -def.height / 2 - 0.1, 0.12]} />
        )}
      </group>
    </group>
  );
}
