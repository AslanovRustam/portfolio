'use client';

import { useEffect, useRef } from 'react';

/**
 * On touch screens, where the browser hides the scrollbar: a thin glowing tube down the right edge that
 * grows with how far down the page the visitor is. It only shows; it never takes a touch.
 */
export default function ProgressTube() {
  const tube = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - innerHeight;
      if (tube.current) tube.current.style.transform = `scaleY(${max > 0 ? Math.min(1, Math.max(0.02, scrollY / max)) : 0.02})`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onScroll);
    };
  }, []);
  return <div ref={tube} aria-hidden="true" className="progress-tube" />;
}
