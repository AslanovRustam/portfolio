import { expect, it } from 'vitest';
import {
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
