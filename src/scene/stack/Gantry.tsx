'use client';

import { useThree } from '@react-three/fiber';
import { plateFontReady } from '../plateFont';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import {
  BoxGeometry,
  type BufferGeometry,
  CanvasTexture,
  Color,
  Matrix4,
  BufferAttribute,
  MeshBasicMaterial,
  PlaneGeometry,
  Quaternion,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { STACK } from '@/content/stack';
import { registerProbe } from '@/dev/sceneProbe';
import type { Vec3 } from '@/experience/choreography';
import { stackStopAt } from '@/experience/stackStops';
import { experienceStore } from '@/experience/store';
import { revealUniforms } from '../reveal/registry';
import { applyReveal } from '../reveal/revealMaterial';
import { gantryLayout } from './layout';
import { drawSign, SIGN_TEXTURE } from './signTexture';

const L = gantryLayout();
const T = L.truss;
const C = L.catwalk;
const TUBE = 0.14;
/** truss panels along the span, ~1 m each */
const PANELS = Math.round(2 * L.postX);
/** the six signs share one texture: three across, two down */
const ATLAS = { cols: 3, rows: 2 } as const;

/** A box: its centre, its size and a turn about z. */
interface Piece {
  at: Vec3;
  size: Vec3;
  rz?: number;
}

/** The steel: the truss's four chords and its lacing, and the posts' legs and ties. */
function steelPieces(): Piece[] {
  const out: Piece[] = [];
  const pl = (2 * L.postX) / PANELS;
  const h = T.top - T.bottom;
  const depth = T.front - T.back;
  const mid = (T.front + T.back) / 2;
  const midY = (T.top + T.bottom) / 2;
  for (const y of [T.top, T.bottom]) for (const z of [T.front, T.back]) out.push({ at: [0, y, z], size: [2 * L.postX, TUBE, TUBE] });
  for (const z of [T.front, T.back]) {
    for (let k = 0; k <= PANELS; k++) out.push({ at: [-L.postX + k * pl, midY, z], size: [0.06, h, 0.06] });
    const angle = Math.atan2(h, pl);
    for (let k = 0; k < PANELS; k++)
      out.push({ at: [-L.postX + (k + 0.5) * pl, midY, z], size: [Math.hypot(pl, h), 0.05, 0.05], rz: k % 2 === 0 ? angle : -angle });
  }
  for (const y of [T.top, T.bottom]) for (let k = 0; k <= PANELS; k++) out.push({ at: [-L.postX + k * pl, y, mid], size: [0.06, 0.06, depth] });
  const postH = T.top + 0.25;
  for (const side of [-1, 1]) {
    const x = side * L.postX;
    for (const z of [T.front, T.back]) out.push({ at: [x, postH / 2, z], size: [0.22, postH, 0.22] });
    for (const y of [1.2, 2.4, 3.6, T.bottom, T.top]) out.push({ at: [x, y, mid], size: [0.08, 0.08, depth] });
  }
  return out;
}

/** The sheet metal: each sign's back, and the catwalk under them. */
function backPieces(): Piece[] {
  return [
    ...L.signs.map((s): Piece => ({ at: [s.position[0], s.position[1], s.position[2] - 0.04], size: [s.width + 0.04, s.height + 0.04, 0.06] })),
    { at: [0, C.y, C.z - C.depth / 2], size: [C.x1 - C.x0, 0.04, C.depth] },
  ];
}

const plinths = (): Piece[] =>
  [-1, 1].map((side) => ({ at: [side * L.postX, 0.2, (T.front + T.back) / 2], size: [L.postWidth + 0.3, 0.4, T.front - T.back + 0.6] }));
const lamps = (): Piece[] => L.signs.map((s) => ({ at: [s.position[0], C.y + 0.05, C.z - 0.12], size: [0.6, 0.05, 0.14] }));

/**
 * Night light baked into the vertices by which way each face looks: the undersides warm from the lamps on
 * the catwalk, the faces toward the street a little lit by it, the tops in the dark.
 */
function shade(g: BufferGeometry): BufferGeometry {
  const n = g.attributes.normal;
  const out = new Float32Array(n.count * 3);
  for (let k = 0; k < n.count; k++) {
    const down = Math.max(0, -n.getY(k));
    const up = Math.max(0, n.getY(k));
    const front = Math.max(0, n.getZ(k));
    const v = 0.42 + 0.22 * front - 0.2 * up;
    out[k * 3] = v + 0.5 * down;
    out[k * 3 + 1] = v + 0.4 * down;
    out[k * 3 + 2] = v + 0.26 * down;
  }
  g.setAttribute('color', new BufferAttribute(out, 3));
  return g;
}

/** Boxes merged into one geometry: one draw call per material, however many parts the steel has. */
function merged(pieces: Piece[]): BufferGeometry {
  const m = new Matrix4();
  const q = new Quaternion();
  const z = new Vector3(0, 0, 1);
  const parts = pieces.map(({ at, size, rz = 0 }) => {
    const g = new BoxGeometry(1, 1, 1);
    g.applyMatrix4(m.compose(new Vector3(...at), q.setFromAxisAngle(z, rz), new Vector3(...size)));
    return g;
  });
  const out = mergeGeometries(parts)!;
  for (const g of parts) g.dispose();
  return out;
}

/** The six sign faces in one geometry, each showing its cell of the atlas. */
function signFaces(): BufferGeometry {
  const parts = L.signs.map((s, i) => {
    const g = new PlaneGeometry(s.width, s.height);
    g.translate(s.position[0], s.position[1], s.position[2] + 0.0015);
    const col = i % ATLAS.cols;
    const row = Math.floor(i / ATLAS.cols);
    const uv = g.attributes.uv;
    // the canvas runs down from its top row; the texture's v runs up
    for (let k = 0; k < uv.count; k++) uv.setXY(k, (col + uv.getX(k)) / ATLAS.cols, (ATLAS.rows - 1 - row + uv.getY(k)) / ATLAS.rows);
    return g;
  });
  const out = mergeGeometries(parts)!;
  for (const g of parts) g.dispose();
  return out;
}

/** Every category painted onto its own cell of one texture. */
function paintAtlas(titles: readonly string[]): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = SIGN_TEXTURE.w * ATLAS.cols;
  c.height = SIGN_TEXTURE.h * ATLAS.rows;
  const ctx = c.getContext('2d')!;
  STACK.forEach((g, i) => {
    ctx.save();
    ctx.translate((i % ATLAS.cols) * SIGN_TEXTURE.w, Math.floor(i / ATLAS.cols) * SIGN_TEXTURE.h);
    drawSign(ctx, { title: titles[i], items: g.items.map((it) => ({ label: it.label, icon: it.sticker })) }, SIGN_TEXTURE);
    ctx.restore();
  });
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/**
 * Stack's sign gantry over the road (spec §9): six green highway signs on a galvanised box truss, a post
 * beyond each sidewalk, a catwalk under the signs with a lamp lighting each one from below. The signs are
 * painted in the visitor's language and shown flat, as retroreflective signs look in their own light. Five
 * draw calls in all (the steel, the sheet metal, the plinths, the lamps, the signs); it renders out of the
 * blueprint with the street.
 */
export default function Gantry() {
  const t = useTranslations('stack.groups');
  const key = STACK.map((g) => t(g.key)).join('|');
  const reveal = useMemo(() => revealUniforms('street'), []);

  // the signs are painted once the face is in (or has failed): until then they stand blank
  const [fonts, setFonts] = useState(false);
  useEffect(() => {
    let alive = true;
    plateFontReady(700, key).then(() => alive && setFonts(true));
    return () => {
      alive = false;
    };
  }, [key]);

  const geo = useMemo(
    () => ({
      steel: shade(merged(steelPieces())),
      back: shade(merged(backPieces())),
      plinths: shade(merged(plinths())),
      lamps: merged(lamps()),
      signs: signFaces(),
    }),
    [],
  );
  const parts = useMemo(() => {
    // the metal's light is baked into its vertices (shade): a lit material here cost the About frame a whole
    // vsync step on the integrated GPU, as every pixel of the truss summed the pole's lights
    const steel = applyReveal(new MeshBasicMaterial({ color: '#8b9098', vertexColors: true }), reveal);
    const back = applyReveal(new MeshBasicMaterial({ color: '#4d5158', vertexColors: true }), reveal);
    const concrete = applyReveal(new MeshBasicMaterial({ color: '#55565c', vertexColors: true }), reveal);
    const lamp = applyReveal(new MeshBasicMaterial({ color: new Color('#fff1d0').multiplyScalar(1.6), toneMapped: false }), reveal);
    const blank = applyReveal(new MeshBasicMaterial({ color: '#0d6b3b' }), reveal);
    return { steel, back, concrete, lamp, blank };
  }, [reveal]);
  const signs = useMemo(() => {
    if (!fonts) return null;
    const map = paintAtlas(key.split('|'));
    return { map, material: applyReveal(new MeshBasicMaterial({ map }), reveal) };
  }, [fonts, key, reveal]);

  useEffect(
    () => () => {
      for (const g of Object.values(geo)) g.dispose();
    },
    [geo],
  );
  useEffect(
    () => () => {
      for (const m of Object.values(parts)) m.dispose();
    },
    [parts],
  );
  useEffect(
    () => () => {
      signs?.map.dispose();
      signs?.material.dispose();
    },
    [signs],
  );

  // which sign the camera stands under, and where each sign is on the screen
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    const v = new Vector3();
    const ndc = (x: number, y: number, z: number): [number, number] => {
      v.set(x, y, z).project(camera);
      return [v.x, v.y];
    };
    return registerProbe('gantry', () => ({
      stop: stackStopAt(experienceStore.getState().progress),
      titles: key.split('|'),
      signs: L.signs.map(({ position: [x, y, z], width, height }) => {
        const [l, b] = ndc(x - width / 2, y - height / 2, z);
        const [r, tp] = ndc(x + width / 2, y + height / 2, z);
        return { ndc: ndc(x, y, z), rect: [l, b, r, tp] };
      }),
    }));
  }, [camera, key]);

  return (
    <group name="gantry">
      <mesh geometry={geo.steel} material={parts.steel} />
      <mesh geometry={geo.back} material={parts.back} />
      <mesh geometry={geo.plinths} material={parts.concrete} />
      <mesh geometry={geo.lamps} material={parts.lamp} />
      <mesh geometry={geo.signs} material={signs?.material ?? parts.blank} />
    </group>
  );
}
