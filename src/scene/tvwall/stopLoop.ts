import { SRGBColorSpace, VideoTexture } from 'three';
import type { Project } from '@/content/projects';
import type { LoopSources } from '@/experience/loops';

/**
 * The stop whose live loop should play on the wall: the current one, while the wall is lit (in Work), when
 * loops are allowed here, with no case open over the street, and only if its project has a loop (the
 * "small part" stop after the projects never does). Null: every screen shows its still.
 */
export function loopTarget(o: {
  current: number;
  inWork: boolean;
  allowed: boolean;
  caseOpen: boolean;
  projects: readonly Project[];
}): number | null {
  if (!o.inWork || !o.allowed || o.caseOpen) return null;
  return o.projects[o.current]?.loop ? o.current : null;
}

/**
 * One video at most, playing the loop of one stop into a VideoTexture. The texture is handed over
 * (`show(stop, texture)`) only once its first frame is decoded, so the screen never goes black between
 * the still and the video; `show(stop, null)` puts the still back. A file that fails or an autoplay the
 * browser refuses simply leaves the still.
 */
export class StopLoopPlayer {
  private video: HTMLVideoElement | null = null;
  private texture: VideoTexture | null = null;
  private stop: number | null = null;
  private isShown = false;
  private created = 0;
  /** stops whose loop failed (a bad file, a refused autoplay): they keep their stills from now on */
  private readonly failed = new Set<number>();

  constructor(
    private readonly show: (stop: number, texture: VideoTexture | null) => void,
    /** where video elements come from (a stand-in in the unit tests) */
    private readonly createVideo: () => HTMLVideoElement = () => document.createElement('video'),
  ) {}

  /** What is playing on the wall (for the test probe): the stop and the video's time, once it is shown. */
  get state(): { stop: number; time: number } | null {
    return this.isShown && this.video && this.stop !== null ? { stop: this.stop, time: this.video.currentTime } : null;
  }

  /** Live video elements made by this player (0 or 1). */
  get elements(): number {
    return this.video ? 1 : 0;
  }

  /** The video texture on its stop's screen right now, if any (re-applied when the materials are rebuilt). */
  get shown(): { stop: number; texture: VideoTexture } | null {
    return this.isShown && this.texture && this.stop !== null ? { stop: this.stop, texture: this.texture } : null;
  }

  /** How many video elements this player has made so far (a fast sweep must not pile them up). */
  get made(): number {
    return this.created;
  }

  update(stop: number | null, src: LoopSources | null): void {
    if (stop !== null && (this.failed.has(stop) || !src)) stop = null;
    if (stop === this.stop) return;
    this.release();
    if (stop === null || !src) return;
    this.stop = stop;
    const video = this.createVideo();
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.src = video.canPlayType('video/webm; codecs="vp9"') ? src.webm : src.mp4;
    this.video = video;
    this.created++;
    const mine = () => this.video === video;
    const reveal = () => {
      if (!mine() || this.isShown) return;
      const texture = new VideoTexture(video);
      texture.colorSpace = SRGBColorSpace;
      // upload the frame on screen now: until its own frame callback fires, a fresh video texture is
      // skipped by the renderer and the screen would sample an empty (black) one
      texture.needsUpdate = true;
      this.texture = texture;
      this.isShown = true;
      this.show(stop, texture);
    };
    // the first decoded frame, not just 'playing': a texture before it would show black
    if (typeof video.requestVideoFrameCallback === 'function') video.requestVideoFrameCallback(() => reveal());
    else (video as HTMLVideoElement).addEventListener('playing', reveal, { once: true });
    const fail = () => {
      if (!mine()) return;
      this.failed.add(stop);
      this.release();
    };
    video.addEventListener('error', fail, { once: true });
    video.play().catch(fail);
  }

  /** Stops the video, puts the still back and frees the decoder. */
  private release(): void {
    const { video, texture, stop, isShown } = this;
    this.video = null;
    this.texture = null;
    this.stop = null;
    this.isShown = false;
    if (stop !== null && isShown) this.show(stop, null);
    texture?.dispose();
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
  }

  dispose(): void {
    this.release();
  }
}
