'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  CylinderGeometry,
  type InstancedMesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  QuadraticBezierCurve3,
  SRGBColorSpace,
  TubeGeometry,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { useNightEnv } from '../env';
import { globalReveal, revealUniforms } from '../reveal/registry';
import { applyReveal } from '../reveal/revealMaterial';
import { ARM_REACH, LAMP_COLOR, LAMP_HEAD_Y, LAMP_HEIGHT, lampIntensity, streetLayout } from './layout';

const PANEL_GLOW = new Color(LAMP_COLOR).multiplyScalar(7);
const CONE = { w: 1.9, h: LAMP_HEAD_Y - 0.05 };
const HEAD_X = -ARM_REACH - 0.05;

/** A soft cone of lamp light falling through the rain: bright under the head, gone at the ground. */
function coneTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  for (let y = 0; y < 256; y++) {
    const t = y / 255;
    const half = 6 + t * 58;
    const a = 0.3 * (1 - t) ** 1.8;
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

/** One lamp's parts in its own frame (right-sidewalk lamp: arm reaching toward −x). */
function lampGeometries() {
  const base = new CylinderGeometry(0.11, 0.14, 0.7, 16).translate(0, 0.35, 0);
  const shaft = new CylinderGeometry(0.045, 0.075, LAMP_HEIGHT - 0.7, 16).translate(0, 0.7 + (LAMP_HEIGHT - 0.7) / 2, 0);
  const arm = new TubeGeometry(
    new QuadraticBezierCurve3(
      new Vector3(0, LAMP_HEIGHT - 0.3, 0),
      new Vector3(0, LAMP_HEIGHT + 0.25, 0),
      new Vector3(HEAD_X + 0.2, LAMP_HEIGHT + 0.2, 0),
    ),
    28,
    0.03,
    8,
  );
  const head = new RoundedBoxGeometry(0.85, 0.11, 0.32, 2, 0.04).translate(HEAD_X, LAMP_HEAD_Y + 0.07, 0);
  const panel = new PlaneGeometry(0.7, 0.24).rotateX(Math.PI / 2).translate(HEAD_X, LAMP_HEAD_Y + 0.011, 0);
  return { base, shaft, arm, head, panel };
}

/**
 * Street lamps along both sidewalks: a cast base, a tapered pole, a curved arm and a flat LED
 * luminaire over the road, with a cone of light in the rain. A few are failing and stutter now and
 * then — their cones and their streaks on the wet road flicker with them. Emissive only (no real
 * lights): bloom makes them glow, the streaks make them shine on the asphalt.
 */
export default function StreetLights() {
  const { lamps } = useMemo(() => streetLayout(5), []);
  const env = useNightEnv();
  const u = revealUniforms('street');
  const cone = useMemo(() => coneTexture(), []);
  const geo = useMemo(() => lampGeometries(), []);
  const mats = useMemo(
    () => ({
      metal: applyReveal(
        new MeshStandardMaterial({ color: '#2a2c31', metalness: 0.7, roughness: 0.42, envMap: env, envMapIntensity: 0.6 }),
        u,
      ),
      panel: applyReveal(new MeshBasicMaterial({ toneMapped: false }), u),
      cone: new MeshBasicMaterial({
        map: cone,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    }),
    [env, u, cone],
  );
  const baseRef = useRef<InstancedMesh>(null);
  const shaftRef = useRef<InstancedMesh>(null);
  const armRef = useRef<InstancedMesh>(null);
  const headRef = useRef<InstancedMesh>(null);
  const panelRef = useRef<InstancedMesh>(null);
  const cones = useRef<InstancedMesh>(null);
  const tint = useRef(new Color());

  useEffect(
    () => () => {
      cone.dispose();
      for (const g of Object.values(geo)) g.dispose();
      for (const m of Object.values(mats)) m.dispose();
    },
    [cone, geo, mats],
  );

  useLayoutEffect(() => {
    const o = new Object3D();
    lamps.forEach((l, i) => {
      o.position.set(l.x, 0, l.z);
      // left-sidewalk lamps are the mirror image: arm reaching toward +x
      o.rotation.set(0, l.side > 0 ? 0 : Math.PI, 0);
      o.scale.set(1, 1, 1);
      o.updateMatrix();
      for (const p of [baseRef, shaftRef, armRef, headRef, panelRef]) p.current!.setMatrixAt(i, o.matrix);
      o.position.set(l.x - l.side * ARM_REACH, CONE.h / 2, l.z + 0.05);
      o.rotation.set(0, 0, 0);
      o.scale.set(CONE.w, CONE.h, 1);
      o.updateMatrix();
      cones.current!.setMatrixAt(i, o.matrix);
    });
    for (const p of [baseRef, shaftRef, armRef, headRef, panelRef, cones]) p.current!.instanceMatrix.needsUpdate = true;
  }, [lamps]);

  // failing lamps stutter: their LED panel and cone of light follow lampIntensity
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const r = globalReveal();
    const c = tint.current;
    lamps.forEach((l, i) => {
      const k = lampIntensity(l, t) * r;
      panelRef.current?.setColorAt(i, c.copy(PANEL_GLOW).multiplyScalar(k));
      cones.current?.setColorAt(i, c.setScalar(k));
    });
    if (panelRef.current?.instanceColor) panelRef.current.instanceColor.needsUpdate = true;
    if (cones.current?.instanceColor) cones.current.instanceColor.needsUpdate = true;
  });

  const n = lamps.length;
  return (
    <group name="street-lights">
      <instancedMesh ref={baseRef} args={[geo.base, mats.metal, n]} frustumCulled={false} />
      <instancedMesh ref={shaftRef} args={[geo.shaft, mats.metal, n]} frustumCulled={false} />
      <instancedMesh ref={armRef} args={[geo.arm, mats.metal, n]} frustumCulled={false} />
      <instancedMesh ref={headRef} args={[geo.head, mats.metal, n]} frustumCulled={false} />
      <instancedMesh ref={panelRef} args={[geo.panel, mats.panel, n]} frustumCulled={false} />
      <instancedMesh ref={cones} args={[undefined, mats.cone, n]} renderOrder={2} frustumCulled={false}>
        <planeGeometry />
      </instancedMesh>
    </group>
  );
}
