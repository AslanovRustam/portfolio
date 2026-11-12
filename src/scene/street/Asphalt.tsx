'use client';

import { MeshReflectorMaterial, useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from 'three';
import type { MeshReflectorMaterial as ReflectorImpl } from '@react-three/drei/materials/MeshReflectorMaterial';
import { damp, revealProgress } from '@/experience/choreography';
import { TIER } from '@/experience/quality';
import { experienceStore, useExperience } from '@/experience/store';
import { registerProbe } from '@/dev/sceneProbe';
import { useNightEnv } from '../env';
import { puddleMask } from './puddles';

export const STREET_SIZE = 100;
const MAX_MIX = 3.2;
const MAP_SIZE = 2048;
const TILES = 15;
const MASK = 256;
const PUDDLE_TILES = 7;

/**
 * The street's colour and roughness maps (the reflector blurs its reflection by roughness): dry asphalt
 * is rough, puddles are glassy, so neon shows up sharp in the water and smeared on the tarmac.
 */
function buildStreetMaps(diffuse: Texture): { map: CanvasTexture; puddles: CanvasTexture } {
  const mask = puddleMask(MASK, 11);
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = maskCanvas.height = MASK;
  const mctx = maskCanvas.getContext('2d')!;
  const img = mctx.createImageData(MASK, MASK);
  for (let i = 0; i < mask.length; i++) {
    const v = Math.round(mask[i] * 255);
    img.data.set([v, v, v, 255], i * 4);
  }
  mctx.putImageData(img, 0, 0);

  const rough = document.createElement('canvas');
  rough.width = rough.height = 1024;
  const rctx = rough.getContext('2d')!;
  rctx.imageSmoothingQuality = 'high';
  // the mask tiles seamlessly: 7×7 over the 100 m street gives puddles of a few metres
  const cell = 1024 / PUDDLE_TILES;
  for (let y = 0; y < PUDDLE_TILES; y++)
    for (let x = 0; x < PUDDLE_TILES; x++) rctx.drawImage(maskCanvas, x * cell, y * cell, cell, cell);

  const colour = document.createElement('canvas');
  colour.width = colour.height = MAP_SIZE;
  const cctx = colour.getContext('2d')!;
  const tile = MAP_SIZE / TILES;
  const src = diffuse.image as CanvasImageSource;
  for (let y = 0; y < TILES; y++) for (let x = 0; x < TILES; x++) cctx.drawImage(src, x * tile, y * tile, tile, tile);
  // night tarmac: darker than the daylight scan; puddles differ by roughness, not colour
  cctx.globalCompositeOperation = 'multiply';
  cctx.fillStyle = '#7a7a80';
  cctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

  const map = new CanvasTexture(colour);
  map.colorSpace = SRGBColorSpace;
  map.anisotropy = 8;
  const puddles = new CanvasTexture(rough);
  return { map, puddles };
}

export default function Asphalt() {
  const tier = useExperience((s) => s.tier);
  const [diffuse, normal, rough] = useTexture(
    ['/textures/asphalt_03/diffuse.webp', '/textures/asphalt_03/nor_gl.webp', '/textures/asphalt_03/rough.webp'],
    // configured once on load (textures are shared through drei's cache)
    ([, n, r]) => {
      n.wrapS = n.wrapT = RepeatWrapping;
      n.repeat.set(TILES * 2, TILES * 2);
      n.anisotropy = 8;
      r.wrapS = r.wrapT = RepeatWrapping;
    },
  );
  const env = useNightEnv();
  const { map, puddles } = useMemo(() => buildStreetMaps(diffuse), [diffuse]);

  const material = useRef<ReflectorImpl>(null);
  const wet = useRef(0);

  useEffect(() => registerProbe('wetness', () => wet.current), []);
  useEffect(
    () => () => {
      map.dispose();
      puddles.dispose();
    },
    [map, puddles],
  );

  useFrame((_, dt) => {
    const { progress, reducedMotion } = experienceStore.getState();
    const target = reducedMotion ? 1 : revealProgress(progress);
    wet.current = damp(wet.current, target, reducedMotion ? Infinity : 2, dt);
    if (material.current) material.current.mixStrength = MAX_MIX * wet.current;
  });

  return (
    <mesh rotation-x={-Math.PI / 2} name="Asphalt">
      <planeGeometry args={[STREET_SIZE, STREET_SIZE]} />
      <MeshReflectorMaterial
        ref={material}
        resolution={TIER[tier].reflectorResolution}
        blur={[420, 140]}
        mixBlur={1.4}
        mixStrength={0}
        mixContrast={1.15}
        mirror={0.92}
        depthScale={1.1}
        minDepthThreshold={0.35}
        maxDepthThreshold={1.3}
        distortion={0.035}
        distortionMap={rough}
        map={map}
        normalMap={normal}
        normalScale={[0.55, 0.55]}
        roughnessMap={puddles}
        roughness={1}
        metalness={0.15}
        envMap={env}
        envMapIntensity={0.03}
        color="#b4b4bc"
      />
    </mesh>
  );
}
