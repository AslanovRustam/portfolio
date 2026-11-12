'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { AdditiveBlending, BufferAttribute, BufferGeometry, ShaderMaterial } from 'three';
import { TIER } from '@/experience/quality';
import { useExperience } from '@/experience/store';
import { globalReveal } from '../reveal/registry';
import { mulberry32 } from './random';

const BOX = { x: 24, y: 11, zNear: 7, zFar: -26 };
const DROP = 0.32;

const vertex = /* glsl */ `
  uniform float uTime;
  attribute float aSpeed;
  attribute float aEnd;
  varying float vEnd;
  varying float vFade;
  void main() {
    vec3 p = position;
    float y = mod(p.y - uTime * aSpeed, ${BOX.y.toFixed(1)});
    p.y = y - aEnd * ${DROP.toFixed(2)};
    p.x += aEnd * 0.03;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vEnd = aEnd;
    vFade = smoothstep(0.0, 0.8, y) * smoothstep(${BOX.y.toFixed(1)}, ${(BOX.y - 2).toFixed(1)}, y) * smoothstep(40.0, 4.0, -mv.z);
  }
`;

const fragment = /* glsl */ `
  uniform float uFade;
  varying float vEnd;
  varying float vFade;
  void main() {
    // brighter head, fading tail: reads as a streak of falling water
    float a = mix(0.32, 0.04, vEnd) * vFade * uFade;
    gl_FragColor = vec4(0.78, 0.86, 1.0, a);
  }
`;

/** Light rain: short falling streaks, animated entirely on the GPU; count follows the quality tier. */
export default function Rain() {
  const count = useExperience((s) => TIER[s.tier].particles * 2);
  const geometry = useMemo(() => {
    const rand = mulberry32(9);
    const pos = new Float32Array(count * 6);
    const speed = new Float32Array(count * 2);
    const end = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      const x = (rand() - 0.5) * BOX.x;
      const y = rand() * BOX.y;
      const z = BOX.zFar + rand() * (BOX.zNear - BOX.zFar);
      const s = 7 + rand() * 4;
      pos.set([x, y, z, x, y, z], i * 6);
      speed.set([s, s], i * 2);
      end.set([0, 1], i * 2);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(pos, 3));
    g.setAttribute('aSpeed', new BufferAttribute(speed, 1));
    g.setAttribute('aEnd', new BufferAttribute(end, 1));
    return g;
  }, [count]);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: { uTime: { value: 0 }, uFade: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  );
  const live = useRef(material);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame((state) => {
    live.current.uniforms.uTime.value = state.clock.elapsedTime;
    live.current.uniforms.uFade.value = globalReveal();
  });

  return <lineSegments geometry={geometry} material={material} frustumCulled={false} />;
}
