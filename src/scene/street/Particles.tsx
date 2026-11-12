'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, BufferAttribute, BufferGeometry, ShaderMaterial } from 'three';
import { TIER } from '@/experience/quality';
import { useExperience } from '@/experience/store';
import { globalReveal } from '../reveal/registry';
import { mulberry32 } from './random';

const BOX = { x: 14, y: 9, z: 10 };

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute float aSpeed;
  varying float vFade;
  void main() {
    vec3 p = position;
    p.y = mod(p.y - uTime * aSpeed, ${BOX.y.toFixed(1)});
    p.x += sin(uTime * 0.3 + position.z) * 0.15;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uPixelRatio * 26.0 / -mv.z;
    vFade = smoothstep(0.0, 1.2, p.y) * smoothstep(${BOX.y.toFixed(1)}, ${(BOX.y - 2).toFixed(1)}, p.y);
  }
`;

const fragment = /* glsl */ `
  uniform float uFade;
  varying float vFade;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * 0.35 * vFade * uFade;
    gl_FragColor = vec4(0.82, 0.86, 1.0, a);
  }
`;

/** Drizzle and dust drifting through the lamp light, animated entirely on the GPU. */
export default function Particles() {
  const count = useExperience((s) => TIER[s.tier].particles);
  const geometry = useMemo(() => {
    const rand = mulberry32(3);
    const pos = new Float32Array(count * 3);
    const speed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos.set([(rand() - 0.5) * BOX.x, rand() * BOX.y, (rand() - 0.5) * BOX.z], i * 3);
      speed[i] = 0.25 + rand() * 0.6;
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(pos, 3));
    g.setAttribute('aSpeed', new BufferAttribute(speed, 1));
    return g;
  }, [count]);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 }, uFade: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  );
  const ref = useRef(material);

  useFrame((state) => {
    ref.current.uniforms.uTime.value = state.clock.elapsedTime;
    ref.current.uniforms.uPixelRatio.value = state.gl.getPixelRatio();
    ref.current.uniforms.uFade.value = globalReveal();
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
