# Plan 4b — M4 round 1: the billboard's support and screen, the dive, the pole close-up, the neon loader

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rustam's five notes from M4 round 1: the billboard stands on a column. It becomes a screen that switches on with a glitch only once the camera has stopped. On a phone the camera dives into that screen and the form scrolls inside its neon frame. About looks at the pole from centimetres away, with the bills pasted on it. The loader becomes a neon "Rendering" sign.

**Architecture:** The camera pose stays a function of story progress, now also of the viewport and the measured journey (About's close-up distance and descent, the dive's stretches are in px). `desiredCameraPose(p, viewport, reduced)` composes the route with two new pure modules: `src/experience/aboutPole.ts` (the close-up) and `src/experience/dive.ts` (arrival, dive, inside). Where the page must move with the scene pixel for pixel (About's descent, the dive) the camera follows that pose undamped. The screen's state is a pure function of progress (`src/experience/billboardScreen.ts`), read by both the DOM (CSS glitch) and the 3D panel (a flicker uniform). The new support is merged unlit geometry with baked vertex light, like the gantry.

**Tech Stack:** Next.js 16 / React 19, three 0.187 + R3F 9 + drei, GSAP ScrollTrigger + Lenis, next-intl 4, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-16-ride-round-1-design.md` (amends `docs/superpowers/specs/2026-11-15-the-ride-design.md`). Branch: `plan-4/ride` (continue on it; the merge into `main` waits for the M4 gate).

## Global Constraints

- Section windows stay: work 0.15–0.37, about 0.37–0.59, stack 0.59–0.8, contact 0.8–1; `holdWindow('about')` = [0.395, 0.565]; `CONTACT_FROM` = `END_FROM` = 0.86 (the camera stops at the billboard).
- The camera never moves more than 0.5 m per svh of scroll anywhere (the route test, now over `desiredCameraPose` on laptop and phone viewports).
- No new scene lights. New big parts are merged `MeshBasicMaterial` geometry with light baked into vertex colours (Plan 4 lesson: lit materials cost a vsync step on the Intel UHD).
- Median frame ≤ 33.4 ms on the medium tier in every section; perf runs on its own after a pause, with the Playwright MCP browser closed.
- All text stays HTML: selectable, translatable, read by screen readers. No inner scroll container anywhere (`innerScrollers()` stays empty), phones included.
- Every glitch or blink: at most three flashes in any one second; none under reduced motion.
- Deep links, `#contact`, the language switch "at the same place", the Next button, the phone menu, reduced motion and the no-WebGL page keep working.
- The camera's near plane is 0.1 m: About's close-up keeps the camera ≥ 0.15 m from the pole's surface.
- Restart :3200 after editing `messages/*.json`; delete `.next/dev` if CSS looks stale.

## Review Focus

1. **The phone keyboard inside the frame.** Typing in the message field on a phone (the on-screen keyboard shrinks the viewport): the field stays visible inside the frame, the visitor is not thrown out of the dive. Test in Task 4.
2. **A fling across the arrival.** One swipe from Stack to the end and straight back: the screen ends in the state where the scroll stopped, glitches never stack, the form is never visible while the camera moves. Test in Task 2.
3. **Turning a tablet between billboard and dive mid-Contact** (768×1024 ↔ 1024×768): typed text kept, the right mode, no half-lit frame. Test in Task 4.
4. **A laptop window resized inside About.** The close-up distance is recomputed and the bills stay pasted (no drift) after the resize. Test in Task 5.
5. **Reduced motion on a phone, Contact from the header link.** It lands inside the frame at the start of the content, with no glitch. Test in Task 4.

---

### Task 1: The billboard stands on a column

**Files:**
- Modify: `src/scene/billboard/layout.ts` (add `BILLBOARD.support`), `src/scene/billboard/Billboard.tsx` (draw the support; remove `struts()`; the lamps' glow on the panel's lower edge; the probe gets `support`)
- Test: `tests/unit/billboard.test.ts`, `tests/e2e/contact.spec.ts`

**Interfaces:**
- Produces: `BILLBOARD.support: { column: { x: number; z: number; width: number; top: number }; catwalk: { y: number; z: number; depth: number; x0: number; x1: number }; lamps: readonly Vec3[] }` (metres, street coordinates; the column's foot is at y = 0).
- Probe `billboard` gains `support: { catwalk: [number, number] }` (the catwalk's centre in screen px).

- [ ] **Step 1: Failing unit tests** in `billboard.test.ts`: the column stands on the ground (foot at y 0) and reaches the frame's lower edge (`top` within 0.4 m below the panel's bottom after the tilt). It stands behind the panel's face and in front of the building's face (`building.z0 < column.z < panel back`), inside the panel's x span. The catwalk runs under the panel's bottom edge, at least 2/3 of the panel's width. Exactly three lamps sit on the catwalk, in front of the panel, below its bottom edge. Every route camera position from `STACK_TO` to 1 (`ridePose`) keeps ≥ 1 m from the column and the catwalk.
- [ ] **Step 2: Run** `cd d:/projects/portfolio && npx vitest run tests/unit/billboard.test.ts`. Expected: FAIL (`support` undefined).
- [ ] **Step 3: Implement** `BILLBOARD.support` and draw it in `Billboard.tsx`:
  - one steel column, a head under the frame, a catwalk with a railing, three gooseneck lamps;
  - geometry merged by material (steel; emissive lamp heads with a small additive glow card each), with vertex light baked by `merged()` as now;
  - the panel texture gains a soft warm wash along its lower edge where the lamps light it;
  - delete `struts()`.
- [ ] **Step 4: Run** the unit tests. Expected: PASS.
- [ ] **Step 5: Failing e2e** in `contact.spec.ts`: at progress 1 on 1440×800 the probe's `support.catwalk` lies inside the frame, below the panel's rect.
- [ ] **Step 6: Run** `npx playwright test tests/e2e/contact.spec.ts --project=chromium`. Expected: the new test passes, the rest of the file green.
- [ ] **Step 7: Commit** `feat(billboard): a column, a catwalk and lamps under the billboard`

### Task 2: The screen switches on when the camera stops (laptop)

**Files:**
- Create: `src/experience/billboardScreen.ts`
- Modify: `src/ui/sections/ContactBillboard.tsx` (shown by the screen's state, not the `IN` fade; `data-screen`, the glitch), `src/scene/billboard/Billboard.tsx` (the panel's flicker uniform; the off screen's look), `src/app/globals.css` (`screen-on` / `screen-off` keyframes, scanlines on the content)
- Test: `tests/unit/billboardScreen.test.ts`, `tests/e2e/contact.spec.ts`

**Interfaces:**
- Produces:
  - `GLITCH_MS = 700`
  - `screenOn(p: number, reduced: boolean): boolean`: reduced → `sectionPresence(p, 'contact') > 0`; otherwise `p >= END_FROM`
  - `panelFlicker(ms: number, on: boolean): number`: the 3D panel's brightness multiplier `ms` after the last switch; on: flashes, then 1 from `GLITCH_MS`; off: flashes, then 0
- `ContactBillboard` root carries `data-screen="on" | "off"` and, while a glitch plays, `data-glitch`.

- [ ] **Step 1: Failing unit tests** in `billboardScreen.test.ts`:
  - `screenOn` is false at 0.859 and true at 0.86 and 1;
  - under reduced motion it is true at 0.82;
  - `panelFlicker(GLITCH_MS + 1, true) === 1` and `panelFlicker(GLITCH_MS + 1, false) === 0`;
  - sampling every 5 ms over `[0, GLITCH_MS]`, the number of rises above 0.8 after a dip below 0.3 is between 1 and 3 (a glitch, and never more than three flashes in a second).
- [ ] **Step 2: Run** `npx vitest run tests/unit/billboardScreen.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** `billboardScreen.ts` and wire it:
  - **`ContactBillboard`.** On every store change it compares `screenOn` with its last state. On a flip it sets `data-screen` and restarts the glitch: a flip during a running glitch replaces it, so glitches never stack. It is `visible` and not `inert` only while on. It hides after the `screen-off` animation ends.
  - **Movement.** Drop the `rise` translate: the content never moves on the panel.
  - **CSS.** `screen-on`: slices offset through `clip-path: inset()`, a pink/cyan `text-shadow` split, one brightness flash, settling by 700 ms, in the manner of `critical-glitch`. `screen-off`: a quick collapse. Faint scanlines over the content (`::after`, `pointer-events: none`). Under `prefers-reduced-motion: reduce` there are no animations.
  - **3D panel.** `Billboard.tsx` keeps its own `{ on, since }` from the same `screenOn` and multiplies the panel and tube colours by `panelFlicker(now - since, on)` (the tube never drops below 0.35, so the switched-off screen still shows its edge). The off panel stays near black, with faint scanlines drawn into its texture at a pitch that does not shimmer from 16 m.
- [ ] **Step 4: Run** the unit tests. Expected: PASS.
- [ ] **Step 5: Failing e2e tests** in `contact.spec.ts` (update the ones that pinned the old `IN` window):
  - at 0.855, while the camera still drives in (the old fade had it partly shown there), `[data-billboard]` is hidden and inert;
  - after `scrollTo(1)` it has `data-screen="on"` and is visible within 1.5 s;
  - back to 0.855, it is hidden again;
  - **Review Focus 2:** `scrollTo(0.7)`, then `scrollTo(1)` and `scrollTo(0.8)` within 300 ms, rest: hidden and `data-screen="off"`, with `data-glitch` gone within 1.5 s;
  - under reduced motion at 0.82 it is visible with no `data-glitch` ever set.
- [ ] **Step 6: Run** `npx playwright test tests/e2e/contact.spec.ts --project=chromium`. Expected: PASS.
- [ ] **Step 7: Commit** `feat(billboard): a screen that switches on with a glitch once the camera stops`

### Task 3: The dive — the camera's path on phones

**Files:**
- Create: `src/experience/dive.ts`
- Modify:
  - `src/scene/cameraPose.ts`: `desiredCameraPose(p, viewport, reduced)` takes `{ w, h }`, and the dive overrides the route on dive screens;
  - `src/scene/billboard/fit.ts`: compute the end pose from the route's END and `fitDistance` directly, so `cameraPose.ts` may import `billboardFit` without a cycle;
  - `src/experience/journey.ts`: add `pieceSpanPx`;
  - the callers: `CameraRig.tsx`, `Pole.tsx`, `billboardRect.ts`;
  - `CameraRig.tsx`: undamped while `lockedAxes` says so;
  - `src/experience/panels.ts`: `frameShift` returns 0 for contact on narrow screens;
  - `src/experience/workStops.ts`: `sectionTarget`'s contact landing;
  - `src/scroll/SmoothScroll.tsx`: passes the dive view.
- Test: `tests/unit/dive.test.ts`, `tests/unit/route.test.ts`, `tests/unit/workStops.test.ts`

**Interfaces:**
- Consumes: `BILLBOARD` (Task 1), `END_FROM`, `fitDistance`, `billboardFit`.
- Produces:
  - `pieceSpanPx(id: PieceId, viewportH: number): number`: the measured length in px, or `DEFAULT_SVH[id] * viewportH / 100` before measuring.
  - `DIVE = { arriveSvh: 20, diveSvh: 60, frameInset: 8, overscan: 0.9 }`.
  - `type DiveView = { w: number; h: number; contactPx: number }`.
  - `diveStage(p: number, view: DiveView): { stage: 'approach' | 'arrived' | 'dive' | 'inside'; t: number }`. The stages are counted in px from the start of the Contact piece: arrived for `arriveSvh`, the dive for `diveSvh`, then inside; `t` is 0..1 within the dive.
  - `divePose(p: number, view: DiveView): Pose`:
    - **arrival:** square to the panel, its centre in the middle of the screen, at the distance where panel, title and catwalk fill ≤ 85 % of the height;
    - **dive end:** along the panel's normal, at the distance where the panel's interior height × `overscan` fills the screen's height;
    - **between:** smootherstep on the dive's `t`.
  - `contactLanding(view: DiveView): number`: story progress where the dive ends.
  - `isDive(viewport: { w: number; h: number }, webgl: boolean): boolean` = `webgl && billboardFit(viewport) === null`.
  - In `src/scene/cameraPose.ts`: `lockedAxes(p: number, viewport: { w: number; h: number }, reduced: boolean): 'none' | 'y' | 'all'`. 'all' in the dive's `dive` and `inside` stages ('y' comes in Task 5). `desiredCameraPose` builds the `DiveView` itself from the viewport and `pieceSpanPx('contact', h)`, and assumes WebGL (it only runs where the scene or the dive does).
  - `sectionTarget(id: SectionId, dive?: DiveView): number`: contact → `dive ? contactLanding(dive) : 1`.

- [ ] **Step 1: Failing unit tests** in `dive.test.ts`, for 412×839, 390×844, 360×740, 768×1024 and 900×600 (a small landscape window), each with a contact piece of 1.6, 2.5 and 4 screens:
  - stage boundaries match the svh lengths;
  - the arrival pose centres the panel (|centre x − w/2| < 2 px through `projectPanel`) with the panel and the title inside the screen's height;
  - at the dive end all four corners of the panel's interior project outside the screen;
  - the distance to the panel never grows through the dive;
  - `desiredCameraPose` is continuous (< 1e-6 m) at 0.86 and at the dive's end;
  - the camera keeps ≥ 0.5 m from the support (Task 1) all the way.
  
  In `route.test.ts`, the speed test runs over `desiredCameraPose` for 1440×800 and 412×839 with measured lengths set; still ≤ 0.5 m per svh.
  
  In `workStops.test.ts`, `sectionTarget('contact', view)` equals `contactLanding(view)`, and `sectionTarget('contact')` is 1.
- [ ] **Step 2: Run** `npx vitest run tests/unit/dive.test.ts tests/unit/route.test.ts tests/unit/workStops.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement**:
  - **Approach on a dive screen.** From the gantry to the arrival, `desiredCameraPose` blends the fitted route pose into the arrival pose over [0.83, 0.86], so the path stays within the speed limit.
  - **From 0.86.** `divePose`, with no `fitDistance`.
  - **Reduced motion on a dive screen.** The dive's end pose for all of Contact.
  - **`CameraRig`.** Uses `k = Infinity` on the axes `lockedAxes` names.
  - **`frameShift`.** Contact on narrow screens → `{ x: 0, y: 0 }`.
  - **`SmoothScroll`.** `scrollToSection` and `parseHash` build the `DiveView` from `innerWidth`/`innerHeight`, `pieceSpanPx('contact', innerHeight)` and the store's `webgl`.
- [ ] **Step 4: Run** the unit tests and `npx tsc --noEmit`. Expected: PASS, no type errors.
- [ ] **Step 5: Run** `npx playwright test --project=chromium --project=mobile`. Expected: green, except the phone Contact tests that pinned the old flow. List them in the ledger; Task 4 rewrites them.
- [ ] **Step 6: Commit** `feat(ride): on a phone the camera dives into the billboard's screen`

### Task 4: The dive — the screen and its frame in the page

**Files:**
- Create: `src/ui/sections/ContactScreen.tsx` (the screen picture on the panel during arrival and dive; the frame, its mat and scanlines when inside), `src/ui/sections/useContactMode.ts`
- Modify:
  - `src/ui/flow/JourneyTrack.tsx`: the contact piece by mode;
  - `src/ui/flow/SectionFlow.tsx`: a `dive` prop → `data-dive`;
  - `src/app/[locale]/(site)/layout.tsx`: renders `<ContactScreen/>`;
  - `src/app/globals.css`: the dive's `--entry`, hidden content until inside, the frame, the mat, `scroll-margin`;
  - `src/scene/billboard/fit.ts`: export `projectPanel` for the page.
- Test: `tests/e2e/mobile.spec.ts`, `tests/e2e/contact.spec.ts`

**Interfaces:**
- Consumes: `diveStage`, `divePose`, `DIVE`, `screenOn`, `GLITCH_MS`, `projectPanel`.
- Produces: `useContactMode(): 'billboard' | 'dive' | 'page'` (`page` without WebGL). The contact `SectionFlow` carries `data-dive` and `data-stage` (= `diveStage`'s stage) on dive screens.

The real content stays in the page flow, so focus, the on-screen keyboard and text selection behave natively.

1. **Arrival and dive.** `ContactScreen` draws an `aria-hidden`, inert picture of the content's first screen on the panel:
   - what it shows: the lead, the field outlines and the Send sign (not the form itself);
   - where: placed every frame by `projectPanel(desiredCameraPose(p, viewport, reduced), viewport)`, centred, at the scale the panel gives it;
   - when it appears: with Task 2's `screen-on` glitch at arrival.
2. **Inside.** It shows the frame instead:
   - a neon tube in the contact colour, `DIVE.frameInset` px from the screen's edges and below the header;
   - black mats outside the tube that hide the content above and below the frame;
   - faint scanlines.
3. **The real content.** It becomes visible and not inert at the same moment, under a short flash, so the hand-over is not seen.
4. **Where the content starts.** The dive's CSS sets the contact piece's `--entry` so the content's top sits at the frame's inner top when the dive ends: arrive + dive + header + inset. Under reduced motion it sits at the frame's top from the start of Contact.

- [ ] **Step 1: Failing e2e** in `mobile.spec.ts` (Pixel 7) and `contact.spec.ts` (chromium at 900×600):
  - **at 0.86:** after the switch-on the screen picture lies inside the projected panel; the real form is hidden and inert;
  - **after `scrollToSection('contact')`:**
    - the frame's rect is within 4–20 px of the screen's left, right and bottom edges and below the header;
    - the form's inputs lie inside the frame;
    - scrolling 300 px moves the form up by 300 px ± 2 while the frame stays put;
    - `innerScrollers()` is empty;
  - **back to 0.86:** the frame and the form are hidden again;
  - **`#contact` hash and the language switch** land at the content's start;
  - **Review Focus 1:** focus the message field, shrink the viewport to 60 % of its height. The field stays inside the frame and `data-stage` stays `inside`;
  - **Review Focus 3:** type a name at the landing on 768×1024, turn to 1024×768. The form is on the billboard with the name kept. Turn back: inside the frame, the name kept, no frame visible while the stage is not `inside`;
  - **Review Focus 5:** reduced motion, 412×839, the header menu's Contact. The frame is lit, the content's top is inside it, `data-glitch` is never set.
- [ ] **Step 2: Run** `npx playwright test tests/e2e/mobile.spec.ts tests/e2e/contact.spec.ts --project=mobile --project=chromium`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above. Rewrite the old phone Contact tests from Task 3's ledger list against the dive; each changed assertion gets a ledger ruling.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(contact): on a phone the form scrolls inside the billboard's screen`

### Task 5: About — the pole close up, the bills pasted on it

**Files:**
- Create: `src/experience/aboutPole.ts`, `src/ui/sections/AboutBackdrop.tsx` (the blurred, dimmed street beside the pole on wide screens)
- Modify:
  - `src/experience/route.ts`: the About keys (0.4, 0.48, 0.565) leave `RIDE`; `stationPose('about')` goes;
  - `src/scene/cameraPose.ts`: About from `aboutPose`;
  - `src/experience/poleRide.ts`: `ABOUT_IN` = [0.37, 0.395];
  - `src/scene/cameraPose.ts`: `lockedAxes` returns 'y' inside About's hold; `desiredCameraPose` builds the `AboutView` from the viewport and `pieceSpanPx('about', h)`;
  - `src/experience/panels.ts`: no frame shift for About on narrow screens;
  - `src/app/globals.css`:
    - `#about` `--entry: 100svh`;
    - the swing-in rules for the poster and the bills go;
    - the bills' edges darken (`.paper-bill-sheet` and `.paper-poster`, an `::after` gradient, ~12 % each side);
  - `src/ui/flow/JourneyTrack.tsx`: the swing observer goes;
  - `src/scene/stickers/PoleStickers.tsx`: a sharper atlas where the tier allows;
  - `src/app/[locale]/(site)/layout.tsx`: renders `<AboutBackdrop/>`.
- Test: `tests/unit/aboutPole.test.ts`, `tests/unit/route.test.ts`, `tests/unit/poleRide.test.ts`, `tests/e2e/flow.spec.ts` (or the About tests' current home)

**Interfaces:**
- Produces:
  - `type AboutView = { w: number; h: number; aboutPx: number; billsPx: number }`, with `billsPx` = the bills column's width in px. Wide: `min(32rem, 44vw)`, computed the same way as the CSS. Narrow: `w - 32`.
  - `aboutCloseUp(view: AboutView): { distance: number; top: number; bottom: number }`, metres; `distance` is the camera's distance from the pole's axis.
  - `aboutPose(p: number, view: AboutView): Pose`. The camera sits at `STATIONS.pole.x` and `STATIONS.pole.z + distance`, looking level at the pole. Its height runs linearly from `top` at 0.395 to `bottom` at 0.565. Over [0.37, 0.395] it blends from the route's 0.37 key; over [0.565, 0.59] it blends into the 0.59 key (smootherstep).
  - Rules for `aboutCloseUp`:
    - the pole's on-screen width is `max(1.15 × billsPx, w ≥ 1024 ? 0 : 1.25 × w)` px;
    - the descent equals `aboutPx` scroll px at that scale;
    - `top` = 1.6 m;
    - if `bottom` would fall below 0.3 m, the camera comes closer until it fits. It is never faster, and never nearer than 0.15 m to the surface; if even that does not fit, `bottom` clamps at 0.3 and the ledger notes the screen.

- [ ] **Step 1: Failing unit tests** in `aboutPole.test.ts`, for 1440×800, 1280×720, 1920×1080, 412×839 and 360×740 with `aboutPx` from 2600 to 7000:
  - **pasted:** projecting a pole surface point at `p` and `p + δ` (through `fit.ts`'s projection), it moves up the screen by `δ / 0.17 × aboutPx` px ± 0.5;
  - **range:** the camera's height stays within [0.3, 1.6];
  - **width:** the pole's projected width is ≥ `billsPx` on laptops and ≥ the screen's width on phones;
  - **near plane:** the distance from the surface is ≥ 0.15 m.
  
  In `poleRide.test.ts`, the pole is at its station by 0.395. The route speed test (now over `desiredCameraPose`) stays ≤ 0.5 m per svh with About measured at 2600 and 7000 px.
- [ ] **Step 2: Run** `npx vitest run tests/unit/aboutPole.test.ts tests/unit/route.test.ts tests/unit/poleRide.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above.
  - **Reduced motion.** It also follows `aboutPose` inside the hold, where the descent is the page's own scroll. Entering and leaving are cuts.
  - **`AboutBackdrop`.** Two fixed, `aria-hidden` strips beside the pole's projected column:
    - shown with About's presence;
    - `backdrop-filter: blur(6px)` and a dark tint under `html:not([data-tier='low'])`, the tint alone on `low`;
    - nothing on narrow screens, where the pole fills the width.
  - **Stickers.** The atlas goes to 4096 with 512 px cells where the tier is medium or high. Low keeps 2048: atlas memory on phones is a deferred concern. Ledger the measured GPU memory.
- [ ] **Step 4: Run** the unit tests. Expected: PASS.
- [ ] **Step 5: Failing e2e tests:**
  - **close-up:** at 0.395 the camera probe is within 0.5 m of the pole's axis and no bill is on screen yet;
  - **pasted:** the pole probe gets `pin`, the screen y of a fixed pole point at 1.2 m. Scroll 400 px inside About's hold: the first visible bill's `rect.y` and `pin` both move by 400 ± 3 px;
  - **Review Focus 4:** resize 1440×800 → 1280×720 inside About, wait for the remeasure, repeat the 400 px check;
  - **narrow:** on the mobile project the pole's projected width covers the screen.
- [ ] **Step 6: Run** `npx playwright test --project=chromium --project=mobile`. Expected: PASS. Rewrite the About tests that pinned the swing or the rising camera, with ledger rulings.
- [ ] **Step 7: Commit** `feat(about): the camera close to the pole, the bills pasted on it`

### Task 6: The loader — a neon "Rendering" sign

**Files:**
- Create: `src/ui/loaderLog.ts`
- Modify:
  - `src/ui/Loader.tsx`: rewritten;
  - `src/ui/loaderGauge.ts`: `speedFor` → `percentFor`; `arcFor` goes;
  - `src/experience/store.ts`: add `loadItems`;
  - `src/scene/Experience.tsx`: `LoadProgress` pushes `item`;
  - `src/ui/ExperienceGate.tsx` and `src/app/[locale]/(site)/layout.tsx`: drop `unit`;
  - `messages/{en,ru,uk}.json`: `loader.label`, and `loader.unit` goes;
  - `src/app/globals.css`: the sign's blink and switch-off keyframes; `gauge-go` goes.
- Test: `tests/unit/loader.test.ts`, `tests/unit/messages.test.ts`, the loader e2e in `tests/e2e/interaction.spec.ts`

**Interfaces:**
- Produces:
  - `percentFor(loaded: number, previous?: number): number`, `speedFor`'s behaviour: floors, holds 99 until 100, never goes back.
  - `loadItems: string[]` in the store, with `pushLoadItem(url: string)`: the URL's basename, the last 12 kept.
  - `logLines(items: readonly string[], percent: number, max: number): string[]`:
    - first line `{ scene ......... NN%`;
    - then the last `max - 2` items as `  name ...... ok`, padded to one width;
    - last line `  …` while under 100, `  /` at 100.
  - The log is English in every language.
  - three's `LoadingManager` reports a file only when it has finished. So the log lists finished files with `ok`, and the files still in flight show as one trailing `…` line, not one line each. This is a deviation from spec §7: ledger a ruling.

- [ ] **Step 1: Failing unit tests:**
  - `percentFor` keeps `speedFor`'s cases;
  - `logLines`: the first line carries the percent; the item lines end in `ok` and are equally long; never more than `max` lines; long names are cut with `…`;
  - `messages.test`: `loader.label` is "Rendering", "Загрузка", "Завантаження"; no `loader.unit`.
- [ ] **Step 2: Run** `npx vitest run tests/unit/loader.test.ts tests/unit/messages.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `Loader.tsx` after the approved mockup (`.superpowers/brainstorm/9090-1794853127/content/loader-and-dive-v2.html`):
  - **The sign.** A near-black screen with a plum glow in the middle. A pink double neon frame (`NEON.name`), the label in capitals (CSS `uppercase`), the percent in `NEON.about` cyan. A bracketed bar: the filled part bright, the rest dotted.
  - **The log.** Top left (`aria-hidden`): 7 lines on wide screens, 3 on phones.
  - **Phases.** `data-phase="load" | "compile" | "off"`. At 100 and not ready the frame blinks (≤ 3 flashes a second). On `ready` the sign goes out like switched-off neon (two short flickers, then dark, ~500 ms) and the loader hides as now.
  - **Unchanged.** `role="status"` reads `{label} {N}%`. Under reduced motion: no blink, no flicker, a fade. The name in the header still paints first; the loader's z-order and the `data-shown` gate are untouched.
- [ ] **Step 4: Run** the unit tests. Expected: PASS.
- [ ] **Step 5: Failing e2e test** (rewrite the speedometer test): on `/ru`, `/en` and `/uk` the loader shows "Загрузка", "Rendering" and "Завантаження" with a percent, the status reads the same, and the log has ≥ 2 lines. Once ready the loader is hidden.
- [ ] **Step 6: Run** `npx playwright test tests/e2e/interaction.spec.ts --project=chromium`. Expected: PASS.
- [ ] **Step 7: Commit** `feat(ui): a neon Rendering sign while the street loads`

### Task 7: Verification and the gate

**Files:**
- Modify: `tests/e2e/perf.spec.ts` (add the About close-up and the dive), `docs/superpowers/gates/2026-11-16-m4-ride-gate.md` (Round 1 — done: what changed, verification, decisions)

- [ ] **Step 1: Run** the whole check: `npm run lint`, `npx tsc --noEmit`, `npx vitest run`, `npx playwright test --project=chromium` and `--project=mobile`, the output to the workspace. Expected: all green.
- [ ] **Step 2: Perf**, on its own after a pause, with the MCP browser closed. `npx playwright test --project=perf`, with new cases for standing in About (close-up, blur on) and the phone dive's end (on 412×839 under the perf GPU flags). Expected: every median ≤ 33.4 ms; ledger the numbers.
- [ ] **Step 3: Prod:** `npm run build` and the `prod` project. Expected: LCP not worse than 952 ms by more than 10 %; JS on `/en` within +20 KB of 822 KB.
- [ ] **Step 4:** Write "Round 1 — done" into the gate log: what changed per note, the numbers, what to look at (Ctrl+Shift+R; laptop and phone). Rustam's «все ок» (2026-11-16) covers the two decisions of the agenda: intro-end perf → Plan 5, and phones without the green light (now part of the dive).
- [ ] **Step 5: Commit** `docs(gate): M4 round 1 done`
