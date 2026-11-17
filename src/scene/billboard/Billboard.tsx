'use client';

import { useThree } from '@react-three/fiber';
import { useTranslations } from 'next-intl';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  type BufferGeometry,
  CanvasTexture,
  Color,
  type InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { registerProbe } from '@/dev/sceneProbe';
import type { Vec3 } from '@/experience/choreography';
import { NEON } from '@/ui/neon';
import { revealUniforms } from '../reveal/registry';
import { applyReveal } from '../reveal/revealMaterial';
import { mulberry32 } from '../street/random';
import { billboardRect } from './billboardRect';
import { BILLBOARD, onBillboard } from './layout';

const P = BILLBOARD.panel;
const F = BILLBOARD.frame;
const T = BILLBOARD.title;
const H = BILLBOARD.building;
const [PX, PY] = P.center;

interface Piece {
  at: Vec3;
  size: Vec3;
}

/** Boxes merged into one geometry, the night's light baked into their vertices by which way each face looks. */
function merged(pieces: Piece[], lift = 0): BufferGeometry {
  const m = new Matrix4();
  const q = new Quaternion();
  const parts = pieces.map(({ at, size }) => {
    const g = new BoxGeometry(1, 1, 1);
    g.applyMatrix4(m.compose(new Vector3(...at), q, new Vector3(...size)));
    return g;
  });
  const g = mergeGeometries(parts)!;
  for (const p of parts) p.dispose();
  const n = g.attributes.normal;
  const out = new Float32Array(n.count * 3);
  for (let k = 0; k < n.count; k++) {
    // the fronts catch the billboard's pink, the undersides a little of the street, the tops stay dark
    const front = Math.max(0, n.getZ(k));
    const v = 0.38 + 0.25 * front + lift - 0.18 * Math.max(0, n.getY(k));
    out[k * 3] = v + 0.12 * front;
    out[k * 3 + 1] = v;
    out[k * 3 + 2] = v + 0.06 * front;
  }
  g.setAttribute('color', new BufferAttribute(out, 3));
  return g;
}

/**
 * The frame round the panel, the rail the title stands on and the two brackets between them: relative to
 * the panel's centre, before the tilt (they lean with it).
 */
function frame(): Piece[] {
  const w = P.width + 2 * F;
  const h = P.height + 2 * F;
  const z = -0.08;
  const railY = T.offset[1] - T.height / 2 - 0.08;
  const top = P.height / 2 + F;
  return [
    { at: [0, P.height / 2 + F / 2, z], size: [w, F, 0.3] },
    { at: [0, -P.height / 2 - F / 2, z], size: [w, F, 0.3] },
    { at: [-P.width / 2 - F / 2, 0, z], size: [F, h, 0.3] },
    { at: [P.width / 2 + F / 2, 0, z], size: [F, h, 0.3] },
    { at: [0, railY, T.offset[2] - 0.05], size: [T.width + 0.4, 0.1, 0.18] },
    ...[-1, 1].map((s): Piece => ({ at: [s * T.width * 0.35, (top + railY) / 2, T.offset[2] - 0.08], size: [0.1, railY - top, 0.1] })),
  ];
}

const S = BILLBOARD.support;
/** the lamps' goosenecks run forward this high, under the panel's edge as the last frame sees it */
const ARM_Y = 3.72;

/**
 * What the billboard stands on, in the street (layout.ts): the column, its head under the frame, two
 * brackets out to the catwalk, the catwalk's deck, kick plate, rails and posts, and the lamps' goosenecks.
 */
