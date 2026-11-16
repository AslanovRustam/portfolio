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

/** Struts from the back of the leaning frame to the wall, in the street. */
function struts(): Piece[] {
  const out: Piece[] = [];
  for (const y of [-P.height / 2 + 0.4, P.height / 2 - 0.4])
    for (const x of [-P.width * 0.33, P.width * 0.33]) {
      const back = onBillboard([x, y, -0.23]);
      const len = back[2] - H.z0;
      out.push({ at: [back[0], back[1], H.z0 + len / 2], size: [0.12, 0.12, len] });
    }
  return out;
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

/** The panel's face: near black, a faint glow from the tube along its edges. */
function panelTexture(color: string): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#07070b';
  g.fillRect(0, 0, c.width, c.height);
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
 * Contact's billboard on the building across the end of the street (spec §10): a big dark panel in a steel
 * frame with a neon tube round it, the section's title in neon letters on top (in the visitor's language),
 * the pink light on the wall. On a laptop the page fits the contact form into the panel; on a phone the
 * panel stays dark and the form follows in the page. Unlit and merged (eight draw calls); it renders out
 * of the blueprint with the street.
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
      struts: merged(struts()),
      tube: merged(tube()),
      window: new PlaneGeometry(1.3, 1.7),
    }),
    [],
  );
  const parts = useMemo(() => {
    const pink = NEON.contact;
    const panelMap = panelTexture(pink);
    const glowMap = glowTexture(pink);
    return {
      panelMap,
      glowMap,
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
      registerProbe('billboard', () => ({
        rect: billboardRect(camera, { x: 0, y: 0, width: size.width, height: size.height }),
        title: sign ? title : null,
      })),
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
      <mesh geometry={geo.struts} material={parts.steel} />
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
