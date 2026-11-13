# TV Wall and Street Plates Implementation Plan (Plan 2b)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat Work card strip with a 3D wall of CRT TVs the camera travels along, and restyle the HTML chrome (header, panels, case, controls) as enamel street plates.

**Architecture:**
- **Scroll.** The store keeps speaking "story progress" (every existing window, key and test stays valid). SmoothScroll maps the page's scroll position to story progress through a piecewise-linear stretch that gives each of the 10 Work stops ~40 svh, and snaps to the nearest stop inside Work.
- **Wall.** It is a separate Suspense subtree in the scene, laid out by a pure function. The camera blends from the keyframed pose onto a wall pose while in Work.
- **HTML.** The Work HTML becomes a caption board with a project pager; the old card strip survives as the no-WebGL fallback.
- **Plates.** They are CSS classes driven by CSS variables taken from `SIGNS`.

**Tech Stack:** Next.js 16.4 (App Router, read `node_modules/next/dist/docs/` before Next code), React 19, R3F + drei, three 0.187, GSAP ScrollTrigger + Lenis 1.3, zustand, Tailwind 4, next-intl 4, next/font/google, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-13-tv-wall-and-street-plates-design.md`, amending `docs/superpowers/specs/2026-11-12-portfolio-design.md`. Gate log: `docs/superpowers/gates/2026-11-12-m2-gate.md`.

## Global Constraints

**Assets**
- Free assets only (CC0, OFL). The 3D assets (`public/hdri`, `public/textures`, `public/fonts`, `public/models`) total ≤ 6 MB.
- TV models: Poly Haven CC0 `Television_01` and `television_02`, glTF 1k.

**Scroll and motion**
- Story progress (`experienceStore.progress`) keeps today's windows: `SECTIONS`, `INTRO_END = 0.15`, `TURN = 0.05`, `TRACK_FROM = 0.18`, `TRACK_TO = 0.32`.
- Only the page-scroll mapping changes. Work stops: `WORK_STOPS = PROJECTS.length + 1` (9 projects + "a small part"), `STOP_SVH = 40`. Intro, About, Stack and Contact keep their svh length (base journey = 1000 svh of scroll).
- Snap only inside the Work track, after ~150 ms of no scrolling, glide ~0.4 s. Never during a programmatic scroll; no snap animation under reduced motion.
- Reduced motion: no camera glide on the wall, no power-on wave.

**Behaviour**
- After Work the screens go to standby: level 0, dark glass, red LED. Their road streaks go dark with them.
- The wave plays on every entry into Work from outside.
- Header "Work", the WORK sign click and `#work` land on stop 0 (story `0.18`). `#work-N` (N = 1…10) lands on stop N−1.
- `?webgl=0` / lost context shows the card strip (today's `WorkSection` track) with every project.
- Every new R3F pointer handler starts with `if (overUi(e)) return …`, like `Sign.tsx`. Hover sets `document.body.style.cursor = 'pointer'`.

**Look**
- Plate navy `#17345f`, inset rule `#f4f4f4` (2 px, 3 px in from the edge), plate text white.
- The active nav plate takes its sign's `color` / `textColor` from `SIGNS` (WORK `#ff7a1a` / `#111111`, ABOUT `#111111` / `#f4f4f4`, STACK and CONTACT `#d8262b` / `#ffffff`, CV `#1c7a3c` / `#ffffff`).
- Fonts: Oswald (next/font/google, subsets latin + cyrillic) for plates and board titles; JetBrains Mono stays for body text; Anton stays only in 3D.
- Hero title block is not restyled.

**Copy and process**
- 3D text is decoration only; anything to read is HTML in en/ru/uk with the same keys (`tests/unit/messages.test.ts`).
- Frame budget: `tests/e2e/perf.spec.ts` median ≤ 33.4 ms, unchanged.
- Env: vitest runs after `cd d:/projects/portfolio`. The dev server on :3200 starts from PowerShell (see `docs/superpowers/gates/2026-11-12-m2-gate.md`) and is restarted after `messages/*.json` edits. Python edits write with `newline=''` (keep LF).

## Review Focus

1. **Pointer over HTML that sits over a TV** (caption, pager, header): no screen hover, no case opens. Test in Task 8.
2. **Programmatic scrolls never get snapped** (header jump across Work, hash link, pager, the pending scroll after a case closes). They land where they were sent. Test in Task 2.
3. **TV models or a poster fail to load:** the scene still becomes ready, Work still works from HTML, no console error loop. Test in Task 6.
4. **Closing a case opened from a TV** returns to the same stop, not stop 0 and not a neighbour. Test in Task 8.
5. **Switching language at stop k** keeps stop k (`#work-(k+1)`). Test in Task 8.

---

### Task 1: Story ↔ scroll stretch and Work stops (pure)

**Files:**
- Create: `src/experience/journey.ts`, `src/experience/workStops.ts`
- Modify: `src/experience/panels.ts` (export `TRACK_FROM`, `TRACK_TO`)
- Test: `tests/unit/journey.test.ts`, `tests/unit/workStops.test.ts`

**Interfaces:**
- Produces, `journey.ts`:
  - `BASE_SVH = 1000`, `STOP_SVH = 40`;
  - `JOURNEY_SVH: number` (scroll length after the stretch);
  - `JOURNEY_HEIGHT: string` (`${JOURNEY_SVH + 100}svh`, the `#journey` element height);
  - `storyFromScroll(s: number): number`, `scrollFromStory(q: number): number` (both clamp to 0..1).
- Produces, `workStops.ts`:
  - `WORK_STOPS: number`;
  - `stopProgress(i: number): number` (story q of stop i);
  - `stopAt(q: number): number` (nearest stop, clamped);
  - `wallPosition(q: number): number` (continuous 0..WORK_STOPS−1 with dwell `DWELL = 0.2` at each stop);
  - `snapTarget(q: number): number | null`;
  - `sectionTarget(id: SectionId): number`;
  - `hashFor(q: number): string | null`;
  - `parseHash(h: string): number | null` (story q to scroll to).

- [ ] **Step 1: Write the failing tests**

```ts
// tests/unit/journey.test.ts
import { BASE_SVH, JOURNEY_HEIGHT, JOURNEY_SVH, STOP_SVH, scrollFromStory, storyFromScroll } from '@/experience/journey';
import { WORK_STOPS } from '@/experience/workStops';
const svh = (a: number, b: number) => (scrollFromStory(b) - scrollFromStory(a)) * JOURNEY_SVH;
it('the stretch gives Work 40 svh per stop and leaves every other section its length', () => {
  expect(JOURNEY_SVH).toBeCloseTo(BASE_SVH - 140 + WORK_STOPS * STOP_SVH, 6);
  expect(JOURNEY_HEIGHT).toBe(`${JOURNEY_SVH + 100}svh`);
  expect(svh(0.18, 0.32)).toBeCloseTo(WORK_STOPS * STOP_SVH, 6);
  expect(svh(0, 0.15)).toBeCloseTo(150, 6);
  expect(svh(0.37, 0.59)).toBeCloseTo(220, 6);
  expect(svh(0.8, 1)).toBeCloseTo(200, 6);
});
it('story and scroll progress are inverse, monotonic and pinned at the ends', () => {
  for (const s of [0, 0.05, 0.13, 0.2, 0.5, 0.77, 1]) expect(scrollFromStory(storyFromScroll(s))).toBeCloseTo(s, 9);
  expect(storyFromScroll(0)).toBe(0);
  expect(storyFromScroll(1)).toBe(1);
  expect(storyFromScroll(-1)).toBe(0);
  let last = -1;
  for (let s = 0; s <= 1; s += 0.01) { const q = storyFromScroll(s); expect(q).toBeGreaterThanOrEqual(last); last = q; }
});
```

```ts
// tests/unit/workStops.test.ts
import { PROJECTS } from '@/content/projects';
import { hashFor, parseHash, sectionTarget, snapTarget, stopAt, stopProgress, wallPosition, WORK_STOPS } from '@/experience/workStops';
it('ten stops spread over the Work track', () => {
  expect(WORK_STOPS).toBe(PROJECTS.length + 1);
  expect(stopProgress(0)).toBeCloseTo(0.18, 9);
  expect(stopProgress(WORK_STOPS - 1)).toBeCloseTo(0.32, 9);
  for (let i = 0; i < WORK_STOPS; i++) expect(stopAt(stopProgress(i))).toBe(i);
  expect(stopAt(0.05)).toBe(0);
  expect(stopAt(0.9)).toBe(WORK_STOPS - 1);
});
it('the wall position holds still around each stop and moves between them', () => {
  const gap = stopProgress(1) - stopProgress(0);
  expect(wallPosition(stopProgress(3))).toBe(3);
  expect(wallPosition(stopProgress(3) + gap * 0.15)).toBe(3);
  expect(wallPosition(stopProgress(3) + gap * 0.5)).toBeCloseTo(3.5, 6);
  expect(wallPosition(0.1)).toBe(0);
  expect(wallPosition(0.5)).toBe(WORK_STOPS - 1);
});
it('snap pulls a resting scroll onto the nearest stop, only inside Work', () => {
  const gap = stopProgress(1) - stopProgress(0);
  expect(snapTarget(stopProgress(4) + gap * 0.3)).toBeCloseTo(stopProgress(4), 9);
  expect(snapTarget(stopProgress(4) + gap * 0.7)).toBeCloseTo(stopProgress(5), 9);
  expect(snapTarget(stopProgress(4))).toBeNull();
  expect(snapTarget(0.16)).toBeNull();
  expect(snapTarget(0.34)).toBeNull();
  expect(snapTarget(0.48)).toBeNull();
});
it('Work links land on the first project; hashes carry the stop', () => {
  expect(sectionTarget('work')).toBeCloseTo(0.18, 9);
  expect(sectionTarget('about')).toBeCloseTo(0.48, 9);
  expect(hashFor(stopProgress(4))).toBe('work-5');
  expect(hashFor(0.48)).toBe('about');
  expect(hashFor(0.05)).toBeNull();
  expect(parseHash('work-5')).toBeCloseTo(stopProgress(4), 9);
  expect(parseHash('work')).toBeCloseTo(0.18, 9);
  expect(parseHash('stack')).toBeCloseTo(0.695, 9);
  expect(parseHash('work-99')).toBeNull();
  expect(parseHash('nope')).toBeNull();
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `cd d:/projects/portfolio && npx vitest run tests/unit/journey.test.ts tests/unit/workStops.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement both modules.**
  - **Stretch.** Piecewise linear with three pieces: `[0, 0.18]`, `[0.18, 0.32]`, `[0.32, 1]` in story space. In svh the pieces are `180`, `WORK_STOPS * STOP_SVH` and `680`, normalised by `JOURNEY_SVH`.
  - **`wallPosition`.** `u = trackProgress(q) * (WORK_STOPS − 1)`, `k = floor(u)`, `f = u − k`. The result is `k + smoothstep(DWELL, 1 − DWELL, f)`, clamped to the last stop.
  - **`snapTarget`.** Returns null when `q <= TRACK_FROM || q >= TRACK_TO`, or when q is within 1e-6 of a stop.

- [ ] **Step 4: Run them to verify they pass**

Run: `npx vitest run tests/unit` — Expected: all pass (existing 70 + new).

- [ ] **Step 5: Commit** `feat(scroll): story/scroll stretch and Work stops`

---

### Task 2: Scroll integration: stretch, snap, Work targets, stop hashes

**Files:**
- Modify:
  - `src/scroll/SmoothScroll.tsx`;
  - `src/app/[locale]/(site)/layout.tsx` (`height: JOURNEY_HEIGHT`);
  - `src/ui/LanguageSwitch.tsx` (`href` hash from `hashFor(progress)`);
  - `src/scene/pole/Sign.tsx` (sign click uses `scrollToSection`, unchanged call; the target changes).
- Test:
  - `tests/e2e/scroll.spec.ts` (add);
  - `tests/e2e/interaction.spec.ts:13` (WORK sign now lands on 0.18).

**Interfaces:**
- Consumes: Task 1.
- Produces:
  - `scrollToProgress(q: number, immediate?: boolean)` still takes **story** progress (the test hook unchanged);
  - `scrollToSection(id)` uses `sectionTarget`;
  - the ScrollTrigger `onUpdate` writes `storyFromScroll(self.progress)`;
  - the deep link uses `parseHash`.

- [ ] **Step 1: Write the failing e2e tests** in `tests/e2e/scroll.spec.ts`

```ts
test('a scroll that stops between two Work stops settles on the nearest one', async ({ page }) => {
  await gotoScene(page); await waitReady(page);
  const gap = 0.14 / 9;
  await scrollTo(page, 0.18 + gap * 3.3);
  await page.mouse.move(720, 300); await page.mouse.wheel(0, 1); // a real (non-programmatic) scroll event, then rest
  await expect.poll(() => progress(page), { timeout: 4000 }).toBeCloseTo(0.18 + gap * 3, 3);
});
test('a header jump across Work is not bent by the snap', async ({ page }) => {
  await gotoScene(page); await waitReady(page);
  await page.getByRole('button', { name: 'About', exact: true }).click();
  await expect.poll(() => progress(page), { timeout: 8000 }).toBeCloseTo(0.48, 2);
  await page.waitForTimeout(800);
  expect(await progress(page)).toBeCloseTo(0.48, 2);
});
test('Work in the header and #work-5 land on their stops', async ({ page }) => {
  await gotoScene(page); await waitReady(page);
  await page.getByRole('button', { name: 'Work', exact: true }).click();
  await expect.poll(() => progress(page), { timeout: 8000 }).toBeCloseTo(0.18, 3);
});
test('#work-5 opens the fifth project', async ({ page }) => {
  await gotoScene(page, '/en#work-5'); await waitReady(page); // a fresh page: a hash-only goto would not remount
  await expect.poll(() => progress(page), { timeout: 8000 }).toBeCloseTo(0.18 + (0.14 / 9) * 4, 3);
});
```

Change `interaction.spec.ts:13` to expect `0.18` (to 3 digits).

- [ ] **Step 2: Run them to verify they fail**

Run: `npx playwright test --project=chromium tests/e2e/scroll.spec.ts tests/e2e/interaction.spec.ts --reporter=line`
Expected: the snap test, the Work-lands-on-stop test and the interaction test FAIL; the header-jump test may already pass, which is fine (it guards Step 3).

- [ ] **Step 3: Implement.**
  - **Mapping.** `scrollToProgress(q)` converts with `scrollFromStory` before computing `y`.
  - **Snap.** On Lenis `scroll` events from the visitor, restart a 150 ms timer. When it fires and Lenis is idle, unlocked and not in a programmatic scroll, call `lenis.scrollTo(target y, { duration: 0.4 })` with `snapTarget(story)`, or `immediate` under reduced motion.
  - **Programmatic scrolls.** `scrollToProgress` sets a flag cleared on Lenis's `onComplete`, and the snap ignores scroll events while it is set.
  - **Deep links.** Accept any hash `parseHash` understands.
  - **LanguageSwitch.** Use `hashFor`.

- [ ] **Step 4: Run** `npx playwright test --project=chromium --project=mobile --reporter=line` — Expected: all pass. This includes `mobile.spec` (swipe, rotate). The resize hold keeps story progress, so rotation still restores it.

- [ ] **Step 5: Commit** `feat(scroll): Work gets 40 svh per stop and settles on the nearest project`

---

### Task 3: Street plates: font, tokens, header, language switch

**Files:**
- Modify:
  - `src/app/[locale]/layout.tsx` (Oswald via next/font/google: `subsets: ['latin', 'cyrillic']`, `weight: ['500', '600', '700']`, `variable: '--font-oswald'`, on `<html>` next to JetBrains Mono);
  - `src/app/globals.css` (tokens + plate classes);
  - `src/ui/SiteHeader.tsx`, `src/ui/LanguageSwitch.tsx`.
- Create: `src/ui/plates.ts`
- Test: `tests/unit/plates.test.ts`, `tests/e2e/plates.spec.ts`

**Interfaces:**
- Produces `plateVars(id: SignId): Record<'--sign-bg' | '--sign-fg', string>` from `SIGNS`.
- CSS classes:
  - `plate` (small enamel plate: navy, radius 6 px, inset rule via `outline: 2px solid var(--plate-rule); outline-offset: -5px`, vertical sheen gradient, Oswald uppercase 600, tracking 0.04em);
  - `plate-sign` (switches to `var(--sign-bg)` / `var(--sign-fg)` on `[aria-current]` and on `:hover`);
  - `plate-inverse` (white plate, navy text);
  - `board` (panel: navy at 94% opacity, radius 10 px, same inset rule, two bolt dots in the top corners);
  - `board-head` (band in `var(--sign-bg)` with `var(--sign-fg)` text, Oswald 700).
- Tokens on `:root`: `--plate: #17345f`, `--plate-rule: #f4f4f4`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/unit/plates.test.ts
import { plateVars } from '@/ui/plates';
it('a plate takes its sign colours', () => {
  expect(plateVars('work')).toEqual({ '--sign-bg': '#ff7a1a', '--sign-fg': '#111111' });
  expect(plateVars('cv')).toEqual({ '--sign-bg': '#1c7a3c', '--sign-fg': '#ffffff' });
});
```

```ts
// tests/e2e/plates.spec.ts
test('nav plates are navy, the active one wears its sign colour', async ({ page }) => {
  await gotoScene(page); await waitReady(page);
  await scrollTo(page, 0.48);
  const about = page.getByRole('button', { name: 'About', exact: true });
  await expect(about).toHaveCSS('background-color', 'rgb(17, 17, 17)');
  await expect(page.getByRole('button', { name: 'Stack', exact: true })).toHaveCSS('background-color', 'rgb(23, 52, 95)');
  await scrollTo(page, 0.18);
  await expect(page.getByRole('button', { name: 'Work', exact: true })).toHaveCSS('background-color', 'rgb(255, 122, 26)');
});
test('plates are set in Oswald, with Cyrillic on /ru', async ({ page }) => {
  await gotoScene(page, '/ru');
  await expect(page.getByRole('button', { name: 'Обо мне' })).toHaveCSS('font-family', /Oswald/);
  const cyrillic = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].some((f) => /Oswald/.test(f.family) && f.status === 'loaded' && /U\+04/i.test(f.unicodeRange));
  });
  expect(cyrillic).toBe(true);
});
```

Check the RU nav label in `messages/ru.json` (`nav.about`) and use it verbatim.

- [ ] **Step 2: Run them to verify they fail** (`npx vitest run tests/unit/plates.test.ts`; `npx playwright test --project=chromium tests/e2e/plates.spec.ts`)

Expected: FAIL (no module; navy/orange colours absent; font not Oswald).

- [ ] **Step 3: Implement the plates.**
  - **Header.** Wordmark as a larger plate. Nav items, CV and languages as separate plates with a small gap, no shared frame.
  - **CV.** A `plate plate-sign` with `plateVars('cv')`: green only on hover, never `aria-current`.
  - **Languages.** The active one is `plate-inverse`.
  - **Focus.** `focus-visible` gets a white ring with a 2 px offset.
  - **Restart.** Restart the dev server if the font does not show up (new next/font import).

- [ ] **Step 4: Run** unit + `npx playwright test --project=chromium --project=mobile` — Expected: all pass. That includes `sections.spec` "header buttons show the hand cursor" and the language tests.

- [ ] **Step 5: Commit** `feat(ui): header and language switch as enamel street plates`

---

### Task 4: Boards: section panels, case overlay, controls inside

**Files:**
- Modify:
  - `src/ui/sections/SectionPanel.tsx` (board + `board-head` with `plateVars(id)`; `PanelTitle` renders inside the head band in Oswald);
  - `src/ui/sections/CaseOverlay.tsx` (board, head band `plateVars('work')`, links as plates, Close as a plate);
  - `src/ui/sections/StackSection.tsx` (chips as small plates with the inset rule);
  - `src/ui/sections/ContactSection.tsx`, `src/ui/sections/ContactForm.tsx` (inputs as dark wells with a white bottom rule; Send as `plate` with `plateVars('cv')` always on; links as plates);
  - `src/ui/sections/ProjectCard.tsx` (card frame as a plate edge).
- Test: `tests/e2e/plates.spec.ts` (add)

- [ ] **Step 1: Write the failing test**

```ts
test('each panel is a board whose head band wears its sign colour', async ({ page }) => {
  await gotoScene(page); await waitReady(page);
  for (const [p, id, bg] of [[0.48, 'about', 'rgb(17, 17, 17)'], [0.695, 'stack', 'rgb(216, 38, 43)'], [0.9, 'contact', 'rgb(216, 38, 43)']] as const) {
    await scrollTo(page, p);
    await expect(page.locator(`section#${id} [data-board-head]`)).toHaveCSS('background-color', bg);
  }
  await expect(page.getByRole('button', { name: 'Send' })).toHaveCSS('background-color', 'rgb(28, 122, 60)');
  await page.goto('/en/work/altus');
  await expect(page.getByRole('dialog').locator('[data-board-head]')).toHaveCSS('background-color', 'rgb(255, 122, 26)', { timeout: 15_000 });
});
```

- [ ] **Step 2: Run it to verify it fails.** Expected: FAIL, `[data-board-head]` not found.

- [ ] **Step 3: Implement.** Keep:
  - every `data-ui`, `inert`, `data-more` mask and `data-lenis-prevent` behaviour;
  - the dialog semantics.

  Text contrast on navy must stay AA: body text `#e8f7ff` at ≥ 85%.

