import type { ReactNode } from 'react';
import type { HoldId } from '@/experience/journey';

/**
 * A section whose text rides the page scroll: one piece of #journey. Its first box enters from below as
 * the pole finishes turning to the section's sign, and the last one has gone under the header before the
 * next turn starts; the piece is as tall as that ride, so a longer text simply makes a longer section.
 * Contact, the last piece, ends with its last box resting low on the screen instead of leaving.
 */
export default function SectionFlow({
  id,
  labelledBy,
  wide = false,
  children,
}: {
  id: HoldId;
  labelledBy: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      data-section={id}
      data-piece={id}
      data-last={id === 'contact' ? '' : undefined}
      aria-labelledby={labelledBy}
      className="flow-piece pointer-events-none"
    >
      <div data-flow className={wide ? 'flow-wide' : undefined}>
        {children}
      </div>
    </section>
  );
}
