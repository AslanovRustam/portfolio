import type { ReactNode } from 'react';
import { type NeonId, neonStyle } from '../neon';

/**
 * One neon box of a section's text: dark glass ringed by a tube in the section's colour. Boxes take the
 * pointer (data-ui); the space around them in a section lets it through to the street.
 */
export default function NeonBox({ id, className = '', children }: { id: NeonId; className?: string; children: ReactNode }) {
  return (
    <div data-ui className={`nbox pointer-events-auto px-5 py-5 sm:px-6 ${className}`} style={neonStyle(id)}>
      {children}
    </div>
  );
}
