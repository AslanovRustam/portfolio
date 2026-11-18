'use client';

import { useThree } from '@react-three/fiber';
import { use, useEffect, useMemo, useRef, useState } from 'react';
import { CanvasTexture, CylinderGeometry, type Mesh, SRGBColorSpace, Vector3 } from 'three';
import { registerProbe } from '@/dev/sceneProbe';
import { experienceStore, useExperience } from '@/experience/store';
import { useNightEnv } from '../env';
import { revealUniforms } from '../reveal/registry';
import { revealCompile } from '../reveal/revealMaterial';
import { overUi } from '../uiPointer';
import { type AtlasRect, layoutAtlas } from './atlas';
import { getIcon } from './icons';
import { mulberry32 } from '../street/random';
import { EGG, type StickerDef, stickerRadius, STICKERS } from './stickers';

const ATLAS = 2048;
const CELL = 256;
/** transparent margin inside each cell: a rolled sticker's bounding box must never reach the next cell */
const PAD = 32;
const INNER = CELL - 2 * PAD;

let fonts: Promise<unknown> | null = null;
function loadFonts() {
  fonts ??= Promise.all([
    new FontFace('StickerDisplay', 'url(/fonts/Anton-Regular.woff)').load(),
    new FontFace('StickerMono', 'url(/fonts/JetBrainsMono-Regular.woff)').load(),
  ]).then((faces) => faces.forEach((f) => document.fonts.add(f)));
  return fonts;
}

function shapePath(ctx: CanvasRenderingContext2D, s: StickerDef, x: number, y: number, w: number, h: number) {
  ctx.beginPath();
  if (s.shape === 'circle') ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
  else ctx.roundRect(x, y, w, h, Math.min(w, h) * 0.18);
}

