'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Vector3 } from 'three';
import { activeSection, cameraPose, damp } from '@/experience/choreography';
import { frameShift, sectionPresence } from '@/experience/panels';
import { experienceStore } from '@/experience/store';
import { registerProbe } from '@/dev/sceneProbe';
import { END_FROM } from '@/experience/route';
import { desiredCameraPose } from './cameraPose';

const LAMBDA = 3;
/** how near (m, position and aim together) the damped camera must be to its pose to count as at rest:
 * at the billboard its panel is then within ~1.5 % of its final size on the screen */
const AT_REST = 0.25;
const goal = new Vector3();
/** how quickly the frame slides aside for a section panel */
const SHIFT_LAMBDA = 4;

/**
 * Damps the camera toward the choreography's pose for the current scroll progress; on portrait screens
 * it backs off along the same view line (fitDistance) so a whole sign stays in frame. Through Work it
 * travels along the TV wall instead, at a distance that suits the screen's aspect. While a section
 * panel is up, a view offset slides the rendered frame aside so the panel never covers the active sign.
 */
export default function CameraRig() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const aspect = size.width / Math.max(1, size.height);
  const target = useRef(new Vector3(...cameraPose(0).target));
  const shift = useRef({ x: 0, y: 0 });

  useEffect(
    () =>
      registerProbe('camera', () => ({
        position: camera.position.toArray(),
        target: target.current.toArray(),
      })),
    [camera],
  );
  useEffect(() => registerProbe('viewOffset', () => ({ ...shift.current })), []);

  useFrame((_, dt) => {
    const { progress, reducedMotion } = experienceStore.getState();
    const pose = desiredCameraPose(progress, aspect, reducedMotion);
    const k = reducedMotion ? Infinity : LAMBDA;
    const p = camera.position;
    p.set(damp(p.x, pose.position[0], k, dt), damp(p.y, pose.position[1], k, dt), damp(p.z, pose.position[2], k, dt));
    const t = target.current;
    t.set(damp(t.x, pose.target[0], k, dt), damp(t.y, pose.target[1], k, dt), damp(t.z, pose.target[2], k, dt));
    camera.lookAt(t);
    const lag = p.distanceTo(goal.set(...pose.position)) + t.distanceTo(goal.set(...pose.target));
    // computed against this frame's progress: a jump to the end does not find a camera "at rest" from before it
    const atBillboard = lag < AT_REST && progress >= END_FROM;
    if (atBillboard !== experienceStore.getState().cameraAtBillboard) experienceStore.getState().setCameraAtBillboard(atBillboard);

    const section = activeSection(progress);
    const want = frameShift(section, section ? sectionPresence(progress, section) : 0, {
      w: size.width,
      h: size.height,
    });
    const sk = reducedMotion ? Infinity : SHIFT_LAMBDA;
    const sh = shift.current;
    sh.x = damp(sh.x, want.x, sk, dt);
    sh.y = damp(sh.y, want.y, sk, dt);
    if (Math.abs(sh.x) < 1e-4 && Math.abs(sh.y) < 1e-4) {
      sh.x = 0;
      sh.y = 0;
      if (camera.view?.enabled) camera.clearViewOffset();
    } else {
      const { width: w, height: h } = size;
      camera.setViewOffset(w, h, -sh.x * w, sh.y * h, w, h);
    }
  });

  return null;
}
