'use client';

/**
 * Night light: a warm sodium street lamp off-screen that pools on the wet street, and a faint sky fill.
 * No back light: on wet ground it turns every puddle into a milky glare. Image-based light comes per
 * material (see env.ts); the signs bring their own neon, which also rims the pole.
 */
export default function Lighting() {
  return (
    <>
      <fogExp2 attach="fog" args={['#050507', 0.034]} />
      <spotLight
        position={[6.5, 9, 4]}
        angle={0.55}
        penumbra={0.85}
        intensity={650}
        distance={40}
        decay={2}
        color="#ffb36b"
      />
      <hemisphereLight args={['#1a2236', '#050507', 0.35]} />
    </>
  );
}
