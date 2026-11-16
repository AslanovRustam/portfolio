'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BoxGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  type InstancedMesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  ShaderMaterial,
  SRGBColorSpace,
} from 'three';
import { NEON } from '@/ui/neon';
import { mulberry32 } from '../street/random';
import { revealUniforms } from '../reveal/registry';
import { applyReveal, REVEAL_PARS, revealFront } from '../reveal/revealMaterial';
import { shopLayout } from './layout';

const SHOP = shopLayout();
const F = SHOP.facade;
const W = SHOP.window;
/** where the shop front ends and the upper floors begin */
const FLOOR = 3.3;

/**
 * Dark glass with a cold highlight from the street lamp and rain running down it: the TVs show through
 * it, a little dimmed. No real reflection (too dear for the integrated GPU); it renders out of the
 * blueprint with the street.
 */
function glassMaterial(reveal: ReturnType<typeof revealUniforms>): ShaderMaterial {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { ...reveal, uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vRevealWorld;
      void main() {
        vUv = uv;
        vRevealWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      ${REVEAL_PARS}
      float h(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
      void main() {
        ${revealFront(false)}
        // a soft diagonal highlight, as from the lamp across the street
        float band = smoothstep(0.08, 0.0, abs(vUv.x * 0.35 + vUv.y * 0.9 - 0.55)) * 0.16;
        // rain: thin drops running down in a few columns
        vec2 cell = vec2(floor(vUv.x * 90.0), 0.0);
        float speed = 0.15 + h(cell) * 0.35;
        float y = fract(vUv.y * 3.0 + uTime * speed + h(cell + 3.1));
        float drop = step(0.92, h(cell + 7.7)) * smoothstep(0.06, 0.0, abs(fract(vUv.x * 90.0) - 0.5) - 0.05) * smoothstep(0.0, 0.3, y) * (1.0 - y);
        vec3 col = vec3(0.55, 0.7, 0.85) * (band + drop * 0.35);
        float a = 0.16 + band * 0.5 + drop * 0.25;
        gl_FragColor = vec4(col + vec3(0.01, 0.012, 0.02), a);
      }
    `,
  });
}

/** The neon WORK over the window, drawn once into a texture: a glowing tube on a dark backing board. */
function signTexture(text: string, color: string): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#07080c';
  g.fillRect(0, 0, c.width, c.height);
  g.font = '600 168px Oswald, "Arial Narrow", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (const [blur, alpha] of [
    [48, 0.55],
    [20, 0.8],
    [6, 1],
  ] as const) {
    g.shadowColor = color;
    g.shadowBlur = blur;
    g.globalAlpha = alpha;
    g.fillStyle = color;
    g.fillText(text, c.width / 2, c.height / 2 + 6);
  }
  g.globalAlpha = 1;
  g.shadowBlur = 0;
  g.fillStyle = '#fff4e6';
  g.fillText(text, c.width / 2, c.height / 2 + 6);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** A soft round glow for the wall around the sign (the neon's light on the concrete). */
function glowTexture(color: string): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(128, 64, 4, 128, 64, 124);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.scale(1, 0.5);
  g.fillRect(0, 0, 256, 256);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/**
 * The building on the left (spec §7): three floors with a few lit windows over an electronics shop whose
 * long window holds the TV wall on a riser, and a neon WORK sign above it. Simple boxes, lit by the street
 * and the screens; it renders out of the blueprint with the street.
 */
export default function Shop() {
  const reveal = useMemo(() => revealUniforms('street'), []);
  const parts = useMemo(() => {
    const concrete = applyReveal(new MeshStandardMaterial({ color: '#3a3b42', roughness: 0.86 }), reveal);
    const trim = applyReveal(new MeshStandardMaterial({ color: '#111216', roughness: 0.5, metalness: 0.3 }), reveal);
    const inside = applyReveal(new MeshStandardMaterial({ color: '#0d0e12', roughness: 0.95, side: DoubleSide }), reveal);
    const lit = applyReveal(new MeshBasicMaterial({ color: '#c88a4e' }), reveal);
    const glass = glassMaterial(reveal);
    const tex = signTexture(SHOP.sign.text, NEON.work);
    const sign = applyReveal(new MeshBasicMaterial({ map: tex, toneMapped: false }), reveal);
    const halo = glowTexture(NEON.work);
    const glow = applyReveal(
      new MeshBasicMaterial({ map: halo, color: new Color(0.55, 0.55, 0.55), transparent: true, blending: AdditiveBlending, depthWrite: false }),
      reveal,
    );
    // the shop's ceiling light, a cold strip along the top of the window
    const strip = applyReveal(new MeshBasicMaterial({ color: '#dfe9ff' }), reveal);
    return { concrete, trim, inside, lit, glass, tex, sign, halo, glow, strip };
  }, [reveal]);
  useEffect(
    () => () => {
      for (const v of Object.values(parts)) v.dispose();
    },
    [parts],
  );
  // the rain on the glass runs with the clock (written through a ref, as the frame loop must not touch hook values)
  const glass = useRef<ShaderMaterial | null>(null);
  useEffect(() => {
    glass.current = parts.glass;
  }, [parts]);
  useFrame((state) => {
    const g = glass.current;
    if (g) g.uniforms.uTime.value = state.clock.elapsedTime;
  });

  const depth = F.x1 - F.x0;
  const length = F.z0 - F.z1;
  const cx = (F.x0 + F.x1) / 2;
  const cz = (F.z0 + F.z1) / 2;
  const winLen = W.z0 - W.z1;
  const winMid = (W.z0 + W.z1) / 2;

  // the upper floors' windows: a seeded few lit, the rest dark
  const windows = useMemo(() => {
    const rand = mulberry32(31);
    const out: { y: number; z: number; lit: boolean }[] = [];
    for (let y = FLOOR + 1.6; y < F.height - 1; y += 3.1)
      for (let z = F.z0 - 1.3; z > F.z1 + 0.8; z -= 2.2) out.push({ y, z, lit: rand() < 0.28 });
    return out;
  }, []);
  const litRef = useRef<InstancedMesh>(null);
  const darkRef = useRef<InstancedMesh>(null);
  useEffect(() => {
    const o = new Object3D();
    let li = 0;
    let di = 0;
    for (const w of windows) {
      o.position.set(F.x1 + 0.012, w.y, w.z);
      o.rotation.set(0, Math.PI / 2, 0);
      o.updateMatrix();
      if (w.lit) litRef.current?.setMatrixAt(li++, o.matrix);
      else darkRef.current?.setMatrixAt(di++, o.matrix);
    }
    // the bounds were taken before the windows moved onto the facade: take them again, or they get culled
    for (const m of [litRef.current, darkRef.current]) {
      if (!m) continue;
      m.instanceMatrix.needsUpdate = true;
      m.computeBoundingSphere();
    }
  }, [windows]);
  const windowGeo = useMemo(() => new PlaneGeometry(1.1, 1.5), []);
  const box = useMemo(() => new BoxGeometry(1, 1, 1), []);
  useEffect(
    () => () => {
      windowGeo.dispose();
      box.dispose();
    },
    [windowGeo, box],
  );
  const litCount = windows.filter((w) => w.lit).length;

  return (
    <group name="shop">
      {/* upper floors */}
      <mesh geometry={box} material={parts.concrete} position={[cx, (FLOOR + F.height) / 2, cz]} scale={[depth, F.height - FLOOR, length]} />
      {/* the shop front: pillars either side of the window, the sill and the fascia */}
      <mesh geometry={box} material={parts.concrete} position={[F.x1 - 0.4, FLOOR / 2, (F.z0 + W.z0) / 2]} scale={[0.8, FLOOR, F.z0 - W.z0]} />
      <mesh geometry={box} material={parts.concrete} position={[F.x1 - 0.4, FLOOR / 2, (W.z1 + F.z1) / 2]} scale={[0.8, FLOOR, W.z1 - F.z1]} />
      <mesh geometry={box} material={parts.trim} position={[F.x1 - 0.15, W.y0 / 2, winMid]} scale={[0.3, W.y0, winLen]} />
      <mesh geometry={box} material={parts.trim} position={[F.x1 - 0.15, (W.y1 + FLOOR) / 2, winMid]} scale={[0.3, FLOOR - W.y1, winLen]} />
      {/* inside: the back wall, floor and ceiling of the shop, and the riser the TVs stand on */}
      <mesh geometry={box} material={parts.inside} position={[F.x1 - 3.2, FLOOR / 2, winMid]} scale={[0.1, FLOOR, winLen]} />
      <mesh geometry={box} material={parts.inside} position={[F.x1 - 1.6, 0.01, winMid]} scale={[3.2, 0.02, winLen]} />
      <mesh geometry={box} material={parts.inside} position={[F.x1 - 1.6, FLOOR - 0.01, winMid]} scale={[3.2, 0.02, winLen]} />
      <mesh geometry={box} material={parts.trim} position={[F.x1 - 1.3, 0.225, winMid]} scale={[1.1, 0.45, winLen - 0.4]} />
      {/* the window's glass */}
      <mesh material={parts.glass} position={[W.glassX, (W.y0 + W.y1) / 2, winMid]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[winLen, W.y1 - W.y0]} />
      </mesh>
      {/* the neon WORK sign on the fascia, and its glow on the wall */}
      <mesh material={parts.sign} position={SHOP.sign.position} rotation-y={Math.PI / 2}>
        <planeGeometry args={[SHOP.sign.width, SHOP.sign.width / 4]} />
      </mesh>
      <mesh material={parts.glow} position={[F.x1 + 0.01, SHOP.sign.position[1], SHOP.sign.position[2]]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[SHOP.sign.width * 1.9, SHOP.sign.width * 0.6]} />
      </mesh>
      {/* the ceiling light inside the window */}
      <mesh material={parts.strip} position={[F.x1 - 0.5, W.y1 - 0.06, winMid]} rotation-z={Math.PI / 2}>
        <boxGeometry args={[0.04, 0.12, winLen - 0.6]} />
      </mesh>
      {/* the upper floors' windows */}
      <instancedMesh ref={litRef} args={[windowGeo, parts.lit, litCount]} />
      <instancedMesh ref={darkRef} args={[windowGeo, parts.trim, windows.length - litCount]} />
    </group>
  );
}
