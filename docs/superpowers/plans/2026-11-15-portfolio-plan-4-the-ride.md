# Plan 4 — the ride

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scrolling drives the camera forward down the neon street while the pole rides along on the right as the menu; each section is a place on the street — Work a shop window of TVs on the left, About paper bills on the pole, Stack green highway signs over the road, Contact a "Let's go" billboard — plus a speedometer loader and a "CRITICAL ERROR" 404.

**Architecture:** The camera's pose stays a pure function of story progress, now a Catmull-Rom spline down the road with holds at each station (`src/experience/route.ts`). The pole's world pose is a function of the camera pose (`src/experience/poleRide.ts`), damped in `Pole.tsx`. New street pieces are code geometry under `src/scene/shop`, `src/scene/stack`, `src/scene/billboard`, lit by emission only. Text stays HTML (paper bills over the pole, a caption per Stack sign like Work's, the form fitted into the billboard's projected frame); the 3D signs mirror it on canvas textures.

**Tech Stack:** Next.js 16 / React 19, three 0.187 + R3F 9 + drei, GSAP ScrollTrigger + Lenis, next-intl 4, Vitest 5, Playwright 1.65.

**Spec:** `docs/superpowers/specs/2026-11-15-the-ride-design.md`

**Before Task 1 (Rustam's call):** merge `plan-3/assets` into `main` (M3 round 1 is done), then branch `plan-4/ride` from `main`. If he prefers, branch from `plan-3/assets` and merge both later.

## Global Constraints

- Section progress ranges stay: intro 0–0.15, work 0.15–0.37, about 0.37–0.59, stack 0.59–0.8, contact 0.8–1; deep links, `#work-N`, the language switch "at the same place", the Next button and the phone menu keep working.
- Camera pose and pole pose are pure functions of progress (plus aspect); no inertia that breaks them.
- The pole: at the start as now; after the intro it rides on the right of the frame (camera space ≈ 1.3 m right, 3.2 m ahead, base below the frame), damped; out of frame to the right while the camera faces the shop window; centred only in About; its signs stay clickable (CV downloads); the traffic light is red at the start, yellow on the way, green in the final frame.
- Shop: a building on the left (z ≈ −14…−26) with a ≈ 8 m × 2.6 m window and a neon "WORK" sign; the current TV wall (9 projects, the NDA screen, fillers) behind the glass; loops, CRT shader, clicks → case, captions, pager and snap as now; no TVs left on the right sidewalk.
- About: paper bills over the pole (the photo poster first, then lead, story, path, education, languages), riding the scroll; the camera rises along the pole; About's neon boxes go.
- Stack: a gantry over the road at z ≈ −40 with six green signs (one per category, up to 8 lines, icons from simple-icons); a stop per sign with a visible HTML caption in a neon box (like Work's), snap per stop; Stack's length is a fixed stop track; the vertical blades go.
- Contact: a billboard on a building at the end (z ≈ −62), neon "Let's go" and the contacts; the form is HTML fitted into the billboard's projected frame on laptops, in the flow below it on phones; progress 1 = the billboard with the pole's light green in frame (no rise); contact clicks and a sent form glide there.
- Loader: a motorcycle speedometer counting 0 → 100 with the load, a tachometer arc, "GO" at ready; reduced motion: digits only; the rest of the page hidden while it shows (done in Plan 3).
- 404: black, a red warning triangle with "!" and "CRITICAL ERROR" glitching (≤ 3 flashes/s), "404 — this road doesn't exist" and a neon link back to the street, in EN/RU/UK; no 3D.
- No new scene lights (emission and shader glow only); 3D assets ≤ 6 MB in all; median frame ≤ 33.4 ms on the medium tier in every section.
- Reduced motion: no ride — the camera cuts between station poses, the pole stands still on the right. Without WebGL: every section is HTML as now.
- All text stays HTML (selectable, translatable, read by screen readers). No secrets or LAN IP in the repo; the Playwright MCP browser closed during e2e; restart :3200 after editing `messages`.

## Review Focus

1. A fling through the whole ride (one long wheel or touch swipe): the camera never cuts through geometry, the pole never ends up inside the shop or the billboard building.
2. A portrait phone (412×915) and a 21:9 screen: the pole never covers a caption, a bill or the form, and every text block stays readable.
3. A deep link or a language switch mid-ride (`/ru#about`, `#work-5`, a Stack stop): it lands at the same station with the pole in its right place.
4. Reduced motion: station poses only, the pole static on the right, nothing slides or sways.
5. A resize or phone rotation at the billboard with the form fitted into it: the form re-fits the new frame or falls back to the flow, never off screen.

---

### Task 1: The route — stations and the camera spline

**Files:**
- Create: `src/experience/route.ts`
- Modify: `src/experience/choreography.ts` (`cameraPose`, `reducedCameraPose` delegate to the route after the intro), `src/scene/CameraRig.tsx` (unchanged API)
- Test: `tests/unit/route.test.ts`, `tests/unit/choreography.test.ts` (update the camera expectations)

**Interfaces:**
- Produces:
  - `STATIONS: { shop: { x: number; z0: number; z1: number }; pole: { z: number }; gantry: { z: number }; billboard: { z: number; y: number } }`
  - `ridePose(p: number): Pose` — the intro's keys for p ≤ 0.15, then a Catmull-Rom spline through station keys with holds; continuous in p
  - `stationPose(id: SectionId): Pose` — the reduced-motion pose of each section
  - `cameraPose(p)` keeps its signature and returns `ridePose(p)`

- [ ] **Step 1: Failing tests** — `ridePose` equals the current intro pose for p ∈ [0, 0.15]; adjacent samples (Δp = 0.001) never move the camera more than 0.25 m; outside the About hold the camera's z never increases (it only drives forward); at each section centre the target lies inside that station's box (shop window, pole, gantry, billboard); `stationPose` targets the same boxes.
- [ ] **Step 2: Run** `cd d:/projects/portfolio && npx vitest run tests/unit/route.test.ts` — Expected: FAIL (module missing).
- [ ] **Step 3: Implement** `route.ts` (keys per station, holds as flat spans, Catmull-Rom between) and delegate from `choreography.ts`.
- [ ] **Step 4: Run** unit tests — Expected: PASS. Update `choreography.test.ts`'s camera keys only where they pinned the old orbit (ledger a ruling per changed assertion).
- [ ] **Step 5:** run the chromium e2e; expect the camera-position tests that pin the old orbit to fail — list them in the ledger; they are rewritten in the task that owns their section (Work → Task 3, About → Task 4, Stack → Task 5, Contact → Task 6). Expected: everything else green.
- [ ] **Step 6: Commit** `feat(ride): the camera drives down the street`

---

### Task 2: The pole rides along

**Files:**
- Create: `src/experience/poleRide.ts`
- Modify: `src/scene/pole/Pole.tsx` (world position from `poleWorldPose`, damped; yaw as now), probe `pole`
- Test: `tests/unit/poleRide.test.ts`, `tests/e2e/ride.spec.ts`

**Interfaces:**
- Consumes: `ridePose`, `STATIONS` (Task 1); `activeSection`, `poleYaw` (choreography).
- Produces:
  - `poleWorldPose(p: number, camera: Pose, aspect: number): { position: Vec3; mode: 'start' | 'ride' | 'parked' | 'centre' }`
  - probe `pole`: `{ screen: [number, number]; mode: string; light: 'off' | 'red' | 'yellow' | 'green' }` (screen = the pole's mid-height projected to NDC)

- [ ] **Step 1: Failing unit tests** — p ≤ 0.15: the origin (`start`); just after the intro: in camera space x ∈ [1.0, 1.6], z ∈ [−3.6, −2.8] (`ride`); while the camera faces the shop window: outside the frustum to the right (`parked`); at About's centre: on the camera's view line (`centre`); on a portrait aspect (0.45) the riding pole's NDC x ∈ [0.55, 0.95].
- [ ] **Step 2: Failing e2e** (`ride.spec.ts`):
  - `after the intro the pole rides on the right` — at p = 0.2 the probe's NDC x > 0.3 and mode `ride`;
  - `its signs still lead to their sections` — click the ABOUT sign → progress reaches About's hold;
  - `in Work the pole steps aside` — at `stop(4)` mode `parked`;
  - `the light is green in the final frame` — at p = 1 the light is green and its NDC is inside ±1;
  - `reduced motion: the pole stands still on the right` (Review Focus 4) — with `reducedMotion: 'reduce'`, two probes 500 ms apart at the same progress give the same NDC, and the camera sits on `stationPose` of the active section.
- [ ] **Step 3: Run** both — Expected: FAIL.
- [ ] **Step 4: Implement** `poleRide.ts` and wire `Pole.tsx` (damp the position like the camera; reduced motion jumps).
- [ ] **Step 5: Run** unit + `ride.spec.ts` + `interaction.spec.ts` (sign hover/click) — Expected: PASS.
- [ ] **Step 6: Commit** `feat(ride): the pole rides along on the right as the menu`

---

### Task 3: The shop and its window (Work)

**Files:**
- Create: `src/scene/shop/Building.tsx`, `src/scene/shop/ShopWindow.tsx`, `src/scene/shop/glassMaterial.ts`, `src/scene/shop/layout.ts`
- Modify: `src/scene/tvwall/layout.ts` (`WALL` anchored behind the window, facing +x), `src/scene/tvwall/camera.ts` (`wallPose` in front of the glass along +x; `onWall` blends from the ride), `src/scene/Experience.tsx` (mount the building), `src/scene/street/Streaks.tsx`/`WallStreaks.tsx` (screen glow on the sidewalk in front of the window)
- Test: `tests/unit/shop.test.ts`, `tests/unit/wallCamera.test.ts`, `tests/unit/tvWall.test.ts`, `tests/e2e/work.spec.ts`, `tests/e2e/tvwall.spec.ts`, `tests/e2e/loops.spec.ts`, `tests/e2e/perf.spec.ts`

**Interfaces:**
- Consumes: `STATIONS.shop` (Task 1); `poleWorldPose` parks the pole while `wallWeight > 0.5` (Task 2).
- Produces: `shopLayout(): { facade: Box; window: { x: number; y0: number; y1: number; z0: number; z1: number }; sign: { text: 'WORK'; position: Vec3 } }`; every `TvSlot` inside the window box; `wallPose(s, aspect)` with the camera on the street side of the glass.

- [ ] **Step 1: Failing unit tests** — every TV slot sits inside the window box and behind the glass plane; `wallPose` keeps the camera at x greater than the glass (on the street) and its target on the screen; the facade does not cross the road or the sidewalk's kerb line.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** the building (boxes, instanced upper windows with a few lit, a shop front), the window (glass shader: dark, a lamp highlight, rain drops, no realtime reflection), the neon "WORK" sign, and move the wall into the window. Remove the sidewalk wall.
- [ ] **Step 4: Run** the unit tests, then `work.spec`, `tvwall.spec`, `loops.spec`, `case.spec` (clicking a TV opens its case, loops play, captions, pager, snap) — rewrite only the camera/coordinate assertions that pinned the old sidewalk wall (ledger each). Expected: PASS.
- [ ] **Step 5: Perf** — `npm run perf` Work stop ≤ 33.4 ms median (with and without loops). Record in the ledger.
- [ ] **Step 6: Commit** `feat(ride): the TVs move into a shop window on the left`

---

### Task 4: About — bills on the pole

**Files:**
- Create: `src/ui/flow/PaperBill.tsx`
- Modify: `src/ui/sections/AboutSection.tsx` (bills instead of NeonBoxes; the poster stays first), `src/app/globals.css` (`.paper-bill`: paper, tape, slight tilt, torn edge via `tornEdge`), `src/experience/route.ts` (About keys: the camera before the pole, rising with progress), `src/ui/flow/JourneyTrack.tsx` (swing selector: bills)
- Test: `tests/e2e/flow.spec.ts`, `tests/unit/route.test.ts`

**Interfaces:**
- Consumes: `tornEdge` (Plan 3), `PaperPoster`, `poleWorldPose` `centre` mode (Task 2).
- Produces: `PaperBill({ children, seed }: { children: ReactNode; seed: number })`.

- [ ] **Step 1: Failing tests** — e2e: About's items are `.paper-bill` (after `.paper-poster`), each over the pole's projected column on a laptop (bill centre within ±25 % of the viewport from the pole's NDC x), full width on a phone; no inner scroll; bills swing in; reduced motion: simply there. Unit: through the About hold the camera's y rises and its target stays on the pole.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** `PaperBill`, the CSS, the About keys; keep the measured About piece.
- [ ] **Step 4: Run** `flow.spec`, `sections.spec`, mobile — Expected: PASS (update the tests that pinned `.nbox` in About; ledger).
- [ ] **Step 5: Commit** `feat(ride): About as paper bills on the pole`

---

### Task 5: Stack — signs over the road

**Files:**
- Create: `src/scene/stack/Gantry.tsx`, `src/scene/stack/signTexture.ts`, `src/experience/stackStops.ts`, `src/ui/sections/StackCaption.tsx`
- Modify: `src/ui/sections/StackSection.tsx` (a caption per stop instead of the blades), `src/experience/journey.ts` + `src/ui/flow/JourneyTrack.tsx` (Stack becomes a fixed stop track like Work), `src/scroll/SmoothScroll.tsx` (snap inside Stack), `src/experience/route.ts` (a hold before each sign), `src/content/stack.ts` if the categories live elsewhere
- Test: `tests/unit/signTexture.test.ts`, `tests/unit/stackStops.test.ts`, `tests/unit/journey.test.ts`, `tests/e2e/stack.spec.ts`

**Interfaces:**
- Consumes: the Work stop pattern (`workStops.ts`: `stopProgress`, `stopAt`, `snapTarget`).
- Produces:
  - `STACK_STOPS = 6`, `stackStopProgress(i: number): number`, `stackStopAt(q: number): number`, `stackSnapTarget(q: number, from?: number): number | null`
  - `drawSign(ctx: CanvasRenderingContext2D, sign: { title: string; items: { label: string; icon?: string }[] }, size: { w: number; h: number }): { fontPx: number; overflow: boolean }`
  - probe `gantry`: `{ stop: number; signs: { ndc: [number, number] }[] }`

- [ ] **Step 1: Failing unit tests** — `drawSign` fits the longest category (Front-end, 8 items) and the longest translated label without overflow at ≥ 18 px on a 1024-px-wide texture; stack stops are evenly spread inside Stack's range and snap like Work's; the journey's pieces still add up with Stack as a stop track.
- [ ] **Step 2: Failing e2e** — each stop shows its HTML caption (the category and its items, selectable) and the camera faces its sign (its NDC near the centre); no blades remain; hovering a caption item lights its pole sticker (if kept); `/ru` shows Russian captions; a deep link to Stack lands on its first sign (Review Focus 3).
- [ ] **Step 3: Run** — Expected: FAIL.
- [ ] **Step 4: Implement** the gantry (a truss, six panels with canvas textures in sRGB, a reflective border, emissive lift for the night), the stop track, the caption, the snap.
- [ ] **Step 5: Run** unit + `stack.spec`, `sections.spec`, `flow.spec`, mobile; perf at a Stack stop ≤ 33.4 ms. Expected: PASS.
- [ ] **Step 6: Commit** `feat(ride): Stack as green signs over the road`

---

### Task 6: Contact — the billboard

**Files:**
- Create: `src/scene/billboard/Billboard.tsx`, `src/scene/billboard/billboardRect.ts`
- Modify: `src/ui/sections/ContactSection.tsx` (on laptops the form sits in the billboard's projected frame; on phones in the flow; `toGreenLight` scrolls to the final frame), `src/ui/sections/ContactForm.tsx` (layout inside the frame), `src/experience/route.ts` (the end pose: the billboard, the pole's light in frame)
- Test: `tests/unit/billboardRect.test.ts`, `tests/e2e/contact.spec.ts`, `tests/e2e/mobile.spec.ts`

**Interfaces:**
- Consumes: `projectScreen`-style projection (`src/scene/tvwall/screenRects.ts`), `poleWorldPose` (Task 2).
- Produces: `billboardRect(camera, canvas): Rect | null` (the screen rect of the billboard's panel); `setBillboardRectSource` / `billboardRectNow()` like `screenRectFor`.

- [ ] **Step 1: Failing tests** — unit: the projected rect of the panel at the end pose is inside the viewport on a 1440×800 laptop and wide enough for the form (≥ 520 px). E2E: at p = 1 on a laptop the form's box lies inside the billboard rect; the light is green in frame; a contact click or a sent message glides to p = 1 (as now); on a phone the form is in the flow under the billboard; a resize at the end re-fits the form or moves it into the flow (Review Focus 5). With every station now built, in `ride.spec.ts`:
  - `a fling through the whole ride stays on the street` (Review Focus 1) — one long wheel from p = 0.16 to the end, sampling every 100 ms: the camera is never inside the shop or billboard building boxes, the pole's position never inside them either;
  - `the pole never covers the text` (Review Focus 2) — at 412×915 and 2560×1080, at a Work stop, About's hold, every Stack stop and p = 1: the pole's screen box does not intersect the caption, the bills or the form.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** the billboard (a frame on a facade, a dark panel, neon "Let's go", the contacts as neon lines), the rect source, the fitted form.
- [ ] **Step 4: Run** unit + `contact.spec`, `mobile.spec`, `flow.spec`; perf at the end ≤ 33.4 ms. Expected: PASS.
- [ ] **Step 5: Commit** `feat(ride): Let's go on a billboard at the end of the street`

---

### Task 7: The speedometer loader

**Files:**
- Modify: `src/ui/Loader.tsx`, `src/app/globals.css`, `messages/{en,ru,uk}.json` (`loader.*`)
- Test: `tests/e2e/interaction.spec.ts`, `tests/unit/loader.test.ts` (the digit and arc mapping)

**Interfaces:**
- Produces: `speedFor(loaded: number): number` (0–100, never backwards), `arcFor(speed: number): number` (0–1).

- [ ] **Step 1: Failing tests** — unit: `speedFor` is monotonic and reaches 100 only at 100 %; e2e: while loading the loader shows the digits and the arc, "GO" appears at ready, then the loader leaves and the page comes; reduced motion: digits only, no arc animation.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** (SVG arc + digits in the site's neon, `role="status"` keeps the percentage for screen readers).
- [ ] **Step 4: Run** unit + `interaction.spec` + mobile — Expected: PASS.
- [ ] **Step 5: Commit** `feat(ui): a speedometer while the street loads`

---

### Task 8: The 404 — critical error

**Files:**
- Create: `src/app/[locale]/not-found.tsx`, `src/app/[locale]/[...rest]/page.tsx` (calls `notFound()` so unknown paths get the localized page), `src/ui/CriticalError.tsx`
- Modify: `src/app/globals.css` (glitch keyframes, ≤ 3 flashes/s, off under reduced motion), `messages/{en,ru,uk}.json` (`notFound.*`)
- Test: `tests/e2e/notfound.spec.ts`, `tests/unit/neon.test.ts` (flash count of the glitch keyframes)

- [ ] **Step 1: Failing tests** — `/en/nope` answers 404 with "CRITICAL ERROR" and the link back to `/en`; `/ru/nope`, `/uk/nope` in their languages; reduced motion: no glitch animation; the glitch keyframes drop at most three times per second; `/en/work/nope` still answers 404 (the case route).
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** (check Next 16's `not-found` conventions in `node_modules/next/dist/docs` first).
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(ui): a CRITICAL ERROR 404`

---

### Task 9: Verification and the gate

- [ ] **Step 1:** `npm run lint && npm run typecheck && npx vitest run` — Expected: clean, PASS.
- [ ] **Step 2:** full chromium and mobile e2e — Expected: PASS.
- [ ] **Step 3:** `npm run perf` with a measurement per section (intro, a Work stop, About, a Stack stop, the end) — Expected: each median ≤ 33.4 ms on medium; record the numbers.
- [ ] **Step 4:** `npm run build` + `npx playwright test --project=prod` — Expected: PASS; 3D assets ≤ 6 MB, JS on `/en` recorded.
- [ ] **Step 5:** gate agenda (`docs/superpowers/gates/2026-11-16-m4-ride-gate.md`): the ride, the pole, the shop window, the bills, the signs, the billboard, the loader, the 404, laptop and phone; Ctrl+Shift+R.
- [ ] **Step 6: Commit** `docs(gate): the ride`
