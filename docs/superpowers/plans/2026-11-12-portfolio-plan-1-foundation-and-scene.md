# Portfolio · Plan 1: Foundation + 3D Scene (M0 + M1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Next.js project with the full-screen 3D night-street signpost scene, which scroll rotates and renders from blueprint wireframe to neon PBR. This scene is what Rustam judges at the M1 "wow" gate.

**Architecture:** One page per locale. A fixed, `aria-hidden` R3F canvas sits behind a tall scroll track. Lenis + GSAP ScrollTrigger turn scroll into a single `progress` (0..1) in a zustand store. Pure, unit-tested functions in `src/experience/` map `progress` to everything the scene shows: pole yaw, camera pose, reveal amount, traffic-light state and active section. Scene components only read the store and damp toward those targets. The architecture mirrors Rustam's own `_sources/aslanair`: experience store, pure choreography, QualityGovernor, test hooks, and Playwright on the real GPU.

**Tech Stack:** Next.js 16.4.6, React 19.3.1, TypeScript 5.9.3, Tailwind 4, three 0.187.0, @react-three/fiber 9.8.2, @react-three/drei 10.7.9, @react-three/postprocessing 3.2.2, n8ao 2.0.1, gsap 3.15.1 + @gsap/react 2.1.2, lenis 1.3.27, zustand 5.1.0, maath 0.10.8, next-intl 4.15.1, simple-icons 16.37.0, Vitest 5.1.0, Playwright 1.65.0, r3f-perf 7.2.3.

**Spec:** `docs/superpowers/specs/2026-11-12-portfolio-design.md` (approved). This plan covers spec §13 milestones **M0 and M1 only**. Plan 2 (content, i18n copy, Work, Contact) is written after the M1 gate passes.

**Out of scope for Plan 1:** content sections (Work, About, Stack, Contact HTML), the contact form, project videos, ChatGPT textures, the photo poster, the statue easter egg, KTX2 conversion, static fallback frames, SEO/OG, the Vercel deploy. All of these come in later plans.

## Global Constraints

- Dark theme only. Palette: background near-black `#050507`; neon orange-red `#ff5a1f` / `#ff7a1a` (primary accent); blueprint background `#0b1f38`, blueprint lines `#7fe3ff` / `#bfe9ff` (secondary accent); green `#1fd16a` **only** at the finale (green traffic light).
- Free assets only: CC0 (Poly Haven) or OFL fonts. No paid models, textures or fonts.
- Geometry is built in code (three.js / R3F). Blender is a fallback only and is not used in this plan.
- Sign labels are always English: `WORK`, `ABOUT`, `STACK`, `CONTACT`, `CV`.
- Locales: `en` (default), `ru`, `uk`, routed as `/en`, `/ru`, `/uk`.
- The canvas is `aria-hidden="true"`. All meaningful text lives in the DOM.
- Performance: 60 FPS target on a mid laptop (Intel Iris Xe / Apple M1 class), ≥30 FPS on a mid phone. DPR never above 1.75. LCP < 2.5 s. 3D assets (textures + HDRI + fonts in `public/`) ≤ 6 MB total.
- `prefers-reduced-motion: reduce` → no scroll-scrubbed rotation or glide. The scene shows fully rendered, and the pole snaps to the active section.
- Secrets never go in the repo (`.env*` ignored). `_sources/`, `examples/` and `.superpowers/` are git-ignored.
- **Next.js 16 has breaking changes vs. older Next** (e.g. `proxy.ts` replaces `middleware.ts`, `params` is a Promise, `next lint` is gone). Before writing Next-specific code, read the relevant guide in `node_modules/next/dist/docs/`.
- Exact dependency versions as listed in Tech Stack (`--save-exact`). TypeScript stays on 5.9.3; do not adopt TS 7.

## Review Focus

1. **Window resize / orientation change mid-scroll**: progress, active section and pole yaw stay where they were (±0.02). → test in Task 5.
2. **Keyboard jumps and fast flicks** (End / Home / PageDown, trackpad flick): the pole lands on the right sign without extra spins. The traffic light ends green after `End`. → test in Task 5 + probe check in Task 8.
3. **Reload mid-page**: the page always starts at progress 0 (manual scroll restoration), with no half-rendered state. → test in Task 5.
4. **Phone touch scroll** with the collapsing address bar: progress moves forward on swipe, no ScrollTrigger refresh jitter (`ignoreMobileResize`, `svh` units), no console errors. → test in Task 6 (mobile project).
5. **WebGL context loss** (GPU reset, many tabs): the page swaps to the fallback instead of a frozen black canvas. → test in Task 12.

---

## File map (created by this plan)

```
.github/workflows/ci.yml
messages/en.json · ru.json · uk.json
scripts/fetch-assets.mjs · assets.manifest.json
public/hdri/ · public/textures/ · public/fonts/          (fetched, committed, CC0/OFL)
src/proxy.ts
src/i18n/routing.ts · request.ts
src/app/[locale]/layout.tsx · page.tsx · globals.css
src/experience/store.ts · choreography.ts · signs.ts · quality.ts · webgl.ts
src/scroll/SmoothScroll.tsx
src/dev/testHooks.ts · sceneProbe.ts
src/scene/Experience.tsx · CameraRig.tsx · Lighting.tsx · Effects.tsx · QualityGovernor.tsx · Ready.tsx
src/scene/street/Street.tsx · Asphalt.tsx · Skyline.tsx · Particles.tsx
src/scene/pole/Pole.tsx · Sign.tsx · TrafficLight.tsx · geometry.ts · materials.ts · parts.ts
src/scene/stickers/stickers.ts · icons.ts · atlas.ts · Stickers.tsx
src/scene/reveal/revealMaterial.ts · Blueprint.tsx · EdgesOverlay.tsx
src/ui/Hero.tsx · Loader.tsx · Fallback.tsx · ExperienceGate.tsx
tests/unit/*.test.ts · tests/e2e/*.spec.ts · tests/e2e/helpers.ts
vitest.config.ts · playwright.config.ts
```

---

### Task 1: Repository and Next.js scaffold

**Files:**
- Create: `.gitignore`, `vitest.config.ts`, `playwright.config.ts`, `.github/workflows/ci.yml`, plus the create-next-app output moved to the root
- Test: (harness only; real tests start in Task 2)

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `e2e`, `e2e:mobile`, `perf`, `shots`, `prod`, `assets`; the `@/*` → `src/*` alias; Playwright projects `chromium`, `mobile`, `perf`, `shots`, `prod`.

- [ ] **Step 1: `git init` in `d:\projects\portfolio`** and write `.gitignore` with: `node_modules/`, `.next/`, `out/`, `.env*` (plus `!.env.example`), `_sources/`, `examples/`, `.superpowers/`, `test-results/`, `playwright-report/`, `*.tsbuildinfo`, `next-env.d.ts`.

- [ ] **Step 2: Scaffold into a temp folder and move up** (create-next-app refuses a non-empty dir):

```bash
npx create-next-app@16.4.6 _scaffold --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-git --yes
```
Move every file and dotfile from `_scaffold/` to the root (merge `.gitignore` lines, keep ours), then delete `_scaffold/`.

- [ ] **Step 3: Pin dependencies**

```bash
npm i --save-exact next@16.4.6 react@19.3.1 react-dom@19.3.1 three@0.187.0 @react-three/fiber@9.8.2 @react-three/drei@10.7.9 @react-three/postprocessing@3.2.2 postprocessing@6.39.6 n8ao@2.0.1 gsap@3.15.1 @gsap/react@2.1.2 lenis@1.3.27 zustand@5.1.0 maath@0.10.8 next-intl@4.15.1 simple-icons@16.37.0
npm i -D --save-exact typescript@5.9.3 @types/three@0.187.0 vitest@5.1.0 @playwright/test@1.65.0 r3f-perf@7.2.3 @fontsource/anton@5.3.0 @fontsource/jetbrains-mono@5.3.0 eslint-config-next@16.4.6
npx playwright install chromium
```

- [ ] **Step 4: Scripts in `package.json`:** `"lint": "eslint ."`, `"typecheck": "tsc --noEmit"`, `"test": "vitest run --passWithNoTests"`, `"e2e": "playwright test --project=chromium"`, `"e2e:mobile": "playwright test --project=mobile"`, `"perf": "playwright test --project=perf"`, `"shots": "playwright test --project=shots"`, `"prod": "next build && playwright test --project=prod"`, `"assets": "node scripts/fetch-assets.mjs"`.

