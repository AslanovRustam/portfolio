'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Vector3 } from 'three';
import { activeSection, cameraPose, damp } from '@/experience/choreography';
import { frameShift, sectionPresence } from '@/experience/panels';
import { experienceStore } from '@/experience/store';
import { registerProbe } from '@/dev/sceneProbe';
import { END_FROM } from '@/experience/route';
import { landing, landingArmed, landingPose, planPose } from '@/experience/landing';
import { cameraLambdas, desiredCameraPose } from './cameraPose';

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
  const target = useRef(new Vector3(...cameraPose(0).target));
  const shift = useRef({ x: 0, y: 0 });
  /** the landing's clock (ms): frame time capped at 50 ms, so a stalled frame pauses the move, never skips it */
  const clock = useRef(0);

  useEffect(
    () =>
      registerProbe('camera', () => ({
        position: camera.position.toArray(),
        target: target.current.toArray(),
      })),
    [camera],
  );
  useEffect(() => registerProbe('viewOffset', () => ({ ...shift.current })), []);

  // the landing (landing.ts): from the top of a fresh page the camera waits high over the floor while the
  // loader is up, and cranes down once the scene is ready; a scene that is already shown (a language
  // switch mounts a new one) never lands
  useEffect(() => {
    const store = experienceStore.getState();
    const armed =
      !store.ready &&
      landingArmed({
        reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
        hash: location.hash,
        scrollY: scrollY,
        webgl: true,
      });
    if (armed) landing.arm();
    // (arm() takes once per page load: a scene mounted by a language switch stays where it is)
    if (landing.phase === 'armed') {
      const plan = planPose(innerHeight);
      camera.position.set(...plan.position);
      target.current.set(...plan.target);
      camera.lookAt(target.current);
    }
    const unprobe = registerProbe('landing', () => ({ phase: landing.phase }));
    const go = () => landing.start(clock.current);
    if (store.ready) go();
    const off = experienceStore.subscribe((s) => s.ready && go());
    return () => {
      off();
      unprobe();
    };
  }, [camera]);

  useFrame((_, dt) => {
    const { progress, reducedMotion } = experienceStore.getState();
    const pose = desiredCameraPose(progress, { w: size.width, h: size.height }, reducedMotion);
    clock.current += Math.min(dt, 0.05) * 1000;
    const now = clock.current;
    // the visitor's own scroll hurries the landing to its end, towards the pose that scroll asks for (a
    // hand-over to the damping from high above would leap); before the scene is ready it just stops it
    if (progress >= 0.001) {
      if (landing.phase === 'armed') landing.cancel();
      else landing.hurry(now);
    }
    const lt = landing.progress(now);
    if (lt !== null) {
      const l = landingPose(lt, planPose(size.height), pose);
      camera.position.set(...l.position);
      target.current.set(...l.target);
      camera.lookAt(target.current);
      return;
    }
    // in About's hold the camera follows the scroll exactly: the bills ride the page, the pole must keep up
    const { xz: k, y: ky } = cameraLambdas(progress, reducedMotion);
    const p = camera.position;
    p.set(damp(p.x, pose.position[0], k, dt), damp(p.y, pose.position[1], ky, dt), damp(p.z, pose.position[2], k, dt));
    const t = target.current;
    t.set(damp(t.x, pose.target[0], k, dt), damp(t.y, pose.target[1], ky, dt), damp(t.z, pose.target[2], k, dt));
    camera.lookAt(t);
    const lag = p.distanceTo(goal.set(...pose.position)) + t.distanceTo(goal.set(...pose.target));
    // computed against this frame's progress: a jump to the end does not find a camera "at rest" from before
    // it; once there it holds while the scroll stays at the billboard (a dive into its screen moves the camera)
    const atBillboard = progress >= END_FROM && (experienceStore.getState().cameraAtBillboard || lag < AT_REST);
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
