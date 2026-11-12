'use client';

import { useEffect, useMemo } from 'react';
import { BoxGeometry, type BufferGeometry, MeshStandardMaterial, PlaneGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useNightEnv } from '../env';
import { revealUniforms } from '../reveal/registry';
import { applyReveal } from '../reveal/revealMaterial';
import { ROAD } from './layout';

const LENGTH = ROAD.zNear - ROAD.zFar;
const MID_Z = (ROAD.zNear + ROAD.zFar) / 2;
const PAINT_Y = 0.006;

/** Flat road paint as one mesh: edge lines, a dashed centre line and a zebra crossing behind the pole. */
function markings(): BufferGeometry {
  const flat = (w: number, l: number, x: number, z: number) =>
    new PlaneGeometry(w, l).rotateX(-Math.PI / 2).translate(x, PAINT_Y, z);
  const parts: BufferGeometry[] = [];
  const zebraFar = ROAD.zNear - 3.6;
  // edge lines, from the crossing on
  for (const s of [1, -1]) parts.push(flat(0.12, zebraFar - ROAD.zFar, s * (ROAD.half - 0.3), (zebraFar + ROAD.zFar) / 2));
  // dashed centre line: 3 m dashes, 4 m gaps
  for (let z = zebraFar - 1.5; z > ROAD.zFar + 2; z -= 7) parts.push(flat(0.14, 3, 0, z - 1.5));
  // zebra: stripes along the road, across its width
  for (let x = -ROAD.half + 0.55; x < ROAD.half - 0.3; x += 0.9) parts.push(flat(0.5, 3, x, ROAD.zNear - 1.9));
  const g = mergeGeometries(parts)!;
  for (const p of parts) p.dispose();
  return g;
}

/** Kerbs and sidewalks on both sides of the carriageway, running away from the camera. */
function sides(): { kerbs: BufferGeometry; walks: BufferGeometry } {
  const kerb = (s: number) =>
    new BoxGeometry(0.22, ROAD.kerb, LENGTH).translate(s * (ROAD.half + 0.11), ROAD.kerb / 2, MID_Z);
  const walk = (s: number) => {
    const w = ROAD.sidewalk - 0.22;
    return new BoxGeometry(w, ROAD.kerb - 0.01, LENGTH).translate(s * (ROAD.half + 0.22 + w / 2), (ROAD.kerb - 0.01) / 2, MID_Z);
  };
  const k = [kerb(1), kerb(-1)];
  const w = [walk(1), walk(-1)];
  const out = { kerbs: mergeGeometries(k)!, walks: mergeGeometries(w)! };
  for (const g of [...k, ...w]) g.dispose();
  return out;
}

/**
 * The road behind the pole that the lamps line: wet concrete kerbs and pavements, and white road paint
 * (edge lines, a dashed centre line, a zebra crossing by the traffic light) that catches the lamplight.
 * It renders out of the blueprint with the rest of the street.
 */
export default function Road() {
  const env = useNightEnv();
  const u = revealUniforms('street');
  const geo = useMemo(() => ({ paint: markings(), ...sides() }), []);
  const mats = useMemo(
    () => ({
      paint: applyReveal(
        new MeshStandardMaterial({
          // worn paint, wet: light enough to catch the lamps, not a white cartoon stripe
          color: '#9c9c97',
          roughness: 0.38,
          metalness: 0,
          envMap: env,
          envMapIntensity: 0.25,
          polygonOffset: true,
          polygonOffsetFactor: -2,
        }),
        u,
      ),
      kerb: applyReveal(new MeshStandardMaterial({ color: '#3d3e42', roughness: 0.42, envMap: env, envMapIntensity: 0.35 }), u),
      // wet concrete pavement: dark and glossy
      walk: applyReveal(new MeshStandardMaterial({ color: '#18191c', roughness: 0.28, envMap: env, envMapIntensity: 0.45 }), u),
    }),
    [env, u],
  );

  useEffect(
    () => () => {
      for (const g of Object.values(geo)) g.dispose();
      for (const m of Object.values(mats)) m.dispose();
    },
    [geo, mats],
  );

  return (
    <group name="road">
      <mesh geometry={geo.paint} material={mats.paint} renderOrder={1} />
      <mesh geometry={geo.kerbs} material={mats.kerb} />
      <mesh geometry={geo.walks} material={mats.walk} />
    </group>
  );
}
