import { ShaderMaterial, type Texture, Vector2 } from 'three';
import { REVEAL_PARS, revealFront, type RevealUniforms } from '../reveal/revealMaterial';

/**
 * The picture on an old CRT: the poster (or a filler pattern), bent by the tube's barrel, with
 * scanlines, an aperture-grille mask, a vignette and a faint flicker. `level` is its brightness (0 is a
 * dark glass with a sheen, above 1 a white flare as it switches on); `age` drives the switch-on: the
 * picture opens out of a bright horizontal line. Instanced fillers carry their own level, age, pattern
 * and seed as attributes; a project screen takes them as uniforms.
 */
const vertex = (instanced: boolean) => /* glsl */ `
  varying vec2 vUv;
  varying float vLevel;
  varying float vAge;
  varying float vPattern;
  varying float vSeed;
  varying vec3 vRevealWorld;
  ${
    instanced
      ? 'attribute float aLevel; attribute float aAge; attribute float aPattern; attribute float aSeed;'
      : 'uniform float uLevel; uniform float uAge; uniform float uPattern; uniform float uSeed;'
  }
  void main() {
    vUv = uv;
    ${
      instanced
        ? 'vLevel = aLevel; vAge = aAge; vPattern = aPattern; vSeed = aSeed;'
        : 'vLevel = uLevel; vAge = uAge; vPattern = uPattern; vSeed = uSeed;'
    }
    vec4 p = vec4(position, 1.0);
    ${instanced ? 'p = instanceMatrix * p;' : ''}
    vRevealWorld = (modelMatrix * p).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * p;
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uHasMap;
  /** 1 while uMap is a video: three uploads videos linear, so the sRGB decode happens here */
  uniform float uVideo;
  uniform float uTime;
  uniform float uCurve;
  uniform float uMask;
  uniform vec2 uCover;
  varying vec2 vUv;
  varying float vLevel;
  varying float vAge;
  varying float vPattern;
  varying float vSeed;
  ${REVEAL_PARS}

  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  vec3 pattern(vec2 uv) {
    float t = uTime;
    if (vPattern < 0.5) {
      // snow
      float n = hash(floor(uv * vec2(150.0, 110.0)) + floor(t * 24.0) + vSeed * 17.0);
      return vec3(n * 0.8);
    }
    if (vPattern < 1.5) {
      // colour bars
      float i = floor(uv.x * 7.0);
      vec3 bars[7];
      bars[0] = vec3(0.75); bars[1] = vec3(0.75, 0.75, 0.0); bars[2] = vec3(0.0, 0.75, 0.75);
      bars[3] = vec3(0.0, 0.75, 0.0); bars[4] = vec3(0.75, 0.0, 0.75); bars[5] = vec3(0.75, 0.0, 0.0);
      bars[6] = vec3(0.0, 0.0, 0.75);
      vec3 c = bars[0];
      for (int k = 1; k < 7; k++) if (abs(i - float(k)) < 0.5) c = bars[k];
      return uv.y < 0.22 ? vec3(0.04, 0.04, 0.12) : c;
    }
    if (vPattern < 2.5) {
      // a blue "no signal" screen with a slow rolling band
      float band = smoothstep(0.0, 0.08, abs(fract(uv.y - t * 0.13 + vSeed) - 0.5) - 0.38);
      return mix(vec3(0.16, 0.24, 0.95), vec3(0.05, 0.08, 0.5), band);
    }
    // the WORK arrow, pointing on along the wall
    vec2 q = uv - vec2(0.5);
    float body = step(abs(q.y), 0.08) * step(-0.3, q.x) * step(q.x, 0.08);
    float head = step(0.08, q.x) * step(abs(q.y), 0.22 - (q.x - 0.08) * 1.0) * step(q.x, 0.3);
    return mix(vec3(0.03), vec3(1.0, 0.48, 0.1), max(body, head));
  }

  void main() {
    ${revealFront(false)}
    vec2 c = vUv - 0.5;
    vec2 uv = 0.5 + c * (1.0 + uCurve * dot(c, c));
    float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);

    // dark glass: a faint sheen across the tube, what a switched-off set shows
    vec3 glass = vec3(0.012, 0.014, 0.018) + 0.035 * smoothstep(0.35, 0.0, abs(vUv.x - vUv.y * 0.6 - 0.15));

    vec3 col = uHasMap > 0.5 ? texture2D(uMap, (uv - 0.5) * uCover + 0.5).rgb : pattern(uv);
    if (uVideo > 0.5) col = sRGBTransferEOTF(vec4(col, 1.0)).rgb;
    // scanlines, aperture grille, vignette and a breathing flicker
    col *= 0.78 + 0.22 * sin(vUv.y * 900.0);
    col *= mix(1.0, 0.82 + 0.18 * sin(gl_FragCoord.x * 2.094), uMask);
    col *= smoothstep(0.85, 0.3, length(c) * 1.2);
    col *= 0.96 + 0.04 * sin(uTime * 50.0 + vSeed * 6.28);

    // switch-on: the picture opens out of a bright line
    float open = clamp(vAge / 0.18, 0.0, 1.0);
    float rows = step(abs(c.y), max(open * 0.5, 0.006));
    float line = (1.0 - open) * smoothstep(0.02, 0.0, abs(c.y)) * 3.0;

    float level = max(vLevel, 0.0);
    vec3 lit = col * min(level, 1.0) * 1.6 + vec3(max(level - 1.0, 0.0) * 1.4);
    lit = lit * rows + vec3(line) * step(0.0, vAge) * step(0.001, level);
    vec3 outCol = level > 0.001 ? mix(glass, lit, inside) : glass;
    gl_FragColor = vec4(outCol + uEdge * 3.0 * revealBand, 1.0);
    #include <colorspace_fragment>
  }
`;

export interface CrtOptions {
  map: Texture | null;
  /** filler pattern 0 snow, 1 bars, 2 no-signal blue, 3 arrow (ignored with a map) */
  pattern?: number;
  /** barrel bend and aperture mask (off on the lighter tiers) */
  curved: boolean;
  /** per-instance level/age/pattern/seed attributes instead of uniforms */
  instanced?: boolean;
  /** picture aspect (w/h) of the screen, to cover-crop the map */
  aspect?: number;
  seed?: number;
  /** the street's blueprint → render front, which the screens render out of with their sets */
  reveal: RevealUniforms;
}

export function createCrtMaterial(o: CrtOptions): ShaderMaterial {
  const img = o.map?.image as { width?: number; height?: number } | undefined;
  const mapAspect = img?.width && img.height ? img.width / img.height : 1.6;
  const screenAspect = o.aspect ?? 1.4;
  // cover: crop the longer side so the picture fills the tube
  const cover = mapAspect > screenAspect ? new Vector2(screenAspect / mapAspect, 1) : new Vector2(1, mapAspect / screenAspect);
  return new ShaderMaterial({
    vertexShader: vertex(!!o.instanced),
    fragmentShader: fragment,
    uniforms: {
      ...o.reveal,
      uMap: { value: o.map },
      uHasMap: { value: o.map ? 1 : 0 },
      uVideo: { value: 0 },
      uTime: { value: 0 },
      uCurve: { value: o.curved ? 0.18 : 0 },
      uMask: { value: o.curved ? 1 : 0 },
      uCover: { value: cover },
      uLevel: { value: 0 },
      uAge: { value: -1 },
      uPattern: { value: o.pattern ?? 0 },
      uSeed: { value: o.seed ?? 0 },
    },
  });
}