- [ ] **Step 5: `vitest.config.ts`**: alias `@` → `./src`, `environment: 'node'`, `include: ['tests/unit/**/*.test.ts']`.

- [ ] **Step 6: `playwright.config.ts`**, modelled on `_sources/aslanair/playwright.config.ts`:
  - Desktop device: Desktop Chrome, `channel: 'chromium'`, viewport 1440×800, launch args `--enable-gpu --use-angle=d3d11 --ignore-gpu-blocklist` (real GPU, not SwiftShader).
  - `workers: 2`, `timeout: 90_000`, `testDir: 'tests/e2e'`.
  - Projects:
    - `chromium`: ignores `perf|mobile|shots|prod` specs.
    - `mobile`: Pixel 7, same GPU args, matches `mobile.spec.ts`.
    - `perf`: desktop + `--force_low_power_gpu`, matches `perf.spec.ts`.
    - `shots`: desktop, matches `shots.spec.ts`.
    - `prod`: desktop, baseURL `http://localhost:3300`, matches `prod.spec.ts`.
  - `webServer`, as an array:
    - dev: `npm run dev -- -p 3200` with env `NEXT_PUBLIC_TEST_HOOKS=1`, `reuseExistingServer: true`.
    - prod: `npx next start -p 3300`, included only when the run targets the prod project (`const prodRun = process.argv.some((a) => a.includes('prod'))`). Do not use an env-var prefix in npm scripts: it does not work in Windows `cmd`.

- [ ] **Step 7: `.github/workflows/ci.yml`**: on push and pull_request, Node 24, `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. E2E is not run in CI (it needs a real GPU).

- [ ] **Step 8: Verify**

Run: `npm run lint && npm run typecheck && npm test && npm run build`
Expected: all exit 0.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 16 portfolio with pinned deps, Vitest, Playwright, CI"
```

---

### Task 2: Locale routing skeleton (next-intl)

**Files:**
- Create: `src/i18n/routing.ts`, `src/i18n/request.ts`, `src/proxy.ts`, `messages/en.json`, `messages/ru.json`, `messages/uk.json`, `src/app/[locale]/layout.tsx`, `src/app/[locale]/page.tsx`
- Modify: `next.config.ts` (wrap with `createNextIntlPlugin('./src/i18n/request.ts')`); move `src/app/globals.css` to `src/app/[locale]/globals.css` (or keep it and import it from the locale layout); delete the scaffold `src/app/page.tsx` and `src/app/layout.tsx`
- Test: `tests/unit/messages.test.ts`, `tests/e2e/i18n.spec.ts`

**Interfaces:**
- Produces: `routing` (`locales: ['en','ru','uk']`, `defaultLocale: 'en'`); a `[locale]` layout that sets `<html lang>`, the JetBrains Mono font (`next/font/google`, subsets `latin` + `cyrillic`, CSS var `--font-mono`), `NextIntlClientProvider`, and metadata from `meta.*`; message keys used by later tasks: `meta.title`, `meta.description`, `hero.name`, `hero.role`, `hero.cue`, `loader.label`, `fallback.title`, `fallback.body`.

- [ ] **Step 1: Write the messages.** Exact copy:

| key | en | ru | uk |
|---|---|---|---|
| meta.title | Rustam Aslanov — Front-end engineer | Рустам Асланов — Front-end разработчик | Рустам Асланов — Front-end розробник |
| meta.description | Portfolio of Rustam Aslanov, front-end engineer: React, Next.js, three.js. | Портфолио Рустама Асланова, front-end разработчика: React, Next.js, three.js. | Портфоліо Рустама Асланова, front-end розробника: React, Next.js, three.js. |
| hero.name | Rustam Aslanov | Rustam Aslanov | Rustam Aslanov |
| hero.role | Front-end engineer | Front-end разработчик | Front-end розробник |
| hero.cue | Scroll to render | Скролль, чтобы отрендерить | Гортай, щоб відрендерити |
| loader.label | Rendering | Рендеринг | Рендеринг |
| fallback.title | This street needs WebGL2 | Этой улице нужен WebGL2 | Цій вулиці потрібен WebGL2 |
| fallback.body | Open the site in a recent Chrome, Edge, Firefox or Safari to see the 3D scene. | Откройте сайт в свежем Chrome, Edge, Firefox или Safari, чтобы увидеть 3D-сцену. | Відкрийте сайт у свіжому Chrome, Edge, Firefox або Safari, щоб побачити 3D-сцену. |

(The name stays in Latin script in every locale: it is a brand mark drawn in the blueprint art.)

- [ ] **Step 2: Write the failing unit test** `tests/unit/messages.test.ts`:

```ts
import en from '../../messages/en.json';
import ru from '../../messages/ru.json';
import uk from '../../messages/uk.json';

const keys = (o: object, p = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' ? keys(v, `${p}${k}.`) : [`${p}${k}`])).sort();
const values = (o: object): unknown[] => Object.values(o).flatMap((v) => (typeof v === 'object' ? values(v) : [v]));

it('ru and uk have exactly the en keys', () => {
  expect(keys(ru)).toEqual(keys(en));
  expect(keys(uk)).toEqual(keys(en));
});
it('no message is empty', () => {
  for (const m of [en, ru, uk]) for (const v of values(m)) expect(String(v).trim()).not.toBe('');
});
```

- [ ] **Step 3: Run** `npx vitest run tests/unit/messages.test.ts`. Expected: FAIL until the message files exist, then PASS after Step 1. (If Step 1 is already done, temporarily delete one key from `uk.json` to see the failure, then restore it.)

- [ ] **Step 4: Implement routing.** `src/i18n/routing.ts` (`defineRouting`), `src/i18n/request.ts` (`getRequestConfig`, loads `messages/${locale}.json`), `src/proxy.ts` (next-intl middleware, matcher excluding `_next`, `api` and files with extensions; check the Next 16 docs and the next-intl 4 docs for the `proxy.ts` form), `src/app/[locale]/layout.tsx` with `generateStaticParams` over the locales and `setRequestLocale`, and `page.tsx` rendering `<h1>{t('hero.name')}</h1><p>{t('hero.role')}</p>` as a placeholder.

- [ ] **Step 5: Write the e2e test** `tests/e2e/i18n.spec.ts`:

```ts
test('/ redirects to /en', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/en$/);
});
for (const [loc, role] of [['ru', 'Front-end разработчик'], ['uk', 'Front-end розробник']] as const) {
  test(`/${loc} renders its language`, async ({ page }) => {
    await page.goto(`/${loc}`);
    await expect(page.locator('html')).toHaveAttribute('lang', loc);
    await expect(page.getByText(role)).toBeVisible();
  });
}
```

- [ ] **Step 6: Run** `npm test && npx playwright test tests/e2e/i18n.spec.ts --project=chromium`. Expected: PASS.

- [ ] **Step 7: Commit** `git commit -am "feat(i18n): en/ru/uk locale routing with next-intl"` (add the new files first).

---

### Task 3: Experience store, sign config, choreography (pure logic)

**Files:**
- Create: `src/experience/store.ts`, `src/experience/signs.ts`, `src/experience/choreography.ts`
- Test: `tests/unit/choreography.test.ts`, `tests/unit/signs.test.ts`

**Interfaces:**
- Produces (exact):

