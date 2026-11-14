import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { flicker, NEON, neonStyle } from '@/ui/neon';

const period = (i: number) => parseFloat(String((flicker(i) as Record<string, string>)['--flicker-period']));

it('each sign has its tube colour; Contact is raspberry, the name pink', () => {
  expect(NEON).toMatchObject({
    work: '#ff8a2a',
    about: '#5fe1ff',
    stack: '#ff3448',
    contact: '#ff45b5',
    cv: '#3dff8f',
    name: '#ff4fb0',
    lang: '#c9d6ff',
    blueprint: '#7fe3ff',
  });
  expect(neonStyle('stack')).toEqual({ '--c': '#ff3448' });
});

it('flicker periods sit between 8 and 16 s, are deterministic, and neighbours differ', () => {
  for (let i = 0; i < 12; i++) {
    expect(period(i)).toBeGreaterThanOrEqual(8);
    expect(period(i)).toBeLessThanOrEqual(16);
    expect(flicker(i)).toEqual(flicker(i));
  }
  for (let i = 0; i < 8; i++) expect(flicker(i)).not.toEqual(flicker(i + 1));
});

it('a flicker burst drops at most three times', () => {
  const css = readFileSync('src/app/globals.css', 'utf8');
  const block = /@keyframes neon-buzz\s*{([\s\S]*?)\n {0,2}}/.exec(css);
  expect(block).not.toBeNull();
  expect((block![1].match(/opacity:\s*0?\.\d/g) ?? []).length).toBeLessThanOrEqual(3);
});

it('the name dips a word or a letter at most twice at a time', () => {
  const css = readFileSync('src/app/globals.css', 'utf8');
  for (const name of ['neon-word', 'neon-letter']) {
    const block = new RegExp(String.raw`@keyframes ${name}\s*{([\s\S]*?)\n {0,2}}`).exec(css);
    expect(block, name).not.toBeNull();
    expect((block![1].match(/opacity:\s*0?\.\d/g) ?? []).length, name).toBeLessThanOrEqual(2);
  }
});