/** Every sticker drawn once into one atlas: white die-cut edge, coloured vinyl, logo or lettering. */
function drawAtlas(stickers: readonly StickerDef[], rects: AtlasRect[]): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = ATLAS;
  const ctx = canvas.getContext('2d')!;
  stickers.forEach((s, i) => {
    const cx = rects[i].u * ATLAS;
    const cy = rects[i].v * ATLAS;
    const w = INNER;
    const h = INNER * s.aspect;
    const x = cx + PAD;
    const y = cy + (CELL - h) / 2;
    const marble = s.key === EGG.key;
    const edge = 7;
    if (marble) {
      // a slab of stone, no vinyl edge: cut to shape, a few grey veins through it
      ctx.save();
      shapePath(ctx, s, x, y, w, h);
      ctx.clip();
      ctx.fillStyle = s.bg;
      ctx.fillRect(x, y, w, h);
      const rand = mulberry32(7);
      ctx.lineCap = 'round';
      for (let v = 0; v < 6; v++) {
        ctx.strokeStyle = `rgba(110, 104, 96, ${0.18 + rand() * 0.22})`;
        ctx.lineWidth = 0.8 + rand() * 1.6;
        ctx.beginPath();
        let px = x + rand() * w;
        let py = y;
        ctx.moveTo(px, py);
        while (py < y + h) {
          px += (rand() - 0.5) * 18;
          py += 6 + rand() * 10;
          ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      ctx.restore();
    } else {
      ctx.fillStyle = '#f7f5ef';
      shapePath(ctx, s, x, y, w, h);
      ctx.fill();
      ctx.fillStyle = s.bg;
      shapePath(ctx, s, x + edge, y + edge, w - 2 * edge, h - 2 * edge);
      ctx.fill();
    }
    ctx.fillStyle = s.fg;
    if (s.kind === 'logo') {
      const icon = getIcon(s.slug!)!;
      const size = (Math.min(w, h) - 2 * edge) * (s.shape === 'circle' ? 0.56 : 0.62);
      ctx.save();
      ctx.translate(x + w / 2 - size / 2, y + h / 2 - size / 2);
      ctx.scale(size / 24, size / 24);
      ctx.fill(new Path2D(icon.path));
      ctx.restore();
    } else {
      const mono = /[<>]|git|200/.test(s.text!);
      const family = mono ? 'StickerMono' : 'StickerDisplay';
      let px = (h - 2 * edge) * 0.62;
      ctx.font = `${px}px ${family}`;
      const fit = (w - 2 * edge) * 0.84;
      const measured = ctx.measureText(s.text!).width;
      if (measured > fit) {
        px *= fit / measured;
        ctx.font = `${px}px ${family}`;
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.text!, x + w / 2, y + h / 2 + px * 0.04);
    }
  });
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * A curved patch of the pole's surface covering the sticker's rolled bounding box. UVs carry the roll:
 * each vertex samples the atlas through the inverse rotation, so the sticker hugs the pole at any angle
 * and the alpha test cuts its die-cut outline.
 */
function stickerGeometry(s: StickerDef, rect: AtlasRect): CylinderGeometry {
  const r = stickerRadius(s);
  const c = Math.abs(Math.cos(s.roll));
  const sn = Math.abs(Math.sin(s.roll));
  const h = s.size * s.aspect;
  const W = s.size * c + h * sn;
  const H = s.size * sn + h * c;
  const arc = W / r;
  const g = new CylinderGeometry(r, r, H, 16, 4, true, s.angle - arc / 2, arc);
  const uv = g.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) {
    const x = (uv.getX(i) - 0.5) * W;
    const y = (uv.getY(i) - 0.5) * H;
    const xr = x * Math.cos(-s.roll) - y * Math.sin(-s.roll);
    const yr = x * Math.sin(-s.roll) + y * Math.cos(-s.roll);
    const sx = xr / s.size + 0.5;
    const sy = yr / h + 0.5;
    const px = rect.u * ATLAS + PAD + sx * INNER;
    const py = rect.v * ATLAS + CELL / 2 + (0.5 - sy) * INNER * s.aspect;
    uv.setXY(i, px / ATLAS, 1 - py / ATLAS);
  }
  uv.needsUpdate = true;
  return g;
}

/** Stack logos and a few jokes stuck all over the pole; logos (and the marble egg) light up under the cursor. */
export default function PoleStickers() {
  use(loadFonts());
  const env = useNightEnv();
  const rects = useMemo(() => layoutAtlas(STICKERS.length, CELL, ATLAS), []);
  const atlas = useMemo(() => drawAtlas(STICKERS, rects), [rects]);
  const geometries = useMemo(() => STICKERS.map((s, i) => stickerGeometry(s, rects[i])), [rects]);
  const [hovered, setHovered] = useState<string | null>(null);
  // a chip in the Stack panel lights its sticker too
  const highlight = useExperience((st) => st.highlight);
  const glowing = hovered ?? highlight;
  // stickers are part of the pole: they render with it
  const compile = useMemo(() => revealCompile(revealUniforms('pole')), []);

  useEffect(() => registerProbe('stickerGlow', () => glowing), [glowing]);

  // the marble egg on the page (CSS px): the part of its curved face that looks at the camera
  const eggMesh = useRef<Mesh>(null);
  const { camera, size } = useThree();
  useEffect(
    () =>
      registerProbe('egg', () => {
        const m = eggMesh.current;
        if (!m) return null;
        m.updateWorldMatrix(true, false);
        const r = stickerRadius(EGG);
        const h = EGG.size * EGG.aspect;
        const arc = EGG.size / r;
        const xs: number[] = [];
        const ys: number[] = [];
        let front = false;
        const p = new Vector3();
        const n = new Vector3();
        for (let i = 0; i <= 16; i++) {
          const a = EGG.angle - arc / 2 + (arc * i) / 16;
          n.set(Math.sin(a), 0, Math.cos(a)).transformDirection(m.matrixWorld);
          for (const dy of [-h / 2, h / 2]) {
            p.set(r * Math.sin(a), dy, r * Math.cos(a)).applyMatrix4(m.matrixWorld);
            const toCam = camera.position.clone().sub(p);
            if (n.dot(toCam) <= 0) continue;
            if (i === 8) front = true;
            p.project(camera);
            xs.push(((p.x + 1) / 2) * size.width);
            ys.push(((1 - p.y) / 2) * size.height);
          }
        }
        if (!xs.length) return null;
        const x = Math.min(...xs);
        const y = Math.min(...ys);
        return { rect: { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }, front };
      }),
    [camera, size],
  );

  useEffect(
    () => () => {
      atlas.dispose();
      geometries.forEach((g) => g.dispose());
    },
    [atlas, geometries],
  );

  return (
    <group name="stickers">
      {STICKERS.map((s, i) => (
        <mesh
          key={s.key}
          ref={s === EGG ? eggMesh : undefined}
          geometry={geometries[i]}
          position-y={s.y}
          onPointerOver={(e) => {
            if ((s.kind !== 'logo' && s !== EGG) || overUi(e)) return;
            e.stopPropagation();
            setHovered(s.key);
            if (s === EGG) document.body.style.cursor = 'pointer';
          }}
          onPointerMove={(e) => {
            if (s !== EGG) return;
            // the pointer can slide from the bare sticker onto HTML lying over it without leaving the mesh
            const over = !overUi(e);
            setHovered((k) => (over ? s.key : k === s.key ? null : k));
            document.body.style.cursor = over ? 'pointer' : '';
          }}
          onPointerOut={() => {
            setHovered((k) => (k === s.key ? null : k));
            if (s === EGG) document.body.style.cursor = '';
          }}
          onClick={
            s === EGG
              ? (e) => {
                  e.stopPropagation();
                  if (overUi(e)) return;
                  experienceStore.getState().setEggOpen(true);
                }
              : undefined
          }
        >
          <meshStandardMaterial
            map={atlas}
            alphaTest={0.5}
            roughness={0.42}
            metalness={0}
            envMap={env}
            envMapIntensity={0.5}
            emissiveMap={atlas}
            emissive="#ffffff"
            emissiveIntensity={glowing === s.key ? 1.4 : 0.06}
            polygonOffset
            polygonOffsetFactor={-2}
            onBeforeCompile={compile}
            customProgramCacheKey={() => 'reveal'}
          />
        </mesh>
      ))}
    </group>
  );
}
