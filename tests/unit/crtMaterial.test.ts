import { expect, it } from 'vitest';
import { createCrtMaterial } from '@/scene/tvwall/crtMaterial';
import { revealUniforms } from '@/scene/reveal/registry';

// three r187 uploads a VideoTexture as linear RGBA8 and decodes it from sRGB only in its built-in materials
// (DECODE_VIDEO_TEXTURE); a ShaderMaterial has to decode it itself, or the video comes out washed out
it('a screen decodes its video from sRGB itself, and only while a video is on it', () => {
  const m = createCrtMaterial({ map: null, curved: false, reveal: revealUniforms('street') });
  expect(m.uniforms.uVideo.value).toBe(0);
  expect(m.fragmentShader).toMatch(/uVideo > 0\.5[\s\S]{0,80}sRGBTransferEOTF/);
});
