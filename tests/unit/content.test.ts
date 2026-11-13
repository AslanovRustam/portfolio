import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { PROJECTS } from '@/content/projects';
import { STACK } from '@/content/stack';
import { STICKERS } from '@/scene/stickers/stickers';
import en from '../../messages/en.json';
import ru from '../../messages/ru.json';
import uk from '../../messages/uk.json';

const get = (o: unknown, path: string) =>
  path.split('.').reduce<unknown>((a, k) => (a as Record<string, unknown>)?.[k], o);

it('projects: unique slugs, spec order, four featured first', () => {
  expect(PROJECTS.map((p) => p.slug)).toEqual([
    'gipper',
    'aslanair',
    'gengo',
    'moto',
    'altus',
    'aslan-can',
    'kolir',
    'tuti',
    'devdigest',
  ]);
  expect(PROJECTS.filter((p) => p.featured).map((p) => p.slug)).toEqual(['gipper', 'aslanair', 'gengo', 'moto']);
  expect(PROJECTS.find((p) => p.slug === 'devdigest')!.badge).toBe('course');
});

it('every project has its copy in every locale, within the limits', () => {
  for (const m of [en, ru, uk])
    for (const p of PROJECTS) {
      const keys = ['title', 'kind', 'summary', ...(p.featured ? ['problem', 'did', 'result'] : [])];
      for (const k of keys) expect(String(get(m, `projects.${p.slug}.${k}`) ?? '').trim()).not.toBe('');
      expect(String(get(m, `projects.${p.slug}.summary`)).length).toBeLessThanOrEqual(160);
    }
});

it('links are https and stack stickers exist on the pole', () => {
  for (const p of PROJECTS) for (const url of Object.values(p.links)) expect(url).toMatch(/^https:\/\//);
  const keys = new Set(STICKERS.map((s) => s.key));
  for (const g of STACK) for (const i of g.items) if (i.sticker) expect(keys.has(i.sticker)).toBe(true);
});

it('every poster file exists and stays small; the CV is there', () => {
  for (const p of PROJECTS.filter((x) => x.poster)) {
    const f = join('public', p.poster!);
    expect(existsSync(f), f).toBe(true);
    expect(statSync(f).size).toBeLessThanOrEqual(200 * 1024);
  }
  expect(existsSync('public/cv/rustam-aslanov-cv.pdf')).toBe(true);
});
