'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { type RefObject, useEffect, useMemo, useRef } from 'react';
import { AdditiveBlending, Color, type InstancedMesh, Object3D } from 'three';
import { streakPlacement } from '../street/layout';
import { streakTexture } from '../street/Streaks';
import { wallLayout, wallStreaks } from './layout';

const STREAKS = wallStreaks(wallLayout());
/** How strongly a fully lit screen shows on the road. */
const POWER = 1.1;

/**
 * The TV wall's light on the wet road: a streak under each project screen, in the colour of its picture,
 * as bright as the screen is. Dark on standby. Laid like the street lamps' reflections.
 */
export default function WallStreaks({
  levels,
  glow,
  out,
}: {
  /** current brightness per stop (TvWall writes it every frame) */
  levels: RefObject<number[]>;
  glow: readonly Color[];
  /** the brightness each streak was drawn at, for the scene probe */
  out: RefObject<number[]>;
}) {
  const mesh = useRef<InstancedMesh>(null);
  const camera = useThree((s) => s.camera);
  const texture = useMemo(() => streakTexture(), []);
  const o = useMemo(() => new Object3D(), []);
  const tint = useMemo(() => new Color(), []);
  const live = useRef(glow);
  useEffect(() => {
    live.current = glow;
  }, [glow]);
  useEffect(() => () => texture.dispose(), [texture]);

  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    STREAKS.forEach((s, i) => {
      const power = Math.min(1, levels.current[i] ?? 0) * POWER;
      out.current[i] = power;
      m.setColorAt(i, tint.copy(live.current[i] ?? live.current[0]).multiplyScalar(power));
      const p = streakPlacement({ x: s.x, h: s.h, z: s.zFar }, camera.position, s.length);
      o.position.set(p.x, 0.016, p.z);
      o.rotation.set(-Math.PI / 2, p.angle, 0, 'YXZ');
      o.scale.set(s.width, p.length, 1);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  return (
    // matrices change every frame: a bounding sphere computed once would cull them wrongly
    <instancedMesh ref={mesh} args={[undefined, undefined, STREAKS.length]} renderOrder={1} frustumCulled={false}>
      <planeGeometry />
      <meshBasicMaterial map={texture} transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
    </instancedMesh>
  );
}