function support(): Piece[] {
  const { column: c, catwalk: w } = S;
  const front = w.z + w.depth / 2;
  const back = w.z - w.depth / 2;
  const len = w.x1 - w.x0;
  const mid = (w.x0 + w.x1) / 2;
  const out: Piece[] = [
    { at: [c.x, c.top / 2, c.z], size: [c.width, c.top, c.width] },
    // the head: a beam along the frame's lower bar, carrying it
    { at: [c.x, c.top - 0.12, c.z + c.width / 2 - 0.06], size: [P.width * 0.6, 0.24, 0.32] },
    { at: [mid, w.y - 0.04, w.z], size: [len, 0.06, w.depth] },
    { at: [mid, w.y + 0.08, front], size: [len, 0.18, 0.03] },
    { at: [mid, w.y + w.rail, front], size: [len, 0.05, 0.05] },
    { at: [mid, w.y + w.rail / 2, front], size: [len, 0.03, 0.03] },
  ];
  // brackets from the column's head out under the deck
  for (const dx of [-3, 3]) {
    const z0 = c.z + c.width / 2;
    out.push({ at: [c.x + dx, w.y - 0.14, (z0 + front) / 2], size: [0.1, 0.14, front - z0] });
  }
  for (let x = w.x0; x <= w.x1 + 1e-6; x += len / 8) out.push({ at: [x, w.y + w.rail / 2, front], size: [0.05, w.rail, 0.05] });
  for (const [x, , z] of S.lamps) {
    out.push({ at: [x, (w.y + w.rail + ARM_Y) / 2, front], size: [0.05, ARM_Y - w.y - w.rail + 0.03, 0.05] });
    out.push({ at: [x, ARM_Y, (front + z) / 2], size: [0.05, 0.05, z - front] });
    out.push({ at: [x, ARM_Y - 0.05, z], size: [0.05, 0.1, 0.05] });
  }
  // the deck's back edge and the head are tied
  out.push({ at: [c.x, w.y - 0.04, (back + c.z) / 2], size: [0.12, 0.08, back - c.z + 0.2] });
  return out;
}

/** The lamp heads, hanging from their goosenecks, their faces turned up to the panel. */
function lampHeads(): Piece[] {
  return S.lamps.map(([x, y, z]) => ({ at: [x, y, z], size: [0.42, 0.12, 0.24] }));
}

/** The neon tube run just inside the frame, relative to the panel's centre. */
function tube(): Piece[] {
  const i = 0.12;
  const t = 0.05;
  const z = 0.04;
  const w = P.width - 2 * i;
  const h = P.height - 2 * i;
  return [
    { at: [0, h / 2, z], size: [w + t, t, t] },
    { at: [0, -h / 2, z], size: [w + t, t, t] },
    { at: [-w / 2, 0, z], size: [t, h + t, t] },
    { at: [w / 2, 0, z], size: [t, h + t, t] },
  ];
}

/** The panel's face: near black, a faint glow from the tube along its edges, the lamps' warm light low on it. */
function panelTexture(color: string): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#07070b';
  g.fillRect(0, 0, c.width, c.height);
  // the three lamps under the edge light the lower part of the face
  for (const fx of [1 / 6, 1 / 2, 5 / 6]) {
    const warm = g.createRadialGradient(fx * c.width, c.height + 20, 4, fx * c.width, c.height + 20, 120);
    warm.addColorStop(0, 'rgba(255, 214, 160, 0.16)');
    warm.addColorStop(1, 'rgba(255, 214, 160, 0)');
    g.fillStyle = warm;
    g.fillRect(0, 0, c.width, c.height);
  }
  g.globalAlpha = 0.16;
  for (const [x0, y0, x1, y1] of [
    [0, 0, 0, 40],
    [0, c.height, 0, c.height - 40],
    [0, 0, 60, 0],
    [c.width, 0, c.width - 60, 0],
  ]) {
    const grad = g.createLinearGradient(x0, y0, x1, y1);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, c.width, c.height);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** The title in neon letters on a transparent sheet: a glowing tube, white-hot in its core. */