```ts
// signs.ts
export type SectionId = 'work' | 'about' | 'stack' | 'contact';
export type SignId = SectionId | 'cv';
export type SignShape = 'arrow' | 'rect' | 'octagon' | 'square';
export interface SignDef {
  id: SignId; label: string; shape: SignShape;
  width: number; height: number;   // metres
  y: number;                       // height of the sign centre on the pole
  facing: number;                  // radians: direction of the sign's face normal around the pole (0 = towards +z / camera)
  tilt: number;                    // radians, in-plane roll for a hand-mounted look
  color: string; textColor: string; border?: string;
}
export const SIGNS: readonly SignDef[];
export const POLE = { height: 5.2, radius: 0.06 } as const;

// store.ts  (zustand vanilla store + hook)
export type LightState = 'off' | 'red' | 'yellow' | 'green';
export type Tier = 'high' | 'medium' | 'low';
export interface ExperienceState {
  progress: number; tier: Tier; reducedMotion: boolean; ready: boolean;
  hoveredSign: SignId | null; webgl: boolean;
  setProgress(p: number): void; setTier(t: Tier): void; setReducedMotion(v: boolean): void;
  setReady(v: boolean): void; setHoveredSign(id: SignId | null): void; setWebgl(v: boolean): void;
}
export const experienceStore: import('zustand').StoreApi<ExperienceState>;
export function useExperience<T>(selector: (s: ExperienceState) => T): T;

// choreography.ts
export const INTRO_END = 0.15;
export const TURN = 0.05; // width of the turn window around each section boundary
export const SECTIONS: readonly { id: SectionId; start: number; end: number; center: number }[];
export function activeSection(p: number): SectionId | null;
export function sectionCenter(id: SectionId): number;
export function lightState(p: number): LightState;
export function revealProgress(p: number): number;
export function partReveal(reveal: number, index: number, count: number, overlap?: number): number;
export function poleYaw(p: number): number;
export function cameraPose(p: number): { position: [number, number, number]; target: [number, number, number] };
export function damp(current: number, target: number, lambda: number, dt: number): number;
```

Values: `setProgress` clamps to [0,1].

`SIGNS` (initial values, tuned at the gate; the tests pin only labels, order and facing):

| id | label | shape | w × h | y | facing | tilt | color | text | border |
|---|---|---|---|---|---|---|---|---|---|
| stack | STACK | octagon | 0.9 × 0.9 | 3.8 | π | 0.14 | #d8262b | #ffffff | #ffffff |
| work | WORK | arrow | 1.5 × 0.42 | 3.4 | 0 | −0.08 | #ff7a1a | #111111 | — |
| about | ABOUT | rect | 1.4 × 0.46 | 2.9 | π/2 | 0.10 | #111111 | #f4f4f4 | #f4f4f4 |
| contact | CONTACT | rect | 1.5 × 0.40 | 2.4 | 3π/2 | −0.06 | #d8262b | #ffffff | — |
| cv | CV | square | 0.5 × 0.5 | 1.9 | 3π/2 + π/6 | 0.05 | #1c7a3c | #ffffff | #ffffff |

`SECTIONS`: work [0.15, 0.37) centre 0.26 · about [0.37, 0.59) centre 0.48 · stack [0.59, 0.80) centre 0.695 · contact [0.80, 1] centre 0.9.

`poleYaw` algorithm (not determined by the signature): yaw that faces section *s* is `−facing(s)`. On [0, INTRO_END] it goes from `π` (half turn away from WORK) to `0` with easeInOutCubic. After that it holds `−facing(active section)`, except inside `[b − TURN/2, b + TURN/2]` around each boundary *b* ∈ {0.37, 0.59, 0.80}. There it eases (easeInOutCubic) from the previous section's yaw to the next one's. The result is monotonic, non-increasing.

`cameraPose` keys (initial, tuned at the gate), interpolated with smoothstep between neighbours:

| p | position | target |
|---|---|---|
| 0 | [0, 2.6, 9.5] | [0, 2.6, 0] |
| 0.15 | [1.4, 3.0, 6.2] | [0, 3.0, 0] |
| 0.26 | [1.0, 3.4, 4.6] | [0, 3.4, 0] |
| 0.48 | [1.0, 2.9, 4.6] | [0, 2.9, 0] |
| 0.695 | [1.0, 3.8, 4.8] | [0, 3.8, 0] |
| 0.85 | [0.6, 2.6, 4.8] | [0, 2.6, 0] |
| 1 | [0, 4.6, 3.4] | [0, 4.7, 0] |

`damp`: `current + (target − current) * (1 − exp(−lambda * min(dt, 0.1)))`. The dt clamp keeps a returning hidden tab from jumping.

`partReveal(reveal, i, n, overlap = 0.5)`: window width `w = 1 / (n − (n − 1) * overlap)`, start `i * w * (1 − overlap)`, result `clamp((reveal − start) / w, 0, 1)`.

`revealProgress(p)`: `easeInOutCubic(clamp(p / INTRO_END, 0, 1))`.

`lightState(p)`: `p < 0.02` → off · `< 0.15` → red · `< 0.80` → yellow · else green.

- [ ] **Step 1: Write the failing tests** `tests/unit/signs.test.ts` and `tests/unit/choreography.test.ts`:

```ts
// signs.test.ts
it('labels are the fixed English set, top to bottom', () => {
  expect([...SIGNS].sort((a, b) => b.y - a.y).map((s) => s.label)).toEqual(['STACK', 'WORK', 'ABOUT', 'CONTACT', 'CV']);
});
it('section signs face four different directions', () => {
  const f = SIGNS.filter((s) => s.id !== 'cv').map((s) => s.facing);
  expect(new Set(f).size).toBe(4);
});
it('every sign sits on the pole below the traffic light', () => {
  for (const s of SIGNS) expect(s.y + s.height / 2).toBeLessThan(POLE.height - 0.9);
});

// choreography.test.ts
const close = (a: number, b: number, eps = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(eps);
it('traffic light follows the spec table', () => {
  expect([0, 0.01, 0.05, 0.15, 0.79, 0.8, 1].map(lightState)).toEqual(['off', 'off', 'red', 'yellow', 'yellow', 'green', 'green']);
});
it('sections and centres', () => {
  expect([0.1, 0.15, 0.37, 0.6, 0.8, 1].map(activeSection)).toEqual([null, 'work', 'about', 'stack', 'contact', 'contact']);
  expect(sectionCenter('work')).toBe(0.26);
  expect(sectionCenter('contact')).toBe(0.9);
});
it('reveal runs over the intro', () => {
  close(revealProgress(0), 0); close(revealProgress(0.075), 0.5); close(revealProgress(0.15), 1); close(revealProgress(0.6), 1);
});
it('parts reveal in order', () => {
  close(partReveal(0, 3, 4), 0); close(partReveal(1, 0, 4), 1); close(partReveal(1, 3, 4), 1);
  expect(partReveal(0.5, 0, 4)).toBeGreaterThan(partReveal(0.5, 3, 4));
});
it('pole yaw: half turn in the intro, holds facing each section, monotonic', () => {
  close(poleYaw(0), Math.PI); close(poleYaw(0.15), 0); close(poleYaw(0.26), 0);
  close(poleYaw(0.37), -Math.PI / 4); close(poleYaw(0.48), -Math.PI / 2);
  close(poleYaw(0.695), -Math.PI); close(poleYaw(0.9), -1.5 * Math.PI); close(poleYaw(1), -1.5 * Math.PI);
  for (let p = 0; p < 1; p += 0.001) expect(poleYaw(p + 0.001)).toBeLessThanOrEqual(poleYaw(p) + 1e-9);
});
it('camera pose hits its end keys and is continuous', () => {
  expect(cameraPose(0)).toEqual({ position: [0, 2.6, 9.5], target: [0, 2.6, 0] });
  expect(cameraPose(1)).toEqual({ position: [0, 4.6, 3.4], target: [0, 4.7, 0] });
  for (let p = 0; p < 1; p += 0.001) {
    const a = cameraPose(p).position, b = cameraPose(p + 0.001).position;
    expect(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])).toBeLessThan(0.05);
  }
});
it('damp converges and clamps long frames', () => {
  close(damp(0, 1, 4, 0.016), 1 - Math.exp(-4 * 0.016));
  close(damp(0, 1, 4, 5), damp(0, 1, 4, 0.1));
});
it('store clamps progress', () => {
  experienceStore.getState().setProgress(1.4); expect(experienceStore.getState().progress).toBe(1);
  experienceStore.getState().setProgress(-1); expect(experienceStore.getState().progress).toBe(0);
});
```

- [ ] **Step 2: Run** `npx vitest run tests/unit/choreography.test.ts tests/unit/signs.test.ts`. Expected: FAIL (modules missing).
- [ ] **Step 3: Implement** `signs.ts`, `store.ts` (`createStore` from `zustand/vanilla` + `useStore` hook), `choreography.ts` with the values above.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat(experience): store, sign config and scroll choreography"`

---

### Task 4: Quality tiers and WebGL detection (pure logic)

**Files:**
- Create: `src/experience/quality.ts`, `src/experience/webgl.ts`
- Test: `tests/unit/quality.test.ts`

