'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { experienceStore } from '@/experience/store';

const FRAMES = 30;

/**
 * Mounted inside the scene's Suspense, after everything else: compiles every material's shader up
 * front (compileAsync), so the first turn to a new sign never stalls on a D3D/GL compile, then flags
 * the scene ready once it has drawn a few frames.
 */
export default function Ready() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const compiled = useRef(false);
  const frames = useRef(0);

  useEffect(() => {
    let alive = true;
    gl.compileAsync(scene, camera).then(
      () => {
        if (alive) compiled.current = true;
      },
      () => {
        if (alive) compiled.current = true;
      },
    );
    return () => {
      alive = false;
    };
  }, [gl, scene, camera]);

  useFrame(() => {
    if (!compiled.current || frames.current > FRAMES) return;
    frames.current += 1;
    if (frames.current === FRAMES) experienceStore.getState().setReady(true);
  });
  return null;
}
