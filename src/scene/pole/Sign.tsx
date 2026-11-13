'use client';

import { Text } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  CatmullRomCurve3,
  Color,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type Group,
  type PointLight,
  TubeGeometry,
  Vector3,
} from 'three';
import { damp } from '@/experience/choreography';
import { POLE, type SignDef } from '@/experience/signs';
import { experienceStore } from '@/experience/store';
import { registerProbe } from '@/dev/sceneProbe';
import { scrollToSection } from '@/scroll/SmoothScroll';
import EdgesOverlay from '../reveal/EdgesOverlay';
import { overUi } from '../uiPointer';
import { revealUniforms } from '../reveal/registry';
import { applyReveal } from '../reveal/revealMaterial';
import { neonFlicker } from '../reveal/revealMath';
import { bandOffset, borderGeometry, neonOutline, PLATE, signGeometry, signProxyGeometry } from './geometry';
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
const NEON_LIGHT = 1.4;
const HOVER_GLOW = 2.6;

function hover(id: SignDef['id'], on: boolean) {
  const store = experienceStore.getState();
  if (on) {
    store.setHoveredSign(id);
    document.body.style.cursor = 'pointer';
  } else if (store.hoveredSign === id) {
    store.setHoveredSign(null);
    document.body.style.cursor = '';
  }
}

function labelSize(def: SignDef) {
  if (def.shape === 'octagon') return 0.25;
  if (def.shape === 'square') return 0.21;
  return def.height * 0.6;
}

/**
 * One street sign: a bevelled painted plate with grunge, an optional painted border, an Anton label,
 * a neon tube along its edge with a coloured light that rims the pole and spills on the wet street,
 * and the clamp bands that hold it to the pole. It renders out of its blueprint with its own part of
 * the reveal, and its neon switches on with a stutter once the plate is done.
 */
export default function Sign({ def, mats }: { def: SignDef; mats: Mats }) {
  const neon = NEON[def.id];
  const u = revealUniforms(def.id);
  const plate = useMemo(() => signGeometry(def), [def]);
  const proxy = useMemo(() => signProxyGeometry(def), [def]);
  const border = useMemo(() => (def.border ? borderGeometry(def) : null), [def]);
  const tube = useMemo(() => {
    if (!neon) return null;
    const pts = neonOutline(def).map(([x, y]) => new Vector3(x, y, 0));
    return new TubeGeometry(new CatmullRomCurve3(pts, true, 'centripetal'), pts.length * 2, 0.009, 8, true);
  }, [def, neon]);

  const own = useMemo(
    () => ({
      face: applyReveal(mats.face(def.color, def.id === 'about' ? 0.02 : 0.12), u),
      edge: applyReveal(mats.edge.clone(), u),
      hardware: applyReveal(mats.hardware.clone(), u),
      border: def.border
        ? applyReveal(
            new MeshStandardMaterial({
              color: def.border,
              emissive: new Color(def.border),
              emissiveIntensity: 0.25,
              roughness: 0.6,
            }),
            u,
          )
        : null,
      text: applyReveal(
        new MeshStandardMaterial({
          color: def.textColor,
          emissive: new Color(def.textColor),
          emissiveIntensity: 0.4,
          roughness: 0.5,
        }),
        u,
      ),
      neon: neon ? new MeshBasicMaterial({ color: new Color(neon).multiplyScalar(3), toneMapped: false }) : null,
    }),
    [mats, def, neon, u],
  );
  const live = useRef(own);
  useEffect(() => {
    live.current = own;
  }, [own]);
  const light = useRef<PointLight>(null);
  const plateGroup = useRef<Group>(null);
  const glow = useRef(1);
  const faceGlow = useMemo(() => own.face.emissiveIntensity, [own]);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const neonBase = useMemo(() => (neon ? new Color(neon).multiplyScalar(3) : null), [neon]);

  useEffect(
    () => () => {
      for (const d of [plate, proxy, border, tube, ...Object.values(own)]) d?.dispose();
    },
    [plate, proxy, border, tube, own],
  );

  // where the sign's centre lands on screen (CSS px): lets tests aim the pointer at it
  useEffect(
    () =>
      registerProbe(`signScreen:${def.id}`, () => {
        const v = new Vector3();
        plateGroup.current?.getWorldPosition(v);
        v.project(camera);
        return { x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height };
      }),
    [def.id, camera, size],
  );

  useFrame((state, dt) => {
    const hovered = experienceStore.getState().hoveredSign === def.id;
    glow.current = damp(glow.current, hovered ? HOVER_GLOW : 1, 10, dt);
    live.current.face.emissiveIntensity = faceGlow * glow.current;
    const on = neonFlicker(u.uReveal.value, state.clock.elapsedTime);
    const m = live.current.neon;
    if (m && neonBase) {
      m.color.copy(neonBase).multiplyScalar(on * (0.6 + 0.4 * glow.current));
      m.visible = on > 0;
    }
    if (light.current) light.current.intensity = NEON_LIGHT * on;
  });

  const bandY = bandOffset(def);
  const labelX = def.shape === 'arrow' ? -def.height * 0.3 : 0;
  const bracketLength = MOUNT - FRONT - POLE.radius + 0.01;

  return (
    <group position-y={def.y} rotation-y={def.facing} name={`sign-${def.id}`}>
      {/* clamp bands around the pole and the brackets to the plate */}
      {[bandY, -bandY].map((y) => (
        <group key={y} position-y={y}>
          <mesh material={own.hardware}>
            <cylinderGeometry args={[POLE.radius + 0.008, POLE.radius + 0.008, 0.035, 24]} />
          </mesh>
          <mesh material={own.hardware} position-z={(POLE.radius + MOUNT - FRONT) / 2}>
            <boxGeometry args={[0.05, 0.03, bracketLength]} />
          </mesh>
        </group>
      ))}
      <group ref={plateGroup} position-z={MOUNT} rotation-z={def.tilt}>
        <mesh
          geometry={plate}
          material={[own.face, own.edge, own.edge]}
          onPointerOver={(e) => {
            e.stopPropagation();
            if (!overUi(e)) hover(def.id, true);
          }}
          onPointerMove={(e) => {
            // the pointer can slide from the bare sign onto HTML lying over it without leaving the mesh
            const over = !overUi(e);
            if (over !== (experienceStore.getState().hoveredSign === def.id)) hover(def.id, over);
          }}
          onPointerOut={() => hover(def.id, false)}
          onClick={(e) => {
            e.stopPropagation();
            if (overUi(e)) return;
            scrollToSection(def.id === 'cv' ? 'contact' : def.id);
          }}
        />
        <EdgesOverlay geometry={proxy} part={def.id} threshold={30} />
        {border && own.border && <mesh geometry={border} material={own.border} position-z={FRONT + 0.0015} />}
        <Text
          font={FONT}
          fontSize={labelSize(def)}
          letterSpacing={0.03}
          anchorX="center"
          anchorY="middle"
          position={[labelX, 0, FRONT + 0.003]}
          material={own.text}
        >
          {def.label}
        </Text>
        {tube && own.neon && <mesh geometry={tube} material={own.neon} position-z={FRONT + 0.012} />}
        {/* under the plate's front edge: spills down the pole and onto the street, never onto a neighbour's face */}
        {neon && (
          <pointLight
            ref={light}
            color={neon}
            intensity={0}
            distance={2.6}
            decay={2}
            position={[0, -def.height / 2 - 0.1, 0.12]}
          />
        )}
      </group>
    </group>
  );
}
