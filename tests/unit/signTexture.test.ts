import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { STACK } from '@/content/stack';
import { layoutSign, SIGN_TEXTURE } from '@/scene/stack/signTexture';

/** A stand-in for canvas measureText: a bold sans averages a little over half its size per character. */
const measure = (text: string, px: number) => text.length * px * 0.6;

const titles = (locale: string) =>
  (JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8')) as { stack: { groups: Record<string, string> } }).stack.groups;

it('every category fits its sign in every language: one line each, at a readable size', () => {
  for (const locale of ['en', 'ru', 'uk'])
    for (const group of STACK) {
      const sign = { title: titles(locale)[group.key], items: group.items.map((i) => ({ label: i.label, icon: i.sticker })) };
      const l = layoutSign(sign, SIGN_TEXTURE, measure);
      expect(l.overflow, `${locale} ${group.key}`).toBe(false);
      expect(l.itemPx, `${locale} ${group.key}`).toBeGreaterThanOrEqual(18 * (SIGN_TEXTURE.w / 1024));
      expect(l.titlePx).toBeGreaterThanOrEqual(l.itemPx);
      // every line inside the sign
      for (const line of l.lines) {
        expect(line.x).toBeGreaterThanOrEqual(0);
        expect(line.x + line.width).toBeLessThanOrEqual(SIGN_TEXTURE.w);
        expect(line.y).toBeLessThanOrEqual(SIGN_TEXTURE.h);
      }
    }
});

it('the busiest category (Front-end, eight items) lays out in two columns', () => {
  const front = STACK.find((g) => g.key === 'frontend')!;
  const l = layoutSign({ title: 'Front-end', items: front.items.map((i) => ({ label: i.label, icon: i.sticker })) }, SIGN_TEXTURE, measure);
  expect(front.items.length).toBe(8);
  expect(l.columns).toBe(2);
  expect(l.lines.filter((x) => x.kind === 'item')).toHaveLength(8);
});
