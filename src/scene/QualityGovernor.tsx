'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { createFrameSampler, type DeviceProbe, dprFor, pickTier, qualityOverride, stepDown } from '@/experience/quality';
import { experienceStore, type Tier, useExperience } from '@/experience/store';
import { registerProbe } from '@/dev/sceneProbe';
import { globalReveal } from './reveal/registry';

/** The one runtime step down: `wait` s after the scene is rendered, over `frames` frame times. */
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
  const sampler = useRef(createFrameSampler(SAMPLE));
  const off = useRef(false);

  useLayoutEffect(() => {
    chosen.current = qualityOverride(location.search);
    if (navigator.webdriver) off.current = true;
    experienceStore.getState().setTier(pickTier(probe(gl.getContext()), chosen.current));
  }, [gl]);

  // the tier's pixel ratio, lower through the intro on medium (dprFor); set only when it changes
  useEffect(() => {
    let applied = 0;
    const apply = () => {
      const dpr = dprFor(tier, experienceStore.getState().progress);
      if (dpr === applied) return;
      applied = dpr;
      setDpr(dpr);
    };
    apply();
    return experienceStore.subscribe(apply);
  }, [tier, setDpr]);
  useEffect(() => registerProbe('dpr', () => gl.getPixelRatio()), [gl]);
  useEffect(() => registerProbe('gpuTextures', () => gl.info.memory.textures), [gl]);

  useFrame((state, delta) => {
    if (off.current || chosen.current) return;
    const verdict = sampler.current.push({
      now: state.clock.elapsedTime,
      dtMs: delta * 1000,
      // judge the rendered street, not the cheap blueprint the visitor may still be looking at
      settled: experienceStore.getState().ready && globalReveal() >= 1,
      hidden: document.hidden,
    });
    if (verdict === 'slow') {
      const s = experienceStore.getState();
      s.setTier(stepDown(s.tier));
    }
  });

  return null;
}