- [ ] **Step 4: Run** the full chromium + mobile e2e. Expected: all pass.

  Then take scratch shots at 0.48 / 0.695 / 0.9 and a case on desktop 1440×900 and Pixel 7 (pattern: `tests/e2e/_scratch/r1.spec.ts`) and look at them. The boards must read as enamel signs, and text must not touch the inset rule.

- [ ] **Step 5: Commit** `feat(ui): panels and the case as enamel information boards`

---

### Task 5: TV models and the wall layout (pure)

**Files:**
- Create:
  - `scripts/fetch-tv-models.mjs`;
  - `public/models/tv/television_01/*`, `public/models/tv/television_02/*`;
  - `src/scene/tvwall/layout.ts`.
- Modify: `tests/unit/assetBudget.test.ts` (add `public/models`)
- Test: `tests/unit/tvWall.test.ts`

**Interfaces:**
- Produces in `src/scene/tvwall/layout.ts`:

```ts
export type TvModel = 'tv1' | 'tv2';
export interface TvModelDef {
  url: string;                       // /models/tv/television_0X/television_0X_1k.gltf
  size: [number, number, number];    // local bbox w, h, d (m)
  screen: { center: [number, number]; size: [number, number]; z: number }; // local, front of the glass
}
export const TV_MODELS: Record<TvModel, TvModelDef>;
export const WALL: { x0: 1.8; z: -1.5; scale: 1.6 };
export type ScreenContent = { kind: 'stop'; stop: number } | { kind: 'filler'; pattern: 0 | 1 | 2 | 3 };
export interface TvSlot { model: TvModel; position: [number, number, number]; yaw: number; roll: number; scale: number; content: ScreenContent; order: number }
export function wallLayout(seed?: number): TvSlot[];           // `order` = left-to-right index for the power-on wave
export function screenRect(slot: TvSlot): { center: [number, number, number]; width: number; height: number }; // world space
export function stopSlots(layout: TvSlot[]): TvSlot[];          // the WORK_STOPS stop screens, by stop
```

