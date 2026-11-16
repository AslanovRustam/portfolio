'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { experienceStore } from '@/experience/store';
import { forcedNoWebGL, supportsWebGL2 } from '@/experience/webgl';
import Fallback from './Fallback';
import Loader from './Loader';
import SceneBoundary from './SceneBoundary';

const Experience = dynamic(() => import('@/scene/Experience'), { ssr: false });

let decision: boolean | null = null;
/** Decided once per page load, on the client: can this browser show the 3D scene? */
const canRender = () => (decision ??= supportsWebGL2() && !forcedNoWebGL(location.search));
const noop = () => () => {};
/** The server cannot know: it renders the loader, never the "needs WebGL2" card. */
const undecided = () => null;

/**
 * Mounts the 3D scene where WebGL2 is available, with the blueprint loader over it; otherwise, when the
 * GPU drops the context, or when the scene throws, the static fallback.
 */
export default function ExperienceGate({
  loaderLabel,
  loaderUnit,
  fallbackTitle,
  fallbackBody,
}: {
  loaderLabel: string;
  loaderUnit: string;
  fallbackTitle: string;
  fallbackBody: string;
}) {
  const webgl = useSyncExternalStore<boolean | null>(noop, canRender, undecided);
  /** the GPU dropped the context or the scene threw: from here on, only the fallback */
  const [lost, setLost] = useState(false);

  useEffect(() => {
    experienceStore.getState().setWebgl(canRender() && !lost);
  }, [lost]);

  // the page's buttons and text come once there is a street to show them over (or the fallback): until then
  // the loader is all there is, so nothing gets pressed half-loaded (globals.css, html:not([data-shown])).
  // A store subscription, not a hook: re-rendering the gate on `ready` would re-render the Canvas and reset
  // the pixel ratio the quality governor set.
  useEffect(() => {
    const show = () => {
      document.documentElement.dataset.shown = '';
    };
    if (webgl === false || lost || experienceStore.getState().ready) return show();
    return experienceStore.subscribe((s) => s.ready && show());
  }, [webgl, lost]);

  const fallback = <Fallback title={fallbackTitle} body={fallbackBody} />;
  if (webgl === null) return <Loader label={loaderLabel} unit={loaderUnit} />;
  if (!webgl || lost) return fallback;
  return (
    <>
      <SceneBoundary fallback={fallback} onError={() => setLost(true)}>
        <Experience onContextLost={() => setLost(true)} />
      </SceneBoundary>
      <Loader label={loaderLabel} unit={loaderUnit} />
    </>
  );
}
