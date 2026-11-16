import { cameraPose, fitDistance, type Pose, reducedCameraPose } from '@/experience/choreography';
import { onWall } from './tvwall/camera';

/**
 * Where the camera should be for story progress p on a screen of this aspect: the ride's pose (or the
 * section's still pose under reduced motion), backed off along its view line on narrow screens, and in Work
 * in front of the TVs. CameraRig damps towards it; the riding pole places itself against it.
 */
export function desiredCameraPose(p: number, aspect: number, reduced: boolean): Pose {
  const base = reduced ? reducedCameraPose(p) : cameraPose(p);
  const fit = fitDistance(aspect);
  for (let i = 0; i < 3; i++) base.position[i] = base.target[i] + (base.position[i] - base.target[i]) * fit;
  return onWall(p, base, aspect, reduced);
}
