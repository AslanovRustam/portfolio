import type { CSSProperties, ReactNode } from 'react';
import { billTilt, tornEdge } from './tornEdge';

/**
 * A paper bill pasted on the pole (About, spec §8): printed paper torn at the top and the bottom, held by
 * two strips of tape, each one tilted its own way. It rides the page's scroll, and the camera goes down the
 * pole with it, so it stays pasted on the pole (M4 round 1).
 */
export default function PaperBill({ children, seed }: { children: ReactNode; seed: number }) {
  const tilt = billTilt(seed);
  return (
    <div data-ui className="paper-bill pointer-events-auto" style={{ '--tilt': `${tilt}deg` } as CSSProperties}>
      <div className="paper-bill-sheet" style={{ clipPath: tornEdge(seed, 18) }}>
        {children}
      </div>
      <span aria-hidden="true" className="paper-tape paper-tape-left" />
      <span aria-hidden="true" className="paper-tape paper-tape-right" />
    </div>
  );
}
