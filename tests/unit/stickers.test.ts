import { expect, it } from 'vitest';
import { SIGNS } from '@/experience/signs';
import { bandOffset } from '@/scene/pole/geometry';
import { layoutAtlas, stickerArc } from '@/scene/stickers/atlas';
import { getIcon } from '@/scene/stickers/icons';
import { EGG, STACK_SLUGS, STICKERS, stickerRadius } from '@/scene/stickers/stickers';
import { POLE } from '@/experience/signs';

it('every logo sticker resolves to a simple-icons icon', () => {
  for (const s of STICKERS.filter((x) => x.kind === 'logo')) expect(getIcon(s.slug!)).not.toBeNull();
});

it('every remaining stack slug has a sticker', () => {
  const onPole = new Set(STICKERS.map((s) => s.slug));
  for (const slug of STACK_SLUGS) expect(onPole.has(slug)).toBe(true);
});

it('atlas cells fit and do not overlap', () => {
  const r = layoutAtlas(40, 256, 2048);
  expect(r).toHaveLength(40);
  for (const a of r) {
    expect(a.u).toBeGreaterThanOrEqual(0);
    expect(a.u + a.w).toBeLessThanOrEqual(1);
    expect(a.v + a.h).toBeLessThanOrEqual(1);
  }
  for (let i = 0; i < r.length; i++)
    for (let j = i + 1; j < r.length; j++) {
      const a = r[i];
      const b = r[j];
      expect(a.u + a.w <= b.u || b.u + b.w <= a.u || a.v + a.h <= b.v || b.v + b.h <= a.v).toBe(true);
    }
});

it('stickers avoid sign brackets', () => {
  for (const st of STICKERS)
    for (const sg of SIGNS) {
      const da = Math.abs(Math.atan2(Math.sin(st.angle - sg.facing), Math.cos(st.angle - sg.facing)));
      expect(Math.abs(st.y - sg.y) > 0.12 || da > 0.4).toBe(true);
    }
});

it('stickers stay clear of the clamp bands', () => {
  for (const st of STICKERS)
    for (const sg of SIGNS)
      for (const band of [sg.y + bandOffset(sg), sg.y - bandOffset(sg)])
        expect(Math.abs(st.y - band)).toBeGreaterThan(st.size * st.aspect * 0.5);
});

it('stickers do not overlap each other', () => {
  for (let i = 0; i < STICKERS.length; i++)
    for (let j = i + 1; j < STICKERS.length; j++) {
      const a = STICKERS[i];
      const b = STICKERS[j];
      const arc = Math.abs(Math.atan2(Math.sin(a.angle - b.angle), Math.cos(a.angle - b.angle))) * 0.06;
      const apart = arc > (a.size + b.size) / 2 || Math.abs(a.y - b.y) > (a.size * a.aspect + b.size * b.aspect) / 2;
      expect(apart).toBe(true);
    }
});

it('arc length', () => {
  expect(stickerArc(0.12, 0.06)).toBeCloseTo(2, 6);
});

it('every text sticker found a place on the pole', () => {
  const keys = new Set(STICKERS.map((s) => s.key));
  for (const k of ['statue', 'zustand', 'fabric', 'skia', 'code', 'ship', 'nobugs', 'push', 'ok', 'odesa']) expect(keys.has(k)).toBe(true);
});

it('the statue sticker stands above About’s bills on the side About sees', () => {
  expect(STICKERS[0].key).toBe('statue');
  expect(STICKERS[0]).toBe(EGG);
  expect(EGG.angle).toBeCloseTo(SIGNS.find((s) => s.id === 'about')!.facing, 9);
  // the camera arrives level with the pole at 1.6 m (aboutPole.ts TOP) and sees only ±0.07–0.09 m around it
  expect(Math.abs(EGG.y - 1.6)).toBeLessThan(0.06);
  expect(EGG.text).toBe('</>');
});

it('every sticker lies on the pole’s surface, out of its taper (the pole is 6 % wider at the foot)', () => {
  // Pole.tsx: a cylinder from r·1.06 at the foot to r at the top
  const surface = (y: number) => POLE.radius * (1.06 - (0.06 * y) / POLE.height);
  for (const s of STICKERS) {
    const h = s.size * s.aspect;
    expect(stickerRadius(s)).toBeGreaterThan(surface(s.y - h / 2));
  }
});
