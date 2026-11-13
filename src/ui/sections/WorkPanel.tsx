'use client';

import { useExperience } from '@/experience/store';
import SectionPanel from './SectionPanel';

/** The Work board: a caption in the corner beside the TV wall, or a band along the bottom for the card strip. */
export default function WorkPanel({ children }: { children: React.ReactNode }) {
  const webgl = useExperience((s) => s.webgl);
  return (
    <SectionPanel id="work" layout={webgl ? 'caption' : 'bottom'} labelledBy="work-title">
      {children}
    </SectionPanel>
  );
}
