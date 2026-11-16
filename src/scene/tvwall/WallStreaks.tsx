'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { type RefObject, useEffect, useMemo, useRef } from 'react';
import { AdditiveBlending, Color, type InstancedMesh, Object3D } from 'three';
import { streakTexture } from '../street/Streaks';
import { WORK_STOPS } from '@/experience/workStops';
import { wallStreakPlacements } from './layout';
/** How strongly a fully lit screen shows on the road. */
const POWER = 1.1;

/**
 * The TV wall's light on the wet sidewalk in front of the window: a streak under each project screen, in
 * the colour of its picture, as bright as the screen is. Dark on standby. Laid like the street lamps'
 * reflections, in street coordinates.
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
    wallStreakPlacements(camera.position).forEach((p, i) => {
      const power = Math.min(1, levels.current[i] ?? 0) * POWER;
      out.current[i] = power;
      m.setColorAt(i, tint.copy(live.current[i] ?? live.current[0]).multiplyScalar(power));
      o.position.set(p.x, p.y, p.z);
      o.rotation.set(-Math.PI / 2, p.angle, 0, 'YXZ');
      o.scale.set(p.width, p.length, 1);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    // on standby every streak is black: skip the draw (it is never culled)
    m.visible = out.current.some((v) => v > 0);
  });

  return (
    // matrices change every frame: a bounding sphere computed once would cull them wrongly
    <instancedMesh ref={mesh} args={[undefined, undefined, WORK_STOPS]} renderOrder={1} frustumCulled={false}>
      <planeGeometry />
      <meshBasicMaterial map={texture} transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
    </instancedMesh>
  );
}
