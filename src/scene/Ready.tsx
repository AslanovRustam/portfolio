'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { experienceStore } from '@/experience/store';

const FRAMES = 30;

/** Flags the scene ready once it has drawn a few frames (shaders compiled, textures uploaded). */
export default function Ready() {
  const frames = useRef(0);
  useFrame(() => {
    if (frames.current > FRAMES) return;
    frames.current += 1;
    if (frames.current === FRAMES) experienceStore.getState().setReady(true);
  });
  return null;
}
