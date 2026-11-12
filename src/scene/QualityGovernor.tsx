'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { type DeviceProbe, pickTier, qualityOverride, slowDevice, stepDown, TIER } from '@/experience/quality';
import { experienceStore, type Tier, useExperience } from '@/experience/store';
import { registerProbe } from '@/dev/sceneProbe';

/** The one runtime step down: `wait` s after the scene is ready, over `frames` frame times. */
const SAMPLE = { wait: 3, frames: 120 };

function probe(gl: WebGLRenderingContext | WebGL2RenderingContext): DeviceProbe {
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    renderer: String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER)),
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    minScreenSide: Math.min(screen.width, screen.height),
    deviceMemory: nav.deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency ?? 4,
  };
}

/**
 * Picks the device's quality tier before anything is drawn and applies its pixel ratio. Once the
 * scene is ready it watches frame times and steps down a tier, once, if the device is slower than
 * its probe said — unless `?quality=` chose, or a test drives the browser (shared GPU, not the device's).
 */
export default function QualityGovernor() {
  const gl = useThree((s) => s.gl);
  const setDpr = useThree((s) => s.setDpr);
  const tier = useExperience((s) => s.tier);
  const chosen = useRef<Tier | null>(null);
  const watch = useRef<{ since: number | null; times: number[]; done: boolean }>({ since: null, times: [], done: false });

  useLayoutEffect(() => {
    chosen.current = qualityOverride(location.search);
    if (navigator.webdriver) watch.current.done = true;
    experienceStore.getState().setTier(pickTier(probe(gl.getContext()), chosen.current));
  }, [gl]);

  useEffect(() => setDpr(TIER[tier].dpr), [tier, setDpr]);
  useEffect(() => registerProbe('dpr', () => gl.getPixelRatio()), [gl]);

  useFrame((state, delta) => {
    const w = watch.current;
    if (w.done || chosen.current || !experienceStore.getState().ready) return;
    // a hidden tab's frames are throttled, not slow: start the count again when it comes back
    if (document.hidden) {
      w.since = null;
      w.times.length = 0;
      return;
    }
    w.since ??= state.clock.elapsedTime;
    if (state.clock.elapsedTime - w.since < SAMPLE.wait) return;
    w.times.push(delta * 1000);
    if (w.times.length < SAMPLE.frames) return;
    w.done = true;
    if (slowDevice(w.times)) {
      const s = experienceStore.getState();
      s.setTier(stepDown(s.tier));
    }
  });

  return null;
}
