# Plan 3 — live product loops and the About photo poster

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every project's TV and case card show a seamless muted loop of the product in use (stills where video is not allowed), and About opens with Rustam's portrait as a neon-duotone street poster.

**Architecture:** A local capture pipeline (`scripts/capture-loops.mjs`, Playwright + CDP screencast, ffmpeg) records each site by a scripted scenario and writes `public/projects/<slug>.{webm,mp4,webp}` plus a metadata manifest. A pure rule (`loopAllowed`) decides where video may play. On the wall a single `StopLoopPlayer` feeds a `VideoTexture` into the current stop's CRT material; the case card renders a `<video>` over the same still. A sharp script turns the portrait into a duotone WebP that About shows as a torn paper poster.

**Tech Stack:** Next.js 16 / React 19, three 0.187 + R3F 9, Playwright 1.65 (Chromium, CDP), ffmpeg 8 (local), sharp 0.35, Vitest 5, next-intl 4.

**Spec:** `docs/superpowers/specs/2026-11-15-portfolio-assets-design.md`

## Global Constraints

- Loops: 1200×750, 30 fps, 8–12 s, no audio track; WebM (VP9) + MP4 (H.264, yuv420p, faststart); each file ≤ 1.5 MB.
- Recording window 1440×900 CSS px, scaled down to 1200×750.
- Still = first frame of the loop, WebP 1200×750, at `public/projects/<slug>.webp` (replaces today's poster).
- Jank gate: real-time take fails if > 5 % of page frame intervals are longer than 50 ms or any is longer than 150 ms; one retake, then frame-stepped mode.
- Seam: the scenario ends where it began, else the last 0.5 s cross-fades into the first frame.
- English version wherever a site has one (GenGO via its client-side picker, Kolir `/en`); TUTI and Moto: Ukrainian, frames with little text (Moto product cards with photos and prices, TUTI the games). Cookie banners closed before recording. A site that is down: ask Rustam, never swap the source.
- Never read or create `.env*` in `_sources`; DevDigest gets a loop only if it runs locally without secrets.
- Wall: only the current stop plays, only while the wall is lit (in Work); no video on tier `low`; the NDA stop never has video.
- No video anywhere under reduced motion, with `navigator.connection.saveData`, with `?loops=0`, or in the no-WebGL card strip. The case card plays on every tier.
- No request for `.webm` / `.mp4` before Work is entered or a case is opened.
- Perf: Work-stop median frame with a loop playing ≤ the same stop with `?loops=0` + 3 ms.
- Video in the case card is decorative (`aria-hidden`).
- Poster: source `examples/1782901779f3ef.png` (Rustam chose it knowing it is AI-made); processing only (duotone, grain, edges), no generation. Shadows near-black violet, highlights About cyan `#5fe1ff`; `public/about/poster.webp` about 600×800, ≤ 120 KB; first item of About's flow, above the title box, width `min(300px, 70%)`, tilted −2…−3°, two tape strips, torn edges; swings in like About's boxes; `alt` "Rustam Aslanov" (EN) / "Рустам Асланов" (RU, UK).
- Gipper: Rustam's demo layout without client data; a visible Chromium with a temporary profile outside the repo where Rustam logs in himself; no password in chat or files, no cookies copied; account details cropped or covered; the profile deleted right after; the layout URL passed at run time, never committed. Gipper does not block the M3 gate.
- No secrets, LAN IP or `.env*` in the repo. Keep the Playwright MCP browser closed during e2e. Start the dev server from PowerShell (see the project memory for the exact env).

## Review Focus

1. A fast sweep across Work stops: at most one live video element at any time, and no black screen between still and video.
2. A loop that fails to load or decode (404, corrupt file): the still stays on the wall and in the case, nothing turns black.
3. Autoplay refused (`play()` rejects, e.g. iOS Low Power Mode): the still stays, no unhandled promise rejection.
4. A case open over the wall: the wall's loop pauses while the case plays its own.
5. The quality governor drops the tier to `low` while a loop plays: the wall's loop stops and the still returns.

---

### Task 1: Loop rules, data and the case flag

**Files:**
- Create: `src/experience/loops.ts`
- Modify: `src/content/projects.ts` (field `loop?: true`), `src/experience/store.ts` (`caseOpen`), `src/ui/sections/CaseOverlay.tsx` (sets `caseOpen`)
- Test: `tests/unit/loops.test.ts`

**Interfaces:**
- Produces:
  - `type LoopPlace = 'wall' | 'case'`
  - `interface LoopSources { webm: string; mp4: string; still: string }`
  - `loopAllowed(env: { place: LoopPlace; tier: Tier; reducedMotion: boolean; saveData: boolean; disabled: boolean }): boolean`
  - `loopSources(p: Project): LoopSources | null` — `/projects/<slug>.webm|.mp4|.webp` when `p.loop`, else null
  - `loopsDisabled(search: string): boolean` — true for `?loops=0`
  - `saveDataOn(): boolean` — `navigator.connection?.saveData === true`, false when absent or on the server
  - store: `caseOpen: boolean`, `setCaseOpen(on: boolean): void`

- [ ] **Step 1: Write the failing tests** in `tests/unit/loops.test.ts`:

```ts
it('the wall plays only on medium and high, with motion, without save-data or ?loops=0', () => {
  const base = { place: 'wall', tier: 'high', reducedMotion: false, saveData: false, disabled: false } as const;
  expect(loopAllowed(base)).toBe(true);
  expect(loopAllowed({ ...base, tier: 'medium' })).toBe(true);
  expect(loopAllowed({ ...base, tier: 'low' })).toBe(false);
  expect(loopAllowed({ ...base, reducedMotion: true })).toBe(false);
  expect(loopAllowed({ ...base, saveData: true })).toBe(false);
  expect(loopAllowed({ ...base, disabled: true })).toBe(false);
});
it('the case card plays on every tier, but never under reduced motion, save-data or ?loops=0', () => {
  const base = { place: 'case', tier: 'low', reducedMotion: false, saveData: false, disabled: false } as const;
  expect(loopAllowed(base)).toBe(true);
  expect(loopAllowed({ ...base, reducedMotion: true })).toBe(false);
  expect(loopAllowed({ ...base, saveData: true })).toBe(false);
});
it('a project with a loop has its webm, mp4 and still next to each other; one without has none', () => {
  expect(loopSources({ ...projectBySlug('altus')!, loop: true })).toEqual({
    webm: '/projects/altus.webm', mp4: '/projects/altus.mp4', still: '/projects/altus.webp',
  });
  expect(loopSources({ ...projectBySlug('altus')!, loop: undefined })).toBeNull();
});
it('?loops=0 switches loops off', () => {
  expect(loopsDisabled('?loops=0')).toBe(true);
  expect(loopsDisabled('?quality=low')).toBe(false);
});
```

- [ ] **Step 2: Run** `cd d:/projects/portfolio && npx vitest run tests/unit/loops.test.ts` — Expected: FAIL, module `@/experience/loops` not found.
- [ ] **Step 3: Implement** `loops.ts`, the `loop?: true` field (no project sets it yet), and `caseOpen` in the store; `CaseOverlay`'s mount effect sets `caseOpen` true and its cleanup false.
- [ ] **Step 4: Run** the unit test, then `npm run lint && npm run typecheck` — Expected: PASS, clean.
- [ ] **Step 5: Commit** `feat(loops): where a product loop may play, and where its files live`

---

### Task 2: The capture pipeline, proven on ALTUS

**Files:**
- Create: `scripts/capture/loop.ts` (pure helpers), `scripts/capture/scenarios.mjs`, `scripts/capture-loops.mjs`, `public/projects/loops.json`
- Modify: `package.json` (script `"loops": "node scripts/capture-loops.mjs"`), `.gitignore` (`.capture/`), `src/content/projects.ts` (`altus` gets `loop: true`), `public/projects/altus.webp` (replaced by the loop's first frame), `scripts/capture-posters.mjs` (header note: posters of projects with loops come from `npm run loops`; skip them)
- Create: `public/projects/altus.webm`, `public/projects/altus.mp4`
- Test: `tests/unit/captureLoop.test.ts`, `tests/unit/loopAssets.test.ts`

**Interfaces:**
- Consumes: `PROJECTS`, `loopSources` (Task 1).
- Produces:
  - `jankVerdict(deltasMs: number[]): { ok: boolean; slowShare: number; worstMs: number }`
  - `constantRate(times: number[], fps: number, seconds: number): number[]` — for each output frame k (time k/fps from the first capture), the index of the last captured frame at or before it
  - `seamFilter(seconds: number, fade: number): string` — ffmpeg filtergraph that cross-fades the last `fade` s into the first frame and trims to `seconds`
  - `encodeArgs(kind: 'webm' | 'mp4', input: string, output: string): string[]` — ffmpeg arguments: VP9 / H.264 yuv420p `+faststart`, 30 fps, scale 1200×750, `-an`
  - `checkLoopMeta(m: LoopMeta): string[]` — problems, empty when within the Global Constraints
  - `interface LoopMeta { seconds: number; width: number; height: number; fps: number; audio: boolean; webmBytes: number; mp4Bytes: number; mode: 'realtime' | 'frames' }`
  - `public/projects/loops.json`: `Record<ProjectSlug, LoopMeta>`, written from `ffprobe` by the runner
  - CLI: `npm run loops -- --only=<slug>[,<slug>] [--frames] [--headed] [--url=<override>]`

- [ ] **Step 1: Write the failing tests** in `tests/unit/captureLoop.test.ts`:

```ts
it('a take with 5 % or fewer intervals over 50 ms and none over 150 ms passes', () => {
  expect(jankVerdict([...Array(95).fill(16.7), ...Array(5).fill(60)]).ok).toBe(true);
  expect(jankVerdict([...Array(94).fill(16.7), ...Array(6).fill(60)]).ok).toBe(false);
  expect(jankVerdict([...Array(99).fill(16.7), 151]).ok).toBe(false);
});
it('constant rate holds the last captured frame until the next one arrives', () => {
  // captures at 0, 10, 100 ms; 30 fps over 0.1 s → frames at 0, 33.3, 66.7 ms
  expect(constantRate([0, 0.01, 0.1], 30, 0.1)).toEqual([0, 1, 1]);
});
it('the seam fades the last half second into the first frame', () => {
  expect(seamFilter(10, 0.5)).toMatch(/xfade=transition=fade:duration=0\.5:offset=9\.5/);
});
it('encodings carry no audio and the right codec, size and rate', () => {
  const webm = encodeArgs('webm', 'in.mkv', 'out.webm').join(' ');
  const mp4 = encodeArgs('mp4', 'in.mkv', 'out.mp4').join(' ');
  for (const a of [webm, mp4]) expect(a).toMatch(/-an\b.*|.*-an\b/), expect(a).toContain('scale=1200:750'), expect(a).toContain('-r 30');
  expect(webm).toContain('libvpx-vp9');
  expect(mp4).toMatch(/libx264.*yuv420p.*\+faststart|\+faststart.*yuv420p/);
});
it('loop metadata outside the constraints is reported', () => {
  const ok = { seconds: 10, width: 1200, height: 750, fps: 30, audio: false, webmBytes: 1e6, mp4Bytes: 1.2e6, mode: 'realtime' } as const;
  expect(checkLoopMeta(ok)).toEqual([]);
  expect(checkLoopMeta({ ...ok, seconds: 13 })).not.toEqual([]);
  expect(checkLoopMeta({ ...ok, audio: true })).not.toEqual([]);
  expect(checkLoopMeta({ ...ok, mp4Bytes: 1.6 * 1024 * 1024 })).not.toEqual([]);
});
```

and in `tests/unit/loopAssets.test.ts` (runs in CI without ffmpeg):

```ts
for (const p of PROJECTS.filter((p) => p.loop)) {
  it(`${p.slug}: the committed loop matches its manifest and the constraints`, () => {
    const meta = manifest[p.slug];
    expect(meta, 'manifest entry').toBeDefined();
    expect(checkLoopMeta(meta)).toEqual([]);
    expect(statSync(`public/projects/${p.slug}.webm`).size).toBe(meta.webmBytes);
    expect(statSync(`public/projects/${p.slug}.mp4`).size).toBe(meta.mp4Bytes);
    expect(existsSync(`public/projects/${p.slug}.webp`)).toBe(true);
  });
}
it.skipIf(!hasFfprobe)('the manifest tells the truth (ffprobe, local only)', () => { /* probe each file: duration, size, fps, no audio stream */ });
```

- [ ] **Step 2: Run** `npx vitest run tests/unit/captureLoop.test.ts tests/unit/loopAssets.test.ts` — Expected: FAIL, `scripts/capture/loop.ts` not found.
- [ ] **Step 3: Implement the pure helpers** in `scripts/capture/loop.ts` (erasable TypeScript only: Node runs it by type stripping, like `capture-posters.mjs` imports `projects.ts`).
- [ ] **Step 4: Run** the unit tests — Expected: `captureLoop` PASS; `loopAssets` passes with no loops yet (no project has `loop`).
- [ ] **Step 5: Implement the runner.** Real-time mode: Chromium (same GPU args as `capture-posters.mjs`), 1440×900, DPR 1; the scenario's `prepare(page)` (open URL, close banners, switch to English, wait for the intro) runs before recording; then CDP `Page.startScreencast` (JPEG q ≈ 92, every frame, acked) plus an in-page `requestAnimationFrame` probe for page frame intervals while `run(page)` plays the scripted path; frames go to `.capture/<slug>/`. `jankVerdict` on the rAF intervals; on failure one retake, then frame-stepped mode. Frame-stepped mode (`--frames` or after two failed takes): `page.clock.install()`, then per 1/30 s step `page.clock.runFor(1000 / 30)`, pause every `document.getAnimations()` and advance its `currentTime` by the step, pause `<video>` elements and advance `currentTime`, screenshot. Assemble with `constantRate` → ffmpeg (`seamFilter` unless the scenario declares `returnsToStart`) → `encodeArgs` for both files; still = frame 0 via sharp (WebP q 82); `ffprobe` both outputs into `loops.json`. Exit non-zero if `checkLoopMeta` reports problems.
- [ ] **Step 6: Write the ALTUS scenario** (`scenarios.mjs`): EN page; scroll through the scroll-driven video, the headline reveal and the horizontal pin; 8–12 s; returns to the top or relies on the seam fade.
- [ ] **Step 7: Run** `npm run loops -- --only=altus`, then look at both files (play them, check the seam and the first frame against the still). Expected: exit 0, `loops.json` has `altus` with `mode` and sizes ≤ 1.5 MB.
- [ ] **Step 8:** set `loop: true` on `altus`; run `npx vitest run` — Expected: all unit tests PASS, including `altus` in `loopAssets` and the ffprobe check locally.
- [ ] **Step 9: Commit** `feat(capture): record a product loop from its live site; ALTUS first`

---

### Task 3: Loops for the other public sites

**Files:**
- Modify: `scripts/capture/scenarios.mjs`, `src/content/projects.ts` (`loop: true` per recorded project), `public/projects/loops.json`
- Create / replace: `public/projects/{aslanair,aslan-can,gengo,kolir,tuti,moto}.{webm,mp4,webp}`; DevDigest only if it runs locally without secrets
- Test: `tests/unit/loopAssets.test.ts` (covers each new loop through `loop: true`)

**Interfaces:**
- Consumes: the runner and CLI from Task 2.

- [ ] **Step 1: Scenarios**, per the spec's §5 table: AslanAir (night cabin, camera over the seats, a seat picked); Aslan-can (3D scenes answering the scroll); GenGO (public page, English through the picker: RU → English); Kolir (`/en`, agency cases); TUTI (Ukrainian, the games, little text); Moto (Ukrainian, product cards with photos and prices from several shops, little text). Before Moto, check that the sslip.io preview answers; if not, stop and ask Rustam.
- [ ] **Step 2: Record** each with `npm run loops -- --only=<slug>`; the 3D sites are expected to fall back to frame-stepped mode. Watch every result: no text in another language where English exists, no seam jump, no stutter.
- [ ] **Step 3: DevDigest.** Read `_sources/dev-digest`'s README and `package.json` scripts only (never `.env*`). If running the studio needs API keys, an external database or any secret, record a ruling in the ledger and leave DevDigest without a loop (its current still stays). Otherwise run it locally and record.
- [ ] **Step 4:** set `loop: true` for every recorded project; run `npx vitest run` — Expected: PASS, one `loopAssets` case per recorded project.
- [ ] **Step 5: Commit** `feat(capture): live loops for AslanAir, Aslan-can, GenGO, Kolir, TUTI and Moto`

---

### Task 4: The wall plays the current stop's loop

**Files:**
- Create: `src/scene/tvwall/stopLoop.ts`
- Modify: `src/scene/tvwall/TvWall.tsx` (player, material swap, probe), `tests/e2e/perf.spec.ts` (the Work stop with and without loops)
- Test: `tests/unit/stopLoop.test.ts`, `tests/e2e/loops.spec.ts`

**Interfaces:**
- Consumes: `loopAllowed`, `loopSources`, `loopsDisabled`, `saveDataOn`, store `caseOpen` (Task 1); `stopAt`, `STOPS`, `stopMats[i].uniforms.uMap` (TvWall).
- Produces:
  - `loopTarget(o: { current: number; inWork: boolean; allowed: boolean; caseOpen: boolean; projects: readonly Project[] }): number | null` — the stop whose loop should play, or null
  - `class StopLoopPlayer { constructor(show: (stop: number, texture: VideoTexture | null) => void); update(stop: number | null, src: LoopSources | null): void; readonly state: { stop: number; time: number } | null; readonly elements: number; dispose(): void }` — one `<video>` at most; `show(stop, texture)` only after the first frame is decoded; `show(stop, null)` puts the still back; errors and a rejected `play()` keep the still
  - probe `wall` gains `loop: { stop: number; time: number } | null` and `videos: number`

- [ ] **Step 1: Write the failing unit tests** (`tests/unit/stopLoop.test.ts`):

```ts
it('plays the current stop only in Work, when allowed, with no case open, and never on the NDA stop', () => {
  const o = { current: 4, inWork: true, allowed: true, caseOpen: false, projects: withLoops('altus') };
  expect(loopTarget(o)).toBe(4);
  expect(loopTarget({ ...o, inWork: false })).toBeNull();
  expect(loopTarget({ ...o, allowed: false })).toBeNull();
  expect(loopTarget({ ...o, caseOpen: true })).toBeNull();
  expect(loopTarget({ ...o, current: 9 })).toBeNull(); // "a small part"
  expect(loopTarget({ ...o, current: 3 })).toBeNull(); // moto without a loop in this fixture
});
```

- [ ] **Step 2: Write the failing e2e** (`tests/e2e/loops.spec.ts`), using `gotoScene`, `waitReady`, `scrollTo`, `stop` and a `wall` probe reader:
  - `the current stop plays its loop and its neighbours keep their stills` — at `stop(4)`: `loop.stop === 4`, `loop.time` grows over 1 s; `videos === 1`.
  - `leaving Work stops the loop` — `scrollTo(0.48)` → `loop === null`, `videos === 0`.
  - `a fast sweep across the stops keeps one video at most` (Review Focus 1) — scroll `stop(0)`…`stop(8)` in 150 ms steps, sampling `videos ≤ 1` each step; settles with `loop.stop` = the last stop with a loop.
  - `a loop that fails to load leaves the still` (Review Focus 2) — `page.route('**/projects/altus.*', r => r.abort())` for webm/mp4 → at `stop(4)` `loop === null` after 3 s, no page errors.
  - `refused autoplay leaves the still` (Review Focus 3) — init script makes `HTMLMediaElement.prototype.play` reject → `loop === null`, no `pageerror`.
  - `an open case pauses the wall's loop` (Review Focus 4) — open the ALTUS case at `stop(4)` → wall `loop === null` while the dialog is open.
  - `a drop to the low tier stops the wall's loop` (Review Focus 5) — set the tier to `low` through the store hook while playing → `loop === null`.
  - `low tier, reduced motion, save-data and ?loops=0 never play on the wall` — `?quality=low`; `reducedMotion: 'reduce'`; init script defining `navigator.connection = { saveData: true }`; `?loops=0`.
  - `the first load asks for no video` — record requests on `/en` until ready + 2 s: none ends in `.webm` or `.mp4`.
- [ ] **Step 3: Run** `npx vitest run tests/unit/stopLoop.test.ts` and `npx playwright test tests/e2e/loops.spec.ts --project=chromium` — Expected: FAIL (module missing; probe has no `loop`).
- [ ] **Step 4: Implement** `stopLoop.ts` and wire it in `TvWall`'s frame loop: compute `allowed` from the store (`tier`, `reducedMotion`), `saveDataOn()` and `loopsDisabled(location.search)` once per mount; `loopTarget` each frame; `player.update(...)` only when the target changes; `show` swaps `stopMats[stop].uniforms.uMap.value` between the `VideoTexture` (sRGB) and the still picture. Video: `muted`, `playsInline`, `loop`, `preload="auto"`, source by `canPlayType('video/webm; codecs="vp9"')` else MP4. On leaving: pause, put the still back, dispose the texture, `removeAttribute('src')` + `load()` to free the decoder. Dispose the player on unmount.
- [ ] **Step 5: Run** the unit and e2e tests — Expected: PASS.
- [ ] **Step 6: Perf.** In `perf.spec.ts`, measure the Work stop at a stop with a loop twice in the same test, with `?loops=0` and without; write both to `test-results/perf-work.json`; assert `withLoop.medianMs ≤ noLoop.medianMs + 3` and the existing 33.4 ms ceiling. Run `npm run perf` — Expected: PASS; record both numbers in the ledger.
- [ ] **Step 7:** run the full chromium e2e — Expected: all green (the existing wall tests unchanged).
- [ ] **Step 8: Commit** `feat(wall): the TV in front of the camera plays its project's live loop`

---

### Task 5: The case card plays the loop

**Files:**
- Create: `src/ui/sections/ProjectMedia.tsx`
- Modify: `src/ui/sections/CaseOverlay.tsx` (the poster block uses `ProjectMedia`)
- Test: `tests/e2e/loops.spec.ts` (case cases), `tests/e2e/case.spec.ts` (unchanged expectations stay green)

**Interfaces:**
- Consumes: `loopAllowed`, `loopSources`, `loopsDisabled`, `saveDataOn` (Task 1).
- Produces: `ProjectMedia({ project, title }: { project: Project; title: string })` — server render: the still through `next/image` (or `BlueprintPoster` without a poster); after mount, when `loopAllowed({ place: 'case', … })` and the project has a loop: `<video autoPlay muted loop playsInline preload="auto" poster={still} aria-hidden>` with WebM then MP4 `<source>`s, in the same 16:10 box. A media error or a rejected `play()` falls back to the still.

- [ ] **Step 1: Write the failing e2e:**
  - `a case plays its loop, muted, over its still` — `/en/work/altus` → `dialog video` has `muted`, `loop`, `poster` = `/projects/altus.webp`, `aria-hidden="true"`, and its `currentTime` grows.
  - `reduced motion and save-data show the still in the case` — no `dialog video`, the still `img` is visible.
  - `a case loop that fails to load leaves the still` (Review Focus 2) — abort the altus video requests → the still is visible, no `pageerror`.
  - `the no-WebGL card strip shows stills only` — `/en?webgl=0#work` → no `video` in the strip.
- [ ] **Step 2: Run** them — Expected: FAIL (no video in the case).
- [ ] **Step 3: Implement** `ProjectMedia` and use it in `CaseOverlay`. `ProjectCard` keeps its still.
- [ ] **Step 4: Run** `npx playwright test tests/e2e/loops.spec.ts tests/e2e/case.spec.ts --project=chromium` and the mobile project — Expected: PASS (on the Pixel 7 the case plays: the case is allowed on `low`).
- [ ] **Step 5: Commit** `feat(case): the case card plays its project's loop`

---

### Task 6: The About photo poster

**Files:**
- Create: `scripts/poster/duotone.ts`, `scripts/about-poster.mjs`, `public/about/poster.webp`, `src/ui/flow/PaperPoster.tsx`, `src/ui/flow/tornEdge.ts`
- Modify: `src/ui/sections/AboutSection.tsx` (poster first), `src/ui/flow/JourneyTrack.tsx` (swing selector adds `#about [data-flow] > .paper-poster`), `src/app/globals.css` (`.paper-poster`, tape, `transform-origin` for its swing), `messages/{en,ru,uk}.json` (`about.posterAlt`), `package.json` (`"poster": "node scripts/about-poster.mjs"`)
- Test: `tests/unit/duotone.test.ts`, `tests/unit/tornEdge.test.ts`, `tests/e2e/flow.spec.ts`

**Interfaces:**
- Produces:
  - `duotoneLut(shadow: string, highlight: string, gamma: number): Uint8Array` — 256 RGB triples from `shadow` (luminance 0) to `highlight` (255)
  - `tornEdge(seed: number, teeth: number): string` — a CSS `polygon(...)` with jagged top and bottom edges, deterministic per seed
  - `PaperPoster({ src, alt }: { src: string; alt: string })` — a `<figure class="paper-poster">` with the image, two tape strips (`aria-hidden`) and the torn clip

- [ ] **Step 1: Write the failing unit tests:**

```ts
it('the duotone runs from the shadow colour to the highlight colour', () => {
  const lut = duotoneLut('#0b0716', '#5fe1ff', 1);
  expect([...lut.slice(0, 3)]).toEqual([0x0b, 0x07, 0x16]);
  expect([...lut.slice(255 * 3, 255 * 3 + 3)]).toEqual([0x5f, 0xe1, 0xff]);
});
it('a torn edge is the same for the same seed and stays inside the box', () => {
  expect(tornEdge(7, 14)).toBe(tornEdge(7, 14));
  for (const [x, y] of points(tornEdge(7, 14))) expect(x >= 0 && x <= 100 && y >= 0 && y <= 100).toBe(true);
});
```

- [ ] **Step 2: Run** `npx vitest run tests/unit/duotone.test.ts tests/unit/tornEdge.test.ts` — Expected: FAIL (modules missing).
- [ ] **Step 3: Implement** `duotone.ts`, `tornEdge.ts`, and `scripts/about-poster.mjs`: read the source, crop to 3:4 around the face, resize to 600×800, greyscale + normalise, map through `duotoneLut('#0b0716', '#5fe1ff', γ)`, seeded film grain, WebP ≤ 120 KB (the script fails above that). Run `npm run poster` and look at the result.
- [ ] **Step 4: Write the failing e2e** in `flow.spec.ts`:
  - `About opens with Rustam's poster` — `#about [data-flow] > :first-child` is `.paper-poster`; its `img` has `alt="Rustam Aslanov"` on `/en` and `alt="Рустам Асланов"` on `/ru` and `/uk`; its width ≤ 300 px on a laptop.
  - `the poster swings in like the boxes` — `data-swing` is `out` before About, `in` once it is on screen.
  - `reduced motion: the poster is simply there` — no `swing-in` animation running on it, opacity 1.
  - the existing "no inner scrollers" test stays green.
- [ ] **Step 5: Implement** `PaperPoster`, the CSS (tilt −2.5°, tape strips, torn `clip-path`, `transform-origin: top center` for the swing), the messages, the selector; restart :3200 after editing `messages`.
- [ ] **Step 6: Run** the unit tests, `npx playwright test tests/e2e/flow.spec.ts --project=chromium` and the mobile project — Expected: PASS. Take a screenshot of About on a laptop and a phone and look at it.
- [ ] **Step 7: Commit** `feat(about): Rustam's portrait as a neon street poster`

---

### Task 7: The Gipper loop (needs Rustam)

**Files:**
- Modify: `scripts/capture/scenarios.mjs` (Gipper), `scripts/capture-loops.mjs` (`--profile=<dir>`: a persistent, visible Chromium for a logged-in session), `src/content/projects.ts` (`gipper` gets `loop: true`), `public/projects/loops.json`
- Create / replace: `public/projects/gipper.{webm,mp4,webp}`

**Interfaces:**
- Consumes: the runner from Task 2.

- [ ] **Step 1: Ask Rustam** for the demo layout's URL (a table, no client data) and a time to log in. Until then this task waits; Tasks 1–6 and 8 do not.
- [ ] **Step 2: Session.** Run `npm run loops -- --only=gipper --headed --profile=<scratchpad>/gipper-profile --url=<layout URL>`; the runner opens the page and waits until Rustam has logged in himself and says "ready".
- [ ] **Step 3: Record.** The scenario creates a table, fills cells and changes a style. If the Fabric.js canvas does not take scripted input, Rustam performs the rehearsed sequence himself in the same window while the screencast runs. Crop or cover any account name, e-mail or workspace.
- [ ] **Step 4: Delete the profile directory** right after recording; confirm it is gone.
- [ ] **Step 5:** set `loop: true` on `gipper`; `npx vitest run` — Expected: PASS. Watch the loop for any client data or account detail.
- [ ] **Step 6: Commit** `feat(capture): the Gipper editor loop`

---

### Task 8: Verification and the M3 gate

**Files:**
- Modify: `docs/superpowers/gates/2026-11-15-m3-gate.md` (create), the spec only if a ruling changed it

- [ ] **Step 1:** `npm run lint && npm run typecheck && npx vitest run` — Expected: clean, all PASS.
- [ ] **Step 2:** full `npx playwright test --project=chromium` and `--project=mobile` — Expected: all PASS.
- [ ] **Step 3:** `npm run perf` — Expected: PASS; record the Work-stop numbers with and without loops.
- [ ] **Step 4:** `npm run build` — Expected: success; note the first-load JS (should not grow beyond the player code) and the total size of `public/projects` loops.
- [ ] **Step 5:** write the M3 gate agenda: the loops on the wall and in the cases (laptop and phone), the About poster (duotone tone, size, place), Gipper's status; remind Rustam of Ctrl+Shift+R.
- [ ] **Step 6: Commit** `docs(gate): M3 agenda`
