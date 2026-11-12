'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { AgXToneMapping } from 'three';
import { cameraPose } from '@/experience/choreography';
import { POLE } from '@/experience/signs';
import CameraRig from './CameraRig';
import Lighting from './Lighting';
import Street from './street/Street';
import { useNightEnv } from './env';
import QualityGovernor from './QualityGovernor';
import Ready from './Ready';

const start = cameraPose(0);

function PlaceholderMetal() {
  const env = useNightEnv();
  return <meshStandardMaterial color="#3b3b42" metalness={0.6} roughness={0.4} envMap={env} envMapIntensity={0.35} />;
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
          gl.toneMapping = AgXToneMapping;
        }}
      >
        <color attach="background" args={['#050507']} />
        <QualityGovernor />
        <CameraRig />
        <Ready />
        <Suspense fallback={null}>
          <Lighting />
          <Street />
          {/* placeholder until the pole lands (Task 8) */}
          <mesh position={[0, POLE.height / 2, 0]}>
            <cylinderGeometry args={[POLE.radius, POLE.radius, POLE.height, 32]} />
            <PlaceholderMetal />
          </mesh>
          <pointLight position={[0.6, 3.4, 0.6]} intensity={14} color="#ff7a1a" />
        </Suspense>
      </Canvas>
    </div>
  );
}
