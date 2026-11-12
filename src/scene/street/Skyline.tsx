'use client';

import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, type InstancedMesh, Object3D, ShaderMaterial } from 'three';
import { mulberry32 } from './random';

const PALETTE = ['#ffcf8a', '#ffb36b', '#9fd8ff', '#ff3d6e', '#35e0ff', '#ff7a1a', '#fff1d6'].map((c) => new Color(c));

function layout(seed: number) {
  const rand = mulberry32(seed);
  const blocks: { x: number; z: number; w: number; d: number; h: number }[] = [];
  let x = -60;
  while (x < 60) {
    const w = 5 + rand() * 9;
    if (Math.abs(x + w / 2) > 6) blocks.push({ x: x + w / 2, z: -34 - rand() * 18, w, d: 8, h: 10 + rand() * 30 });
    x += w + 0.5 + rand() * 2;
  }
  // defocused city lights: windows, shop neons, far headlights at street level
  const n = 140;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const size = new Float32Array(n);
  const phase = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const street = rand() < 0.25;
    pos.set([(rand() - 0.5) * 70, street ? 0.4 + rand() * 2.5 : 2 + rand() * 24, -20 - rand() * 34], i * 3);
    const c = PALETTE[Math.floor(rand() * PALETTE.length)];
    col.set([c.r, c.g, c.b], i * 3);
    size[i] = 0.35 + rand() * (street ? 1.1 : 0.7);
    phase[i] = rand() * 6.283;
  }
  return { blocks, bokeh: { pos, col, size, phase } };
}

const bokehVertex = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aPhase;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float dist = -mv.z;
    gl_PointSize = uPixelRatio * aSize * 900.0 / dist;
    vColor = aColor;
    // far lights fade into the night; a slow shimmer keeps the city alive
    vAlpha = (0.55 + 0.45 * sin(uTime * 0.7 + aPhase)) * smoothstep(70.0, 22.0, dist);
  }
`;

const bokehFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    // a lens disc: soft core, slightly brighter rim
    float disc = smoothstep(1.0, 0.82, d);
    float rim = smoothstep(0.7, 0.95, d) * disc * 0.35;
    gl_FragColor = vec4(vColor * (disc * 0.55 + rim), (disc * 0.5 + rim) * vAlpha);
  }
`;

/** Barely-there blocks far away and a defocused field of city lights: depth and bokeh, no clutter. */
export default function Skyline() {
  const { blocks, bokeh } = useMemo(() => layout(7), []);
  const mesh = useRef<InstancedMesh>(null);

  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(bokeh.pos, 3));
    g.setAttribute('aColor', new BufferAttribute(bokeh.col, 3));
    g.setAttribute('aSize', new BufferAttribute(bokeh.size, 1));
    g.setAttribute('aPhase', new BufferAttribute(bokeh.phase, 1));
    return g;
  }, [bokeh]);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: bokehVertex,
        fragmentShader: bokehFragment,
        uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  );

  useLayoutEffect(() => {
    const o = new Object3D();
    blocks.forEach((b, i) => {
      o.position.set(b.x, b.h / 2, b.z);
      o.scale.set(b.w, b.h, b.d);
      o.updateMatrix();
      mesh.current!.setMatrixAt(i, o.matrix);
    });
    mesh.current!.instanceMatrix.needsUpdate = true;
  }, [blocks]);

  const live = useRef(material);
  useFrame((state) => {
    live.current.uniforms.uTime.value = state.clock.elapsedTime;
    live.current.uniforms.uPixelRatio.value = state.gl.getPixelRatio();
  });

  return (
    <group name="Skyline">
      <instancedMesh ref={mesh} args={[undefined, undefined, blocks.length]}>
        <boxGeometry />
        <meshStandardMaterial color="#07080c" roughness={0.95} metalness={0} />
      </instancedMesh>
      <points geometry={geometry} material={material} frustumCulled={false} />
    </group>
  );
}
