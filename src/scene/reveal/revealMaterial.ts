import { Color, type Material, type WebGLProgramParametersWithUniforms } from 'three';

export interface RevealUniforms {
  uReveal: { value: number };
  uEdge: { value: Color };
  uSeed: { value: number };
  uMinY: { value: number };
  uMaxY: { value: number };
}

export function makeRevealUniforms(seed: number, range: [number, number] = [0, 1]): RevealUniforms {
  return {
    uReveal: { value: 0 },
    uEdge: { value: new Color('#ff5a1f') },
    uSeed: { value: seed },
    uMinY: { value: range[0] },
    uMaxY: { value: range[1] },
  };
}

export const REVEAL_PARS = /* glsl */ `
  uniform float uReveal;
  uniform vec3 uEdge;
  uniform float uSeed;
  uniform float uMinY;
  uniform float uMaxY;
  varying vec3 vRevealWorld;
  float revealHash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float revealNoise(vec3 p) {
    vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(revealHash(i), revealHash(i + vec3(1,0,0)), f.x), mix(revealHash(i + vec3(0,1,0)), revealHash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(revealHash(i + vec3(0,0,1)), revealHash(i + vec3(1,0,1)), f.x), mix(revealHash(i + vec3(0,1,1)), revealHash(i + vec3(1,1,1)), f.x), f.y),
      f.z);
  }
`;

/**
 * The render front, top to bottom: t mixes normalised height (70 %) with 3D noise (30 %); fragments
 * below the threshold are still "blueprint" and are discarded; a thin band above it glows orange
 * (`revealBand`). The threshold runs 1.02 → −0.06 so nothing is left at 0 and no seam is left at 1.
 * Once a part has rendered (uReveal ≈ 1) the noise is skipped: a uniform branch, free on every GPU.
 */
export function revealFront(invert: boolean): string {
  return /* glsl */ `
  float revealBand = 0.0;
  if (uReveal < 0.999) {
    float revealH = clamp((vRevealWorld.y - uMinY) / max(uMaxY - uMinY, 1e-4), 0.0, 1.0);
    float revealT = revealH * 0.7 + revealNoise(vRevealWorld * 6.0 + uSeed) * 0.3;
    float revealThreshold = 1.02 - uReveal * 1.08;
    ${
      invert
        ? 'if (revealT >= revealThreshold) discard;'
        : 'if (revealT < revealThreshold) discard; revealBand = 1.0 - smoothstep(0.0, 0.07, revealT - revealThreshold);'
    }
  }${invert ? ' else discard;' : ''}
`;
}

/**
 * Patches a material so it renders only where the render front has passed (or, `invert`, only where it
 * has not: the blueprint wireframe). Lit materials also get the glowing seam on their emissive term.
 */
export function revealCompile(u: RevealUniforms, invert = false) {
  return (shader: WebGLProgramParametersWithUniforms) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vRevealWorld;')
      .replace(
        '#include <project_vertex>',
        // instanced meshes (street lamps) carry their placement in instanceMatrix
        '#include <project_vertex>\n#ifdef USE_INSTANCING\nvRevealWorld = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;\n#else\nvRevealWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;\n#endif',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${REVEAL_PARS}`)
      .replace('void main() {', `void main() {\n${revealFront(invert)}`);
    if (!invert && shader.fragmentShader.includes('#include <emissivemap_fragment>')) {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\ntotalEmissiveRadiance += uEdge * 7.0 * revealBand;',
      );
    }
  };
}

export function applyReveal<M extends Material>(material: M, u: RevealUniforms, invert = false): M {
  material.onBeforeCompile = revealCompile(u, invert);
  material.customProgramCacheKey = () => (invert ? 'reveal-inverse' : 'reveal');
  return material;
}
