'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Vector3 } from 'three';
import { cameraPose, damp, fitDistance, reducedCameraPose } from '@/experience/choreography';
import { experienceStore } from '@/experience/store';
import { registerProbe } from '@/dev/sceneProbe';

const LAMBDA = 3;

/**
 * Damps the camera toward the choreography's pose for the current scroll progress; on portrait screens
 * it backs off along the same view line (fitDistance) so a whole sign stays in frame.
 */
export default function CameraRig() {
  const camera = useThree((s) => s.camera);
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  const target = useRef(new Vector3(...cameraPose(0).target));

  useEffect(
    () =>
      registerProbe('camera', () => ({
        position: camera.position.toArray(),
        target: target.current.toArray(),
      })),
    [camera],
  );

  useFrame((_, dt) => {
    const { progress, reducedMotion } = experienceStore.getState();
    const pose = reducedMotion ? reducedCameraPose(progress) : cameraPose(progress);
    const fit = fitDistance(aspect);
    for (let i = 0; i < 3; i++) pose.position[i] = pose.target[i] + (pose.position[i] - pose.target[i]) * fit;
    const k = reducedMotion ? Infinity : LAMBDA;
    const p = camera.position;
    p.set(damp(p.x, pose.position[0], k, dt), damp(p.y, pose.position[1], k, dt), damp(p.z, pose.position[2], k, dt));
    const t = target.current;
    t.set(damp(t.x, pose.target[0], k, dt), damp(t.y, pose.target[1], k, dt), damp(t.z, pose.target[2], k, dt));
    camera.lookAt(t);
  });

  return null;
}
