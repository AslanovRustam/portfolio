'use client';

import { useGLTF, useTexture } from '@react-three/drei';
import { type ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { Component, type ReactNode, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  CanvasTexture,
  CircleGeometry,
  Color,
  type Group,
  InstancedBufferAttribute,
  type InstancedMesh,
  type Material,
  Matrix4,
  type Mesh,
  MeshBasicMaterial,
  type PointLight,
  Object3D,
  PlaneGeometry,
  SRGBColorSpace,
  type Texture,
  Vector3,
} from 'three';
import { PROJECTS } from '@/content/projects';
import { registerProbe } from '@/dev/sceneProbe';
import { activeSection } from '@/experience/choreography';
import { experienceStore, useExperience } from '@/experience/store';
import { stopAt, wallPosition } from '@/experience/workStops';
import { WALL_LIGHT } from '../Lighting';
import { globalReveal } from '../reveal/registry';
import { overUi } from '../uiPointer';
import { createCrtMaterial } from './crtMaterial';
import { screenRect, stopSlots, TV_MODELS, type TvModel, type TvSlot, wallLayout } from './layout';
import { screenAge, screenLevel } from './power';
import WallStreaks from './WallStreaks';

const LAYOUT = wallLayout();
const STOPS = stopSlots(LAYOUT);
const MODELS: readonly TvModel[] = ['tv1', 'tv2'];
const FILLERS: Record<TvModel, TvSlot[]> = {
  tv1: LAYOUT.filter((s) => s.content.kind === 'filler' && s.model === 'tv1'),
  tv2: LAYOUT.filter((s) => s.content.kind === 'filler' && s.model === 'tv2'),
};
/** the standby lamp on the front of each set, local units */
const LED: Record<TvModel, [number, number, number]> = { tv1: [0.22, 0.1, 0.197], tv2: [0.15, 0.085, 0.114] };

/** A wall that fails to load (blocked models, a bad poster) is simply not there; the scene goes on. */
export class WallBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(e: unknown) {
    console.warn('[tv wall] not shown:', e instanceof Error ? e.message : e);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const dummy = new Object3D();
function slotMatrix(s: TvSlot, offset?: [number, number, number]): Matrix4 {
  dummy.position.set(...s.position);
  dummy.rotation.set(0, s.yaw, s.roll);
  dummy.scale.setScalar(s.scale);
  dummy.updateMatrix();
  const m = dummy.matrix.clone();
  if (offset) m.multiply(new Matrix4().makeTranslation(...offset));
  return m;
}

/** The picture area of a model in its own units: a plane bulging forward like the tube's glass. */
function screenGeometry(model: TvModel): PlaneGeometry {
  const { center, size, z, bulge } = TV_MODELS[model].screen;
  const g = new PlaneGeometry(size[0], size[1], 12, 9);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const nx = p.getX(i) / (size[0] / 2);
    const ny = p.getY(i) / (size[1] / 2);
    // a flat-topped bulge, a little proud of the measured glass, so the tube never shows through the picture
    const dome = (1 - nx ** 4) * (1 - ny ** 4);
    p.setXYZ(i, p.getX(i) + center[0], p.getY(i) + center[1], z + 0.004 + (bulge + 0.004) * dome);
  }
  g.computeVertexNormals();
  return g;
}

/** A poster redrawn at most `max` px wide: the 1200 px originals would only cost GPU memory here. */
function shrink(tex: Texture, max: number, anisotropy: number): CanvasTexture {
  const img = tex.image as HTMLImageElement | ImageBitmap;
  const k = Math.min(1, max / img.width);
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * k);
  c.height = Math.round(img.height * k);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = anisotropy;
  return t;
}

