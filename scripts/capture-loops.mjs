// Records each project's live loop from its site (spec §6): Chromium at 1440×900 plays the scenario in
// scripts/capture/scenarios.mjs; in real time the frames come from Chrome's screencast and the page's own
// frame pacing is checked (one retake, then frame by frame with the page's clock held); ffmpeg makes the
// loop seamless and writes public/projects/<slug>.webm + .mp4, the still <slug>.webp (its first frame) and
// its entry in public/projects/loops.json. Intermediate frames live in .capture/ (git-ignored).
//
// Usage: npm run loops -- --only=<slug>[,<slug>] [--frames] [--headed] [--url=<override>] [--profile=<dir>] [--reencode]
//   --frames   skip real time, record frame by frame
//   --reencode no recording: encode again from the last take's seamed loop (.capture/<slug>/loop.mp4)
//   --headed   show the browser
//   --url      record another address than the scenario's (e.g. a logged-in page)
//   --profile  a persistent, visible browser profile (a session someone logs into by hand); keep it
//              outside the repo and delete it after recording
import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { PROJECTS } from '../src/content/projects.ts';
import { checkLoopMeta, constantRate, encodeArgs, jankVerdict, LOOP, seamFilter } from './capture/loop.ts';
import { SCENARIOS } from './capture/scenarios.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const flag = (name) => process.argv.includes(`--${name}`);
const only = arg('only')?.split(',');
const VIEW = { width: 1440, height: 900 };
const GPU_ARGS = ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'];
const FADE = 0.5;
const pad = (n) => String(n).padStart(5, '0');

function ffmpeg(args, what) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', ...args], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${what}`);
}

function probe(file) {
  const r = spawnSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'stream=codec_type,width,height,avg_frame_rate:format=duration', '-of', 'json', file],
    { encoding: 'utf8' },
  );
  if (r.status !== 0) throw new Error(`ffprobe failed: ${file}`);
  const info = JSON.parse(r.stdout);
  const v = info.streams.find((s) => s.codec_type === 'video');
  const [n, d] = v.avg_frame_rate.split('/').map(Number);
  return {
    seconds: +Number(info.format.duration).toFixed(3),
    width: v.width,
    height: v.height,
    fps: +(n / d).toFixed(3),
    audio: info.streams.some((s) => s.codec_type === 'audio'),
  };
}

/** Steps the page's own animations and playing videos by dt ms (frame mode; the clock covers timers and rAF). */
function stepPage(dt) {
  const w = window;
  w.__capAnims ??= new WeakSet();
  w.__capVideos ??= new WeakSet();
  for (const a of document.getAnimations()) {
    if (a.playState === 'running') {
      a.pause();
      w.__capAnims.add(a);
    }
    if (w.__capAnims.has(a) && a.currentTime !== null) a.currentTime = Number(a.currentTime) + dt;
  }
  for (const v of document.querySelectorAll('video')) {
    if (!v.paused) {
      v.pause();
      w.__capVideos.add(v);
    }
    if (w.__capVideos.has(v)) v.currentTime = v.currentTime + dt / 1000;
  }
}

/** A programmatic scroll eased over `frames` steps; `at(k)` is the target scrollY after step k. */
const eased = (from, dy, frames) => (k) => from + dy * (0.5 - Math.cos((Math.PI * Math.min(k, frames)) / frames) / 2);

function realtimeControl(page) {
  const start = Date.now();
  return {
    async wait(ms) {
      await page.waitForTimeout(ms);
    },
    async wheel(dy, ms, step = 40) {
      const n = Math.max(1, Math.round(ms / step));
      const t0 = Date.now();
      for (let i = 0; i < n; i++) {
        await page.mouse.wheel(0, dy / n);
        const due = t0 + (i + 1) * step - Date.now();
        if (due > 0) await page.waitForTimeout(due);
      }
    },
    async scroll(dy, ms) {
      await page.evaluate(
        ([dy, ms]) =>
          new Promise((done) => {
            const from = scrollY;
            const t0 = performance.now();
            const tick = (t) => {
              const k = Math.min(1, (t - t0) / ms);
              scrollTo(0, from + dy * (0.5 - Math.cos(Math.PI * k) / 2));
              if (k < 1) requestAnimationFrame(tick);
              else done();
            };
            requestAnimationFrame(tick);
          }),
        [dy, ms],
      );
    },
    async until(seconds) {
      const left = seconds * 1000 - (Date.now() - start);
      if (left > 0) await page.waitForTimeout(left);
    },
  };
}