Stop `WORK_STOPS − 1` is the "a small part / NDA" screen.

- [ ] **Step 1: Fetch and measure the models.**
  - **Fetch.** `scripts/fetch-tv-models.mjs` downloads both 1k glTFs and their `.bin` and textures from `https://api.polyhaven.com/files/<id>` (`gltf['1k']`). It re-encodes each texture with sharp to 512 px JPEG q80 under the same file name, so the glTF stays unchanged. Then it writes them under `public/models/tv/`. Run it and record the total size.
  - **Measure.** Render each model alone in a scratch spec and measure its screen rectangle: local centre x/y, width, height and the z of the glass front. Fill `TV_MODELS`. Starting estimates:
    - tv1: bbox x −0.30…0.30, y 0…0.457, z −0.258…0.212, screen ≈ x −0.26…0.12, y 0.07…0.39;
    - tv2: bbox x −0.202…0.198, y 0…0.411, z −0.228…0.122, screen ≈ x −0.16…0.16, y 0.12…0.37.

- [ ] **Step 2: Write the failing tests**

```ts
// tests/unit/tvWall.test.ts
const layout = wallLayout(7);
const stops = stopSlots(layout);
it('one stop screen per Work stop, left to right at eye height', () => {
  expect(stops.map((s) => (s.content as { stop: number }).stop)).toEqual([...Array(WORK_STOPS).keys()]);
  const xs = stops.map((s) => screenRect(s).center[0]);
  for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThan(xs[i - 1] + 0.3);
  for (const s of stops) { const y = screenRect(s).center[1]; expect(y).toBeGreaterThan(0.8); expect(y).toBeLessThan(2.0); }
});
it('a stacked wall right of the pole: no overlaps, fillers around the stops', () => {
  expect(layout.filter((s) => s.content.kind === 'filler').length).toBeGreaterThanOrEqual(10);
  for (const s of layout) { expect(s.position[0]).toBeGreaterThanOrEqual(WALL.x0 - 0.01); expect(Math.abs(s.position[2] - WALL.z)).toBeLessThan(0.35); }
  const box = (s: TvSlot) => { const d = TV_MODELS[s.model].size; const w = (d[0] * s.scale) / 2; return [s.position[0] - w, s.position[0] + w, s.position[1], s.position[1] + d[1] * s.scale] as const; };
  for (const a of layout) for (const b of layout) if (a !== b) {
    const [ax0, ax1, ay0, ay1] = box(a); const [bx0, bx1, by0, by1] = box(b);
    expect(ax1 - 0.02 <= bx0 || bx1 - 0.02 <= ax0 || ay1 - 0.02 <= by0 || by1 - 0.02 <= ay0).toBe(true);
  }
  expect(new Set(layout.map((s) => s.order)).size).toBe(layout.length);
});
it('the layout is deterministic and the 3D assets stay within budget', () => {
  expect(wallLayout(7)).toEqual(layout);
});
```

