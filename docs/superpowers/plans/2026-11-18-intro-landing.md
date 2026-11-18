# Intro landing (the loader's sheet becomes the floor) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** After the loader, the camera starts looking straight down at the blueprint floor (cells as big as the loader's) and cranes down to the start pose.
**Architecture:** A pure module `src/experience/landing.ts` (plan height, pose blend, arming rule, a small clock-driven state machine); CameraRig uses its pose while it runs; Blueprint reads its progress for the 1 m lines.
**Tech Stack:** R3F, zustand store, Vitest, Playwright.
**Spec:** `docs/superpowers/specs/2026-11-18-intro-landing-design.md`

## Global Constraints
- Loader cell 24 px; floor cell 0.25 m; camera vFOV 35°.
- Hold ≈ 0.9 s after `ready` (sign off 0.5 s + sheet fade 0.4 s), move ≈ 1.8 s, smootherstep.
- No landing under reduced motion, with a location hash, with scrollY > 0 at mount, or without WebGL.
- Perf budget: median ≤ 33.4 ms on the perf project through the landing.

## Review Focus
1. A visitor scrolls during the hold or the move: no jump; the scroll takes over at once.
2. A language switch (no loader) must not replay the landing.
3. A window resize during the landing: the plan height follows the new height.

### Task 1: The landing

**Files:** Create `src/experience/landing.ts`, `tests/unit/landing.test.ts`, `tests/e2e/landing.spec.ts`; modify `src/scene/CameraRig.tsx`, `src/scene/reveal/Blueprint.tsx`.

**Interfaces (produces):**
- `planHeight(hPx: number): number` — metres above the floor at which a 0.25 m cell spans 24 px.
- `planPose(hPx: number): Pose` — straight down over the pole's foot, the street (−z) at the top of the frame.
- `landingPose(t: number, from: Pose, to: Pose): Pose` — smootherstep blend of position and target.
- `landingArmed(o: { reduced: boolean; hash: string; scrollY: number; webgl: boolean }): boolean`.
- `LANDING = { holdMs: 900, moveMs: 1800 }`; module state `landing` with `arm()`, `start(nowMs)`, `cancel()`, `progress(nowMs): number | null` (null = not running: off or done) and probe `'landing'` → `{ phase: 'off' | 'armed' | 'hold' | 'move' | 'done', t: number }`.

- [ ] Unit tests: `planHeight(900)`: `0.25 * 900 / (2 * h * tan(17.5°)) ≈ 24`; `landingPose(0, a, b)` = a, `landingPose(1, a, b)` = b; `landingArmed` false for reduced, a hash, scrollY > 0, no WebGL, true otherwise; the clock: hold → `progress` 0 until 900 ms, 0.5-ish mid-move, `null` after 2700 ms, `null` after `cancel()`.
- [ ] Run → FAIL; implement `landing.ts` → PASS.
- [ ] E2E (chromium): `'after the loader the camera looks straight down at the floor from the plan height, then lands at the start'` — probe camera right after `ready`: target under position (|dx|,|dz| < 0.05), y ≈ planHeight(vh) ± 0.3; then within 5 s the landing probe is `done` and the camera is within 0.1 of `cameraPose(0)` (read the probe 'camera' twice 300 ms apart, still); `'a scroll during the landing takes over at once'` (wheel 400 during hold → landing `off`/`done`, progress > 0, no camera jump > 1 m between frames); `'no landing under reduced motion, with a hash, or after a language switch'`.
- [ ] Run → FAIL; wire CameraRig (armed at mount from `landingArmed`; `start` when `ready` flips; while `progress(now)` is a number and story progress < 0.001 use `landingPose` directly, no damping; a story progress ≥ 0.001 cancels) and Blueprint (1 m lines × landing progress while it runs) → PASS.
- [ ] Look: screenshots at hold, mid-move and done on 1440×900 and 412×915; compare the hold frame with the loader sheet.
- [ ] Perf: a perf-project test sampling frames through the landing (from `ready`, 3 s) — median ≤ 33.4.
- [ ] Full chromium + mobile suites, unit, lint, typecheck; commit `feat(intro): the loader's sheet becomes the floor`.
