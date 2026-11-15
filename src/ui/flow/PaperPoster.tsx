import Image from 'next/image';
import { tornEdge } from './tornEdge';

/** The same tear on every render and on the server. */
const EDGE = tornEdge(11, 14);

/**
 * Rustam's portrait as a street poster pasted up in About's flow: a neon-duotone print with torn top and
 * bottom edges, two strips of tape, tilted a little. It swings in like the boxes (data-swing on the figure).
 */
export default function PaperPoster({ src, alt }: { src: string; alt: string }) {
  return (
    <figure data-ui className="paper-poster pointer-events-auto">
      <div className="paper-poster-sheet" style={{ clipPath: EDGE }}>
        <Image src={src} alt={alt} width={600} height={800} sizes="300px" className="block h-auto w-full" />
      </div>
      <span aria-hidden="true" className="paper-tape paper-tape-left" />
      <span aria-hidden="true" className="paper-tape paper-tape-right" />
    </figure>
  );
}
