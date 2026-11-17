'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { type ReactNode, useEffect, useMemo, useRef } from 'react';
import { Box3, CylinderGeometry, type Group, Vector3 } from 'three';
import { damp, lightState, poleYaw, reducedYaw } from '@/experience/choreography';
import { poleAway, type PoleMode, poleWorldPose, throughGantry } from '@/experience/poleRide';
import { POLE, SIGNS } from '@/experience/signs';
import { experienceStore } from '@/experience/store';
import { registerProbe } from '@/dev/sceneProbe';
import EdgesOverlay from '../reveal/EdgesOverlay';
import { revealUniforms } from '../reveal/registry';
import { applyReveal } from '../reveal/revealMaterial';
import { desiredCameraPose, divesIntoScreen } from '../cameraPose';
import { wallWeight } from '../tvwall/camera';
import { LIGHT_Y } from './lightMount';
import { usePoleMaterials } from './materials';
import Sign from './Sign';
import TrafficLight from './TrafficLight';

const BOLTS = [0, 1, 2, 3].map((i) => (i * Math.PI) / 2 + Math.PI / 4);

/** how quickly the riding pole catches up with the camera: a touch slower than the camera, so it sways */
const RIDE_LAMBDA = 2.4;

/**
 * The signpost: scroll turns it (damped) so each section's sign faces the camera in turn. After the intro
 * it rides along with the camera on the right of the frame (spec §6), steps out of the frame while the
 * camera faces the shop window, and stands at its own spot for About.
 */