The budget check lives in `assetBudget.test.ts` once `public/models` is added.

- [ ] **Step 3: Run them to verify they fail.** Expected: FAIL, module not found.

- [ ] **Step 4: Implement `wallLayout`.**
  - **Rows.** Three: a ground row of fillers, an eye-level row carrying the stops in order (one stop per column, with occasional filler columns between them is fine), and a top row of fillers. Models alternate by a seeded pick (`mulberry32` from `src/scene/street/random.ts`).
  - **Jitter.** Small seeded yaw ±0.08 rad, roll ±0.03 rad and x jitter that never breaks the no-overlap test.
  - **`order`.** Rank by x.

- [ ] **Step 5: Run** `npx vitest run tests/unit` — Expected: all pass, asset budget ≤ 6 MB.

- [ ] **Step 6: Commit** `feat(scene): CC0 TV models and the wall layout`

---

### Task 6: The TV wall in the scene: bodies, CRT screens, power

**Files:**
- Create:
  - `src/scene/tvwall/power.ts`, `src/scene/tvwall/crtMaterial.ts`;
  - `src/scene/tvwall/TvWall.tsx`, `src/scene/tvwall/Screens.tsx`.
- Modify:
  - `src/scene/Experience.tsx` (mount `<Suspense fallback={null}><TvWall /></Suspense>` after the main Suspense);
  - `src/experience/store.ts` (`hoveredScreen: number | null`, `setHoveredScreen`, `pendingCase: ProjectSlug | null`, `requestCase`).
