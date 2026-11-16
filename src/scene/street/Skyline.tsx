'use client';

import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  type InstancedMesh,
  type MeshStandardMaterial,
  Object3D,
  ShaderMaterial,
} from 'three';
import { globalReveal } from '../reveal/registry';
import { skylineLayout } from './skylineLayout';

const bokehVertex = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uFade;
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
    vAlpha = (0.55 + 0.45 * sin(uTime * 0.7 + aPhase)) * smoothstep(70.0, 22.0, dist) * uFade;
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
  const { blocks, bokeh } = useMemo(() => skylineLayout(7), []);
  const mesh = useRef<InstancedMesh>(null);
  const blockMat = useRef<MeshStandardMaterial>(null);

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
        uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 }, uFade: { value: 0 } },
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
    live.current.uniforms.uFade.value = globalReveal();
    if (blockMat.current) blockMat.current.opacity = globalReveal();
  });

  return (
    <group name="Skyline">
      <instancedMesh ref={mesh} args={[undefined, undefined, blocks.length]}>
        <boxGeometry />
        <meshStandardMaterial ref={blockMat} color="#07080c" roughness={0.95} metalness={0} transparent opacity={0} />
      </instancedMesh>
      <points geometry={geometry} material={material} frustumCulled={false} />
    </group>
  );
}
