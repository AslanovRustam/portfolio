'use client';

import { useEnvironment } from '@react-three/drei';

export const NIGHT_HDRI = '/hdri/cobblestone_street_night_1k.hdr';

/**
 * The night HDRI as a per-material envMap, not scene.environment: three ignores a material's
 * envMapIntensity under scene.environment, and the wet street must not mirror the HDRI's bright lamps
 * (they read as milky glare in the puddles) while the metal of the pole still wants them.
 */
export function useNightEnv() {
  return useEnvironment({ files: NIGHT_HDRI });
}