- Test: `tests/unit/tvPower.test.ts`, `tests/e2e/tvwall.spec.ts`

**Interfaces:**
- Consumes: Task 5 layout, Task 1 `stopAt`, `activeSection`.
- Produces:
  - `WAVE = { step: 0.06, flash: 0.12 }` (seconds);
  - `screenLevel(o: { order: number; sinceOn: number | null; active: boolean; hovered: boolean; reduced: boolean }): number`;
  - `createCrtMaterial(o: { map: Texture | null; pattern: number; curved: boolean }): ShaderMaterial` with uniforms `uMap, uLevel, uTime, uPattern, uCurve, uCover` (cover-crop of 16:10 posters onto the screen aspect);
  - probe `wall` → `{ visible: boolean; loaded: boolean; levels: number[]; stops: { stop: number; ndc: [number, number] }[] }`;
  - store `requestCase(slug: ProjectSlug | null)` (Task 8 routes it).

- [ ] **Step 1: Write the failing unit test**

```ts
// tests/unit/tvPower.test.ts
it('standby outside Work, a left-to-right wave on entry, then bright active and dim idle screens', () => {
  expect(screenLevel({ order: 0, sinceOn: null, active: true, hovered: false, reduced: false })).toBe(0);
  expect(screenLevel({ order: 5, sinceOn: 5 * WAVE.step - 0.01, active: false, hovered: false, reduced: false })).toBe(0);
  expect(screenLevel({ order: 0, sinceOn: 0.02, active: false, hovered: false, reduced: false })).toBeGreaterThan(1);   // the flash
  const settled = 3;
  expect(screenLevel({ order: 5, sinceOn: settled, active: true, hovered: false, reduced: false })).toBe(1);
  expect(screenLevel({ order: 5, sinceOn: settled, active: false, hovered: false, reduced: false })).toBeCloseTo(0.25, 6);
  expect(screenLevel({ order: 5, sinceOn: settled, active: false, hovered: true, reduced: false })).toBeCloseTo(0.45, 6);
  expect(screenLevel({ order: 20, sinceOn: 0, active: false, hovered: false, reduced: true })).toBeCloseTo(0.25, 6);
});
```

