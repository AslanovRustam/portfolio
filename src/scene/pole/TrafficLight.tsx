'use client';

import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  BoxGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  ExtrudeGeometry,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Path,
  type PointLight,
  type Shape,
  ShapeGeometry,
  SphereGeometry,
  SRGBColorSpace,
} from 'three';
import { damp, lightState } from '@/experience/choreography';
import { POLE } from '@/experience/signs';
import { experienceStore } from '@/experience/store';
import { registerProbe } from '@/dev/sceneProbe';
import EdgesOverlay from '../reveal/EdgesOverlay';
import { revealUniforms } from '../reveal/registry';
import { applyReveal } from '../reveal/revealMaterial';
import { lensIntensity, roundedRectShape } from './geometry';
import { ledLayout } from './led';
import { HOUSING, LIGHT_FACING, LIGHT_Y } from './lightMount';
import type { usePoleMaterials } from './materials';

type Mats = ReturnType<typeof usePoleMaterials>;
type Lens = 'red' | 'yellow' | 'green';

const MODULE = { w: 0.34, h: 0.3, d: 0.24, gap: 0.012 } as const;
const PITCH = MODULE.h + MODULE.gap;
const LENSES: readonly { id: Lens; y: number; color: string }[] = [
  { id: 'red', y: PITCH, color: '#ff2d2d' },
  { id: 'yellow', y: 0, color: '#ffb31a' },
  { id: 'green', y: -PITCH, color: '#12d65a' },
];
const BOARD = { w: 0.58, h: 1.12, t: 0.012, r: 0.05, rim: 0.032 } as const;
/** local z, from the pole axis out: bracket → backboard → signal modules → lenses */
const BOARD_Z = POLE.radius + 0.05 + BOARD.t / 2;
const MODULE_Z = BOARD_Z + BOARD.t / 2 + 0.002 + MODULE.d / 2;
const LENS_Z = MODULE_Z + MODULE.d / 2 + 0.002;
const LENS_R = 0.085;
/** a shallow glass dome: sphere cap of half-angle 0.5 rad whose rim matches the lens */
const DOME = { angle: 0.5, R: (LENS_R + 0.006) / Math.sin(0.5) } as const;

/** LED matrix behind the glass: soft white dots on black, used as the lens's emissive map. */
function ledTexture(): CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);
  for (const [x, y] of ledLayout(size, 15, 112)) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, 6.5);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.75)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, 6.5, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** The black backboard and its retro-reflective border ring. */
function boardGeometries() {
  const plate = new ExtrudeGeometry(roundedRectShape(BOARD.w, BOARD.h, BOARD.r), { depth: BOARD.t, bevelEnabled: false });
  plate.center();
  const ring = roundedRectShape(BOARD.w - 0.006, BOARD.h - 0.006, BOARD.r - 0.003) as Shape;
  const iw = BOARD.w - 2 * BOARD.rim;
  const ih = BOARD.h - 2 * BOARD.rim;
  const ir = BOARD.r - BOARD.rim / 2;
  const hole = new Path();
  hole.moveTo(-iw / 2 + ir, -ih / 2);
  hole.lineTo(iw / 2 - ir, -ih / 2);
  hole.quadraticCurveTo(iw / 2, -ih / 2, iw / 2, -ih / 2 + ir);
  hole.lineTo(iw / 2, ih / 2 - ir);
  hole.quadraticCurveTo(iw / 2, ih / 2, iw / 2 - ir, ih / 2);
  hole.lineTo(-iw / 2 + ir, ih / 2);
  hole.quadraticCurveTo(-iw / 2, ih / 2, -iw / 2, ih / 2 - ir);
  hole.lineTo(-iw / 2, -ih / 2 + ir);
  hole.quadraticCurveTo(-iw / 2, -ih / 2, -iw / 2 + ir, -ih / 2);
  ring.holes.push(hole);
  return { plate, rim: new ShapeGeometry(ring, 8) };
}

/**
 * A modern three-aspect signal on top of the pole: three worn graphite modules on a black backboard
 * with a retro-reflective yellow border, deep tunnel hoods, and LED matrices behind shallow glass
 * domes. Progress shows as red → yellow → green.
 */