function frameControl(page, dir) {
  const dt = 1000 / LOOP.fps;
  let frame = 0;
  const shoot = async () => {
    await page.clock.runFor(dt);
    await page.evaluate(stepPage, dt);
    await page.screenshot({ path: join(dir, `${pad(frame)}.jpg`), type: 'jpeg', quality: 92 });
    frame++;
  };
  const framesFor = (ms) => Math.max(1, Math.round(ms / dt));
  return {
    get count() {
      return frame;
    },
    async wait(ms) {
      for (let i = framesFor(ms); i > 0; i--) await shoot();
    },
    async wheel(dy, ms, step = 40) {
      const n = Math.max(1, Math.round(ms / step));
      const per = framesFor(step);
      for (let i = 0; i < n; i++) {
        await page.mouse.wheel(0, dy / n);
        for (let j = 0; j < per; j++) await shoot();
      }
    },
    async scroll(dy, ms) {
      const frames = framesFor(ms);
      const at = eased(await page.evaluate(() => scrollY), dy, frames);
      for (let k = 1; k <= frames; k++) {
        await page.evaluate((y) => scrollTo(0, y), at(k));
        await shoot();
      }
    },
    async until(seconds) {
      while (frame < Math.round(seconds * LOOP.fps)) await shoot();
    },
  };
}

/** Records one take. Real time: frame files + their timestamps + the page's frame intervals. Frames: files only. */
async function take(context, slug, sc, mode) {
  const dir = join(root, '.capture', slug, mode);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  const page = await context.newPage();
  try {
    await page.goto(arg('url') ?? sc.url, { waitUntil: 'load', timeout: 90_000 });
    if (arg('profile')) {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      await rl.question(`[${slug}] log in and open the page in the browser window, then press Enter here… `);
      rl.close();
    }
    await sc.prepare?.(page);
    const total = sc.seconds + (sc.returnsToStart ? 0 : FADE);

    if (mode === 'frames') {
      await page.clock.install();
      const ctl = frameControl(page, dir);
      await sc.run(page, ctl);
      await ctl.until(total);
      return { mode, dir, files: Array.from({ length: ctl.count }, (_, i) => join(dir, `${pad(i)}.jpg`)), total };
    }

    await page.evaluate(() => {
      const w = window;
      w.__capDeltas = [];
      w.__capStop = false;
      let last = performance.now();
      const tick = (t) => {
        w.__capDeltas.push(t - last);
        last = t;
        if (!w.__capStop) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const cdp = await context.newCDPSession(page);
    const times = [];
    const writes = [];
    cdp.on('Page.screencastFrame', (f) => {
      const i = times.length;
      times.push(f.metadata.timestamp);
      writes.push(writeFile(join(dir, `${pad(i)}.jpg`), Buffer.from(f.data, 'base64')));
      cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
    });
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: VIEW.width, maxHeight: VIEW.height, everyNthFrame: 1 });
    const ctl = realtimeControl(page);
    await sc.run(page, ctl);
    await ctl.until(total + 0.15);
    await cdp.send('Page.stopScreencast');
    await Promise.all(writes);
    await cdp.detach();
    const deltas = await page.evaluate(() => {
      window.__capStop = true;
      return window.__capDeltas.slice(3);
    });
    const verdict = jankVerdict(deltas);
    const cfr = constantRate(times, LOOP.fps, total);
    console.log(
      `  ${slug} realtime: ${times.length} screencast frames (${(times.length / total).toFixed(1)}/s), page frames slow ${(verdict.slowShare * 100).toFixed(1)} %, worst ${verdict.worstMs.toFixed(0)} ms → ${verdict.ok ? 'ok' : 'stutters'}`,
    );
    return { mode, dir, files: cfr.map((i) => join(dir, `${pad(i)}.jpg`)), total, verdict };
  } finally {
    await page.close();
  }
}

/** Frames → a seamless loop (.capture/<slug>/loop.mp4) → the delivered files. */
async function produce(slug, sc, t) {
  const work = join(root, '.capture', slug);
  const seq = join(work, 'seq');
  await rm(seq, { recursive: true, force: true });
  await mkdir(seq, { recursive: true });
  await Promise.all(t.files.map((f, k) => copyFile(f, join(seq, `${pad(k)}.jpg`))));
  const clip = join(work, 'clip.mp4');
  ffmpeg(['-y', '-framerate', String(LOOP.fps), '-i', join(seq, '%05d.jpg'), '-c:v', 'libx264', '-crf', '10', '-preset', 'fast', '-pix_fmt', 'yuv420p', clip], 'clip');
  const loop = join(work, 'loop.mp4');
  if (sc.returnsToStart) {
    ffmpeg(['-y', '-i', clip, '-t', String(sc.seconds), '-c:v', 'libx264', '-crf', '10', '-preset', 'fast', '-pix_fmt', 'yuv420p', loop], 'trim');
  } else {
    ffmpeg(['-y', '-i', clip, '-filter_complex', seamFilter(sc.seconds, FADE), '-map', '[v]', '-c:v', 'libx264', '-crf', '10', '-preset', 'fast', '-pix_fmt', 'yuv420p', loop], 'seam');
  }
  return deliver(slug, t.mode);
}

/** The seamed loop → the two delivered files, the still and the manifest entry; returns the problems found. */
async function deliver(slug, mode) {
  const work = join(root, '.capture', slug);
  const loop = join(work, 'loop.mp4');
  const out = (ext) => join(root, 'public', 'projects', `${slug}.${ext}`);
  const steps = { webm: [40, 44, 48, 52], mp4: [27, 30, 33, 36] };
  const bytes = {};
  for (const kind of ['webm', 'mp4']) {
    for (const crf of steps[kind]) {
      ffmpeg(encodeArgs(kind, loop, out(kind), crf), `${kind} crf ${crf}`);
      bytes[kind] = (await stat(out(kind))).size;
      if (bytes[kind] <= LOOP.maxBytes) break;
    }
  }
  const still = join(work, 'still.png');
  ffmpeg(['-y', '-i', loop, '-frames:v', '1', still], 'still');
  await sharp(still).resize(LOOP.width, LOOP.height, { kernel: 'lanczos3' }).webp({ quality: 82 }).toFile(out('webp'));

  const meta = { ...probe(out('mp4')), webmBytes: bytes.webm, mp4Bytes: bytes.mp4, mode };
  const webmProbe = probe(out('webm'));
  const problems = [...checkLoopMeta(meta), ...checkLoopMeta({ ...meta, ...webmProbe }).map((p) => `webm: ${p}`)];
  const manifestPath = join(root, 'public', 'projects', 'loops.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  manifest[slug] = meta;
  const sorted = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, manifest[k]]));
  await writeFile(manifestPath, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(`  ${slug}: ${meta.seconds} s, webm ${(bytes.webm / 1024).toFixed(0)} KB, mp4 ${(bytes.mp4 / 1024).toFixed(0)} KB, ${mode}`);
  return problems;
}