- [ ] **Step 2: Run it to verify it fails.** Expected: FAIL.

- [ ] **Step 3: Implement `power.ts`, the material and the components.**
  - **Bodies.** One `InstancedMesh` per model from the glTF geometry and material.
  - **Project screens.** One quad each at `screenRect`, poster from `useTexture(project.poster)`, `SRGBColorSpace`, anisotropy 4. On medium/low: `curved: false`, and the poster is resized to 512 px through a canvas.
  - **The "small part" screen.** Filler pattern with "NDA" drawn by the shader or a 256 px canvas texture.
  - **Fillers.** One instanced quad with a per-instance pattern attribute.
  - **Standby.** Dark glass plus a red LED point (an emissive dot quad per TV, instanced).
  - **Visibility.** The wall is hidden until `globalReveal() >= 0.999`. Pick hiding or blueprint edges, but `visible` is false at story 0.05.
  - **Wave timing.** `sinceOn` resets when `activeSection(progress)` becomes `'work'` from anything else, and becomes `null` when it leaves.
  - **Pointer.** On a project screen: `overUi` filter, hover → `setHoveredScreen(stop)` + pointer cursor, click → `requestCase(slug)`.
  - **Compile.** After load, call `gl.compileAsync` on the wall group, so the first entry into Work does not stall.
  - **Probe.** `stops[].ndc` comes from projecting each stop screen centre with the camera.

- [ ] **Step 4: Write the e2e tests and make them pass**

```ts
// tests/e2e/tvwall.spec.ts
test('the wall is off on the blueprint, wakes in Work and sleeps after it', async ({ page }) => {
  await gotoScene(page); await waitReady(page);
  await scrollTo(page, 0.05);
  expect(((await page.evaluate(() => window.__portfolio.probe('wall'))) as { visible: boolean }).visible).toBe(false);
  await scrollTo(page, 0.18);
  await expect.poll(async () => ((await page.evaluate(() => window.__portfolio.probe('wall'))) as { levels: number[] }).levels[0], { timeout: 8000 }).toBeCloseTo(1, 1);
  await scrollTo(page, 0.48);
  await expect.poll(async () => Math.max(...((await page.evaluate(() => window.__portfolio.probe('wall'))) as { levels: number[] }).levels)).toBe(0);
});
// Review Focus 3
test('a wall whose models fail to load leaves the site working', async ({ page }) => {
  await page.route('**/models/tv/**', (r) => r.abort());
  await gotoScene(page); await waitReady(page);
  await scrollTo(page, 0.18);
  await expect(page.locator('section#work')).toBeVisible();
});
```

Run: `npx playwright test --project=chromium tests/e2e/tvwall.spec.ts` — Expected: PASS. Then run the full chromium + mobile suite; it stays green.

- [ ] **Step 5: Commit** `feat(scene): a wall of CRT TVs that wakes in Work`

---

### Task 7: The camera on the wall

**Files:**
- Create: `src/scene/tvwall/camera.ts`
- Modify:
  - `src/scene/CameraRig.tsx` (blend through `onWall`);
  - `src/experience/panels.ts` (`frameShift('work', …)` on wide screens → `{ x: 0, y: 0 }`).
- Test: `tests/unit/wallCamera.test.ts`, `tests/unit/panels.test.ts` (update the work line)

**Interfaces:**
- Consumes: Task 1 `wallPosition`, `stopProgress`; Task 5 `stopSlots`, `screenRect`, `wallLayout`.
- Produces (and `choreography.ts` now exports its `Vec3` and `Pose = { position: Vec3; target: Vec3 }` types):

```ts
export const WALL_IN: readonly [number, number];   // [0.155, 0.18]
export const WALL_OUT: readonly [number, number];  // [0.32, 0.35]
export function wallWeight(q: number, reduced: boolean): number;
export function wallPose(s: number, aspect: number): Pose;    // Pose = { position: Vec3; target: Vec3 }
export function onWall(q: number, base: Pose, aspect: number, reduced: boolean): Pose;
```

