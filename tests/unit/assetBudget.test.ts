import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';

const size = (d: string): number =>
  readdirSync(d).reduce((s, f) => {
    const p = join(d, f);
    const st = statSync(p);
    return s + (st.isDirectory() ? size(p) : st.size);
  }, 0);

it('3D assets stay within 6 MB', () => {
  const total = ['public/hdri', 'public/textures', 'public/fonts', 'public/models'].reduce((s, d) => s + size(d), 0);
  expect(total).toBeGreaterThan(0);
  expect(total).toBeLessThanOrEqual(6 * 1024 * 1024);
});
