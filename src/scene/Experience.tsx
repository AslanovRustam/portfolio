'use client';

import { useProgress } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Suspense, useEffect } from 'react';
import { NeutralToneMapping } from 'three';
import { cameraPose } from '@/experience/choreography';
import { experienceStore, useExperience } from '@/experience/store';
import CameraRig from './CameraRig';
import Lighting from './Lighting';
import Shop from './shop/Shop';
import Gantry from './stack/Gantry';
import Street from './street/Street';
import Pole from './pole/Pole';
import QualityGovernor from './QualityGovernor';
import { PerfPanel, PerfProbe } from './DebugPerf';
import Effects from './Effects';
import Ready from './Ready';
import Blueprint from './reveal/Blueprint';
import RevealDriver from './reveal/RevealDriver';
import PoleStickers from './stickers/PoleStickers';
import TvWall, { WallBoundary } from './tvwall/TvWall';

const start = cameraPose(0);

/** The drawing only exists for the animated intro; reduced motion starts on the finished street. */
function BlueprintUnlessReduced() {
  const reduced = useExperience((s) => s.reducedMotion);
  return reduced ? null : <Blueprint />;
}

/** Feeds three's loading manager progress to the DOM loader. */
function LoadProgress() {
  const { progress } = useProgress();
  useEffect(() => experienceStore.getState().setLoadProgress(progress), [progress]);
  return null;
}

/**
 * The fixed, full-screen 3D layer. It never takes pointer events itself: R3F listens on the
 * document (eventSource) so page scroll and touch work everywhere while signs stay clickable.
 */
export default function Experience({ onContextLost }: { onContextLost?: () => void }) {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
      <Canvas
        eventSource={document.body}
        eventPrefix="client"
        camera={{ fov: 35, near: 0.1, far: 120, position: start.position }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        dpr={1}
        onCreated={({ gl }) => {
          // a GPU reset or too many tabs: hand over to the static fallback instead of a frozen canvas
          gl.domElement.addEventListener('webglcontextlost', () => onContextLost?.(), { once: true });
          // Khronos PBR Neutral keeps the neon saturated (AgX washed reds/oranges into pastel); while the
          // EffectComposer runs it takes tone mapping over (Effects.tsx uses the same Neutral curve)
          gl.toneMapping = NeutralToneMapping;
        }}
      >
        <color attach="background" args={['#050507']} />
        <QualityGovernor />
        <CameraRig />
        <RevealDriver />
        <PerfProbe />
        <Suspense fallback={null}>
          <Lighting />
          <Street />
          <Shop />
          <Gantry />
          <BlueprintUnlessReduced />
          <Pole>
            <PoleStickers />
          </Pole>
          <Ready />
          <Effects />
        </Suspense>
        {/* the wall loads on its own: it never holds up the first frames, and a failed load only loses it */}
        <WallBoundary>
          <Suspense fallback={null}>
            <TvWall />
          </Suspense>
        </WallBoundary>
      </Canvas>
      <PerfPanel />
      <LoadProgress />
    </div>
  );
}
