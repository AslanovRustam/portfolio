'use client';

import { useExperience } from '@/experience/store';
import SectionPanel from './SectionPanel';
import StackCaption from './StackCaption';

/**
 * Stack: the caption for the green sign the camera stands under, in the lower-left corner beside the
 * gantry (a band along the bottom without the 3D scene, where the caption is all there is).
 */
export default function StackSection() {
  const webgl = useExperience((s) => s.webgl);
  return (
    <SectionPanel id="stack" layout={webgl ? 'sign' : 'bottom'} labelledBy="stack-title">
      <StackCaption />
    </SectionPanel>
  );
}