**Interfaces:**
- Consumes: `Tier` from `store.ts`.
- Produces:

```ts
export interface TierSettings { dpr: number; reflectorResolution: number; ao: boolean; aoHalfRes: boolean; bloom: boolean; noise: boolean; particles: number }
export const TIER: Record<Tier, TierSettings>;
export interface DeviceProbe { renderer: string; maxTouchPoints: number; minScreenSide: number; deviceMemory?: number; hardwareConcurrency: number }
export function pickTier(probe: DeviceProbe, override: Tier | null): Tier;
export function qualityOverride(search: string): Tier | null;   // ?quality=high|medium|low
export function stepDown(t: Tier): Tier;                        // high→medium→low→low
export function slowDevice(frameTimesMs: number[]): boolean;    // median > 22
export function forcedNoWebGL(search: string): boolean;         // ?webgl=0
export function supportsWebGL2(): boolean;                      // browser-only: tries canvas.getContext('webgl2')
```

`TIER`:
- `high`: dpr 1.75, reflector 1024, ao on, aoHalfRes off, bloom on, noise on, particles 600
- `medium`: dpr 1.25, reflector 512, ao on, aoHalfRes on, bloom on, noise off, particles 300
- `low`: dpr 1, reflector 256, ao off, aoHalfRes on, bloom on, noise off, particles 120

`pickTier` rules, in this order:
1. The override wins.
2. Software renderer (`/swiftshader|llvmpipe|software/i`) → low.
3. Touch device (`maxTouchPoints > 0 && minScreenSide < 900`) → low.
4. `deviceMemory <= 4 || hardwareConcurrency <= 4` → medium.
5. Integrated GPU (`/intel|uhd|iris|mali|adreno/i` and not `/arc/i`) → medium.
6. Otherwise → high.

- [ ] **Step 1: Write the failing test** `tests/unit/quality.test.ts`:

```ts
const desk: DeviceProbe = { renderer: 'ANGLE (NVIDIA GeForce RTX 3060)', maxTouchPoints: 0, minScreenSide: 1080, deviceMemory: 16, hardwareConcurrency: 12 };
it('picks tiers', () => {
  expect(pickTier(desk, null)).toBe('high');
  expect(pickTier({ ...desk, renderer: 'ANGLE (Intel(R) Iris(R) Xe Graphics)' }, null)).toBe('medium');
  expect(pickTier({ ...desk, renderer: 'ANGLE (Intel Arc A770)' }, null)).toBe('high');
  expect(pickTier({ ...desk, maxTouchPoints: 5, minScreenSide: 412 }, null)).toBe('low');
  expect(pickTier({ ...desk, renderer: 'Google SwiftShader' }, null)).toBe('low');
  expect(pickTier({ ...desk, hardwareConcurrency: 4 }, null)).toBe('medium');
  expect(pickTier({ ...desk, renderer: 'Google SwiftShader' }, 'high')).toBe('high');
});
it('reads overrides', () => {
  expect(qualityOverride('?quality=low')).toBe('low');
  expect(qualityOverride('?quality=ultra')).toBeNull();
  expect(forcedNoWebGL('?webgl=0')).toBe(true);
  expect(forcedNoWebGL('')).toBe(false);
});
it('steps down and detects slow devices', () => {
  expect(['high', 'medium', 'low'].map((t) => stepDown(t as Tier))).toEqual(['medium', 'low', 'low']);
  expect(slowDevice(Array(120).fill(16.7))).toBe(false);
  expect(slowDevice(Array(120).fill(30))).toBe(true);
});
it('never exceeds DPR 1.75', () => { for (const t of Object.values(TIER)) expect(t.dpr).toBeLessThanOrEqual(1.75); });
```

- [ ] **Step 2: Run** `npx vitest run tests/unit/quality.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `quality.ts` and `webgl.ts`.
- [ ] **Step 4: Run** it again. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat(experience): device quality tiers and WebGL detection"`

---

### Task 5: Smooth scroll → progress, test hooks, scroll track

**Files:**
- Create: `src/scroll/SmoothScroll.tsx`, `src/dev/testHooks.ts`, `src/dev/sceneProbe.ts`, `tests/e2e/helpers.ts`
- Modify: `src/app/[locale]/page.tsx` (render `<SmoothScroll/>` and `<div id="journey" style={{ height: '700svh' }} />`)
- Test: `tests/e2e/scroll.spec.ts`

Load the `gsap-scrolltrigger` and `gsap-react` skills before writing this task. `_sources/aslanair/src/scroll/SmoothScroll.tsx` is a working reference for Lenis + ScrollTrigger + reduced motion on this machine.

**Interfaces:**
- Consumes: `experienceStore`, `sectionCenter`, `activeSection`, `lightState` (Task 3).
- Produces:

```ts
// SmoothScroll.tsx
export function scrollToProgress(p: number, immediate?: boolean): void;
export function scrollToSection(id: SectionId): void;           // scrolls to sectionCenter(id)
export default function SmoothScroll(): null;                   // mounts Lenis + one ScrollTrigger on #journey → setProgress
// sceneProbe.ts  (dev/test only)
export function registerProbe(name: string, read: () => unknown): () => void;  // returns unregister
export function readProbe(name: string): unknown;
// testHooks.ts — when process.env.NEXT_PUBLIC_TEST_HOOKS === '1', installs:
// window.__portfolio = { state(), light(), section(), probe(name), scrollToProgress(p, immediate) }
// tests/e2e/helpers.ts
export async function gotoScene(page: Page, path?: string): Promise<void>;          // goto + wait for __portfolio
export async function scrollTo(page: Page, p: number): Promise<void>;               // immediate scroll + 600 ms settle
export async function progress(page: Page): Promise<number>;
```

Behaviour notes:
- `history.scrollRestoration = 'manual'` plus `scrollTo(0, 0)` on mount.
- `ScrollTrigger.config({ ignoreMobileResize: true })`.
- Reduced motion sets Lenis `lerp: 1`, `smoothWheel: false` and calls `setReducedMotion(true)`, following `matchMedia` changes live.
- Lenis RAF is driven by `gsap.ticker`.

- [ ] **Step 1: Write the failing e2e test** `tests/e2e/scroll.spec.ts`:

```ts
test('scrolling to the end reaches progress 1 and green', async ({ page }) => {
  await gotoScene(page);
  await page.keyboard.press('End');
  await expect.poll(() => progress(page), { timeout: 5000 }).toBeGreaterThan(0.99);
  expect(await page.evaluate(() => window.__portfolio.light())).toBe('green');
});
test('scrollToSection lands on the section centre', async ({ page }) => {
  await gotoScene(page);
  await page.evaluate(() => window.__portfolio.scrollToProgress(0.48, true));
  await expect.poll(() => progress(page)).toBeCloseTo(0.48, 2);
  expect(await page.evaluate(() => window.__portfolio.section())).toBe('about');
});
test('resize mid-scroll keeps progress', async ({ page }) => {          // Review Focus 1
  await gotoScene(page); await scrollTo(page, 0.5);
  await page.setViewportSize({ width: 900, height: 700 }); await page.waitForTimeout(800);
  expect(Math.abs((await progress(page)) - 0.5)).toBeLessThan(0.02);
});
test('reload starts at the top', async ({ page }) => {                   // Review Focus 3
  await gotoScene(page); await scrollTo(page, 0.6); await page.reload();
  await page.waitForFunction(() => !!window.__portfolio);
  expect(await progress(page)).toBeLessThan(0.005);
});
test('reduced motion: no glide', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await gotoScene(page);
  expect(await page.evaluate(() => window.__portfolio.state().reducedMotion)).toBe(true);
});
```
(Also add a `declare global { interface Window { __portfolio: … } }` type in `src/dev/testHooks.ts`.)

- [ ] **Step 2: Run** `npx playwright test tests/e2e/scroll.spec.ts --project=chromium`. Expected: FAIL (no hooks).
- [ ] **Step 3: Implement** `SmoothScroll.tsx`, `sceneProbe.ts`, `testHooks.ts` (installed from a small client component in the page) and `helpers.ts`.
- [ ] **Step 4: Run** it again. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat(scroll): Lenis + ScrollTrigger progress, test hooks"`

---

### Task 6: CC0 assets, budget, and the canvas shell

