'use client';

import { useTexture } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import { Color, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, type Texture, Vector2 } from 'three';
import { useNightEnv } from '../env';

const PAINT = [
  '/textures/rusty_painted_metal/diffuse.webp',
  '/textures/rusty_painted_metal/nor_gl.webp',
  '/textures/rusty_painted_metal/arm.webp',
];
const PLATE = ['/textures/metal_plate_02/nor_gl.webp', '/textures/metal_plate_02/rough.webp'];

function tiled(t: Texture, x: number, y: number): Texture {
  const c = t.clone();
  c.wrapS = c.wrapT = RepeatWrapping;
  c.repeat.set(x, y);
  c.anisotropy = 8;
  c.needsUpdate = true;
  return c;
}

/**
 * Shared PBR materials for the signpost, all from CC0 scans: chipped red paint over rust for the pole,
 * worn sheet metal for sign edges and backs, and the same grunge (as roughness) on painted faces.
 */
export function usePoleMaterials() {
  const [paint, paintNormal, paintArm] = useTexture(PAINT, (ts) => {
    ts[0].colorSpace = SRGBColorSpace;
  });
  const [plateNormal, plateRough] = useTexture(PLATE);
  const env = useNightEnv();

  const materials = useMemo(() => {
    // the pole: u wraps its 0.38 m circumference, v runs 5.2 m → ~14 repeats keep the scan square
    const pole = new MeshStandardMaterial({
      map: tiled(paint, 1, 14),
      normalMap: tiled(paintNormal, 1, 14),
      roughnessMap: tiled(paintArm, 1, 14),
      aoMap: tiled(paintArm, 1, 14),
      color: new Color('#a59a96'),
      metalness: 0.35,
      roughness: 1,
      envMap: env,
      envMapIntensity: 0.55,
    });
    const edge = new MeshStandardMaterial({
      color: new Color('#5d6068'),
      normalMap: tiled(plateNormal, 1, 1),
      roughnessMap: tiled(plateRough, 1, 1),
      metalness: 0.85,
      roughness: 0.9,
      envMap: env,
      envMapIntensity: 0.7,
    });
    const hardware = new MeshStandardMaterial({
      color: new Color('#2a2c31'),
      metalness: 0.9,
      roughness: 0.45,
      envMap: env,
      envMapIntensity: 0.8,
    });
    return { pole, edge, hardware };
  }, [paint, paintNormal, paintArm, plateNormal, plateRough, env]);

  useEffect(
    () => () => {
      for (const m of Object.values(materials)) m.dispose();
    },
    [materials],
  );

  /** A painted face in `color`: scratch roughness and normals from the scan, a soft emissive glow for the neon look. */
  const face = useMemo(
    () => (color: string, glow: number, repeat = 1) =>
      new MeshStandardMaterial({
        color: new Color(color),
        emissive: new Color(color),
        emissiveIntensity: glow,
        // fine scratches of worn sheet metal, not the pole's rust streaks (those read as wood grain on a plate)
        roughnessMap: tiled(plateRough, 2 * repeat, 2 * repeat),
        normalMap: tiled(plateNormal, 2 * repeat, 2 * repeat),
        normalScale: new Vector2(0.3, 0.3),
        metalness: 0.1,
        roughness: 0.75,
        envMap: env,
        envMapIntensity: 0.4,
      }),
    [plateRough, plateNormal, env],
  );

  return { ...materials, face, env };
}
