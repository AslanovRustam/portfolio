'use client';

import { useFrame, useThree } from '@react-three/fiber';
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
import { globalReveal } from '../reveal/registry';
import { lampIntensity, reflectionStreaks, streakPlacement, streetLayout } from './layout';
import { mulberry32 } from './random';

/**
 * One streak, drawn once: brightest under the light (canvas top = far end), fading toward the viewer,
 * soft across, broken into the fine wavering lines that ripples on a wet road make.
 */
export function streakTexture(): CanvasTexture {
  const W = 64;
  const H = 256;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(W, H);
  const rand = mulberry32(23);
  // thin wavering threads with gaps: water ripples, not a brush stroke
  const columns = Array.from({ length: W }, () => 0.2 + rand() ** 2 * 0.8);
  const rows = Array.from({ length: H }, () => (rand() < 0.1 ? 0.25 : 0.6 + rand() * 0.4));
  for (let y = 0; y < H; y++) {
    const t = y / (H - 1);
    // soft at both ends: a short rise under the light, a long fade toward the viewer
    const rise = Math.min(1, t / 0.14);
    const along = rise * rise * (3 - 2 * rise) * (1 - t) ** 1.6 * rows[y];
    for (let x = 0; x < W; x++) {
      const u = (x / (W - 1)) * 2 - 1;
      const across = Math.exp(-u * u * 5) * columns[x];
      const v = Math.round(255 * Math.min(1, along * across));
      img.data.set([v, v, v, 255], (y * W + x) * 4);
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/**
 * The street lights' reflections on the wet road, as additive streaks lying on the asphalt from under
 * each light toward the viewer — the look of both references (a blurred planar mirror smears small
 * far-away neons into nothing). They brighten as the street gets wet.
 */
export default function Streaks() {
  const streaks = useMemo(() => reflectionStreaks(streetLayout(5)), []);
  const texture = useMemo(() => streakTexture(), []);
  const mesh = useRef<InstancedMesh>(null);
  const material = useRef<MeshBasicMaterial>(null);
  const camera = useThree((s) => s.camera);
  const o = useMemo(() => new Object3D(), []);

  useEffect(() => () => texture.dispose(), [texture]);

  const tint = useRef(new Color());
  useLayoutEffect(() => {
    streaks.forEach((s, i) => mesh.current!.setColorAt(i, tint.current.set(s.color).multiplyScalar(s.power)));
    if (mesh.current!.instanceColor) mesh.current!.instanceColor.needsUpdate = true;
  }, [streaks]);

  // each frame: lay every streak on the line from its light to the camera, where the mirror image lands
  useFrame((state) => {
    const m = mesh.current;
    if (!m) return;
    const t = state.clock.elapsedTime;
    streaks.forEach((s, i) => {
      // a failing lamp's streak stutters with it
      m.setColorAt(i, tint.current.set(s.color).multiplyScalar(s.power * lampIntensity(s.source, t)));
      const p = streakPlacement({ x: s.x, h: s.h, z: s.zFar }, camera.position, s.length);
      o.position.set(p.x, s.y, p.z);
      // lay flat (plane +y → −z), then turn about y so the bright end points back at the light
      o.rotation.set(-Math.PI / 2, p.angle, 0, 'YXZ');
      o.scale.set(s.width, p.length, 1);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    material.current?.color.setScalar(globalReveal());
  });

  return (
    // matrices change every frame: the bounding sphere three computed once would cull them wrongly
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, streaks.length]}
      renderOrder={1}
      frustumCulled={false}
      name="reflection-streaks"
    >
      <planeGeometry />
      <meshBasicMaterial
        ref={material}
        map={texture}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </instancedMesh>
  );
}