**Files:**
- Create: `scripts/assets.manifest.json`, `scripts/fetch-assets.mjs`, `src/scene/Experience.tsx`, `src/scene/CameraRig.tsx`, `src/scene/Ready.tsx`, `src/scene/QualityGovernor.tsx`, `src/ui/ExperienceGate.tsx`
- Modify: `src/app/[locale]/page.tsx` (render `<ExperienceGate/>`)
- Test: `tests/unit/assetBudget.test.ts`, `tests/e2e/scene.spec.ts`, `tests/e2e/mobile.spec.ts`

**Interfaces:**
- Consumes: store, `cameraPose`, `damp`, `TIER`, `pickTier`, `qualityOverride`, `slowDevice`, `stepDown`, `supportsWebGL2`, `forcedNoWebGL`, `registerProbe`.
- Produces:
  - `Experience` (default export, client): a fixed full-screen `<Canvas aria-hidden>` with `gl={{ antialias: false, powerPreference: 'high-performance' }}`, AgX tone mapping, camera fov 35, background `#050507`, `<Suspense>` children slot.
  - `ExperienceGate`: `next/dynamic` import of `Experience` with `ssr: false`. It renders `null` when `!supportsWebGL2() || forcedNoWebGL(location.search)` and sets `setWebgl(false)` (the Fallback UI arrives in Task 12).
  - `Ready` sets `setReady(true)` after 30 rendered frames.
  - `CameraRig` damps the camera position and lookAt toward `cameraPose(progress)` with lambda 3, and snaps when reducedMotion is on. It registers probe `camera`.
  - `QualityGovernor` works like aslanair's: it picks the tier at mount, applies DPR, and steps down once after `wait 3 s, 120 frames` if `slowDevice` (skipped when an override is set or `navigator.webdriver`). It registers probe `dpr`.
  - Asset paths: `public/hdri/cobblestone_street_night_1k.hdr`, `public/textures/<id>/<map>.jpg`, `public/fonts/Anton-Regular.woff`, `public/fonts/JetBrainsMono-Regular.woff`.

Manifest (Poly Haven CC0, 1k JPG; the script resolves URLs via `https://api.polyhaven.com/files/<id>`):

| id | type | maps | use |
|---|---|---|---|
| cobblestone_street_night | hdri | hdr 1k | environment lighting / reflections |
| asphalt_03 | texture | diff, nor_gl, rough | wet street (if the look is wrong, compare `asphalt_01`, `asphalt_05`, `asphalt_06`) |
| rusty_painted_metal | texture | diff, nor_gl, rough, arm (if present) | pole and sign edges, chipped paint |
| metal_plate_02 | texture | nor_gl, rough | sign backs, traffic-light housing |

The script also copies the `.woff` files from `node_modules/@fontsource/anton/files/anton-latin-400-normal.woff` and `@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff` into `public/fonts/` under the names above. Assets are committed (CC0/OFL). Running `npm run assets` is idempotent.

- [ ] **Step 1: Write the failing budget test** `tests/unit/assetBudget.test.ts`:

```ts
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const size = (d: string): number => readdirSync(d).reduce((s, f) => { const p = join(d, f); const st = statSync(p); return s + (st.isDirectory() ? size(p) : st.size); }, 0);
it('3D assets stay within 6 MB', () => {
  const total = ['public/hdri', 'public/textures', 'public/fonts'].reduce((s, d) => s + size(d), 0);
  expect(total).toBeGreaterThan(0);
  expect(total).toBeLessThanOrEqual(6 * 1024 * 1024);
});
```

- [ ] **Step 2: Run** `npx vitest run tests/unit/assetBudget.test.ts`. Expected: FAIL (folders missing).
- [ ] **Step 3: Implement** the manifest and `fetch-assets.mjs`, then run `npm run assets`. If the total exceeds 6 MB, drop to the 1k `rough` + `nor_gl` maps only (no `diff`) for `metal_plate_02` first.
- [ ] **Step 4: Run** the budget test again. Expected: PASS.
- [ ] **Step 5: Write the failing e2e tests** `tests/e2e/scene.spec.ts` and `tests/e2e/mobile.spec.ts`:

```ts
// scene.spec.ts
test('canvas renders, is hidden from AT, becomes ready without console errors', async ({ page }) => {
  const errors: string[] = []; page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await gotoScene(page);
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.locator('[aria-hidden="true"] canvas, canvas[aria-hidden="true"]')).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => window.__portfolio.state().ready), { timeout: 30000 }).toBe(true);
  expect(errors).toEqual([]);
});
test('camera follows the choreography', async ({ page }) => {
  await gotoScene(page); await scrollTo(page, 1); await page.waitForTimeout(2500);
  const cam = (await page.evaluate(() => window.__portfolio.probe('camera'))) as { position: number[] };
  expect(cam.position[1]).toBeCloseTo(4.6, 1);
});
// mobile.spec.ts  (Review Focus 4)
test('touch swipe advances progress on a phone, low tier, no errors', async ({ page }) => {
  const errors: string[] = []; page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await gotoScene(page);
  expect(await page.evaluate(() => window.__portfolio.state().tier)).toBe('low');
  const before = await progress(page);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.synthesizeScrollGesture', { x: 200, y: 600, yDistance: -800, gestureSourceType: 'touch', speed: 1200 });
  await expect.poll(() => progress(page)).toBeGreaterThan(before + 0.01);
  expect(errors).toEqual([]);
});
```

- [ ] **Step 6: Implement** `Experience`, `ExperienceGate`, `Ready`, `CameraRig` and `QualityGovernor`, with a temporary placeholder cylinder (radius 0.06, height 5.2) so there is something to see.
- [ ] **Step 7: Run** `npx playwright test tests/e2e/scene.spec.ts --project=chromium && npm run e2e:mobile`. Expected: PASS.
- [ ] **Step 8: Commit** `git commit -m "feat(scene): canvas shell, camera rig, quality governor, CC0 assets"`

---

### Task 7: Night street: wet asphalt, lighting, skyline, particles

**Files:**
- Create: `src/scene/Lighting.tsx`, `src/scene/street/Street.tsx`, `src/scene/street/Asphalt.tsx`, `src/scene/street/Skyline.tsx`, `src/scene/street/Particles.tsx`
- Modify: `src/scene/Experience.tsx` (mount `<Lighting/>` and `<Street/>`)
- Test: `tests/e2e/scene.spec.ts` (extend)

**Interfaces:**
- Consumes: `TIER[tier]` (reflector resolution, particles), `revealProgress`.
- Produces:
  - `Asphalt`: a 40×40 m plane at y=0 with drei `MeshReflectorMaterial`. Resolution comes from the tier; `mixBlur ≈ 1`, `mixStrength` ramps from 0 → full with `revealProgress` (the street gets "wet" as the scene renders); asphalt `rough` + `nor_gl` maps; puddles come from a runtime canvas noise texture used as a roughness mask (low roughness in puddles = mirror patches like the Night City Rush ref). Registers probe `wetness` (current mixStrength / max).
  - `Lighting`: drei `<Environment files="/hdri/cobblestone_street_night_1k.hdr" environmentIntensity≈0.35 />`, one cool rim light, warm practical light from a street lamp off-screen, and exponential fog (`#050507`, density ≈ 0.06). The sign neon lights come in Task 8.
  - `Skyline`: dark low-poly building silhouettes 15–30 m behind the pole, with sparse emissive windows (instanced quads) and one or two blurred neon shop signs (emissive planes, orange/cyan) for bokeh in the reflections.
  - `Particles`: drifting dust or light-drizzle points in the lamp light, count from the tier.

- [ ] **Step 1: Extend the e2e test**: after scrolling to 0.3 and a 1.5 s settle, `probe('wetness')` is > 0.95; at progress 0 it is < 0.05.
- [ ] **Step 2: Run** it. Expected: FAIL.
- [ ] **Step 3: Implement** the four components. The visual target is the Pinterest signpost ref (dark, orange-red neon, deep blacks) plus the wet asphalt of cyberpunk-race.vercel.app. Reflections must read clearly but not mirror-perfect.
- [ ] **Step 4: Run** it again. Expected: PASS. Also take a manual screenshot at p=0.3 (`npx playwright test --project=shots` once Task 13 exists; until then `page.screenshot` in a scratch spec) and check that the street reads as wet, dark and atmospheric.
- [ ] **Step 5: Commit** `git commit -m "feat(scene): wet asphalt, night lighting, skyline, particles"`

