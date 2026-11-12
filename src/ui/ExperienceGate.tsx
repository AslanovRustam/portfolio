'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { experienceStore } from '@/experience/store';
import { forcedNoWebGL, supportsWebGL2 } from '@/experience/webgl';
import Fallback from './Fallback';
import Loader from './Loader';

const Experience = dynamic(() => import('@/scene/Experience'), { ssr: false });

let decision: boolean | null = null;
/** Decided once per page load, on the client: can this browser show the 3D scene? */
const canRender = () => (decision ??= supportsWebGL2() && !forcedNoWebGL(location.search));
const noop = () => () => {};

/**
 * Mounts the 3D scene where WebGL2 is available, with the blueprint loader over it; otherwise, or when
 * the GPU drops the context, the static fallback.
 */
export default function ExperienceGate({
  loaderLabel,
  fallbackTitle,
  fallbackBody,
}: {
  loaderLabel: string;
  fallbackTitle: string;
  fallbackBody: string;
}) {
  const webgl = useSyncExternalStore(noop, canRender, () => false);
  const [lost, setLost] = useState(false);

  useEffect(() => {
    experienceStore.getState().setWebgl(canRender() && !lost);
  }, [lost]);

  if (!webgl || lost) return <Fallback title={fallbackTitle} body={fallbackBody} />;
  return (
    <>
      <Experience onContextLost={() => setLost(true)} />
      <Loader label={loaderLabel} />
    </>
  );
}