export default function Pole({ children }: { children?: ReactNode }) {
  const mats = usePoleMaterials();
  const ride = useRef<Group>(null);
  const group = useRef<Group>(null);
  const mode = useRef<PoleMode>('start');
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const aspect = size.width / Math.max(1, size.height);
  const own = useMemo(() => {
    const pole = revealUniforms('pole');
    const base = revealUniforms('base');
    return {
      pole: applyReveal(mats.pole.clone(), pole),
      cap: applyReveal(mats.hardware.clone(), pole),
      flange: applyReveal(mats.pole.clone(), base),
      plate: applyReveal(mats.edge.clone(), base),
      bolts: applyReveal(mats.hardware.clone(), base),
    };
  }, [mats]);
  /** low-poly stand-ins for the blueprint lines: a few clean facets read as a technical drawing */
  const proxies = useMemo(
    () => ({
      pole: new CylinderGeometry(POLE.radius, POLE.radius * 1.06, POLE.height, 8),
      base: new CylinderGeometry(0.22, 0.23, 0.036, 6),
    }),
    [],
  );
  useEffect(
    () => () => {
      for (const m of Object.values(own)) m.dispose();
      for (const g of Object.values(proxies)) g.dispose();
    },
    [own, proxies],
  );

  useEffect(() => registerProbe('poleYaw', () => group.current?.rotation.y ?? Number.NaN), []);
  useEffect(() => {
    const v = new Vector3();
    const toNdc = (y: number): [number, number] => {
      const r = ride.current;
      if (!r) return [Number.NaN, Number.NaN];
      v.set(0, y, 0);
      r.localToWorld(v);
      v.project(camera);
      return [v.x, v.y];
    };
    const bounds = new Box3();
    // the whole pole on the page (CSS px): its bounding box's corners in front of the camera, projected
    const screenBox = () => {
      const r = ride.current;
      if (!r) return null;
      bounds.setFromObject(r);
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (let i = 0; i < 8; i++) {
        v.set(i & 1 ? bounds.max.x : bounds.min.x, i & 2 ? bounds.max.y : bounds.min.y, i & 4 ? bounds.max.z : bounds.min.z);
        v.applyMatrix4(camera.matrixWorldInverse);
        if (v.z > -0.1) continue; // behind the camera
        v.applyMatrix4(camera.projectionMatrix);
        const px = ((v.x + 1) / 2) * size.width;
        const py = ((1 - v.y) / 2) * size.height;
        x0 = Math.min(x0, px);
        y0 = Math.min(y0, py);
        x1 = Math.max(x1, px);
        y1 = Math.max(y1, py);
      }
      return x0 === Infinity ? null : { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
    };
    // About close up (M4 round 1): where a point on the pole's face, 1.2 m up, is on the page (CSS px), and
    // how wide the pole is there — the bills must move with that point
    const face = () => {
      const r = ride.current;
      if (!r) return null;
      const axis = new Vector3(0, 1.2, 0);
      r.localToWorld(axis);
      const toward = new Vector3(camera.position.x - axis.x, 0, camera.position.z - axis.z).normalize();
      const side = new Vector3(-toward.z, 0, toward.x).multiplyScalar(POLE.radius);
      const px = (p: Vector3) => {
        const s = p.clone().project(camera);
        return [((s.x + 1) / 2) * size.width, ((1 - s.y) / 2) * size.height] as const;
      };
      const [x, pin] = px(axis.clone().addScaledVector(toward, POLE.radius));
      const width = Math.abs(px(axis.clone().add(side))[0] - px(axis.clone().sub(side))[0]);
      return { x, pin, width };
    };
    return registerProbe('pole', () => ({
      ndc: toNdc(2.6),
      face: face(),
      lightNdc: toNdc(LIGHT_Y),
      mode: mode.current,
      light: lightState(experienceStore.getState().progress),
      world: ride.current ? [ride.current.position.x, ride.current.position.y, ride.current.position.z] : null,
      visible: ride.current?.visible ?? false,
      box: screenBox(),
    }));
  }, [camera, size]);

  useFrame((_, dt) => {
    const g = group.current;
    const r = ride.current;
    if (!g || !r) return;
    const { progress, reducedMotion } = experienceStore.getState();
    g.rotation.y = reducedMotion ? reducedYaw(progress) : damp(g.rotation.y, poleYaw(progress), 2.5, dt);
    // where the camera is heading, and where the pole rides beside it
    const viewport = { w: size.width, h: size.height };
    const cam = desiredCameraPose(progress, viewport, reducedMotion);
    const parked = Math.max(
      wallWeight(progress, reducedMotion),
      poleAway(progress, aspect, reducedMotion, divesIntoScreen(viewport)),
    );
    const want = poleWorldPose(progress, cam, aspect, parked, reducedMotion);
    mode.current = want.mode;
    const k = reducedMotion ? Infinity : RIDE_LAMBDA;
    r.position.set(
      damp(r.position.x, want.position[0], k, dt),
      damp(r.position.y, want.position[1], k, dt),
      damp(r.position.z, want.position[2], k, dt),
    );
    r.rotation.y = damp(r.rotation.y, want.facing, k, dt);
    // never drawn through the gantry, should a fling outrun the easing that keeps it out of the frame there
    r.visible = !throughGantry([r.position.x, r.position.y, r.position.z]);
  });

  const r = POLE.radius;
  return (
    <group ref={ride} name="pole-ride">
    <group ref={group} rotation-y={poleYaw(0)} name="pole">
      <mesh material={own.pole} position-y={POLE.height / 2}>
        <cylinderGeometry args={[r, r * 1.06, POLE.height, 40]} />
      </mesh>
      <group position-y={POLE.height / 2}>
        <EdgesOverlay geometry={proxies.pole} part="pole" threshold={20} />
      </group>
      <mesh material={own.cap} position-y={POLE.height + 0.01}>
        <sphereGeometry args={[r * 1.12, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {/* flange, base plate and anchor bolts */}
      <mesh material={own.flange} position-y={0.07}>
        <cylinderGeometry args={[r * 1.5, r * 1.9, 0.14, 32]} />
      </mesh>
      <mesh material={own.plate} position-y={0.018}>
        <cylinderGeometry args={[0.22, 0.23, 0.036, 6]} />
      </mesh>
      <group position-y={0.018}>
        <EdgesOverlay geometry={proxies.base} part="base" threshold={20} />
      </group>
      {BOLTS.map((a) => (
        <mesh key={a} material={own.bolts} position={[Math.cos(a) * 0.16, 0.05, Math.sin(a) * 0.16]}>
          <cylinderGeometry args={[0.018, 0.018, 0.035, 6]} />
        </mesh>
      ))}
      {SIGNS.map((def) => (
        <Sign key={def.id} def={def} mats={mats} />
      ))}
      <TrafficLight mats={mats} />
      {children}
    </group>
    </group>
  );
}
