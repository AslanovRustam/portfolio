'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { registerProbe } from '@/dev/sceneProbe';
import { experienceStore } from '@/experience/store';

/** Live numbers written by PerfProbe (inside the canvas) and read by PerfPanel (DOM). */
const stats = { fps: 0, ms: 0, calls: 0, triangles: 0, dpr: 1 };
const win = { t: 0, n: 0 };
const noop = () => () => {};

function useDebugFlag() {
  return useSyncExternalStore(
    noop,
    () => new URLSearchParams(location.search).has('debug'),
    () => false,
  );
}

/** Inside the Canvas: frame rate over half-second windows and the renderer's draw stats. */
export function PerfProbe() {
  const debug = useDebugFlag();
  // look-dev and perf captures (tests/e2e/_scratch) switch parts of the live scene off through this
  const { scene, gl } = useThree();
  useEffect(() => registerProbe('three', () => ({ scene, gl })), [scene, gl]);
  useFrame((state, dt) => {
    if (!debug) return;
    win.t += dt;
    win.n += 1;
    if (win.t >= 0.5) {
      stats.fps = Math.round(win.n / win.t);
      stats.ms = +((win.t / win.n) * 1000).toFixed(1);
      win.t = 0;
      win.n = 0;
    }
    stats.calls = state.gl.info.render.calls;
    stats.triangles = state.gl.info.render.triangles;
    stats.dpr = state.gl.getPixelRatio();
  });
  return null;
}

/** `?debug`: a small FPS / frame-time / draw-call panel over the scene (own code, no dependency). */
export function PerfPanel() {
  const debug = useDebugFlag();
  const [, tick] = useState(0);
  useEffect(() => {
    if (!debug) return;
    const id = setInterval(() => tick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [debug]);
  if (!debug) return null;
  return (
    <div className="perf-panel fixed left-2 top-2 z-50 rounded bg-black/70 px-3 py-2 font-mono text-[11px] leading-4 text-[#7fe3ff]">
      <div>{stats.fps} fps · {stats.ms} ms</div>
      <div>{stats.calls} calls · {(stats.triangles / 1000).toFixed(1)}k tris</div>
      <div>tier {experienceStore.getState().tier} · dpr {stats.dpr}</div>
    </div>
  );
}
