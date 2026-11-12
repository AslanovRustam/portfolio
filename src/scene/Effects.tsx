'use client';

import { Bloom, EffectComposer, N8AO, Noise, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { useEffect } from 'react';
import { TIER } from '@/experience/quality';
import { useExperience } from '@/experience/store';
import { registerProbe } from '@/dev/sceneProbe';

/**
 * The film on top of the scene: contact shadows (N8AO), neon bloom, tone mapping, SMAA (MSAA is off:
 * N8AO wants a plain depth buffer), grain and a vignette. The pass set follows the quality tier and is
 * rebuilt when the governor steps it down. EffectComposer owns tone mapping while it runs, so the
 * Neutral curve moves here from the renderer.
 */
export default function Effects() {
  const tier = useExperience((s) => s.tier);
  const t = TIER[tier];
  const passes = [t.ao && 'ao', t.bloom && 'bloom', 'tonemap', 'smaa', t.noise && 'noise', 'vignette'].filter(
    (p): p is string => typeof p === 'string',
  );
  const key = passes.join('+');

  useEffect(() => registerProbe('effects', () => key.split('+')), [key]);

  return (
    <EffectComposer key={`${tier}:${key}`} multisampling={0}>
      {t.ao ? <N8AO aoRadius={0.6} intensity={2.5} distanceFalloff={1} halfRes={t.aoHalfRes} quality={tier === 'high' ? 'medium' : 'performance'} /> : <></>}
      {t.bloom ? <Bloom mipmapBlur luminanceThreshold={0.75} luminanceSmoothing={0.2} intensity={1.1} radius={0.75} /> : <></>}
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      <SMAA />
      {t.noise ? <Noise opacity={0.035} premultiply /> : <></>}
      <Vignette offset={0.3} darkness={0.75} />
    </EffectComposer>
  );
}