export default function TrafficLight({ mats }: { mats: Mats }) {
  const u = revealUniforms('light');
  const led = useMemo(() => ledTexture(), []);
  const geo = useMemo(
    () => ({
      ...boardGeometries(),
      dome: new SphereGeometry(DOME.R, 40, 8, 0, Math.PI * 2, 0, DOME.angle),
      proxy: new BoxGeometry(HOUSING.w, HOUSING.h, HOUSING.d),
    }),
    [],
  );
  const own = useMemo(() => {
    const hood = applyReveal(mats.face('#1d1e21', 0, 1), u);
    hood.side = DoubleSide;
    return {
      housing: applyReveal(mats.face('#2b2d31', 0, 1), u),
      board: applyReveal(new MeshStandardMaterial({ color: '#0c0c0e', roughness: 0.85, metalness: 0.1 }), u),
      rim: applyReveal(
        new MeshStandardMaterial({ color: '#c9971a', emissive: new Color('#c9971a'), emissiveIntensity: 0.015, roughness: 0.55 }),
        u,
      ),
      hardware: applyReveal(mats.hardware.clone(), u),
      hood,
    };
  }, [mats, u]);
  const lensMats = useMemo(
    () =>
      Object.fromEntries(
        LENSES.map((l) => [
          l.id,
          {
            leds: applyReveal(
              new MeshStandardMaterial({
                color: new Color(l.color).multiplyScalar(0.08),
                emissive: new Color(l.color),
                emissiveMap: led,
                emissiveIntensity: 0.05,
                roughness: 0.6,
              }),
              u,
            ),
            glass: applyReveal(
              new MeshPhysicalMaterial({
                // dark tinted glass: an unlit lens must read as off, not catch the night and glow
                color: new Color(l.color).multiplyScalar(0.35),
                transparent: true,
                opacity: 0.22,
                roughness: 0.06,
                metalness: 0,
                clearcoat: 1,
                clearcoatRoughness: 0.05,
                envMap: mats.env,
                envMapIntensity: 0.7,
                depthWrite: false,
              }),
              u,
            ),
          },
        ]),
      ) as Record<Lens, { leds: MeshStandardMaterial; glass: MeshPhysicalMaterial }>,
    [mats, u, led],
  );
  const live = useRef(lensMats);
  useEffect(() => {
    live.current = lensMats;
  }, [lensMats]);
  const glow = useRef<PointLight>(null);
  const applied = useRef({ red: 0.05, yellow: 0.05, green: 0.05 });

  useEffect(() => registerProbe('light', () => ({ ...applied.current })), []);
  useEffect(
    () => () => {
      led.dispose();
      for (const g of Object.values(geo)) g.dispose();
      for (const m of Object.values(own)) m.dispose();
      for (const l of Object.values(lensMats)) {
        l.leds.dispose();
        l.glass.dispose();
      }
    },
    [led, geo, own, lensMats],
  );

  useFrame((_, dt) => {
    const target = lensIntensity(lightState(experienceStore.getState().progress));
    for (const l of LENSES) {
      applied.current[l.id] = damp(applied.current[l.id], target[l.id], 6, dt);
      live.current[l.id].leds.emissiveIntensity = applied.current[l.id];
    }
    const brightest = LENSES.reduce((a, b) => (applied.current[b.id] > applied.current[a.id] ? b : a));
    if (glow.current) {
      glow.current.color.set(brightest.color);
      // dark while the housing is still a drawing
      glow.current.intensity = applied.current[brightest.id] * 0.9 * u.uReveal.value;
    }
  });

  const bracketLength = BOARD_Z - BOARD.t / 2 - POLE.radius + 0.01;
  return (
    <group position-y={LIGHT_Y} rotation-y={LIGHT_FACING} name="traffic-light">
      {/* bracket: two arms from the pole to the backboard */}
      {[0.32, -0.32].map((y) => (
        <mesh key={y} material={own.hardware} position={[0, y, POLE.radius + bracketLength / 2 - 0.005]}>
          <boxGeometry args={[0.07, 0.05, bracketLength]} />
        </mesh>
      ))}
      <mesh geometry={geo.plate} material={own.board} position-z={BOARD_Z} />
      <mesh geometry={geo.rim} material={own.rim} position-z={BOARD_Z + BOARD.t / 2 + 0.0008} />
      <group position-z={MODULE_Z}>
        <EdgesOverlay geometry={geo.proxy} part="light" />
      </group>
      {LENSES.map((l) => (
        <group key={l.id} position-y={l.y}>
          <RoundedBox args={[MODULE.w, MODULE.h, MODULE.d]} radius={0.028} smoothness={4} position-z={MODULE_Z} material={own.housing} />
          <group position-z={LENS_Z}>
            <mesh material={lensMats[l.id].leds}>
              <circleGeometry args={[LENS_R, 48]} />
            </mesh>
            {/* shallow glass dome over the LEDs: catches the night's reflections */}
            <mesh
              geometry={geo.dome}
              material={lensMats[l.id].glass}
              rotation-x={Math.PI / 2}
              position-z={-DOME.R * Math.cos(DOME.angle)}
            />
            <mesh material={own.hardware} position-z={0.004}>
              <torusGeometry args={[LENS_R + 0.008, 0.012, 10, 48]} />
            </mesh>
            {/* deep tunnel hood: shields the lens from above and the sides */}
            <mesh material={own.hood} position={[0, 0.012, 0.11]} rotation-x={-Math.PI / 2 - 0.05}>
              <cylinderGeometry args={[0.118, 0.118, 0.22, 36, 1, true, -Math.PI / 2 - 0.45, Math.PI + 0.9]} />
            </mesh>
          </group>
        </group>
      ))}
      {/* below the housing: colours the pole and the wet street, no hotspot on the glass */}
      <pointLight ref={glow} intensity={0} distance={6} decay={2} position={[0, -0.9, LENS_Z + 0.25]} />
    </group>
  );
}
