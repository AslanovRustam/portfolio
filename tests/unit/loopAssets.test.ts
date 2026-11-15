import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { expect, it } from 'vitest';
import { PROJECTS } from '@/content/projects';
import { checkLoopMeta, type LoopMeta } from '../../scripts/capture/loop';

const manifest = JSON.parse(readFileSync('public/projects/loops.json', 'utf8')) as Record<string, LoopMeta>;
const withLoop = PROJECTS.filter((p) => p.loop);
const hasFfprobe = spawnSync('ffprobe', ['-version'], { stdio: 'ignore', shell: process.platform === 'win32' }).status === 0;

it('the manifest lists exactly the projects that have a loop', () => {
  expect(Object.keys(manifest).sort()).toEqual(withLoop.map((p) => p.slug).sort());
});

for (const p of withLoop) {
  it(`${p.slug}: the committed loop matches its manifest and the constraints`, () => {
    const meta = manifest[p.slug];
    expect(meta, 'manifest entry').toBeDefined();
    expect(checkLoopMeta(meta)).toEqual([]);
    expect(statSync(`public/projects/${p.slug}.webm`).size).toBe(meta.webmBytes);
    expect(statSync(`public/projects/${p.slug}.mp4`).size).toBe(meta.mp4Bytes);
    expect(existsSync(`public/projects/${p.slug}.webp`)).toBe(true);
  });
}

it.skipIf(!hasFfprobe || withLoop.length === 0)('the manifest tells the truth (ffprobe, local only)', () => {
  for (const p of withLoop) {
    for (const ext of ['webm', 'mp4']) {
      const out = spawnSync(
        'ffprobe',
        ['-v', 'error', '-show_entries', 'stream=codec_type,width,height,avg_frame_rate:format=duration', '-of', 'json', `public/projects/${p.slug}.${ext}`],
        { encoding: 'utf8', shell: process.platform === 'win32' },
      );
      const info = JSON.parse(out.stdout) as {
        streams: { codec_type: string; width?: number; height?: number; avg_frame_rate?: string }[];
        format: { duration: string };
      };
      const video = info.streams.filter((s) => s.codec_type === 'video');
      expect(video, `${p.slug}.${ext}`).toHaveLength(1);
      expect(info.streams.some((s) => s.codec_type === 'audio'), `${p.slug}.${ext} audio`).toBe(false);
      expect([video[0].width, video[0].height]).toEqual([1200, 750]);
      const [n, d] = video[0].avg_frame_rate!.split('/').map(Number);
      expect(n / d).toBeCloseTo(30, 1);
      expect(Number(info.format.duration)).toBeCloseTo(manifest[p.slug].seconds, 1);
    }
  }
});