---

### Task 8: Pole, signs and traffic light

**Files:**
- Create: `src/scene/pole/geometry.ts`, `src/scene/pole/materials.ts`, `src/scene/pole/parts.ts`, `src/scene/pole/Sign.tsx`, `src/scene/pole/TrafficLight.tsx`, `src/scene/pole/Pole.tsx`
- Modify: `src/scene/Experience.tsx` (replace the placeholder cylinder with `<Pole/>`)
- Test: `tests/unit/geometry.test.ts`, `tests/e2e/pole.spec.ts`

**Interfaces:**
- Consumes: `SIGNS`, `POLE`, `poleYaw`, `lightState`, `damp`, store, `registerProbe`.
- Produces:

```ts
// geometry.ts  (pure, node-testable — three runs in node)
export function octagonPoints(r: number): [number, number][];                 // 8 points, flat top (first angle π/8)
export function arrowPoints(w: number, h: number, tip: number): [number, number][]; // 5 points, tip at +x = w/2
export function roundedRectShape(w: number, h: number, r: number): THREE.Shape;
export function signGeometry(def: SignDef): THREE.ExtrudeGeometry;           // depth 0.03, bevelSize 0.008, bevelThickness 0.008, bevelSegments 3, centred
export function lensIntensity(state: LightState): { red: number; yellow: number; green: number }; // on = 6, off = 0.05
// parts.ts
export const PART_ORDER: readonly string[]; // reveal order top→bottom: ['light','stack','work','about','contact','cv','pole','base']
// Pole.tsx — <Pole/> : group rotated by damped poleYaw(progress) (lambda 2.5; snap if reducedMotion), probe 'poleYaw'
// Sign.tsx — <Sign def={SignDef} partIndex={number} /> : extruded plate + border plate (if border) + clamp brackets to the pole + drei <Text> label (font /fonts/Anton-Regular.woff), and a coloured neon rectAreaLight/pointLight in the sign colour
// TrafficLight.tsx — housing (RoundedBox 0.36×0.95×0.3), three visors, three lenses (MeshPhysicalMaterial, emissive = lensIntensity), a small point light per lens scaled by intensity; probe 'light' → lensIntensity actually applied
```

Construction requirements:
- **Pole:** a 5.2 m `CylinderGeometry` with ~32 radial segments, a base plate with 4 bolts, 2–3 band clamps, and a slight paint-chip texture using `rusty_painted_metal` maps with `metalness` 0.6.
- **Signs:** each sign is mounted with brackets clamped to the pole, offset by `POLE.radius + 0.02` in its `facing` direction (the plate's normal is `facing`), with in-plane roll `tilt`. Edges are bevelled; there is no hard-edged box anywhere.
- **Sign faces:** `MeshStandardMaterial` in the sign colour, roughness from `rusty_painted_metal` (grunge), and emissive in the sign colour at intensity ≈ 0.6 so bloom (Task 11) catches it. The text is slightly emissive too.
- **Traffic light:** lens intensities are damped toward `lensIntensity(lightState(progress))` (lambda 6).

- [ ] **Step 1: Write the failing unit test** `tests/unit/geometry.test.ts`:

```ts
it('octagon: 8 points on radius r with a flat top', () => {
  const pts = octagonPoints(0.45);
  expect(pts).toHaveLength(8);
  for (const [x, y] of pts) expect(Math.hypot(x, y)).toBeCloseTo(0.45, 6);
  const top = [...pts].sort((a, b) => b[1] - a[1]).slice(0, 2);
  expect(top[0][1]).toBeCloseTo(top[1][1], 6);
});
it('arrow points right and fits its box', () => {
  const pts = arrowPoints(1.5, 0.42, 0.25);
  expect(pts).toHaveLength(5);
  expect(Math.max(...pts.map((p) => p[0]))).toBeCloseTo(0.75, 6);
  expect(Math.min(...pts.map((p) => p[0]))).toBeCloseTo(-0.75, 6);
  expect(Math.max(...pts.map((p) => p[1]))).toBeCloseTo(0.21, 6);
});
it('sign geometry is bevelled plate depth', () => {
  const g = signGeometry(SIGNS.find((s) => s.id === 'about')!); g.computeBoundingBox();
  const b = g.boundingBox!;
  expect(b.max.z - b.min.z).toBeCloseTo(0.03 + 2 * 0.008, 3);
  expect(b.max.x - b.min.x).toBeCloseTo(1.4 + 2 * 0.008, 2);
});
it('one lens on per state', () => {
  expect(lensIntensity('off')).toEqual({ red: 0.05, yellow: 0.05, green: 0.05 });
  expect(lensIntensity('red')).toEqual({ red: 6, yellow: 0.05, green: 0.05 });
  expect(lensIntensity('green')).toEqual({ red: 0.05, yellow: 0.05, green: 6 });
});
```

- [ ] **Step 2: Run** `npx vitest run tests/unit/geometry.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `geometry.ts`. Run the test again. Expected: PASS.
- [ ] **Step 4: Write the failing e2e test** `tests/e2e/pole.spec.ts`:

```ts
test('pole faces each section and the light changes', async ({ page }) => {
  await gotoScene(page);
  for (const [p, yaw, lit] of [[0.26, 0, 'yellow'], [0.48, -Math.PI / 2, 'yellow'], [0.9, -1.5 * Math.PI, 'green']] as const) {
    await scrollTo(page, p); await page.waitForTimeout(2000);
    expect(await page.evaluate(() => window.__portfolio.probe('poleYaw') as number)).toBeCloseTo(yaw, 1);
    const l = (await page.evaluate(() => window.__portfolio.probe('light'))) as Record<string, number>;
    expect(l[lit]).toBeGreaterThan(3);
  }
});
test('End key: no extra spins, lands on contact', async ({ page }) => {   // Review Focus 2
  await gotoScene(page); await page.keyboard.press('End'); await page.waitForTimeout(3000);
  expect(await page.evaluate(() => window.__portfolio.probe('poleYaw') as number)).toBeCloseTo(-1.5 * Math.PI, 1);
});
```

- [ ] **Step 5: Implement** `materials.ts` (a `usePoleMaterials()` hook loading the textures once, sharing materials across meshes), `parts.ts`, `Sign.tsx`, `TrafficLight.tsx` and `Pole.tsx`.
- [ ] **Step 6: Run** `npx playwright test tests/e2e/pole.spec.ts --project=chromium`. Expected: PASS.
- [ ] **Step 7: Commit** `git commit -m "feat(scene): signpost pole, bevelled signs, traffic light"`

---

### Task 9: Stickers (stack logos and decorative)

**Files:**
- Create: `src/scene/stickers/icons.ts`, `src/scene/stickers/stickers.ts`, `src/scene/stickers/atlas.ts`, `src/scene/stickers/Stickers.tsx`
- Modify: `src/scene/pole/Pole.tsx` (mount `<Stickers/>`)
- Test: `tests/unit/stickers.test.ts`

**Interfaces:**
- Produces:

```ts
// icons.ts
export function getIcon(slug: string): { title: string; path: string; hex: string } | null; // from simple-icons exports
// stickers.ts
export interface StickerDef { key: string; kind: 'logo' | 'text'; slug?: string; text?: string; bg: string; fg: string; y: number; angle: number; roll: number; size: number }
export const STICKERS: readonly StickerDef[];
export const STACK_SLUGS: readonly string[];
// atlas.ts
export function layoutAtlas(count: number, cell: number, size: number): { u: number; v: number; w: number; h: number }[];
export function stickerArc(width: number, radius: number): number; // thetaLength = width / radius
// Stickers.tsx — draws every sticker into one CanvasTexture atlas (2048², rounded-corner die-cut, white outline);
// each sticker is a curved CylinderGeometry segment (radius POLE.radius + 0.0015, openEnded, thetaStart = angle,
// thetaLength = stickerArc(size, radius)) sampling its atlas rect. Logo stickers glow (emissive ×2) on pointer over.
```

`STACK_SLUGS`, in this order (spec §6.4): `html5, css, sass, tailwindcss, javascript, typescript, react, nextdotjs, redux, mobx, nodedotjs, nestjs, prismic, contentful, sanity, payloadcms, threedotjs, greensock, git, github, gitlab, bitbucket, n8n, claude, openai`. **If a slug does not exist in simple-icons 16.37.0, remove it from the list.** Never draw a brand logo by hand or with AI. Zustand, Fabric.js and Skia have no reliable icons: they appear as `kind: 'text'` stickers (`ZUSTAND`, `FABRIC.JS`, `SKIA`).

Decorative text stickers (exact text): `</>`, `SHIP IT`, `NO BUGS*`, `git push`, `200 OK`, `ODESA`.

Placement: stickers spread over y ∈ [0.6, 4.4] around the full circumference; none overlap the sign brackets (± 0.12 m from each sign's `y` within ± 0.4 rad of its `facing`). Colours come from the palette; logo stickers use the brand `hex` on near-black or white.

- [ ] **Step 1: Write the failing test** `tests/unit/stickers.test.ts`:

```ts
it('every logo sticker resolves to a simple-icons icon', () => {
  for (const s of STICKERS.filter((s) => s.kind === 'logo')) expect(getIcon(s.slug!)).not.toBeNull();
});
it('every remaining stack slug has a sticker', () => {
  const onPole = new Set(STICKERS.map((s) => s.slug));
  for (const slug of STACK_SLUGS) expect(onPole.has(slug)).toBe(true);
});
it('atlas cells fit and do not overlap', () => {
  const r = layoutAtlas(40, 256, 2048);
  expect(r).toHaveLength(40);
  for (const a of r) { expect(a.u).toBeGreaterThanOrEqual(0); expect(a.u + a.w).toBeLessThanOrEqual(1); expect(a.v + a.h).toBeLessThanOrEqual(1); }
  for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) {
    const a = r[i], b = r[j];
    expect(a.u + a.w <= b.u || b.u + b.w <= a.u || a.v + a.h <= b.v || b.v + b.h <= a.v).toBe(true);
  }
});
it('stickers avoid sign brackets', () => {
  for (const st of STICKERS) for (const sg of SIGNS) {
    const da = Math.abs(Math.atan2(Math.sin(st.angle - sg.facing), Math.cos(st.angle - sg.facing)));
    expect(Math.abs(st.y - sg.y) > 0.12 || da > 0.4).toBe(true);
  }
});
it('arc length', () => { expect(stickerArc(0.12, 0.06)).toBeCloseTo(2, 6); });
```

- [ ] **Step 2: Run** `npx vitest run tests/unit/stickers.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the four files. Run the test again. Expected: PASS.
- [ ] **Step 4: Commit** `git commit -m "feat(scene): stack and decorative stickers on the pole"`

