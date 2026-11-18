import { LIGHT_Y } from '../pole/lightMount';
import { bandOffset, poleRadiusAt } from '../pole/geometry';
import { POLE, SIGNS } from '@/experience/signs';
import { mulberry32 } from '../street/random';
import { getIcon } from './icons';

export interface StickerDef {
  key: string;
  kind: 'logo' | 'text';
  slug?: string;
  text?: string;
  bg: string;
  fg: string;
  /** centre height on the pole */
  y: number;
  /** around the pole, same convention as SignDef.facing (0 = +z) */
  angle: number;
  /** in-surface roll, radians */
  roll: number;
  /** width in metres */
  size: number;
  /** height / width */
  aspect: number;
  shape: 'circle' | 'rect';
}

/** The stack from the spec (§6.4) as simple-icons slugs; ones simple-icons lacks are dropped, never hand-drawn. */
export const STACK_SLUGS: readonly string[] = [
  'html5',
  'css',
  'sass',
  'tailwindcss',
  'javascript',
  'typescript',
  'react',
  'nextdotjs',
  'redux',
  'mobx',
  'nodedotjs',
  'nestjs',
  'prismic',
  'contentful',
  'sanity',
  'payloadcms',
  'threedotjs',
  'greensock',
  'git',
  'github',
  'gitlab',
  'bitbucket',
  'n8n',
  'claude',
].filter((s) => getIcon(s));

type Spec = Omit<StickerDef, 'y' | 'angle' | 'roll'>;

const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
};

const logoSpec = (slug: string, i: number): Spec => {
  const hex = getIcon(slug)!.hex;
  const dark = luminance(hex) < 0.25;
  return {
    key: slug,
    kind: 'logo',
    slug,
    bg: dark ? '#f2f2ee' : '#141518',
    fg: dark ? '#111214' : hex,
    size: 0.085 + (i % 3) * 0.012,
    aspect: 1,
    shape: i % 4 === 0 ? 'rect' : 'circle',
  };
};

const textSpec = (key: string, text: string, bg: string, fg: string): Spec => ({
  key,
  kind: 'text',
  text,
  bg,
  fg,
  size: 0.15,
  aspect: 0.42,
  shape: 'rect',
});

const SPECS: Spec[] = [
  ...STACK_SLUGS.map(logoSpec),
  // stack without a reliable logo
  textSpec('zustand', 'ZUSTAND', '#4a3426', '#f4e3c3'),
  textSpec('fabric', 'FABRIC.JS', '#f2f2ee', '#111214'),
  textSpec('skia', 'SKIA', '#141518', '#ff5a1f'),
  // decorative
  textSpec('code', '</>', '#ff5a1f', '#111214'),
  textSpec('ship', 'SHIP IT', '#111214', '#ffc21a'),
  textSpec('nobugs', 'NO BUGS*', '#f2f2ee', '#d8262b'),
  textSpec('push', 'git push', '#0b1f38', '#7fe3ff'),
  textSpec('ok', '200 OK', '#141518', '#7fe3ff'),
  textSpec('odesa', 'ODESA', '#ffd400', '#0057b7'),
];

const angDist = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
const Y_MIN = 0.5;
const Y_MAX = LIGHT_Y - 0.6;

/**
 * Rejection-samples every sticker onto the pole surface (seeded, so the pole looks the same on every
 * load): clear of the plates and their clamp bands, under the traffic light, never overlapping.
 */
export function placeStickers(specs: readonly Spec[], seed: number, fixed: readonly StickerDef[] = []): StickerDef[] {
  const rand = mulberry32(seed);
  const placed: StickerDef[] = [...fixed];
  for (const s of specs) {
    const h = s.size * s.aspect;
    for (let attempt = 0; attempt < 2000; attempt++) {
      const y = Y_MIN + h / 2 + rand() * (Y_MAX - Y_MIN - h);
      const angle = rand() * Math.PI * 2;
      const clearOfSigns = SIGNS.every((sg) => {
        const behindPlate = Math.abs(y - sg.y) < sg.height / 2 + h / 2 && angDist(angle, sg.facing) < 0.6;
        const onBand = [sg.y + bandOffset(sg), sg.y - bandOffset(sg)].some((b) => Math.abs(y - b) < h / 2 + 0.03);
        return !behindPlate && !onBand;
      });
      if (!clearOfSigns) continue;
      const clearOfOthers = placed.every(
        (o) =>
          angDist(angle, o.angle) * POLE.radius > (s.size + o.size) / 2 + 0.008 ||
          Math.abs(y - o.y) > (h + o.size * o.aspect) / 2 + 0.008,
      );
      if (!clearOfOthers) continue;
      placed.push({ ...s, y, angle, roll: (rand() - 0.5) * 0.6 });
      break;
    }
  }
  return placed;
}

/** How far a sticker stands off the pole's surface (m). */
export const STICKER_LIFT = 0.0018;

/** The radius a sticker is curved to: the pole's surface at its foot (the widest part it covers), plus the lift. */
export function stickerRadius(s: StickerDef): number {
  return poleRadiusAt(s.y - (s.size * s.aspect) / 2) + STICKER_LIFT;
}

/** The egg's height on the pole: where the camera arrives level with it as About begins (aboutPole.ts TOP). */
export const EGG_Y = 1.62;

/**
 * The secret (M6): a marble sticker with a `</>` cut in it, like the Mentor's tablet. It sits on the side the
 * pole turns to the camera through About (the ABOUT sign's), at the height the camera arrives at, so it shows
 * before the bills come up under it. A click opens the Mentor's showcase.
 */
export const EGG: StickerDef = {
  ...textSpec('statue', '</>', '#e6e1d6', '#3a3a3c'),
  // a logo sticker's width: a text sticker's 0.15 m wraps 140° round the pole and reads as a band up close
  size: 0.1,
  aspect: 0.55,
  y: EGG_Y,
  angle: SIGNS.find((s) => s.id === 'about')!.facing,
  roll: 0,
};

export const STICKERS: readonly StickerDef[] = placeStickers(SPECS, 21, [EGG]);
