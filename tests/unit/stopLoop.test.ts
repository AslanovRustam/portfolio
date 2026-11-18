import { expect, it } from 'vitest';
import { type Project, PROJECTS } from '@/content/projects';
import { loopTarget, StopLoopPlayer } from '@/scene/tvwall/stopLoop';

/** PROJECTS with a loop on the given slugs only. */
const withLoops = (...slugs: string[]): Project[] => PROJECTS.map((p) => ({ ...p, loop: slugs.includes(p.slug) ? true : undefined }));

it('plays the current stop only in Work, when allowed, with no case open, and never on the NDA stop', () => {
  const o = { current: 4, inWork: true, allowed: true, caseOpen: false, projects: withLoops('altus') };
  expect(loopTarget(o)).toBe(4);
  expect(loopTarget({ ...o, inWork: false })).toBeNull();
  expect(loopTarget({ ...o, allowed: false })).toBeNull();
  expect(loopTarget({ ...o, caseOpen: true })).toBeNull();
  expect(loopTarget({ ...o, current: 9 })).toBeNull(); // "a small part"
  expect(loopTarget({ ...o, current: 3 })).toBeNull(); // moto has no loop in this fixture
});

/** Just enough of a <video> for the player: frame callbacks are presented by hand. */
class FakeVideo {
  muted = false;
  defaultMuted = false;
  loop = false;
  playsInline = false;
  preload = '';
  src = '';
  currentTime = 0;
  videoWidth = 1200;
  videoHeight = 750;
  private frames: (() => void)[] = [];
  setAttribute() {}
  removeAttribute() {}
  load() {}
  pause() {}
  addEventListener() {}
  removeEventListener() {}
  canPlayType() {
    return 'probably';
  }
  play() {
    return Promise.resolve();
  }
  requestVideoFrameCallback(cb: () => void) {
    this.frames.push(cb);
    return this.frames.length;
  }
  cancelVideoFrameCallback() {}
  /** the decoder presents a frame: every waiting callback runs once */
  present() {
    const due = this.frames;
    this.frames = [];
    for (const cb of due) cb();
  }
}

// Review Focus 1: no black frame between the still and the video
it('the video texture carries its first frame the moment it replaces the still', async () => {
  const video = new FakeVideo();
  const shown: { stop: number; version: number }[] = [];
  const player = new StopLoopPlayer(
    (stop, texture) => texture && shown.push({ stop, version: texture.version }),
    () => video as unknown as HTMLVideoElement,
    0,
  );
  player.update(4, { webm: '/a.webm', mp4: '/a.mp4', still: '/a.webp' });
  await Promise.resolve();
  video.present();
  // version 0 would make the renderer skip the upload and bind an empty (black) texture for that frame
  expect(shown).toHaveLength(1);
  expect(shown[0].stop).toBe(4);
  expect(shown[0].version).toBeGreaterThan(0);
  player.dispose();
});

const SRC = { webm: '/a.webm', mp4: '/a.mp4', still: '/a.webp' };

/** A video whose play() is refused the way the browser refuses it. */
class RefusedVideo extends FakeVideo {
  constructor(private readonly reason: string) {
    super();
  }
  play() {
    return Promise.reject(new DOMException('refused', this.reason));
  }
}

it('a play() aborted (the tab hidden before it started) is tried again; a refused one is not', async () => {
  for (const [reason, again] of [
    ['AbortError', true],
    ['NotAllowedError', false],
  ] as const) {
    const player = new StopLoopPlayer(() => {}, () => new RefusedVideo(reason) as unknown as HTMLVideoElement, 0);
    player.update(2, SRC);
    await new Promise((r) => setTimeout(r, 0));
    player.update(2, SRC);
    expect(player.made, reason).toBe(again ? 2 : 1);
    player.dispose();
  }
});

it('a scroll through Work makes no video until it rests on a stop for 300 ms', () => {
  let t = 0;
  const player = new StopLoopPlayer(() => {}, () => new FakeVideo() as unknown as HTMLVideoElement, 300, () => t);
  for (const [at, stop] of [
    [0, 0],
    [100, 1],
    [200, 2],
    [450, 3],
  ] as const) {
    t = at;
    player.update(stop, SRC);
  }
  expect(player.made).toBe(0);
  t = 700;
  player.update(3, SRC);
  expect(player.made).toBe(0);
  t = 760;
  player.update(3, SRC);
  expect(player.made).toBe(1);
  // leaving the stop lets the video go at once
  player.update(null, SRC);
  expect(player.elements).toBe(0);
  player.dispose();
});
