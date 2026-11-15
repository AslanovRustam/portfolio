// Pure helpers of the loop capture pipeline (scripts/capture-loops.mjs). Erasable TypeScript only: Node
// runs this file by type stripping, and Vitest imports it for the unit tests.

/** What the runner measured on a finished loop, kept in public/projects/loops.json. */
export interface LoopMeta {
  seconds: number;
  width: number;
  height: number;
  fps: number;
  audio: boolean;
  webmBytes: number;
  mp4Bytes: number;
  /** recorded in real time, or frame by frame with the page's clock held */
  mode: 'realtime' | 'frames';
}

export const LOOP = {
  width: 1200,
  height: 750,
  fps: 30,
  minSeconds: 8,
  maxSeconds: 12,
  maxBytes: 1.5 * 1024 * 1024,
  /** a page frame slower than this counts as a stutter… */
  slowMs: 50,
  /** …more than this share of them fails the take… */
  slowShare: 0.05,
  /** …and so does a single frame slower than this */
  worstMs: 150,
} as const;

/** Whether a real-time take ran smoothly enough, judged on the page's own frame intervals. */
export function jankVerdict(deltasMs: number[]): { ok: boolean; slowShare: number; worstMs: number } {
  const slow = deltasMs.filter((d) => d > LOOP.slowMs).length;
  const slowShare = deltasMs.length ? slow / deltasMs.length : 0;
  const worstMs = deltasMs.length ? Math.max(...deltasMs) : 0;
  return { ok: slowShare <= LOOP.slowShare && worstMs <= LOOP.worstMs, slowShare, worstMs };
}

/**
 * Captured frames (timestamps in seconds, any clock) onto a constant rate: for each output frame k at k/fps
 * after the first capture, the index of the last capture at or before it. A page that did not change sends
 * no new frame, so the previous one simply holds.
 */
export function constantRate(times: number[], fps: number, seconds: number): number[] {
  const t0 = times[0] ?? 0;
  const out: number[] = [];
  let i = 0;
  const count = Math.round(seconds * fps);
  for (let k = 0; k < count; k++) {
    const t = t0 + k / fps + 1e-9;
    while (i + 1 < times.length && times[i + 1] <= t) i++;
    out.push(i);
  }
  return out;
}

/**
 * ffmpeg filtergraph for a seamless loop of `seconds` from a clip `fade` seconds longer: the loop starts
 * `fade` in, and its last `fade` seconds cross-fade into the clip's head, so its end flows into its start.
 * Input [0:v], output [v].
 */
export function seamFilter(seconds: number, fade: number): string {
  const s = +seconds.toFixed(3);
  const f = +fade.toFixed(3);
  return [
    '[0:v]split[a][b]',
    `[a]trim=start=${f}:end=${+(s + f).toFixed(3)},setpts=PTS-STARTPTS[body]`,
    `[b]trim=start=0:end=${f},setpts=PTS-STARTPTS[head]`,
    `[body][head]xfade=transition=fade:duration=${f}:offset=${+(s - f).toFixed(3)}[v]`,
  ].join(';');
}

/**
 * ffmpeg arguments for one of the two delivered files: 1200×750, 30 fps, no audio, limited-range BT.709.
 * The frames come in as full-range JPEG; a full-range VP9 makes Chrome's decoder fail after its first frame
 * (PIPELINE_ERROR_DECODE), so the range is converted and tagged.
 */
export function encodeArgs(kind: 'webm' | 'mp4', input: string, output: string, crf?: number): string[] {
  const common = [
    ...['-y', '-i', input, '-an'],
    ...['-vf', `scale=${LOOP.width}:${LOOP.height}:flags=lanczos:out_range=tv,format=yuv420p`, '-r', String(LOOP.fps)],
    ...['-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709'],
  ];
  if (kind === 'webm') {
    return [
      ...common,
      ...['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', String(crf ?? 40), '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2'],
      ...['-pix_fmt', 'yuv420p', output],
    ];
  }
  return [
    ...common,
    ...['-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf ?? 27), '-pix_fmt', 'yuv420p', '-movflags', '+faststart'],
    output,
  ];
}

/** What is wrong with a finished loop against the spec's constraints; empty when nothing is. */
export function checkLoopMeta(m: LoopMeta): string[] {
  const problems: string[] = [];
  if (m.seconds < LOOP.minSeconds - 0.05 || m.seconds > LOOP.maxSeconds + 0.05) problems.push(`length ${m.seconds} s`);
  if (m.width !== LOOP.width || m.height !== LOOP.height) problems.push(`size ${m.width}×${m.height}`);
  if (Math.abs(m.fps - LOOP.fps) > 0.05) problems.push(`rate ${m.fps} fps`);
  if (m.audio) problems.push('has an audio track');
  if (m.webmBytes > LOOP.maxBytes) problems.push(`webm ${m.webmBytes} B`);
  if (m.mp4Bytes > LOOP.maxBytes) problems.push(`mp4 ${m.mp4Bytes} B`);
  return problems;
}
