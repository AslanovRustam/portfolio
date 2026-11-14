import { Color, type Material, MeshLambertMaterial, type MeshStandardMaterial, Vector3 } from 'three';
import { revealCompile, type RevealUniforms } from '../reveal/revealMaterial';

/**
 * The current screen's light on the TV sets around it, computed in the sets' own shader. A real point
 * light would cost every lit material in the scene (the wet road above all) a light loop on every frame,
 * ~7 ms on an integrated GPU; this one only touches the pixels of the TV bodies.
 */
export interface GlowUniforms {
  /** the glow's position in view space (TvWall updates it every frame) */
  uGlowView: { value: Vector3 };
  uGlowColor: { value: Color };
  uGlowPower: { value: number };
}

export function createGlowUniforms(): GlowUniforms {
  return { uGlowView: { value: new Vector3() }, uGlowColor: { value: new Color() }, uGlowPower: { value: 0 } };
}

/**
 * The material for the TV bodies, taking the screen glow (as a Lambert point light): a copy of the set's
 * PBR material when `pbr`, otherwise a Lambert one with its colour and normal maps. Close up the bodies
 * fill most of the frame, and on the lighter tiers PBR with ARM maps there cost ~7 ms a frame; the normal
 * map stays, so the knobs and the badge keep their relief.
 */
export function withScreenGlow(source: Material, glow: GlowUniforms, pbr: boolean, reveal: RevealUniforms): Material {
  const pbrSource = source as MeshStandardMaterial;
  const m = pbr
    ? pbrSource.clone()
    : new MeshLambertMaterial({
        map: pbrSource.map,
        color: pbrSource.color,
        normalMap: pbrSource.normalMap,
        normalScale: pbrSource.normalScale,
      });
  const renderOut = revealCompile(reveal);
  m.onBeforeCompile = (shader) => {
    // the sets render out of the blueprint with the street, then take the screen's glow
    renderOut(shader);
    Object.assign(shader.uniforms, glow);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform vec3 uGlowView;\nuniform vec3 uGlowColor;\nuniform float uGlowPower;',
      )
      .replace(
        '#include <lights_fragment_end>',
        /* glsl */ `#include <lights_fragment_end>
        {
          // vViewPosition is the negated view-space position of this fragment
          vec3 toGlow = uGlowView + vViewPosition;
          float d = length(toGlow);
          float ndl = max(dot(normal, toGlow / max(d, 1e-4)), 0.0);
          reflectedLight.directDiffuse += BRDF_Lambert(material.diffuseColor) * uGlowColor * (uGlowPower * ndl / (1.0 + d * d * 2.0));
        }`,
      );
  };
  m.customProgramCacheKey = () => `tv-screen-glow-reveal-${pbr ? 'pbr' : 'lambert'}`;
  return m;
}
