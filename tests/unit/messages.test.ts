import { expect, it } from 'vitest';
import en from '../../messages/en.json';
import ru from '../../messages/ru.json';
import uk from '../../messages/uk.json';

const keys = (o: object, p = ''): string[] =>
  Object.entries(o)
    .flatMap(([k, v]) => (typeof v === 'object' && v !== null ? keys(v, `${p}${k}.`) : [`${p}${k}`]))
    .sort();
const values = (o: object): unknown[] =>
  Object.values(o).flatMap((v) => (typeof v === 'object' && v !== null ? values(v) : [v]));

it('ru and uk have exactly the en keys', () => {
  expect(keys(ru)).toEqual(keys(en));
  expect(keys(uk)).toEqual(keys(en));
});

it('no message is empty', () => {
  for (const m of [en, ru, uk]) for (const v of values(m)) expect(String(v).trim()).not.toBe('');
});

it('meta.name is the name meta.title starts with, and meta.role what follows it', () => {
  for (const m of [en, ru, uk]) expect(m.meta.title).toBe(`${m.meta.name} — ${m.meta.role}`);
});
