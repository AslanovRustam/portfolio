import type { CSSProperties, ReactNode } from 'react';
import { tornEdge } from './tornEdge';

/**
 * A paper bill pasted on the pole (About, spec §8): printed paper torn at the top and the bottom, held by
 * two strips of tape, each one tilted its own way. It rides the page scroll over the pole and swings in like
 * the poster (data-swing on the bill).
 */
export default function PaperBill({ children, seed }: { children: ReactNode; seed: number }) {
  // a small tilt of its own, from −1.8° to 1.8°, the same on every render
  const tilt = ((((seed * 37) % 7) + 7) % 7 - 3) * 0.6;
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