On wide screens the camera sits straight in front of the screen, at a distance where the TV fills about 55% of the frame width. On portrait screens it is close enough that the TV fills about 85%. Between stops `s` is fractional and the pose interpolates.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/unit/wallCamera.test.ts
const stops = stopSlots(wallLayout(7));
const base = { position: [1, 3.4, 4.6] as Vec3, target: [0, 3.4, 0] as Vec3 };
it('at each stop the camera looks straight at its screen', () => {
  for (let i = 0; i < WORK_STOPS; i++) {
    const c = screenRect(stops[i]).center;
    const p = onWall(stopProgress(i), base, 16 / 9, false);
    expect(p.target[0]).toBeCloseTo(c[0], 3); expect(p.target[1]).toBeCloseTo(c[1], 3);
    expect(p.position[0]).toBeCloseTo(c[0], 3); expect(p.position[2]).toBeGreaterThan(c[2] + 1);
  }
});
it('the wall pose blends in before the first stop and out before the turn to About', () => {
  expect(wallWeight(0.15, false)).toBe(0); expect(wallWeight(0.18, false)).toBe(1);
  expect(wallWeight(0.25, false)).toBe(1); expect(wallWeight(0.35, false)).toBe(0); expect(wallWeight(0.48, false)).toBe(0);
  for (let q = 0.14; q < 0.36; q += 0.0005) {
    const a = onWall(q, base, 16 / 9, false).position; const b = onWall(q + 0.0005, base, 16 / 9, false).position;
    expect(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])).toBeLessThan(0.25);
  }
});
it('reduced motion holds the nearest stop; a portrait screen comes closer', () => {
  const gap = stopProgress(1) - stopProgress(0);
  expect(onWall(stopProgress(2) + gap * 0.4, base, 16 / 9, true)).toEqual(onWall(stopProgress(2), base, 16 / 9, true));
  const wide = onWall(stopProgress(2), base, 16 / 9, false); const tall = onWall(stopProgress(2), base, 0.46, false);
  expect(tall.position[2] - tall.target[2]).toBeLessThan(wide.position[2] - wide.target[2]);
});
```

Change `panels.test.ts`: `expect(frameShift('work', 0.5, wide)).toEqual({ x: 0, y: 0 })`.

- [ ] **Step 2: Run them to verify they fail**, then **Step 3: implement**. `CameraRig` computes `base` exactly as today, including `fitDistance`, then calls `pose = onWall(progress, base, aspect, reducedMotion)`. The wall pose ignores `fitDistance`, since its own distance already depends on the aspect.

- [ ] **Step 4: Run** unit + full e2e. `sections.spec.ts:52` ("HTML over a sign swallows the pointer") scrolls to 0.26, where the camera now faces the wall, not the WORK sign. Move it to 0.48 with the ABOUT sign. Expected: all pass. Then take a scratch shot at stops 0, 4 and 9 on desktop and Pixel 7, and look: the screen must be centred, readable and not covered by the caption area (bottom-left ~34 rem on wide, bottom sheet on phones).

- [ ] **Step 5: Commit** `feat(scene): the camera travels along the TV wall`

---

### Task 8: Work HTML: caption board, pager, TV click, fallback strip

**Files:**
- Create:
  - `src/ui/sections/WorkWall.tsx` (caption + pager);
  - `src/ui/sections/WorkTrack.tsx` (today's track code moved out of `WorkSection.tsx` unchanged);
  - `src/ui/sections/WorkPanel.tsx` (client wrapper: `SectionPanel` with layout `caption` when `webgl`, else `bottom`).
- Modify:
  - `src/ui/sections/WorkSection.tsx` (picks `WorkWall` or `WorkTrack` by `webgl`);
  - `src/ui/sections/SectionPanel.tsx` (layout `caption`: narrow = bottom sheet, wide = `wide:inset-x-auto wide:left-6 wide:bottom-6 wide:w-[min(34rem,40vw)]`);
  - `src/app/[locale]/(site)/layout.tsx` (use `WorkPanel`);
  - `messages/{en,ru,uk}.json` (`work.pager`: "Projects" / "Проекты" / "Проєкти").
- Test: `tests/e2e/work.spec.ts` (rewrite), `tests/e2e/case.spec.ts:5-20`

**Interfaces:**
- Consumes:
  - store `pendingCase` / `requestCase`, `hoveredScreen`;
  - Task 1 `stopAt`, `stopProgress`, `WORK_STOPS`;
  - copy keys `work.open`, `work.more`, `work.ndaTitle`, `work.nda.*`, `work.commercial|course|private|inDevelopment`.
- Produces: `WorkWall` re-renders only when `stopAt(progress)` changes (store subscription + state).
  - Caption contents: `NN / 09`, title (an `h3`; the panel's `h2` stays "Examples of work"), kind, year, badges, `Open case` link (`/work/<slug>`, `scroll={false}`, `prefetch`).
  - On stop 10 it shows `work.more` and the NDA list.
  - Pager: buttons `01`…`09` with `aria-label` = project title and `aria-current` on the active one. Each button calls `scrollToProgress(stopProgress(i), reducedMotion)`.
  - It routes `pendingCase` with `router.push('/work/<slug>', { scroll: false })` and clears it.

- [ ] **Step 1: Write the failing e2e tests** (rewrite `work.spec.ts`)

```ts
test('each stop captions its project; the last one is "a small part"', async ({ page }) => {
  await gotoScene(page); await waitReady(page);
  for (const [i, name] of [[0, 'Gipper'], [3, 'Speca.bike'], [8, 'DevDigest']] as const) {
    await scrollTo(page, stop(i));
    await expect(page.locator('section#work h3')).toHaveText(name);
  }
  await scrollTo(page, stop(9));
  await expect(page.getByText(/small part/i)).toBeVisible();
});
test('the pager jumps to a project from the keyboard', async ({ page }) => {
  await gotoScene(page); await waitReady(page); await scrollTo(page, stop(0));
  await page.getByRole('button', { name: 'Kolir' }).focus(); await page.keyboard.press('Enter');
  await expect.poll(() => progress(page), { timeout: 6000 }).toBeCloseTo(stop(6), 3);
});
test('clicking the lit TV opens its case; closing returns to the same stop', async ({ page }) => {  // Review Focus 4
  await gotoScene(page); await waitReady(page); await scrollTo(page, stop(2));
  const { stops } = (await page.evaluate(() => window.__portfolio.probe('wall'))) as { stops: { stop: number; ndc: [number, number] }[] };
  const [x, y] = stops[2].ndc; const vp = page.viewportSize()!;
  await page.mouse.click(((x + 1) / 2) * vp.width, ((1 - y) / 2) * vp.height);
  await expect(page).toHaveURL(/\/en\/work\/gengo$/, { timeout: 15_000 });
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/en$/, { timeout: 15_000 });
  expect(await progress(page)).toBeCloseTo(stop(2), 3);
});
test('HTML over a TV keeps the pointer: no hover, no case', async ({ page }) => {  // Review Focus 1
  await gotoScene(page); await waitReady(page); await scrollTo(page, stop(0));
  const box = (await page.locator('section#work').boundingBox())!;
  await page.mouse.click(box.x + 10, box.y + 10);
  await page.waitForTimeout(500);
  await expect(page).toHaveURL(/\/en$/);
  expect(await page.evaluate(() => window.__portfolio.state().hoveredScreen)).toBeNull();
});
test('switching language at a stop keeps the stop', async ({ page }) => {  // Review Focus 5
  await gotoScene(page); await waitReady(page); await scrollTo(page, stop(4));
  await page.getByRole('link', { name: 'RU', exact: true }).click();
  await expect(page).toHaveURL(/\/ru#work-5$/);
  await expect.poll(() => progress(page), { timeout: 10_000 }).toBeCloseTo(stop(4), 3);
});
test('without WebGL the card strip lists every project', async ({ page }) => {
  await page.goto('/en?webgl=0#work'); await page.waitForFunction(() => !!window.__portfolio);
  await expect(page.locator('section#work li a')).toHaveCount(9);
});
```

Here `stop(i) = 0.18 + (0.14 / 9) * i`; add the helper to `tests/e2e/helpers.ts`.

Rewrite `case.spec.ts` "a case opens over the scene…" to click `Open case` at `stop(0)` instead of the Gipper card. Check the place where the HTML caption covers a TV: if the caption is too small to cover any TV on the 1440×800 shot, click the header's wordmark area over the wall instead and keep the assertion.

- [ ] **Step 2: Run them to verify they fail.** Expected: FAIL (no caption `h3`, no pager, no `#work-5`, no click routing).

- [ ] **Step 3: Implement.** Keep the `track` probe and today's `work.spec` assertions working for `WorkTrack` under `?webgl=0`. A `webglcontextlost` mid-visit flips `webgl` false, and the strip replaces the caption.

- [ ] **Step 4: Run** unit + full chromium + mobile e2e — Expected: all pass. Restart the dev server first (messages changed).

- [ ] **Step 5: Commit** `feat(work): caption board and pager for the TV wall, card strip as fallback`

---

### Task 9: The wall's light on the wet road

**Files:**
- Create: `src/scene/tvwall/WallStreaks.tsx`
- Modify: `src/scene/street/layout.ts` (add `wallStreaks(layout: TvSlot[])`), `src/scene/street/Streaks.tsx` (export `streakTexture`)
- Test: `tests/unit/streetLayout.test.ts` (add)

**Interfaces:**
- Produces `wallStreaks(layout): { x: number; zFar: number; length: number; width: number; stop: number }[]`: one per stop screen, starting under its TV and reaching toward the camera.
- `WallStreaks` multiplies each streak's opacity by its screen's `screenLevel`. The colour is the poster's average, taken once from a 1×1 canvas draw of the loaded texture.

- [ ] **Step 1: Write the failing test**

```ts
it('each lit screen throws one streak on the road, toward the viewer', () => {
  const layout = wallLayout(7); const s = wallStreaks(layout); const stops = stopSlots(layout);
  expect(s.map((x) => x.stop)).toEqual([...Array(WORK_STOPS).keys()]);
  s.forEach((x, i) => { expect(x.x).toBeCloseTo(screenRect(stops[i]).center[0], 3); expect(x.zFar).toBeLessThanOrEqual(WALL.z + 0.1); expect(x.length).toBeGreaterThan(1); });
});
```

- [ ] **Step 2–4:** fail → implement → run unit + `tvwall.spec` (streak opacity follows standby: extend the `wall` probe with `streaks: number[]`, assert max 0 at 0.48). Expected: pass.
- [ ] **Step 5: Commit** `feat(scene): the TV wall glows on the wet road`

---

### Task 10: Verification, performance, gate round 2

- [ ] **Step 1:** Add the stop perf test to `tests/e2e/perf.spec.ts`: `'standing at a Work stop keeps at least 30 fps'`. It scrolls to `stop(3)`, waits 3 s, records 3 s of rAF deltas, and expects the median ≤ 33.4 ms; the report goes to `test-results/perf.json`.

- [ ] **Step 2:** Run all of the following and read the output. Expected: everything green; perf within budget, or a ledgered ruling if the GPU is visibly busy (as in Plan 2: re-measure the pre-change commit to tell the two apart).
  - `npm run lint`;
  - `npx tsc --noEmit`;
  - `npx vitest run`;
  - `npx playwright test --project=chromium --project=mobile`;
  - `npm run perf`;
  - `npm run build` (JS ≤ 1.6 MB as in Plan 2).

- [ ] **Step 3:** Run the scratch shots, desktop 1440×900 and Pixel 7, EN and RU. Points:
  - the blueprint, WORK sign, stops 0 / 4 / 9;
  - About, Stack, Contact;
  - a case overlay;
  - the `?webgl=0` strip.

  Look at each one for: legibility, plates not touching text, no lit wall outside Work, Cyrillic in Oswald.

- [ ] **Step 4:** Final whole-branch review per superpowers:executing-plans (fresh reviewer, Review Focus above verbatim), one fix pass, ledger.

- [ ] **Step 5:** Gate round 2. Log it in `docs/superpowers/gates/2026-11-12-m2-gate.md` and show Rustam on :3200 and the LAN URL. Rulings and deferred minors go in the hand-off message.
