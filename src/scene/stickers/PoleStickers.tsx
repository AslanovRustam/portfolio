'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { CanvasTexture, CylinderGeometry, SRGBColorSpace } from 'three';
import { registerProbe } from '@/dev/sceneProbe';
import { POLE } from '@/experience/signs';
import { useExperience } from '@/experience/store';
import { useNightEnv } from '../env';
import { revealUniforms } from '../reveal/registry';
import { revealCompile } from '../reveal/revealMaterial';
import { overUi } from '../uiPointer';
import { type AtlasRect, layoutAtlas } from './atlas';
import { getIcon } from './icons';
import { type StickerDef, STICKERS } from './stickers';

const ATLAS = 2048;
const CELL = 256;
/** transparent margin inside each cell: a rolled sticker's bounding box must never reach the next cell */
const PAD = 32;
const INNER = CELL - 2 * PAD;
const LIFT = 0.0018;

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
    ctx.fillStyle = '#f7f5ef';
    shapePath(ctx, s, x, y, w, h);
    ctx.fill();
    const edge = 7;
    ctx.fillStyle = s.bg;
    shapePath(ctx, s, x + edge, y + edge, w - 2 * edge, h - 2 * edge);
    ctx.fill();
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
  const r = POLE.radius + LIFT;
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

/** Stack logos and a few jokes stuck all over the pole; logos light up under the cursor. */
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
          geometry={geometries[i]}
          position-y={s.y}
          onPointerOver={(e) => {
            if (s.kind !== 'logo' || overUi(e)) return;
            e.stopPropagation();
            setHovered(s.key);
          }}
          onPointerOut={() => setHovered((k) => (k === s.key ? null : k))}
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
