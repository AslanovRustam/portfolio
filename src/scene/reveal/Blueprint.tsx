'use client';

import { Line, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { type Group, ShaderMaterial } from 'three';
import { POLE } from '@/experience/signs';
import { globalReveal } from './registry';

const FONT = '/fonts/JetBrainsMono-Regular.woff';
const LINE = '#7fe3ff';

const gridVertex = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const gridFragment = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vWorld;
  float gridLine(vec2 p, float size, float width) {
    vec2 g = abs(fract(p / size - 0.5) - 0.5) / fwidth(p / size);
    return 1.0 - min(min(g.x, g.y) / width, 1.0);
  }
  void main() {
    float cell = gridLine(vWorld.xz, 0.25, 1.0);
    float section = gridLine(vWorld.xz, 1.0, 1.4);
    float fade = 1.0 - smoothstep(6.0, 26.0, length(vWorld.xz));
    // linear-space colours (converted to sRGB by colorspace_fragment): paper #0b1f38, cell #24486f, section #7fe3ff
    vec3 paper = vec3(0.0033, 0.0137, 0.040);
    vec3 col = mix(paper, vec3(0.018, 0.064, 0.159), cell * 0.7 * fade);
    col = mix(col, vec3(0.212, 0.768, 1.0), section * 0.45 * fade);
    gl_FragColor = vec4(col, uOpacity);
    #include <colorspace_fragment>
  }
`;

/**
 * The drawing the scene starts from: blueprint paper with a grid as the ground, and dimension lines
 * around the pole. All of it fades as the scene renders, uncovering the wet street underneath.
 */
export default function Blueprint() {
  const grid = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: gridVertex,
        fragmentShader: gridFragment,
        uniforms: { uOpacity: { value: 1 } },
        transparent: true,
        depthWrite: false,
      }),
    [],
  );
  const live = useRef(grid);
  const annotations = useRef<Group>(null);
  const root = useRef<Group>(null);

  useEffect(() => () => grid.dispose(), [grid]);

  useFrame(() => {
    const fade = 1 - globalReveal();
    live.current.uniforms.uOpacity.value = fade;
    if (root.current) root.current.visible = fade > 0.001;
    annotations.current?.traverse((o) => {
      const m = (o as { material?: { opacity: number; transparent: boolean } }).material;
      if (m) {
        m.transparent = true;
        m.opacity = fade;
      }
    });
  });

  const H = POLE.height;
  return (
    <group ref={root} name="blueprint">
      <mesh rotation-x={-Math.PI / 2} position-y={0.004} material={grid} renderOrder={1}>
        <planeGeometry args={[80, 80]} />
      </mesh>
      <group ref={annotations}>
        {/* overall height */}
        <Line points={[[1.2, 0, 0], [1.2, H, 0]]} color={LINE} lineWidth={1} />
        <Line points={[[1.1, 0, 0], [1.3, 0, 0]]} color={LINE} lineWidth={1} />
        <Line points={[[1.1, H, 0], [1.3, H, 0]]} color={LINE} lineWidth={1} />
        <Text font={FONT} fontSize={0.12} color={LINE} position={[1.36, H / 2, 0]} rotation-z={Math.PI / 2} anchorX="center">
          h 5200
        </Text>
        {/* sign width */}
        <Line points={[[-0.75, 3.95, 0.3], [0.75, 3.95, 0.3]]} color={LINE} lineWidth={1} dashed dashSize={0.05} gapSize={0.03} />
        <Text font={FONT} fontSize={0.09} color={LINE} position={[0, 4.04, 0.3]} anchorX="center">
          1500
        </Text>
        {/* pole diameter */}
        <Text font={FONT} fontSize={0.09} color={LINE} position={[0.22, 0.32, 0.15]} anchorX="left">
          ø 120
        </Text>
        <Line points={[[-1.4, 0.02, 0], [1.4, 0.02, 0]]} color={LINE} lineWidth={1} dashed dashSize={0.08} gapSize={0.05} />
      </group>
    </group>
  );
}
