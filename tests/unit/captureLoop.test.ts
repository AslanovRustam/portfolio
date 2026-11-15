import { expect, it } from 'vitest';
import { checkLoopMeta, constantRate, encodeArgs, jankVerdict, seamFilter } from '../../scripts/capture/loop';

it('a take with 5 % or fewer intervals over 50 ms and none over 150 ms passes', () => {
  expect(jankVerdict([...Array(95).fill(16.7), ...Array(5).fill(60)]).ok).toBe(true);
  expect(jankVerdict([...Array(94).fill(16.7), ...Array(6).fill(60)]).ok).toBe(false);
  expect(jankVerdict([...Array(99).fill(16.7), 151]).ok).toBe(false);
  const v = jankVerdict([16, 16, 60, 16]);
  expect(v.slowShare).toBeCloseTo(0.25);
  expect(v.worstMs).toBe(60);
});

it('constant rate holds the last captured frame until the next one arrives', () => {
  // captures at 0, 10, 100 ms; 30 fps over 0.1 s → frames at 0, 33.3, 66.7 ms
  expect(constantRate([0, 0.01, 0.1], 30, 0.1)).toEqual([0, 1, 1]);
  // times count from the first capture, whatever the clock
  expect(constantRate([5, 5.04, 5.07], 30, 0.1)).toEqual([0, 0, 1]);
});

it('the seam fades the last half second into the first frame', () => {
  const f = seamFilter(10, 0.5);
  expect(f).toMatch(/xfade=transition=fade:duration=0\.5:offset=9\.5/);
  // the body starts half a second in, so its end can blend into the head
  expect(f).toContain('trim=start=0.5:end=10.5');
  expect(f).toContain('trim=start=0:end=0.5');
});

it('encodings carry no audio and the right codec, size and rate', () => {
  const webm = encodeArgs('webm', 'in.mkv', 'out.webm');
  const mp4 = encodeArgs('mp4', 'in.mkv', 'out.mp4');
  for (const a of [webm, mp4]) {
    expect(a).toContain('-an');
    expect(a.join(' ')).toContain('scale=1200:750');
    expect(a.join(' ')).toContain('-r 30');
  }
  expect(webm.join(' ')).toContain('libvpx-vp9');
  expect(mp4.join(' ')).toContain('libx264');
  expect(mp4.join(' ')).toContain('yuv420p');
  expect(mp4.join(' ')).toContain('+faststart');
});

it('both files are limited-range BT.709 (a full-range VP9 from JPEG frames fails in Chrome)', () => {
  for (const kind of ['webm', 'mp4'] as const) {
    const a = encodeArgs(kind, 'in.mkv', `out.${kind}`).join(' ');
    expect(a).toContain('out_range=tv');
    expect(a).toContain('-color_range tv');
    expect(a).toContain('-colorspace bt709');
  }
});

it('loop metadata outside the constraints is reported', () => {
  const ok = { seconds: 10, width: 1200, height: 750, fps: 30, audio: false, webmBytes: 1e6, mp4Bytes: 1.2e6, mode: 'realtime' } as const;
  expect(checkLoopMeta(ok)).toEqual([]);
  expect(checkLoopMeta({ ...ok, seconds: 13 })).not.toEqual([]);
  expect(checkLoopMeta({ ...ok, seconds: 7.5 })).not.toEqual([]);
  expect(checkLoopMeta({ ...ok, width: 1440 })).not.toEqual([]);
  expect(checkLoopMeta({ ...ok, fps: 25 })).not.toEqual([]);
  expect(checkLoopMeta({ ...ok, audio: true })).not.toEqual([]);
  expect(checkLoopMeta({ ...ok, mp4Bytes: 1.6 * 1024 * 1024 })).not.toEqual([]);
  expect(checkLoopMeta({ ...ok, webmBytes: 1.6 * 1024 * 1024 })).not.toEqual([]);
});