const targets = PROJECTS.filter((p) => SCENARIOS[p.slug] && (!only || only.includes(p.slug)));
if (!targets.length) {
  console.error('no scenario matches', only ?? '(all)');
  process.exit(1);
}

if (flag('reencode')) {
  const manifest = JSON.parse(await readFile(join(root, 'public', 'projects', 'loops.json'), 'utf8'));
  let bad = 0;
  for (const p of targets) {
    console.log(`${p.slug} (re-encode)`);
    const problems = await deliver(p.slug, manifest[p.slug]?.mode ?? 'realtime');
    if (problems.length) {
      bad++;
      console.error(`  ${p.slug}: ${problems.join('; ')}`);
    }
  }
  process.exit(bad ? 1 : 0);
}

const profile = arg('profile');
const browser = profile ? null : await chromium.launch({ headless: !flag('headed'), args: GPU_ARGS });
const context = profile
  ? await chromium.launchPersistentContext(profile, { headless: false, viewport: VIEW, deviceScaleFactor: 1, args: GPU_ARGS })
  : await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1 });
let failed = 0;

for (const p of targets) {
  const sc = SCENARIOS[p.slug];
  console.log(`${p.slug} ← ${arg('url') ?? sc.url}`);
  try {
    let t = flag('frames') ? null : await take(context, p.slug, sc, 'realtime');
    if (t && !t.verdict.ok) {
      console.log(`  ${p.slug}: retake`);
      t = await take(context, p.slug, sc, 'realtime');
    }
    if (!t || !t.verdict.ok) t = await take(context, p.slug, sc, 'frames');
    const problems = await produce(p.slug, sc, t);
    if (problems.length) {
      failed++;
      console.error(`  ${p.slug}: ${problems.join('; ')}`);
    }
  } catch (e) {
    failed++;
    console.error(`  ${p.slug} failed: ${e.message.split('\n')[0]}`);
  }
}

await context.close();
await browser?.close();
process.exit(failed ? 1 : 0);