---

### Task 10: Blueprint → render transition

**Files:**
- Create: `src/scene/reveal/revealMaterial.ts`, `src/scene/reveal/EdgesOverlay.tsx`, `src/scene/reveal/Blueprint.tsx`
- Modify: `Sign.tsx`, `TrafficLight.tsx`, `Pole.tsx`, `Stickers.tsx` (wrap meshes), `Asphalt.tsx` (hide under the grid at reveal 0), `Experience.tsx` (scene background via `backgroundAt`)
- Test: `tests/unit/reveal.test.ts`, `tests/e2e/reveal.spec.ts`

**Interfaces:**
- Consumes: `revealProgress`, `partReveal`, `PART_ORDER`, store, `registerProbe`.
- Produces:

```ts
// revealMaterial.ts
export interface RevealUniforms { uReveal: { value: number }; uEdge: { value: THREE.Color }; uSeed: { value: number } }
export function makeRevealUniforms(seed: number): RevealUniforms;
export function applyReveal(material: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial, u: RevealUniforms): void; // onBeforeCompile patch, customProgramCacheKey = 'reveal'
export function backgroundAt(reveal: number): string;  // lerp '#0b1f38' → '#050507', returns hex
// EdgesOverlay.tsx — <EdgesOverlay geometry reveal /> : LineSegments(EdgesGeometry(geometry, 20)), LineBasicMaterial '#7fe3ff', transparent, opacity = 1 − reveal (0 when reveal ≥ 1, unmounted)
// Blueprint.tsx — drei <Grid> on y=0.001 (cellSize 0.25, sectionSize 1, cell '#24486f', section '#7fe3ff', fadeDistance 25) + dimension lines (drei <Line>) with mono <Text> labels '1280 px', 'h: 100vh', 'ø 120', all opacity 1 − revealProgress
```

Shader (the one algorithm the signature leaves open):
- In the fragment shader, use world-space height `h` normalised over the part's bounding box plus 3D value noise `n(worldPos * 6.0 + uSeed)`. Define `t = h * 0.7 + n * 0.3` and `threshold = 1.0 − uReveal`.
- `discard` when `t < threshold − 0.0`, so the reveal sweeps top to bottom.
- In the band `threshold ≤ t < threshold + 0.04`, add emissive `uEdge` (`#ff5a1f`, ×4) — the glowing "render front".
- Each part's `uReveal = partReveal(revealProgress(progress), PART_ORDER.indexOf(part), PART_ORDER.length)`.
- Probe `reveal` returns `revealProgress` as applied.

Reduced motion: `uReveal` is 1 for every part from the first frame, and Blueprint is not mounted.

- [ ] **Step 1: Write the failing tests:**

```ts
// tests/unit/reveal.test.ts
it('background goes from blueprint blue to night black', () => {
  expect(backgroundAt(0)).toBe('#0b1f38'); expect(backgroundAt(1)).toBe('#050507');
});
// tests/e2e/reveal.spec.ts
test('scene starts as blueprint and is fully rendered after the intro', async ({ page }) => {
  await gotoScene(page);
  expect(await page.evaluate(() => window.__portfolio.probe('reveal'))).toBeLessThan(0.01);
  await scrollTo(page, 0.2); await page.waitForTimeout(1500);
  expect(await page.evaluate(() => window.__portfolio.probe('reveal'))).toBeCloseTo(1, 2);
});
test('reduced motion shows the rendered scene at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await gotoScene(page);
  await expect.poll(() => page.evaluate(() => window.__portfolio.probe('reveal'))).toBe(1);
  await scrollTo(page, 0.48); await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__portfolio.probe('poleYaw') as number)).toBeCloseTo(-Math.PI / 2, 2);
});
```

- [ ] **Step 2: Run** `npx vitest run tests/unit/reveal.test.ts && npx playwright test tests/e2e/reveal.spec.ts --project=chromium`. Expected: FAIL.
- [ ] **Step 3: Implement** the reveal material, the overlays and Blueprint, then wire every pole/sign/light/sticker mesh through `applyReveal` + `EdgesOverlay`.
- [ ] **Step 4: Run** the same command. Expected: PASS. Take screenshots at p = 0, 0.05, 0.1, 0.15. At 0.05 the top of the pole must be neon/PBR and the bottom still wireframe, with a visible glowing seam.
- [ ] **Step 5: Commit** `git commit -m "feat(scene): blueprint-to-render reveal on the rotating pole"`

---

### Task 11: Post-processing and quality wiring

**Files:**
- Create: `src/scene/Effects.tsx`
- Modify: `src/scene/Experience.tsx` (mount `<Effects/>`; `?debug` mounts `r3f-perf` `<Perf position="top-left"/>`)
- Test: `tests/e2e/quality.spec.ts`

**Interfaces:**
- Consumes: `TIER[tier]`, store.
- Produces: `<Effects/>` — `EffectComposer` (multisampling 0) with:
  - `N8AO` (aoRadius 0.6, intensity 2.5, `halfRes` from the tier; only if `ao`);
  - `Bloom` (mipmapBlur, luminanceThreshold 0.55, intensity 1.1, radius 0.75);
  - `Noise` (opacity 0.035; only if `noise`);
  - `Vignette` (offset 0.3, darkness 0.75);
  - `ToneMapping` (AgX).

  The pass set rebuilds when the tier changes.

- [ ] **Step 1: Write the failing test** `tests/e2e/quality.spec.ts`:

