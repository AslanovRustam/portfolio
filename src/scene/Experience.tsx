'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { NeutralToneMapping } from 'three';
import { cameraPose } from '@/experience/choreography';
import { useExperience } from '@/experience/store';
import CameraRig from './CameraRig';
import Lighting from './Lighting';
import Street from './street/Street';
import Pole from './pole/Pole';
import QualityGovernor from './QualityGovernor';
import { PerfPanel, PerfProbe } from './DebugPerf';
import Effects from './Effects';
import Ready from './Ready';
import Blueprint from './reveal/Blueprint';
import RevealDriver from './reveal/RevealDriver';
import PoleStickers from './stickers/PoleStickers';

const start = cameraPose(0);

/** The drawing only exists for the animated intro; reduced motion starts on the finished street. */
function BlueprintUnlessReduced() {
  const reduced = useExperience((s) => s.reducedMotion);
  return reduced ? null : <Blueprint />;
}

/**
 * The fixed, full-screen 3D layer. It never takes pointer events itself: R3F listens on the
 * document (eventSource) so page scroll and touch work everywhere while signs stay clickable.
 */
export default function Experience() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
      <Canvas
        eventSource={document.body}
        eventPrefix="client"
        camera={{ fov: 35, near: 0.1, far: 120, position: start.position }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        dpr={1}
        onCreated={({ gl }) => {
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
          <BlueprintUnlessReduced />
          <Pole>
            <PoleStickers />
          </Pole>
          <Ready />
          <Effects />
        </Suspense>
      </Canvas>
      <PerfPanel />
    </div>
  );
}