/** The average colour of a picture: what its screen throws on the sets around it and on the road. */
function averageColor(tex: Texture): Color {
  const c = document.createElement('canvas');
  c.width = c.height = 1;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(tex.image as CanvasImageSource, 0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  // a little more saturated and never too dark: a screen's spill reads as its hue
  const color = new Color().setRGB(r / 255, g / 255, b / 255, SRGBColorSpace);
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  return color.setHSL(hsl.h, Math.min(1, hsl.s * 1.3), Math.max(0.45, hsl.l));
}

/** The last stop's picture: the NDA work, which has no screenshots. */
function ndaTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 352;
  const ctx = c.getContext('2d')!;
  const bg = ctx.createLinearGradient(0, 0, 0, c.height);
  bg.addColorStop(0, '#13284a');
  bg.addColorStop(1, '#060d1a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#f4f4f4';
  ctx.textAlign = 'center';
  ctx.font = '900 150px "Arial Black", Impact, sans-serif';
  ctx.fillText('NDA', c.width / 2, 210);
  ctx.font = '600 34px Arial, sans-serif';
  ctx.fillStyle = '#ff7a1a';
  ctx.fillText('+ more', c.width / 2, 275);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function firstMesh(root: Object3D): Mesh {
  let found: Mesh | null = null;
  root.traverse((o) => {
    if (!found && (o as Mesh).isMesh) found = o as Mesh;
  });
  if (!found) throw new Error('TV model without a mesh');
  return found;
}

function hoverScreen(stop: number, on: boolean) {
  const store = experienceStore.getState();
  if (on) {
    store.setHoveredScreen(stop);
    document.body.style.cursor = 'pointer';
  } else if (store.hoveredScreen === stop) {
    store.setHoveredScreen(null);
    document.body.style.cursor = '';
  }
}

/**
 * The wall of old TVs on the sidewalk where the WORK arrow points: one set per project at eye height,
 * fillers showing snow, bars and a blue "no signal" around them. Dark with red standby lamps outside Work;
 * entering Work switches the sets on in a wave from left to right; the current project's screen burns
 * brightest. Clicking a lit project screen opens its case.
 */
export default function TvWall() {
  const tier = useExperience((s) => s.tier);
  const curved = tier === 'high';
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const group = useRef<Group>(null);
  const tv1 = useGLTF(TV_MODELS.tv1.url);
  const tv2 = useGLTF(TV_MODELS.tv2.url);
  const posters = useTexture(PROJECTS.map((p) => p.poster ?? '/projects/devdigest.webp'));

  const bodies = useMemo(() => ({ tv1: firstMesh(tv1.scene), tv2: firstMesh(tv2.scene) }), [tv1, tv2]);
  const screenGeo = useMemo(() => ({ tv1: screenGeometry('tv1'), tv2: screenGeometry('tv2') }), []);
  const pictures = useMemo(() => {
    const aniso = Math.min(4, gl.capabilities.getMaxAnisotropy());
    return [...posters.map((t) => shrink(t, tier === 'high' ? 1024 : 512, aniso)), ndaTexture()];
  }, [posters, tier, gl]);
  const glow = useMemo(() => [...pictures.slice(0, -1).map(averageColor), new Color('#5a7ac0')], [pictures]);
  const stopMats = useMemo(
    () =>
      STOPS.map((s, i) => {
        const [w, h] = TV_MODELS[s.model].screen.size;
        return createCrtMaterial({ map: pictures[Math.min(i, pictures.length - 1)], curved, aspect: w / h, seed: i });
      }),
    [pictures, curved],
  );
  const fillerGeo = useMemo(() => {
    const out = {} as Record<TvModel, PlaneGeometry>;
    for (const m of MODELS) {
      const g = screenGeometry(m);
      const n = FILLERS[m].length;
      g.setAttribute('aLevel', new InstancedBufferAttribute(new Float32Array(n), 1));
      g.setAttribute('aAge', new InstancedBufferAttribute(new Float32Array(n).fill(-1), 1));
      g.setAttribute(
        'aPattern',
        new InstancedBufferAttribute(Float32Array.from(FILLERS[m], (s) => (s.content.kind === 'filler' ? s.content.pattern : 0)), 1),
      );
      g.setAttribute('aSeed', new InstancedBufferAttribute(Float32Array.from(FILLERS[m], (s) => s.order * 0.37), 1));
      out[m] = g;
    }
    return out;
  }, []);
  const fillerMats = useMemo(
    () => ({
      tv1: createCrtMaterial({ map: null, curved, instanced: true }),
      tv2: createCrtMaterial({ map: null, curved, instanced: true }),
    }),
    [curved],
  );
  const led = useMemo(
    () => ({ geo: new CircleGeometry(0.009, 12), mat: new MeshBasicMaterial({ color: new Color(3, 0.12, 0.06), toneMapped: false }) }),
    [],
  );

  const bodyRefs = useRef<Partial<Record<TvModel, InstancedMesh | null>>>({});
  const fillerRefs = useRef<Partial<Record<TvModel, InstancedMesh | null>>>({});
  const ledRefs = useRef<Partial<Record<TvModel, InstancedMesh | null>>>({});

  useLayoutEffect(() => {
    for (const m of MODELS) {
      const slots = LAYOUT.filter((s) => s.model === m);
      slots.forEach((s, k) => {
        bodyRefs.current[m]?.setMatrixAt(k, slotMatrix(s));
        ledRefs.current[m]?.setMatrixAt(k, slotMatrix(s, LED[m]));
      });
      FILLERS[m].forEach((s, k) => fillerRefs.current[m]?.setMatrixAt(k, slotMatrix(s)));
      for (const mesh of [bodyRefs.current[m], fillerRefs.current[m], ledRefs.current[m]]) {
        if (!mesh) continue;
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
      }
    }
  }, [fillerMats, stopMats]);

  // compile the wall's shaders before the first visit, so entering Work never stalls on a compile
  useEffect(() => {
    if (group.current) gl.compileAsync(group.current, camera, scene).catch(() => {});
  }, [gl, camera, scene, stopMats, fillerMats]);

  // No manual dispose: R3F frees the materials and geometries handed to these meshes when they unmount,
  // and disposing here would also run under StrictMode's trial unmount, mid-compile.

  const onAt = useRef<number | null>(null);
  const levels = useRef<number[]>(STOPS.map(() => 0));
  const streaks = useRef<number[]>(STOPS.map(() => 0));
  // what the frame loop writes to each frame (uniforms, instance attributes), kept current with the memos
  const live = useRef({ stopMats, fillerMats, fillerGeo, glow });
  useEffect(() => {
    live.current = { stopMats, fillerMats, fillerGeo, glow };
  }, [stopMats, fillerMats, fillerGeo, glow]);
  // the screen light belongs to the main scene, which may still be loading when the wall arrives
  const light = useRef<PointLight | null>(null);
  useEffect(
    () => () => {
      if (light.current) light.current.intensity = 0;
    },
    [],
  );

  useEffect(() => {
    const v = new Vector3();
    return registerProbe('wall', () => ({
      visible: !!group.current?.visible,
      loaded: true,
      levels: [...levels.current],
      streaks: [...streaks.current],
      stops: STOPS.map((s, i) => {
        v.set(...screenRect(s).center).project(camera);
        return { stop: i, ndc: [v.x, v.y] as [number, number] };
      }),
    }));
  }, [camera]);

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const { progress, reducedMotion, hoveredScreen } = experienceStore.getState();
    const t = state.clock.elapsedTime;
    g.visible = globalReveal() >= 0.999;
    const inWork = g.visible && activeSection(progress) === 'work';
    if (inWork && onAt.current === null) onAt.current = t;
    if (!inWork) onAt.current = null;
    const sinceOn = onAt.current === null ? null : t - onAt.current;
    const current = stopAt(progress);
    const { stopMats, fillerMats, fillerGeo, glow } = live.current;

    STOPS.forEach((s, i) => {
      const st = { order: s.order, sinceOn, active: i === current, hovered: hoveredScreen === i, reduced: reducedMotion };
      const u = stopMats[i].uniforms;
      u.uLevel.value = screenLevel(st);
      u.uAge.value = screenAge(st);
      u.uTime.value = t;
      levels.current[i] = u.uLevel.value;
    });
    for (const m of MODELS) {
      fillerMats[m].uniforms.uTime.value = t;
      const level = fillerGeo[m].getAttribute('aLevel') as InstancedBufferAttribute;
      const age = fillerGeo[m].getAttribute('aAge') as InstancedBufferAttribute;
      FILLERS[m].forEach((s, k) => {
        const st = { order: s.order, sinceOn, active: false, hovered: false, reduced: reducedMotion };
        level.setX(k, screenLevel(st));
        age.setX(k, Math.min(screenAge(st), 99));
      });
      level.needsUpdate = true;
      age.needsUpdate = true;
      const lamps = ledRefs.current[m];
      if (lamps) lamps.visible = sinceOn === null;
    }

    // the current screen lights the sets around it: the light rides along the wall with the camera
    light.current ??= (state.scene.getObjectByName(WALL_LIGHT) as PointLight | undefined) ?? null;
    const lamp = light.current;
    if (lamp) {
      const s = Math.min(wallPosition(progress), STOPS.length - 1);
      const i = Math.min(Math.floor(s), STOPS.length - 2);
      const f = s - i;
      const a = screenRect(STOPS[i]).center;
      const b = screenRect(STOPS[i + 1]).center;
      lamp.position.set(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f + 0.7);
      lamp.color.copy(glow[current]);
      lamp.intensity = sinceOn === null ? 0 : 2.4 * Math.min(1, levels.current[current]);
    }
  });

  const lit = () => !!group.current?.visible && activeSection(experienceStore.getState().progress) === 'work';
  const handlers = (i: number) => ({
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (!overUi(e) && lit()) hoverScreen(i, true);
    },
    onPointerMove: (e: ThreeEvent<PointerEvent>) => {
      // the pointer can slide from the screen onto HTML lying over it without leaving the mesh
      const over = !overUi(e) && lit();
      if (over !== (experienceStore.getState().hoveredScreen === i)) hoverScreen(i, over);
    },
    onPointerOut: () => hoverScreen(i, false),
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (overUi(e) || !lit() || i >= PROJECTS.length) return;
      experienceStore.getState().requestCase(PROJECTS[i].slug);
    },
  });

  return (
    <group ref={group} name="tv-wall" visible={false}>
      {MODELS.map((m) => {
        const count = LAYOUT.filter((s) => s.model === m).length;
        return (
          <group key={m}>
            <instancedMesh
              ref={(r) => {
                bodyRefs.current[m] = r;
              }}
              args={[bodies[m].geometry, bodies[m].material as Material, count]}
            />
            <instancedMesh
              ref={(r) => {
                fillerRefs.current[m] = r;
              }}
              args={[fillerGeo[m], fillerMats[m], FILLERS[m].length]}
            />
            <instancedMesh
              ref={(r) => {
                ledRefs.current[m] = r;
              }}
              args={[led.geo, led.mat, count]}
            />
          </group>
        );
      })}
      <WallStreaks levels={levels} glow={glow} out={streaks} />
      {STOPS.map((s, i) => (
        <mesh
          key={i}
          geometry={screenGeo[s.model]}
          material={stopMats[i]}
          matrix={slotMatrix(s)}
          matrixAutoUpdate={false}
          {...handlers(i)}
        />
      ))}
    </group>
  );
}