```ts
for (const [q, dpr] of [['low', 1], ['high', 1.75]] as const) {
  test(`?quality=${q} applies its tier`, async ({ page }) => {
    await gotoScene(page, `/en?quality=${q}`);
    expect(await page.evaluate(() => window.__portfolio.state().tier)).toBe(q);
    expect(await page.evaluate(() => window.__portfolio.probe('dpr'))).toBe(dpr); // probe 'dpr' = gl.getPixelRatio(); R3F applies a numeric dpr as-is
  });
}
test('?debug shows the perf panel', async ({ page }) => {
  await gotoScene(page, '/en?debug'); await expect(page.locator('.r3f-perf, [class*="perf"]').first()).toBeVisible();
});
```
- [ ] **Step 2: Run** `npx playwright test tests/e2e/quality.spec.ts --project=chromium`. Expected: FAIL.
- [ ] **Step 3: Implement** `Effects.tsx` and the debug panel.
- [ ] **Step 4: Run** it again. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat(scene): bloom, AO, grain, vignette per quality tier"`

---

### Task 12: Interaction, hero overlay, loader, fallback

**Files:**
- Create: `src/ui/Hero.tsx`, `src/ui/Loader.tsx`, `src/ui/Fallback.tsx`
- Modify: `src/scene/pole/Sign.tsx` (pointer events), `src/ui/ExperienceGate.tsx` (fallback + context loss), `src/app/[locale]/page.tsx`
- Test: `tests/e2e/interaction.spec.ts`

Load the `frontend-design` skill for the Hero/Loader look.

**Interfaces:**
- Consumes: `scrollToSection`, store, messages `hero.*`, `loader.label`, `fallback.*`, `registerProbe`.
- Produces:
  - **Sign pointer events:** `onPointerOver` → `setHoveredSign(id)`, `document.body.style.cursor = 'pointer'`, emissive ×1.6 (damped). `onPointerOut` → reset. `onClick` → `scrollToSection(id === 'cv' ? 'contact' : id)`. Probe `signScreen:<id>` → the sign centre projected to CSS pixels `{ x, y }`.
  - **Hero:** a fixed overlay `<header data-hero>`, bottom-left. `<h1>` holds `hero.name` in JetBrains Mono, uppercase, ~clamp(40px, 7vw, 112px), `#e8f7ff`. Under it `hero.role`, then the cue `hero.cue ↓` in `#7fe3ff`. Opacity is `1 − clamp(progress / 0.05, 0, 1)` and `pointer-events: none` once hidden. The hero is server-rendered (it is the LCP element).
  - **Loader:** a full-screen blueprint-style overlay (`#0b1f38` + grid) with `loader.label` and a `0–100%` count from drei `useProgress`. It fades out when `ready` and carries `data-loader`. It must not block the Hero text paint, so it sits under the hero on z.
  - **Fallback:** a static blueprint card with `fallback.title` and `fallback.body`, shown by `ExperienceGate` when WebGL2 is missing, when `?webgl=0`, or after a `webglcontextlost` event on the canvas (the canvas unmounts). It carries `data-fallback`.

- [ ] **Step 1: Write the failing test** `tests/e2e/interaction.spec.ts`:

```ts
test('hovering a sign shows a pointer, clicking it scrolls to its section', async ({ page }) => {
  await gotoScene(page); await scrollTo(page, 0.2); await page.waitForTimeout(2000);
  const { x, y } = (await page.evaluate(() => window.__portfolio.probe('signScreen:work'))) as { x: number; y: number };
  await page.mouse.move(x, y);
  await expect.poll(() => page.evaluate(() => document.body.style.cursor)).toBe('pointer');
  await page.mouse.click(x, y);
  await expect.poll(() => progress(page), { timeout: 4000 }).toBeCloseTo(0.26, 2);
});
test('hero is visible at the top and gone after the intro starts', async ({ page }) => {
  await gotoScene(page);
  await expect(page.getByRole('heading', { level: 1, name: 'Rustam Aslanov' })).toBeVisible();
  await scrollTo(page, 0.1);
  await expect(page.locator('[data-hero]')).toHaveCSS('opacity', '0');
});
test('loader goes away when the scene is ready', async ({ page }) => {
  await gotoScene(page);
  await expect(page.locator('[data-loader]')).toBeHidden({ timeout: 30000 });
});
test('?webgl=0 shows the fallback and no canvas', async ({ page }) => {
  await page.goto('/en?webgl=0');
  await expect(page.locator('[data-fallback]')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
});
test('context loss swaps to the fallback', async ({ page }) => {          // Review Focus 5
  await gotoScene(page);
  await expect.poll(() => page.evaluate(() => window.__portfolio.state().ready), { timeout: 30000 }).toBe(true);
  await page.evaluate(() => (document.querySelector('canvas')!.getContext('webgl2')!.getExtension('WEBGL_lose_context'))!.loseContext());
  await expect(page.locator('[data-fallback]')).toBeVisible({ timeout: 5000 });
});
```

- [ ] **Step 2: Run** `npx playwright test tests/e2e/interaction.spec.ts --project=chromium`. Expected: FAIL.
- [ ] **Step 3: Implement** the sign pointer events, Hero, Loader, Fallback and the ExperienceGate changes.
- [ ] **Step 4: Run** it again. Expected: PASS. Then run the full suite: `npm test && npm run e2e && npm run e2e:mobile`. Expected: all PASS.
- [ ] **Step 5: Commit** `git commit -m "feat(ui): sign navigation, hero, blueprint loader, WebGL fallback"`

---

### Task 13: Review shots, performance report, M1 gate with Rustam

**Files:**
- Create: `tests/e2e/shots.spec.ts`, `tests/e2e/perf.spec.ts`, `tests/e2e/prod.spec.ts`, `docs/superpowers/gates/2026-11-12-m1-gate.md`
- Test: these specs are the deliverable

**Interfaces:**
- Consumes: `gotoScene`, `scrollTo`, `__portfolio`.
- Produces: `test-results/shots/{desktop|mobile}-{p}.png`, `test-results/perf.json` (`{ tier, medianMs, p95Ms, fps, frames }`), and the gate log.

- [ ] **Step 1: `shots.spec.ts`**: for p in `[0, 0.05, 0.1, 0.15, 0.26, 0.48, 0.695, 0.9, 1]`, at 1440×800 and on Pixel 7 (`test.use` per describe), call `scrollTo(p)`, wait 2.5 s, and screenshot to `test-results/shots/<device>-<p>.png`.
- [ ] **Step 2: `perf.spec.ts`**: with no `?quality`, wait until ready plus the governor sample (5 s). Scroll 0 → 1 with `mouse.wheel` steps over ~12 s while an in-page rAF loop records frame deltas. Write `test-results/perf.json` and assert `medianMs <= 33.4` (runs on the low-power GPU).
- [ ] **Step 3: `prod.spec.ts`**: against `next start -p 3300`, read LCP via `PerformanceObserver('largest-contentful-paint')` and assert ≤ 2500 ms. Assert no console errors and that the canvas exists.
- [ ] **Step 4: Run** `npm run shots && npm run perf && npm run prod`. Expected: PASS. Note medianMs, fps and LCP.
- [ ] **Step 5: Self-review the shots against the anti-goals** (spec §2). Open every PNG with the Read tool and check:
  - no primitive or plastic look;
  - neon blooms but text stays readable;
  - the asphalt reads wet with puddle reflections;
  - the blueprint state is crisp;
  - the reveal seam glows;
  - the stickers are legible;
  - mobile framing keeps the pole and signs in view;
  - no aliasing shimmer on the sign edges;
  - green appears only at the end.

  Fix what fails and re-run Step 4. Repeat until the checklist is clean.
- [ ] **Step 6: Commit** `git commit -m "test: review shots, perf probe, prod LCP check for the M1 gate"`
- [ ] **Step 7: Gate session with Rustam.**
  - Run `npm run dev -- -H 0.0.0.0 -p 3000` and give him `http://localhost:3000/en` plus the LAN URL (`http://<this PC's IPv4>:3000/en`) for his phone on the same Wi-Fi (Windows Firewall may ask to allow Node).
  - Share the perf numbers.
  - Ask for his verdict: is it "wow"? What would make it more wow?
- [ ] **Step 8: Log the round** in `docs/superpowers/gates/2026-11-12-m1-gate.md`: round number, his words, the changes made, the screenshots compared. Apply the changes (re-running Steps 4–5) and commit each round.
  - **At most 3 rounds.** If round 3 is still not "wow", stop and discuss changing the approach (other assets, composition, Blender for specific parts) instead of polishing in circles.
- [ ] **Step 9: On his explicit "yes":** mark the gate passed in the log, update the spec status line (M1 passed), commit, and start Plan 2 with superpowers:writing-plans.