function titleTexture(text: string, color: string): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 410;
  const g = c.getContext('2d')!;
  let px = 300;
  g.font = `700 ${px}px Oswald, "Arial Narrow", Arial, sans-serif`;
  const room = c.width * 0.86;
  const wide = g.measureText(text).width;
  if (wide > room) px = Math.floor((px * room) / wide);
  g.font = `700 ${px}px Oswald, "Arial Narrow", Arial, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (const [blur, alpha, fill] of [
    [60, 0.6, color],
    [24, 0.85, color],
    [8, 1, color],
    [0, 1, '#ffe6f6'],
  ] as const) {
    g.shadowColor = color;
    g.shadowBlur = blur;
    g.globalAlpha = alpha;
    g.fillStyle = fill;
    g.fillText(text, c.width / 2, c.height / 2 + px * 0.04);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** The neon's light on the wall round the billboard. */
function glowTexture(color: string): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(128, 128, 30, 128, 128, 128);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** The face's windows: a seeded few lit, the rest dark, none behind the billboard. */
function windows(): { at: Vec3; lit: boolean }[] {
  const rand = mulberry32(53);
  const out: { at: Vec3; lit: boolean }[] = [];
  const x0 = PX - P.width / 2 - F - 1.2;
  const x1 = PX + P.width / 2 + F + 1.2;
  const y1 = PY + T.offset[1] + T.height / 2 + 0.8;
  for (let y = 1.8; y < H.height - 1.5; y += 3.2)
    for (let x = H.x0 + 1.6; x < H.x1 - 1; x += 2.6) {
      if (x > x0 && x < x1 && y < y1) continue;
      out.push({ at: [x, y, H.z0 + 0.012], lit: rand() < 0.26 });
    }
  return out;
}
const WINDOWS = windows();

/**
 * Contact's billboard before the building across the end of the street (spec §10): a big dark panel in a
 * steel frame with a neon tube round it, the section's title in neon letters on top (in the visitor's
 * language), the pink light on the wall; it stands on a steel column with a catwalk and three lamps lighting
 * it from below (M4 round 1). On a laptop the page fits the contact form into the panel. Unlit and merged
 * (ten draw calls); it renders out of the blueprint with the street.
 */
export default function Billboard() {
  const title = useTranslations('contact')('title');
  const reveal = useMemo(() => revealUniforms('street'), []);

  // the title is painted once the face is in (or has failed)
  const [fonts, setFonts] = useState(false);
  useEffect(() => {
    let alive = true;
    const ready = document.fonts ? document.fonts.load('700 40px Oswald', title).catch(() => undefined) : Promise.resolve();
    ready.then(() => alive && setFonts(true));
    return () => {
      alive = false;
    };
  }, [title]);

  const geo = useMemo(
    () => ({
      building: merged([{ at: [(H.x0 + H.x1) / 2, H.height / 2, (H.z0 + H.z1) / 2], size: [H.x1 - H.x0, H.height, H.z0 - H.z1] }], -0.2),
      steel: merged(frame()),
      support: merged(support()),
      lampHeads: merged(lampHeads()),
      lampGlow: mergeGeometries(
        S.lamps.map(([x, y, z]) => new PlaneGeometry(1.4, 0.7).translate(x, y + 0.12, z + 0.15)),
      )!,
      tube: merged(tube()),
      window: new PlaneGeometry(1.3, 1.7),
    }),
    [],
  );
  const parts = useMemo(() => {
    const pink = NEON.contact;
    const panelMap = panelTexture(pink);
    const glowMap = glowTexture(pink);
    const lampGlowMap = glowTexture('#ffd9a0');
    return {
      panelMap,
      glowMap,
      lampGlowMap,
      lamp: applyReveal(new MeshBasicMaterial({ color: new Color('#ffe7c2').multiplyScalar(1.6), toneMapped: false }), reveal),
      lampGlow: applyReveal(
        new MeshBasicMaterial({ map: lampGlowMap, color: new Color(0.6, 0.6, 0.6), transparent: true, blending: AdditiveBlending, depthWrite: false }),
        reveal,
      ),
      building: applyReveal(new MeshBasicMaterial({ color: '#2a2b33', vertexColors: true }), reveal),
      steel: applyReveal(new MeshBasicMaterial({ color: '#4c5059', vertexColors: true }), reveal),
      panel: applyReveal(new MeshBasicMaterial({ map: panelMap }), reveal),
      tube: applyReveal(new MeshBasicMaterial({ color: new Color(pink).multiplyScalar(2.2), toneMapped: false }), reveal),
      glow: applyReveal(
        new MeshBasicMaterial({ map: glowMap, color: new Color(0.5, 0.5, 0.5), transparent: true, blending: AdditiveBlending, depthWrite: false }),
        reveal,
      ),
      lit: applyReveal(new MeshBasicMaterial({ color: '#b98252' }), reveal),
      dark: applyReveal(new MeshBasicMaterial({ color: '#101117' }), reveal),
    };
  }, [reveal]);
  const sign = useMemo(() => {
    if (!fonts) return null;
    const map = titleTexture(title.toUpperCase(), NEON.contact);
    return {
      map,
      material: applyReveal(new MeshBasicMaterial({ map, transparent: true, depthWrite: false, toneMapped: false }), reveal),
    };
  }, [fonts, title, reveal]);

  useEffect(
    () => () => {
      for (const g of Object.values(geo)) g.dispose();
    },
    [geo],
  );
  useEffect(
    () => () => {
      for (const p of Object.values(parts)) p.dispose();
    },
    [parts],
  );
  useEffect(
    () => () => {
      sign?.map.dispose();
      sign?.material.dispose();
    },
    [sign],
  );

  const litRef = useRef<InstancedMesh>(null);
  const darkRef = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const o = new Object3D();
    let li = 0;
    let di = 0;
    for (const w of WINDOWS) {
      o.position.set(...w.at);
      o.updateMatrix();
      if (w.lit) litRef.current?.setMatrixAt(li++, o.matrix);
      else darkRef.current?.setMatrixAt(di++, o.matrix);
    }
    // the bounds were taken before the windows moved onto the face: take them again, or they get culled
    for (const m of [litRef.current, darkRef.current]) {
      if (!m) continue;
      m.instanceMatrix.needsUpdate = true;
      m.computeBoundingSphere();
    }
  }, []);
  const litCount = WINDOWS.filter((w) => w.lit).length;

  // where the panel is on the page now, as the live camera sees it, and the title as painted
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useEffect(
    () =>
      registerProbe('billboard', () => {
        const c = new Vector3(BILLBOARD.panel.center[0], S.catwalk.y, S.catwalk.z).project(camera);
        return {
          rect: billboardRect(camera, { x: 0, y: 0, width: size.width, height: size.height }),
          title: sign ? title : null,
          support: { catwalk: [((c.x + 1) / 2) * size.width, ((1 - c.y) / 2) * size.height] as [number, number] },
        };
      }),
    [camera, size, title, sign],
  );

  return (
    <group name="billboard">
      <mesh geometry={geo.building} material={parts.building} />
      <instancedMesh ref={litRef} args={[geo.window, parts.lit, litCount]} />
      <instancedMesh ref={darkRef} args={[geo.window, parts.dark, WINDOWS.length - litCount]} />
      <mesh material={parts.glow} position={[PX, PY + 1.2, H.z0 + 0.03]}>
        <planeGeometry args={[P.width * 1.9, P.height * 2.4]} />
      </mesh>
      <mesh geometry={geo.support} material={parts.steel} />
      <mesh geometry={geo.lampHeads} material={parts.lamp} />
      <mesh geometry={geo.lampGlow} material={parts.lampGlow} />
      {/* the billboard leans forward to face the end of the ride */}
      <group position={P.center} rotation-x={BILLBOARD.tilt}>
        <mesh geometry={geo.steel} material={parts.steel} />
        <mesh material={parts.panel}>
          <planeGeometry args={[P.width, P.height]} />
        </mesh>
        <mesh geometry={geo.tube} material={parts.tube} />
        {sign && (
          <mesh material={sign.material} position={T.offset}>
            <planeGeometry args={[T.width, (T.width * 410) / 2048]} />
          </mesh>
        )}
      </group>
    </group>
  );
}
