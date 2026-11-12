'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { type BufferGeometry, EdgesGeometry, LineBasicMaterial, type LineSegments } from 'three';
import { applyReveal } from './revealMaterial';
import { revealUniforms } from './registry';

const BLUEPRINT_LINE = '#7fe3ff';

/**
 * The blueprint wireframe of one mesh: its hard edges as glowing cyan lines that exist only where the
 * render front has not passed yet, so the front visibly "eats" the drawing as the part renders.
 */
export default function EdgesOverlay({
  geometry,
  part,
  threshold = 40,
}: {
  geometry: BufferGeometry;
  part: string;
  threshold?: number;
}) {
  const u = revealUniforms(part);
  const edges = useMemo(() => new EdgesGeometry(geometry, threshold), [geometry, threshold]);
  const material = useMemo(
    () =>
      applyReveal(
        new LineBasicMaterial({ color: BLUEPRINT_LINE, transparent: true, opacity: 0.9, toneMapped: false }),
        u,
        true,
      ),
    [u],
  );
  const line = useRef<LineSegments>(null);

  useEffect(
    () => () => {
      edges.dispose();
      material.dispose();
    },
    [edges, material],
  );

  // nothing left to draw once the part is rendered: skip the draw call entirely
  useFrame(() => {
    if (line.current) line.current.visible = u.uReveal.value < 0.999;
  });

  return <lineSegments ref={line} geometry={edges} material={material} />;
}
