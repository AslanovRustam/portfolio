'use client';

import { useExperience } from '@/experience/store';
import WorkTrack from './WorkTrack';
import WorkWall from './WorkWall';

/** Work: the caption and pager for the TV wall, or the card strip when there is no 3D scene. */
export default function WorkSection() {
  const webgl = useExperience((s) => s.webgl);
  return webgl ? <WorkWall /> : <WorkTrack />;
}
