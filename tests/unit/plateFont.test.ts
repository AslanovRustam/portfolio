import { afterEach, expect, it, vi } from 'vitest';
import { plateFontReady } from '@/scene/plateFont';

afterEach(() => vi.unstubAllGlobals());

it('waits for the plate face in the weight a painter uses, for the letters it paints', async () => {
  const load = vi.fn(() => Promise.resolve([]));
  vi.stubGlobal('document', { fonts: { load } });
  await plateFontReady(600, 'WORK');
  expect(load).toHaveBeenCalledWith('600 40px Oswald', 'WORK');
});

it('a face that fails to load lets the painter go on with the fallback', async () => {
  vi.stubGlobal('document', { fonts: { load: () => Promise.reject(new Error('offline')) } });
  await expect(plateFontReady(700, 'STACK')).resolves.toBeUndefined();
});
