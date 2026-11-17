import { expect, it } from 'vitest';
import en from '../../messages/en.json';
import ru from '../../messages/ru.json';
import uk from '../../messages/uk.json';
import { percentFor } from '@/ui/loaderGauge';
import { itemName, logLines } from '@/ui/loaderLog';

it('the percent climbs with the load, never back, and reads 100 only when everything is in', () => {
  let shown = 0;
  for (let loaded = 0; loaded <= 100; loaded += 0.5) {
    const next = percentFor(loaded, shown);
    expect(next).toBeGreaterThanOrEqual(shown);
    expect(Number.isInteger(next)).toBe(true);
    if (loaded < 100) expect(next).toBeLessThan(100);
    shown = next;
  }
  expect(shown).toBe(100);
  // three's loading manager can step back when it finds more to load: the sign does not
  expect(percentFor(40, 63)).toBe(63);
  expect(percentFor(99.9, 0)).toBe(99);
  expect(percentFor(-5, 0)).toBe(0);
  expect(percentFor(140, 0)).toBe(100);
});

it('a loaded file goes into the log by its folder and name', () => {
  expect(itemName('http://localhost:3200/textures/asphalt_03/diffuse.webp')).toBe('asphalt_03/diffuse.webp');
  expect(itemName('/models/tv/television_01/Television_01_2k.gltf')).toBe('television_01/Television_01_2k.gltf');
  expect(itemName('/poster.webp?v=2')).toBe('poster.webp');
  expect(itemName('data:image/png;base64,AAAA')).toBe('data');
});

it('the log: the scene’s percent, the last files in with "ok", one line for what is still loading', () => {
  const items = ['asphalt_03/diffuse.webp', 'asphalt_03/nor_gl.webp', 'rusty_painted_metal/arm.webp', 'television_01/Television_01_2k.gltf'];
  const loading = logLines(items, 64, 5);
  expect(loading).toHaveLength(5);
  expect(loading[0]).toMatch(/^\{ scene \.+ +64%$/);
  // the last three files, in the order they came in
  expect(loading.slice(1, 4).map((l) => l.trim().split(' ')[0])).toEqual([
    'asphalt_03/nor_gl.webp',
    'rusty_painted_metal/arm.webp',
    'television_01/Television_01_2k.gltf',
  ]);
  for (const l of loading.slice(1, 4)) expect(l).toMatch(/^ {2}\S+ \.+ ok$/);
  expect(loading[4]).toBe('  …');
  // the lines line up
  expect(new Set(loading.slice(0, 4).map((l) => l.length)).size).toBe(1);
  // a long name is cut short, not the line
  const long = logLines(['some_very_long_folder_name/and_a_very_long_file_name_too.webp'], 10, 3)[1];
  expect(long.length).toBe(loading[1].length);
  expect(long).toContain('…');
  // at 100 the log closes, and never runs past its lines
  const done = logLines(items, 100, 3);
  expect(done).toHaveLength(3);
  expect(done[2]).toBe('  /');
  expect(logLines([], 0, 3)).toEqual([expect.stringMatching(/^\{ scene \.+ +0%$/), '  …']);
});

it('the sign reads Rendering, Загрузка, Завантаження; the speedometer’s unit is gone', () => {
  expect(en.loader.label).toBe('Rendering');
  expect(ru.loader.label).toBe('Загрузка');
  expect(uk.loader.label).toBe('Завантаження');
  for (const m of [en, ru, uk]) expect(m.loader).not.toHaveProperty('unit');
});
