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
import { mulberry32 } from './random';

export const STREET_SIZE = 100;
const MAX_MIX = 6;
const MAP_SIZE = 2048;
const TILES = 15;
const MASK = 256;
const PUDDLE_TILES = 7;

/**
 * The street's colour, roughness and ripple maps (the reflector blurs its reflection by roughness and
 * wobbles it by the ripple map). The whole street is wet: a glossy film everywhere, standing water in
 * the puddles, so every light streaks across it and goes mirror-sharp in the water.
 */
function buildStreetMaps(diffuse: Texture): { map: CanvasTexture; puddles: CanvasTexture; ripples: CanvasTexture } {
  const mask = puddleMask(MASK, 11);
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = maskCanvas.height = MASK;
  const mctx = maskCanvas.getContext('2d')!;
  const img = mctx.createImageData(MASK, MASK);
  for (let i = 0; i < mask.length; i++) {
    // wet film 0.45 at most, standing water down to 0.05
    const v = Math.round((0.05 + 0.4 * mask[i]) * 255);
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
  // wet night tarmac: much darker than the daylight scan (water darkens asphalt); puddles differ by roughness
  cctx.globalCompositeOperation = 'multiply';
  cctx.fillStyle = '#5a5a60';
  cctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

  // ripples: fine streaks running toward the viewer (plane v ↔ world z) break each reflection into the
  // shimmering vertical lines of a real wet road
  const ripple = document.createElement('canvas');
  ripple.width = ripple.height = 512;
  const pctx = ripple.getContext('2d')!;
  pctx.fillStyle = '#000';
  pctx.fillRect(0, 0, 512, 512);
  const rand = mulberry32(17);
  for (let i = 0; i < 1400; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    pctx.fillStyle = `rgba(255,255,255,${0.15 + rand() * 0.5})`;
    pctx.fillRect(x, y, 0.8 + rand() * 1.6, 6 + rand() * 40);
  }

  const map = new CanvasTexture(colour);
  map.colorSpace = SRGBColorSpace;
  map.anisotropy = 8;
  const puddles = new CanvasTexture(rough);
  const ripples = new CanvasTexture(ripple);
  return { map, puddles, ripples };
}

export default function Asphalt() {
  const tier = useExperience((s) => s.tier);
  const [diffuse, normal] = useTexture(
    ['/textures/asphalt_03/diffuse.webp', '/textures/asphalt_03/nor_gl.webp'],
    // configured once on load (textures are shared through drei's cache)
    ([, n]) => {
      n.wrapS = n.wrapT = RepeatWrapping;
      n.repeat.set(TILES * 2, TILES * 2);
      n.anisotropy = 8;
    },
  );
  const env = useNightEnv();
  const { map, puddles, ripples } = useMemo(() => buildStreetMaps(diffuse), [diffuse]);

  const material = useRef<ReflectorImpl>(null);
  const wet = useRef(0);

  useEffect(() => registerProbe('wetness', () => wet.current), []);
  useEffect(
    () => () => {
      map.dispose();
      puddles.dispose();
      ripples.dispose();
    },
    [map, puddles, ripples],
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
        // little horizontal, a lot of vertical blur: every light becomes a long streak toward the viewer
        blur={[1800, 60]}
        mixBlur={2.2}
        mixStrength={0}
        mixContrast={1.2}
        mirror={0.85}
        depthScale={0}
        minDepthThreshold={0.2}
        maxDepthThreshold={1.6}
        distortion={0.05}
        distortionMap={ripples}
        map={map}
        normalMap={normal}
        normalScale={[0.35, 0.35]}
        roughnessMap={puddles}
        roughness={1}
        metalness={0.15}
        envMap={env}
        envMapIntensity={0.05}
        color="#b4b4bc"
      />
    </mesh>
  );
}
