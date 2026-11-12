'use client';

import dynamic from 'next/dynamic';
import { useEffect, useSyncExternalStore } from 'react';
import { experienceStore } from '@/experience/store';
import { forcedNoWebGL, supportsWebGL2 } from '@/experience/webgl';

const Experience = dynamic(() => import('@/scene/Experience'), { ssr: false });

let decision: boolean | null = null;
/** Decided once per page load, on the client: can this browser show the 3D scene? */
const canRender = () => (decision ??= supportsWebGL2() && !forcedNoWebGL(location.search));
const noop = () => () => {};

/** Mounts the 3D scene only where WebGL2 is available (the fallback UI arrives with the content). */
export default function ExperienceGate() {
  const webgl = useSyncExternalStore(noop, canRender, () => false);

  useEffect(() => {
    experienceStore.getState().setWebgl(canRender());
  }, []);

  return webgl ? <Experience /> : null;
}
