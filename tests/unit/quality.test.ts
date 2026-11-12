import { expect, it } from 'vitest';
import {
  createFrameSampler,
  type DeviceProbe,
  forcedNoWebGL,
  pickTier,
  qualityOverride,
  slowDevice,
  stepDown,
  TIER,
} from '@/experience/quality';
import type { Tier } from '@/experience/store';

const desk: DeviceProbe = {
  renderer: 'ANGLE (NVIDIA GeForce RTX 3060)',
  maxTouchPoints: 0,
  minScreenSide: 1080,
  deviceMemory: 16,
  hardwareConcurrency: 12,
};

it('picks tiers', () => {
  expect(pickTier(desk, null)).toBe('high');
  expect(pickTier({ ...desk, renderer: 'ANGLE (Intel(R) Iris(R) Xe Graphics)' }, null)).toBe('medium');
  expect(pickTier({ ...desk, renderer: 'ANGLE (Intel Arc A770)' }, null)).toBe('high');
  expect(pickTier({ ...desk, maxTouchPoints: 5, minScreenSide: 412 }, null)).toBe('low');
  expect(pickTier({ ...desk, renderer: 'Google SwiftShader' }, null)).toBe('low');
  expect(pickTier({ ...desk, hardwareConcurrency: 4 }, null)).toBe('medium');
  expect(pickTier({ ...desk, renderer: 'Google SwiftShader' }, 'high')).toBe('high');
});

it('reads overrides', () => {
  expect(qualityOverride('?quality=low')).toBe('low');
  expect(qualityOverride('?quality=ultra')).toBeNull();
  expect(forcedNoWebGL('?webgl=0')).toBe(true);
  expect(forcedNoWebGL('')).toBe(false);
});

it('steps down and detects slow devices', () => {
  expect((['high', 'medium', 'low'] as Tier[]).map(stepDown)).toEqual(['medium', 'low', 'low']);
  expect(slowDevice(Array(120).fill(16.7))).toBe(false);
  expect(slowDevice(Array(120).fill(30))).toBe(true);
});

it('no tier uses N8AO half-res (its multi-target shim crashes on three 0.187 every frame)', () => {
  for (const t of Object.values(TIER)) expect(t.aoHalfRes).toBe(false);
});

it('never exceeds DPR 1.75', () => {
  for (const t of Object.values(TIER)) expect(t.dpr).toBeLessThanOrEqual(1.75);
});

it('the frame sampler ignores frames until the scene is rendered, then judges once', () => {
  const s = createFrameSampler({ wait: 1, frames: 10 });
  // blueprint frames (not settled) are cheap and must not count
  for (let t = 0; t < 5; t += 0.016) expect(s.push({ now: t, dtMs: 5, settled: false, hidden: false })).toBeNull();
  let verdict: string | null = null;
  let t = 5;
  for (let i = 0; i < 200 && !verdict; i++, t += 0.03) verdict = s.push({ now: t, dtMs: 30, settled: true, hidden: false });
  expect(verdict).toBe('slow');
  expect(s.push({ now: t + 1, dtMs: 30, settled: true, hidden: false })).toBeNull();
});

it('a hidden tab restarts the sample', () => {
  const s = createFrameSampler({ wait: 0, frames: 3 });
  s.push({ now: 0, dtMs: 30, settled: true, hidden: false });
  s.push({ now: 0.1, dtMs: 30, settled: true, hidden: true });
  expect(s.push({ now: 0.2, dtMs: 10, settled: true, hidden: false })).toBeNull();
  expect(s.push({ now: 0.3, dtMs: 10, settled: true, hidden: false })).toBeNull();
  expect(s.push({ now: 0.4, dtMs: 10, settled: true, hidden: false })).toBe('ok');
});
