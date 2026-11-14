# Plan 2c — Neon street: section text in the page flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** About, Stack and Contact stop being fixed panels with their own scroll and become neon boxes that ride the page scroll over the street. The header becomes flickering neon tubes. A Next button replaces the hero's Scroll cue. The case opens like a CRT switching on. The TV sets get sharp textures.

**Architecture:**
- **Scroll track.** `#journey` becomes a stack of eight measured pieces (`journey.ts`). Fixed spacers carry the intro, the Work stops and the turns. Three in-flow `<section>` pieces carry the text. The story mapping (scroll → story progress) is rebuilt from the measured piece heights, so the scene choreography (`SECTIONS`, `TURN`, camera keys, Work stops) is untouched.
- **Neon look.** It is CSS in `globals.css` driven by one colour variable `--c` per element (`neon.ts`).
- **Case animation.** It runs on the Web Animations API (`crt.ts`) from the clicked TV's projected screen rect.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 4, next-intl 4, Lenis + GSAP ScrollTrigger, R3F 9 / three 0.187, zustand, Vitest, Playwright (chromium + Pixel 7).

**Spec:** `docs/superpowers/specs/2026-11-14-neon-street-content-design.md` (Rustam's choices: mockups in `.superpowers/brainstorm/1246-1794660792/content/`). Parent spec: `docs/superpowers/specs/2026-11-12-portfolio-design.md`.

## Global Constraints

- **Next.js.** Read `node_modules/next/dist/docs/` before writing Next code (AGENTS.md).
- **Frame budget** (`tests/e2e/perf.spec.ts`): median ≤ 33.4 ms on the Intel UHD. Today: 27.9 ms on the journey, 27.7 ms at a Work stop.
- **Asset and bundle budgets.**
  - 3D assets ≤ 6 MB (`tests/unit/assetBudget.test.ts`); today ≈ 3.4 MB.
  - Prod JS ≤ 1.6 MB (`npm run prod`).
- **Free assets only** (CC0 / OFL).
- **Logos.** Only `simple-icons` named imports through `src/scene/stickers/icons.ts`. Never `import *`. Never hand-drawn. No logo → a dot.
- **Fonts.** Oswald (`--font-plate`) for tubes and headings; JetBrains Mono for text. Anton stays 3D-only.
- **Choreography is frozen.**
  - `SECTIONS` (work 0.15–0.37, about 0.37–0.59, stack 0.59–0.8, contact 0.8–1), `TURN` = 0.05, `INTRO_END` = 0.15.
  - `CAMERA_KEYS`, `TRACK_FROM` 0.18 / `TRACK_TO` 0.32, `STOP_SVH` 40, the snap.
- **Neon colours (spec §6.2):**

  | Element | Colour |
  |---|---|
  | work | `#ff8a2a` |
  | about | `#5fe1ff` |
  | stack | `#ff3448` |
  | contact | `#ff45b5` |
  | cv | `#3dff8f` |
  | name | `#ff4fb0` |
  | languages | `#c9d6ff` |
  | blueprint (before Work) | `#7fe3ff` |

- **Box (§6.2).**
  - Fill `rgba(4,8,14,.80)`, radius 10 px, 2 px border of `--c` mixed with white.
  - Glow `0 0 4px`, `0 0 16px` (60 %), inset `12px` (≈30 %).
  - Hangers: two `#3a3f48` 2 px posts between boxes.
- **Flicker.**
  - A tube dips once every 8–16 s (its own deterministic period and offset). At most 3 drops per burst, never more than 3 flashes a second.
  - Hover, focus and `aria-current` are steady.
  - `prefers-reduced-motion`: no flicker at all.
- **No inner scroll** on the home page except the open case (spec §3).
- **Touch targets.** On a phone every header tube and the Next button are ≥ 44×44 px.
- **`data-ui`.** HTML over the scene that takes the pointer carries it (`overUi`). Empty parts of a flow section must not swallow the pointer.
- **No WebGL.** `?webgl=0` shows all content.
- **Copy.** New strings in EN/RU/UK only where the spec names them. Restart the :3200 dev server after editing `messages/*.json`.
- **Commits.** End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Dev/test environment.**
  - Start :3200 from PowerShell: `$env:DEV_LAN_HOST='192.168.100.34'; $env:NEXT_PUBLIC_TEST_HOOKS='1'; $env:MAIL_TRANSPORT='json'; $env:CONTACT_RATE_LIMIT='1000'; npm run dev -- -H 0.0.0.0 -p 3200`.
  - Run vitest from bash after `cd d:/projects/portfolio`.
  - e2e is GPU-bound: poll, don't sleep.

## Review Focus

1. **A pointer over the empty right half of an About/Stack/Contact section on a laptop.** It must still hover and click the signs on the pole: flow sections are `pointer-events: none`, only boxes take the pointer. Pinned in Task 3 (`flow.spec` "the empty part of a section lets the signs be hovered").
2. **A window resized from 1440 to 800 px wide while reading About.** The text re-wraps, the pieces re-measure, and the visitor stays at the same story progress (±0.01) in About. Pinned in Task 3 ("a resize inside About keeps the place").
3. **A phone reaching the end of the page after the address bar collapsed.** Progress reaches 1, and Contact's last box rests inside the viewport. Pinned in Task 3 (`mobile.spec` "the end of the page on a phone").
4. **Tabbing to a link that sits in a box far below the viewport** (Contact's Telegram). The page scrolls it into view and its focus ring is visible. Pinned in Task 5 ("keyboard focus reaches the contact links").
5. **The language switch from the middle of About.** It lands at the start of About in the new language, not at story 0 or in another section. Pinned in Task 3 ("the language switch keeps the section").

---

### Task 1: The journey from measured pieces

**Files:**
- Modify: `src/experience/journey.ts` (rewrite)
- Modify: `src/experience/workStops.ts` (`sectionTarget`)
- Modify: `src/experience/panels.ts` (`FADE_TO` 0.035 → 0.025)
- Test: `tests/unit/journey.test.ts` (rewrite), `tests/unit/workStops.test.ts`, `tests/unit/panels.test.ts`
- Modify: `tests/e2e/helpers.ts` (add `HOLD`), `tests/e2e/sections.spec.ts`, `tests/e2e/scroll.spec.ts` (landing expectations)

**Interfaces:**
- Produces (`journey.ts`):
  ```ts
  export const STOP_SVH = 40;
  export type PieceId = 'intro' | 'work' | 'toAbout' | 'about' | 'toStack' | 'stack' | 'toContact' | 'contact';
  export const PIECE_IDS: readonly PieceId[];        // in that order
  export const STORY_CUTS: readonly number[];        // 9 values: piece starts + 1
  export const DEFAULT_SVH: Readonly<Record<PieceId, number>>;
  export type HoldId = 'about' | 'stack' | 'contact';
  export function holdWindow(id: HoldId): [number, number];
  export function setJourneyLengths(lengths: readonly number[]): void; // 8 positive numbers, any unit
  export function resetJourneyLengths(): void;
  export function storyFromScroll(s: number): number;
  export function scrollFromStory(q: number): number;
  export const JOURNEY_HEIGHT: string; // `${Σ DEFAULT_SVH + 100}svh`, kept only until Task 3 removes it
  ```
- Produces (`workStops.ts`): `sectionTarget('about'|'stack'|'contact')` = `holdWindow(id)[0]`; Work still `stopProgress(0)`.
- Produces (`tests/e2e/helpers.ts`): `export const HOLD = { about: [0.395, 0.565], stack: [0.615, 0.775], contact: [0.825, 1] } as const;` — a mirror of `holdWindow`, pinned by the unit test.

- [ ] **Step 1: Write the failing unit tests**

`tests/unit/journey.test.ts` (`afterEach(resetJourneyLengths)`):
```ts
it('eight pieces run in order over the whole story', () => {
  expect(PIECE_IDS).toEqual(['intro', 'work', 'toAbout', 'about', 'toStack', 'stack', 'toContact', 'contact']);
  [0, 0.18, 0.32, 0.395, 0.565, 0.615, 0.775, 0.825, 1].forEach((v, i) => expect(STORY_CUTS[i]).toBeCloseTo(v, 9));
});
it('a hold runs between the turns around its section', () => {
  expect(holdWindow('about')).toEqual([expect.closeTo(0.395, 9), expect.closeTo(0.565, 9)]);
  expect(holdWindow('stack')).toEqual([expect.closeTo(0.615, 9), expect.closeTo(0.775, 9)]);
  expect(holdWindow('contact')).toEqual([expect.closeTo(0.825, 9), 1]);
});
it('by default Work gets 40 svh a stop and every other piece its old length', () => {
  expect(DEFAULT_SVH).toEqual({ intro: 180, work: WORK_STOPS * STOP_SVH, toAbout: 75, about: 170, toStack: 50, stack: 160, toContact: 50, contact: 175 });
  const total = Object.values(DEFAULT_SVH).reduce((a, b) => a + b, 0);
  expect((scrollFromStory(0.565) - scrollFromStory(0.395)) * total).toBeCloseTo(170, 6);
});
it('a measured hold stretches only its own piece', () => {
  setJourneyLengths([180, 400, 75, 1000, 50, 160, 50, 175]);
  const total = 2090;
  expect((scrollFromStory(0.565) - scrollFromStory(0.395)) * total).toBeCloseTo(1000, 6);
  expect((scrollFromStory(0.18) - scrollFromStory(0)) * total).toBeCloseTo(180, 6);
  expect(storyFromScroll((180 + 400 + 75 + 500) / total)).toBeCloseTo(0.48, 6);
});
it('story and scroll stay inverse, monotonic and pinned, default and measured', () => { /* old test, run for both */ });
it('rejects a wrong count or a non-positive length', () => {
  expect(() => setJourneyLengths([1, 2])).toThrow();
  expect(() => setJourneyLengths([180, 400, 75, 0, 50, 160, 50, 175])).toThrow();
});
```
- **`workStops.test.ts`:** `sectionTarget('about')` is close to 0.395; `parseHash('stack')` is close to 0.615; `parseHash('contact')` is close to 0.825.
- **`panels.test.ts`:** `sectionPresence(holdWindow(id)[0], id)` is 1 for about, stack and contact (the box is fully there when the turn ends). Also mirror `HOLD` from `helpers.ts`: import it in a unit test and compare it to `holdWindow`.

- [ ] **Step 2: Run the tests and watch them fail**

Run: `cd d:/projects/portfolio && npx vitest run tests/unit/journey.test.ts tests/unit/workStops.test.ts tests/unit/panels.test.ts`
Expected: FAIL. The new exports are missing, `sectionTarget('about')` is 0.48, and presence at 0.395 is < 1.

- [ ] **Step 3: Implement**

- **Pieces.** Piece lengths live in a module-level array; the default is `DEFAULT_SVH` in `PIECE_IDS` order. `storyFromScroll` and `scrollFromStory` walk the pieces as today, with `STORY_CUTS` as the story bounds.
- **`STORY_CUTS`.** Build it from `TRACK_FROM`, `TRACK_TO` and `holdWindow`, where `holdWindow(id) = [s.start + TURN/2, s.end >= 1 ? 1 : s.end − TURN/2]`.
- **`sectionTarget`.** For about, stack and contact it returns `holdWindow(id)[0]`.
- **`FADE_TO`.** Set to 0.025 in `panels.ts`.

- [ ] **Step 4: Update the e2e landing expectations**

Every e2e assertion that expects a header link, `parseHash` or a deep link to land at 0.48 / 0.695 / 0.9 now expects `HOLD[id][0]` with `toBeCloseTo(…, 2)`. This covers `sections.spec` ("header nav…" and "a hash deep link…") and `scroll.spec` "scrollToProgress lands on the section centre", which is renamed "…at the start of a section's text". Calls of `scrollTo(page, 0.48)` that only want to stand inside a section stay as they are.

- [ ] **Step 5: Run the tests and watch them pass**

Run: `npx vitest run` and then `npx playwright test tests/e2e/sections.spec.ts tests/e2e/scroll.spec.ts --project=chromium`
Expected: PASS. The site still renders with `JOURNEY_HEIGHT` from the defaults.

- [ ] **Step 6: Commit**

`git commit -m "feat(scroll): the journey is built from measurable pieces; links land where a section's text begins"`

---

### Task 2: Neon tokens and the header in tubes

**Files:**
- Create: `src/ui/neon.ts`, `src/ui/NeonText.tsx`
- Modify: `src/app/globals.css` (tokens, `.neon`, `.neon-flicker`, `.neon-dead`, `.top-fade`, `.nbox`; the enamel `.plate*` / `.board*` rules stay until Task 10)
- Modify: `src/ui/SiteHeader.tsx`, `src/ui/LanguageSwitch.tsx`
- Test: `tests/unit/neon.test.ts` (new), `tests/e2e/neon.spec.ts` (new), `tests/e2e/mobile.spec.ts`
- Modify: `tests/e2e/plates.spec.ts`. Delete "nav plates are navy…" and move "plates are set in Oswald, with Cyrillic on /ru" to `neon.spec` as "tubes are set in Oswald…".

**Interfaces:**
- Produces:
  ```ts
  // src/ui/neon.ts
  export type NeonId = SignId | 'name' | 'lang' | 'blueprint';
  export const NEON: Readonly<Record<NeonId, string>>;            // Global Constraints colours
  export function neonStyle(id: NeonId): CSSProperties;            // { '--c': NEON[id] }
  export function flicker(i: number): CSSProperties;               // { '--flicker-period': 'Ns', '--flicker-delay': '-Ms' }
  // src/ui/NeonText.tsx
  export default function NeonText({ text, dead }: { text: string; dead?: number }): JSX.Element; // letter `dead` wrapped in <span class="neon-dead">
  ```
- **CSS classes later tasks use:**
  - `neon`: a tube text that reads `--c`, with an underline on `[aria-current]`, `:hover` and `:focus-visible`;
  - `neon-flicker`;
  - `nbox`: the box from Global Constraints, reading `--c`;
  - `top-fade`.

- [ ] **Step 1: Write the failing tests**

`tests/unit/neon.test.ts`:
```ts
it('each sign has its tube colour; Contact is raspberry, the name pink', () => {
  expect(NEON).toMatchObject({ work: '#ff8a2a', about: '#5fe1ff', stack: '#ff3448', contact: '#ff45b5', cv: '#3dff8f', name: '#ff4fb0', lang: '#c9d6ff', blueprint: '#7fe3ff' });
  expect(neonStyle('stack')).toEqual({ '--c': '#ff3448' });
});
it('flicker periods sit between 8 and 16 s, are deterministic, and neighbours differ', () => {
  for (let i = 0; i < 12; i++) {
    const p = parseFloat(String(flicker(i)['--flicker-period' as never]));
    expect(p).toBeGreaterThanOrEqual(8); expect(p).toBeLessThanOrEqual(16);
    expect(flicker(i)).toEqual(flicker(i));
  }
  expect(flicker(0)).not.toEqual(flicker(1));
});
it('a flicker burst drops at most three times', () => {
  const css = readFileSync('src/app/globals.css', 'utf8');
  const block = /@keyframes neon-buzz\s*{([\s\S]*?)\n}/.exec(css)![1];
  expect((block.match(/opacity:\s*0?\.\d/g) ?? []).length).toBeLessThanOrEqual(3);
});
```
`tests/e2e/neon.spec.ts`:
```ts
test('the active section is underlined and steady, the others flicker', async ({ page }) => {
  await gotoScene(page); await waitReady(page); await scrollTo(page, 0.48);
  const about = page.getByRole('button', { name: 'About', exact: true });
  await expect(about).toHaveAttribute('aria-current', 'true');
  expect(await about.evaluate((el) => getComputedStyle(el, '::after').opacity)).toBe('1');
  expect(await about.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
  expect(await page.getByRole('button', { name: 'Stack', exact: true }).evaluate((el) => el.getAnimations().length)).toBeGreaterThan(0);
});
test('hover steadies a tube', /* hover Stack → getAnimations({subtree:true}).length === 0 */);
test('reduced motion: nothing in the header flickers', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await gotoScene(page);
  expect(await page.locator('header[data-ui]').evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
});
test('tubes are set in Oswald, with Cyrillic on /ru', /* moved from plates.spec */);
```
`tests/e2e/mobile.spec.ts`:
```ts
test('the header on a phone: name and language above, sections below, every tube at least 44×44', async ({ page }) => {
  // the name link and the current language share a row (|Δy| < 8); the Work button sits lower;
  // every header button/link boundingBox has width ≥ 44 and height ≥ 44
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run tests/unit/neon.test.ts`, then `npx playwright test tests/e2e/neon.spec.ts --project=chromium` and `npx playwright test --project=mobile`
Expected: FAIL. `neon.ts` is missing; the plates have no `::after` and no animations.

- [ ] **Step 3: Implement**

- **`flicker(i)`.** Period `8 + ((i * 37) % 9)` s (8–16). Delay `-((i * 2.3) % 8)` s. Deterministic, so SSR and hydration agree.
- **`@keyframes neon-buzz`.** Opacity 1 everywhere except one burst of ≤ 3 drops (to 0.25–0.3) inside about 3 % of the period.
- **`@keyframes neon-dead`.** Opacity 0.18 with one or two brief returns to 1 in an 11 s cycle.
- **Steady states.**
  - `.neon:hover`, `.neon:focus-visible` and `.neon[aria-current]`, together with their `.neon-dead`, get `animation: none`; the dead letter goes to opacity 1.
  - `@media (prefers-reduced-motion: reduce)` does the same for every `.neon-flicker` and `.neon-dead`.
- **Header markup.**
  - Name: `NeonText` with `dead={3}` (the `t` of Rustam), in `neon`.
  - Section buttons: `neon neon-flicker` + `flicker(i)` + `neonStyle(id)`.
  - Stack: `NeonText dead={label.length − 1}`.
  - CV: `neonStyle('cv')`.
  - `aria-hidden` dots between the sections.
  - Languages: `neon` + `neonStyle('lang')`; the current one carries `aria-current`.
- **Layout.**
  - Phone: two rows, name and languages on top, sections below.
  - ≥ md: one row.
  - Every tube has `min-h-11 min-w-11` and centred content.
- **`.top-fade`.** A `fixed inset-x-0 top-0 h-36 z-20 pointer-events-none` gradient from `rgba(3,5,9,.96)` through `.9` at 70 px to transparent at 150 px. It is rendered by `SiteHeader`; the header itself is `z-30`.

- [ ] **Step 4: Run the tests and watch them pass**

Run: the Step 2 commands, plus `npx playwright test tests/e2e/plates.spec.ts --project=chromium` (its remaining board test still passes on the panels until Task 3 deletes the file).
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "feat(ui): the header is neon tubes that flicker now and then"`

---

### Task 3: Sections in the page flow

**Files:**
- Create: `src/ui/flow/JourneyTrack.tsx`, `src/ui/flow/SectionFlow.tsx`, `src/ui/flow/NeonBox.tsx`
- Modify: `src/app/[locale]/(site)/layout.tsx`
  - About, Stack and Contact move out of `SectionPanel` into `JourneyTrack`.
  - `WorkPanel` stays as it is.
  - The `#journey` div goes.
- Modify: `src/ui/sections/AboutSection.tsx` (five boxes), `StackSection.tsx` and `ContactSection.tsx` (wrapped in boxes, otherwise unchanged until Tasks 4–5)
- Modify: `src/experience/journey.ts` (remove `JOURNEY_HEIGHT`)
- Modify: `src/app/globals.css` (`.flow-piece`)
- Test: `tests/e2e/flow.spec.ts` (new), `tests/e2e/helpers.ts` (`innerScrollers`), `tests/e2e/sections.spec.ts`, `tests/e2e/mobile.spec.ts`
- Delete: `tests/e2e/plates.spec.ts`. Its last test ("each panel is a board…") has no panels left to check; Task 2 moved the rest.

**Interfaces:**
- Consumes: `PIECE_IDS`, `DEFAULT_SVH`, `setJourneyLengths`, `holdWindow` (Task 1); `nbox`, `neonStyle` (Task 2).
- Produces:
  ```ts
  // JourneyTrack.tsx (client)
  export default function JourneyTrack(props: { about: ReactNode; stack: ReactNode; contact: ReactNode }): JSX.Element;
  // renders <div id="journey"> with eight children carrying data-piece={PieceId}:
  // fixed spacers (height `${DEFAULT_SVH[id]}svh`, aria-hidden, pointer-events-none) and the three sections.
  // SectionFlow.tsx
  export default function SectionFlow(props: { id: HoldId; labelledBy: string; wide?: boolean; children: ReactNode }): JSX.Element;
  // <section id data-section data-piece aria-labelledby class="flow-piece pointer-events-none"><div data-flow>…</div></section>
  // NeonBox.tsx
  export default function NeonBox(props: { id: NeonId; className?: string; children: ReactNode }): JSX.Element;
  // <div data-ui class="nbox pointer-events-auto" style={neonStyle(id)}>
  // helpers.ts
  export function innerScrollers(page: Page): Promise<string[]>;
  ```
- Dev probe `journey` → the eight measured lengths in px.

- [ ] **Step 1: Write the failing tests**

`tests/e2e/helpers.ts`:
```ts
export async function innerScrollers(page: Page): Promise<string[]> {
  return page.evaluate(() => [...document.querySelectorAll('body *')]
    .filter((el) => /(auto|scroll)/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 1)
    .map((el) => `${el.tagName.toLowerCase()}#${el.id}.${String(el.className).slice(0, 40)}`));
}
```
`tests/e2e/flow.spec.ts`:
```ts
test('no inner scroll anywhere on the home page, in every language', async ({ page }) => {
  for (const l of ['en', 'ru', 'uk']) {
    await gotoScene(page, `/${l}`); await waitReady(page);
    for (const p of [stop(3), 0.48, 0.695, 0.9, 1]) { await scrollTo(page, p); expect(await innerScrollers(page), `${l} @ ${p}`).toEqual([]); }
  }
});
test('section text rides the page scroll while the sign holds', async ({ page }) => {
  // at HOLD.about[0] + 0.02 read the first box's top and probe('poleYaw'); scroll to HOLD.about[0] + 0.08;
  // the box top moved up by more than 100 px; poleYaw is unchanged (toBeCloseTo, 3)
});
test('a header link lands where the text begins, with the first box on screen', async ({ page }) => {
  // click About → progress ≈ HOLD.about[0] (2 dp); first `#about [data-flow] > *` top is within (0, innerHeight)
});
test('the last box has left before the pole turns', async ({ page }) => {
  // scrollTo(HOLD.about[1]) → every `#about .nbox` bottom < 0.2 * innerHeight
});
test('the page ends with Contact\'s last box resting low on the screen', async ({ page }) => {
  // scrollTo(1) → last `#contact .nbox` bottom between 0.75 and 1.0 × innerHeight
});
test('the journey re-measures when a section grows, and keeps the place', async ({ page }) => {
  // at 0.48: lengths = probe('journey'); append a 600 px div to `#about [data-flow]`;
  // poll probe('journey')[3] grows by 600 ± 2; progress stays 0.48 ± 0.01
});
// Review Focus 1
test('the empty part of a section lets the signs be hovered', async ({ page }) => {
  // 1440×800, scrollTo(0.48), move to probe('signScreen:about') → state().hoveredSign === 'about'
});
// Review Focus 2
test('a resize inside About keeps the place', async ({ page }) => {
  // scrollTo(0.48); setViewportSize 800×800; poll progress ≈ 0.48 (±0.01) and activeSection about
});
// Review Focus 5
test('the language switch keeps the section', async ({ page }) => {
  // scrollTo(0.48); click RU → URL /ru#about; poll progress ≈ HOLD.about[0] (2 dp)
});
test('without WebGL every section is still there', /* ?webgl=0: #about, #stack, #contact each scrollIntoView → visible */);
```
`tests/e2e/mobile.spec.ts`:
```ts
test('a phone has no inner scroll either', /* innerScrollers at 0.48, 0.695, 0.9 → [] */);
// Review Focus 3
test('the end of the page on a phone', async ({ page }) => {
  // swipe repeatedly to the bottom → progress reaches 1; last `#contact .nbox` bottom ≤ innerHeight
});
```
`tests/e2e/sections.spec.ts`: "each section panel shows only inside its window…" becomes "the Work caption shows only in Work, and the scene steps aside in About". It keeps the `panel:work` probe at `stop(0)` and `viewOffset.x > 0.15` at 0.48; the `panel:about|stack|contact` checks go.

- [ ] **Step 2: Run them and watch them fail**

Run: `npx playwright test tests/e2e/flow.spec.ts tests/e2e/sections.spec.ts --project=chromium`
Expected: FAIL. The panels scroll inside, there is no `[data-flow]`, and the `journey` probe is missing.

- [ ] **Step 3: Implement**

- **`.flow-piece`.**
  - `--entry: 70svh`; `wide:` `42svh`. `--exit: 12svh`.
  - `padding-top: var(--entry); min-height: 170svh; position: relative; z-index: 10`.
  - `[data-flow]`: `margin-bottom: calc(-1 * var(--exit))`.
  - The last one (`data-last`, Contact): `min-height: 150svh; padding-bottom: 8svh` and no negative margin, so at story 1 its last box rests at about 92 % of the viewport.
- **Columns.**
  - Phone: full width minus `px-4`.
  - Wide: `ml-6`; `w-[min(30rem,40vw)]` for about and contact, `w-[min(36rem,48vw)]` for stack.
  - Boxes are separated by the hanger posts (`.nbox + .nbox::before/::after`).
- **Measuring.**
  - Read `offsetHeight` of each `[data-piece]`. The last length is `journey.offsetHeight − innerHeight − Σ first seven`, clamped ≥ 1.
  - Call `setJourneyLengths`.
  - When: on mount, on `document.fonts.ready`, on a `ResizeObserver` firing for the three sections (then also `ScrollTrigger.refresh()`), and on ScrollTrigger `refreshInit` (no extra refresh there). `SmoothScroll`'s `refreshInit`/`refresh` handlers already keep the story progress across a refresh.
- **About's boxes, in order:**
  1. `h2#about-title` + lead;
  2. story;
  3. Path list (`data-path`);
  4. Education list (`data-education`);
  5. languages + "how".
- **Stack and Contact for now.** Lead box + one box holding today's content. The `PanelTitle` sticky band is gone from all three.
- **WorkPanel.** Untouched in this task.

- [ ] **Step 4: Run the tests and watch them pass**

Run: `npx playwright test --project=chromium` (whole suite: every spec that scrolls through sections must stay green) and `npx playwright test --project=mobile`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "feat(sections): About, Stack and Contact ride the page scroll in neon boxes; no panel scrolls inside"`

---

### Task 4: Stack as blade signs

**Files:**
- Modify: `src/ui/sections/StackSection.tsx`
- Modify: `src/app/globals.css` (`.blade`, `.blade-arm`)
- Modify: `src/scene/stickers/icons.ts`: add `siCursor` to the map (named import; the stickers still draw only `STACK_SLUGS`)
- Test: `tests/e2e/stack.spec.ts` (new), `tests/e2e/mobile.spec.ts`

**Interfaces:**
- Consumes: `getIcon(slug)` from `src/scene/stickers/icons.ts`, `STACK` from `src/content/stack.ts`, `NeonBox`.

- [ ] **Step 1: Write the failing tests**

```ts
// a label is <span data-line> inside a blade heading or item
const multiLine = (page: Page) => page.evaluate(() =>
  [...document.querySelectorAll('#stack .blade [data-line]')].filter((s) => s.getClientRects().length > 1).map((s) => s.textContent));
test('every blade line is one line, at 1440 px, in every language', async ({ page }) => {
  for (const l of ['en', 'ru', 'uk']) { await gotoScene(page, `/${l}`); await scrollTo(page, 0.695); expect(await multiLine(page), l).toEqual([]); }
  expect(await page.locator('#stack .blade').count()).toBe(6);
});
test('each category hangs on its own bracket', /* every .blade contains one .blade-arm */);
test('a blade item with a sticker lights it on the pole', /* hover the React item → state().highlight === 'react' */);
// mobile.spec
test('blades fit a phone: one line each and inside the screen', /* multiLine → []; every .blade right ≤ innerWidth */);
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx playwright test tests/e2e/stack.spec.ts --project=chromium`
Expected: FAIL (there are no `.blade` elements).

- [ ] **Step 3: Implement**

- **Lead box.** Title + lead.
- **Blades.**
  - A `flex flex-wrap` row of six `.blade` (one per `STACK` group), each `width: max-content`, `white-space: nowrap`.
  - Each blade has `.blade-arm`: a 5 px bar 30 px above the blade with two posts.
  - A small rotation from the list `[-1.2, 0.8, -0.5, 1, -0.9, 0.6]` deg, pivot above the blade. Reduced motion keeps the rotation, since it is static.
- **Items.**
  - An item shows the `getIcon(sticker ?? slug)` path as an inline SVG with a `--c` drop-shadow, or a dot when there is none.
  - The `data-sticker` focus/hover handlers are carried over from today.
- **When a blade would still overflow** the screen width (narrow phone), only that blade's font steps down: `font-size: clamp(...)`, `container`, or a measured class. It must never wrap.

- [ ] **Step 4: Run them and watch them pass**

Run: the Step 2 command, plus `npx playwright test --project=mobile` and `npx playwright test tests/e2e/interaction.spec.ts --project=chromium`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "feat(stack): each category is its own neon blade sign, no line ever wraps"`

---

### Task 5: Contact as a neon form

**Files:**
- Modify: `src/ui/sections/ContactForm.tsx`, `src/ui/sections/ContactSection.tsx`
- Modify: `src/app/globals.css` (`.nfield`, `.nsend`)
- Modify: `src/scene/stickers/icons.ts`: add `siTelegram`, `siGmail`
- Modify: `messages/en.json`, `messages/ru.json`, `messages/uk.json`: add `contact.sendHint`
- Test: `tests/e2e/contact.spec.ts`

**Interfaces:**
- Consumes: `invalidFields(input): Partial<Record<ContactField, true>> | null` (`src/server/contact.ts`), `NeonBox`, `neonStyle`.
- Copy (`contact.sendHint`):
  - EN "Fill in all three fields and the sign lights up."
  - RU "Заполните все три поля, и вывеска загорится."
  - UK "Заповніть усі три поля, і вивіска засвітиться."

- [ ] **Step 1: Write the failing tests**

```ts
test('the Send sign stays dark until the form is valid, and a press on it shows what is missing', async ({ page }) => {
  await gotoScene(page); await scrollTo(page, 0.9);
  const send = page.getByRole('button', { name: en.contact.send });
  await expect(send).toHaveAttribute('data-ready', 'false');
  await expect(send).not.toHaveAttribute('disabled', /.*/);
  await expect(page.getByText(en.contact.sendHint)).toBeVisible();
  await send.click();
  await expect(page.locator('#contact-name')).toHaveAttribute('aria-invalid', 'true');
  // fill name, email, a 20-char message → data-ready 'true', hint hidden; submit → sent (as today)
});
// Review Focus 4
test('keyboard focus reaches the contact links', async ({ page }) => {
  // from the message field press Tab until Telegram is focused → its box within the viewport, outline/box-shadow not 'none'
});
```
The existing contact tests stay as they are: validation, failure fallback, honeypot, links without WebGL.

- [ ] **Step 2: Run them and watch them fail**

Run: restart :3200 (messages changed), then `npx playwright test tests/e2e/contact.spec.ts --project=chromium`
Expected: FAIL (there is no `data-ready` and no hint).

- [ ] **Step 3: Implement**

- **Readiness.** `ready = invalidFields(values) === null`, recomputed on input from the form's `FormData`. It is `data-ready` on the submit button. `disabled` stays only while sending.
- **`.nsend`.**
  - Not ready: dark, dim letters.
  - Ready: lit in `--c` contact, with `neon-flicker`; steady on hover and focus.
- **Hint.** Under the button while not ready, in `aria-live="polite"`.
- **Fields.** `.nfield`: dark glass, a raspberry border that lights on focus, small uppercase labels.
- **Section boxes:** (1) «Поехали» + lead; (2) form; (3) links. In the links box, Telegram, LinkedIn, GitHub and Copy email are `neon` contact-coloured, with logos where `getIcon` has one; Download CV is `neonStyle('cv')`.
- **Unchanged:** errors, statuses, the fallback and the green pulse.

- [ ] **Step 4: Run them and watch them pass**

Run: `npx playwright test tests/e2e/contact.spec.ts --project=chromium` and `npx vitest run tests/unit/messages.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "feat(contact): a neon form whose Send sign lights up once it is ready"`

---

### Task 6: Scrollbar, progress tube and the Next button

**Files:**
- Create: `src/experience/next.ts`, `src/ui/ScrollAccent.tsx`, `src/ui/ProgressTube.tsx`, `src/ui/NextButton.tsx`
- Modify: `src/ui/Hero.tsx`: drop the `cue` prop and its cell; the role cell spans the row
- Modify: `src/app/[locale]/(site)/layout.tsx`: mount the three; stop passing `cue`
- Modify: `messages/*.json`: add `nav.next` ("Next" / "Дальше" / "Далі"); remove `hero.cue`
- Modify: `src/app/globals.css` (webkit scrollbar, Firefox fallback, `.progress-tube`, `.next-fade`)
- Test: `tests/unit/next.test.ts` (new), `tests/e2e/affordances.spec.ts` (new), `tests/e2e/mobile.spec.ts`, `tests/e2e/sections.spec.ts` (hero test)

**Interfaces:**
- Consumes: `activeSection`, `scrollToSection`, `NEON`, `neonStyle`, `flicker`.
- Produces:
  ```ts
  // src/experience/next.ts
  export function nextSection(q: number): SectionId | null; // intro→work, work→about, about→stack, stack→contact, contact→null
  export function accentFor(q: number): string;             // NEON[activeSection(q) ?? 'blueprint']
  ```

- [ ] **Step 1: Write the failing tests**

`tests/unit/next.test.ts`:
```ts
it('names the section after the current one, and nothing after Contact', () => {
  expect(nextSection(0)).toBe('work'); expect(nextSection(0.2)).toBe('about');
  expect(nextSection(0.48)).toBe('stack'); expect(nextSection(0.7)).toBe('contact'); expect(nextSection(0.9)).toBeNull();
});
it('the accent follows the open section, blueprint blue before Work', () => {
  expect(accentFor(0.05)).toBe('#7fe3ff'); expect(accentFor(0.48)).toBe('#5fe1ff'); expect(accentFor(0.9)).toBe('#ff45b5');
});
```
`tests/e2e/affordances.spec.ts`:
```ts
test('Next names the next section and takes you there, then leaves at Contact', async ({ page }) => {
  // at 0: button text `${en.nav.next}: ${en.nav.work}`; click → progress ≈ stop(0) (2 dp);
  // text → "Next: About"; click → ≈ HOLD.about[0]; … at HOLD.contact[0] the button is gone (toHaveCount(0) or hidden)
});
test('on a laptop Next stays clear of the text column and the title block', async ({ page }) => {
  // at 0: no intersection with header[data-hero]; at 0.48 and 0.695: none with any `[data-flow] .nbox`
});
test('no Next over an open case', /* /en/work/altus → Next hidden */);
test('the hero no longer says Scroll', /* header[data-hero] has no text 'Scroll' */);
test('the scrollbar wears the open section\'s colour', /* at 0.48 html --accent === '#5fe1ff'; at 0.695 '#ff3448' */);
```
`tests/e2e/mobile.spec.ts`:
```ts
test('a phone shows the progress tube and a centred Next from the first screen, clear of the title block and the Work caption', async ({ page }) => {
  // .progress-tube visible, its height grows after a swipe; Next centre x within 10 % of innerWidth/2, box ≥ 44×44;
  // at 0 no intersection with header[data-hero]; at stop(0) none with section#work
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run tests/unit/next.test.ts`, restart :3200, then `npx playwright test tests/e2e/affordances.spec.ts --project=chromium` and `npx playwright test --project=mobile`
Expected: FAIL.

- [ ] **Step 3: Implement**

- **`ScrollAccent`.** Subscribes to the store and writes `--accent` (`accentFor`) and `data-tier` (tier) on `<html>`. It renders nothing.
- **Scrollbar CSS.**
  - `html::-webkit-scrollbar` width 12 px, track `#07090e`, thumb `var(--accent)` with a 3 px track-coloured border and an inset glow.
  - Firefox only, inside `@supports not selector(::-webkit-scrollbar)`: `scrollbar-color: var(--accent) #07090e; scrollbar-width: thin`. Chrome ignores the webkit rules when `scrollbar-color` is set.
- **`ProgressTube`.** `aria-hidden`, `fixed right-1 top-0 w-[3px]`, shown only on `(pointer: coarse)`. Its height is `scrollY / (scrollHeight − innerHeight)` of the viewport, glowing in `--accent`. `pointer-events-none`.
- **`NextButton`.**
  - A `neon neon-flicker` button with `neonStyle(next)`, or `'blueprint'` before Work.
  - Text: `` `${t('nav.next')}: ${t(`nav.${next}`)}` `` + an `aria-hidden` arrow that bobs (none under reduced motion).
  - Click: `scrollToSection(next)`.
  - Hidden when `next === null` or the pathname is not `/`.
- **Placement.**
  - Fixed bottom, `min-h-11`, safe-area aware.
  - Narrow: centred. Wide: centred on 72 % of the viewport width.
  - It rises above whichever of `header[data-hero]` (while opacity > 0) or `section#work` (while visible) it would overlap: measure their rects on progress change; bottom = viewport bottom − obstacle top + 12 px, when they overlap horizontally.
  - On narrow screens a `.next-fade` bottom gradient sits under it.

- [ ] **Step 4: Run them and watch them pass**

Run: the Step 2 commands, plus `npx playwright test tests/e2e/sections.spec.ts --project=chromium`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "feat(ui): a Next button names the way on, the scrollbar and a phone tube show where you are"`

---

### Task 7: Work caption, pager and the no-WebGL strip in neon

**Files:**
- Modify: `src/ui/sections/SectionPanel.tsx`
  - Work only: drop the `side` layout and `PanelTitle`'s sticky band.
  - `board` → `nbox` (`neonStyle('work')`).
  - The body does not scroll: `overflow: visible`, no `data-more` mask.
- Modify: `src/ui/sections/WorkWall.tsx`
  - Caption in the box.
  - Pager buttons are `neon` digits with `aria-current`.
  - "Open case" is `neon`.
- Modify: `src/ui/sections/WorkTrack.tsx`, `src/ui/sections/ProjectCard.tsx`, `src/ui/sections/WorkPanel.tsx`: cards as `nbox`
- Test: `tests/e2e/work.spec.ts`, `tests/e2e/mobile.spec.ts`

- [ ] **Step 1: Write the failing tests**

```ts
test('the Work caption is a neon box that never scrolls inside', async ({ page }) => {
  // for stop(0..9): innerScrollers(page) → []; section#work has class nbox
});
test('the pager underlines the current project', /* at stop(4) button '05' aria-current, ::after opacity '1' */);
// mobile.spec
test('the Work caption fits a phone without scrolling', /* stop(0..9) innerScrollers → [] */);
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx playwright test tests/e2e/work.spec.ts --project=chromium`
Expected: FAIL (`board`, `overflow-y-auto` in the panel).

- [ ] **Step 3: Implement** as listed under **Files**. On phones the summary stays `line-clamp-2`. The caption's `max-h` and overflow go.

- [ ] **Step 4: Run them and watch them pass**

Run: `npx playwright test tests/e2e/work.spec.ts tests/e2e/tvwall.spec.ts --project=chromium` and `npx playwright test --project=mobile`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "feat(work): the caption, pager and fallback strip in neon"`

---

### Task 8: The case switches on like a TV

**Files:**
- Create: `src/ui/sections/crt.ts`, `src/scene/tvwall/screenRects.ts`
- Modify: `src/experience/store.ts`: add `caseOrigin: Rect | null`; `requestCase(slug, origin?)` sets both
- Modify: `src/scene/tvwall/TvWall.tsx`
  - The click passes `projectScreen(STOPS[i], camera, canvasRect)` as the origin.
  - An effect registers `setScreenRectSource`; cleanup sets null.
- Modify: `src/ui/sections/WorkWall.tsx` (routing keeps the origin)
- Modify: `src/ui/sections/CaseOverlay.tsx` (CRT look and animations)
- Modify: `src/app/globals.css` (`.crt-card`, scanline overlay, orange case scrollbar)
- Test: `tests/unit/crt.test.ts` (new), `tests/unit/tvWall.test.ts` (`projectScreen`), `tests/e2e/case.spec.ts`, `tests/e2e/work.spec.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface Rect { x: number; y: number; width: number; height: number } // in screenRects.ts, page px
  export function projectScreen(slot: TvSlot, camera: Camera, canvas: Rect): Rect;
  export function setScreenRectSource(fn: ((stop: number) => Rect | null) | null): void;
  export function screenRectFor(stop: number): Rect | null;
  // crt.ts
  export const CRT_OPEN_MS = 800;
  export const CRT_CLOSE_MS = 450;
  export function originTransform(from: Rect, to: Rect): string; // 'translate(DXpx, DYpx) scale(SX, SY)', centre to centre
  export function crtOpen(el: HTMLElement, from: Rect | null, reduced: boolean): Animation[];
  export function crtClose(el: HTMLElement, reduced: boolean): Promise<void>;
  ```
- The dialog's `data-crt` attribute runs `opening` → `open` → `closing`.

- [ ] **Step 1: Write the failing tests**

`tests/unit/crt.test.ts`:
```ts
it('moves the card from the TV screen to its own place, centre to centre', () => {
  expect(originTransform({ x: 100, y: 100, width: 200, height: 100 }, { x: 0, y: 0, width: 1000, height: 500 }))
    .toBe('translate(-300px, -100px) scale(0.2, 0.2)');
});
```
`tests/unit/tvWall.test.ts`: `projectScreen` of a slot straight ahead of a `PerspectiveCamera` gives a rect centred within 2 px of the canvas centre, with width > height > 0.

`tests/e2e/case.spec.ts`:
```ts
test('a case switches on like a TV and switches off on close', async ({ page }) => {
  // stop(0) → click Open case → dialog data-crt 'opening' then 'open' within 1500 ms;
  // the dialog's first animation keyframe has a clip-path inset ≥ 45 %;
  // Escape → data-crt 'closing', then URL /en within 1000 ms and focus back on Open case
});
test('reduced motion: the case just appears', /* emulateMedia reduce → no animation with clipPath; data-crt 'open' within 400 ms */);
test('a direct link opens with the same switch-on', /* /en/work/altus → data-crt reaches 'open' */);
```
`tests/e2e/work.spec.ts`, in the TV-click test: after the click, the dialog's first keyframe `transform` contains `scale(` with SX < 0.8. The card grows from that TV.

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run tests/unit/crt.test.ts tests/unit/tvWall.test.ts` and `npx playwright test tests/e2e/case.spec.ts tests/e2e/work.spec.ts --project=chromium`
Expected: FAIL.

- [ ] **Step 3: Implement**

- **Look.**
  - `.crt-card`: radius 26 px, 2 px `#ffc59a` border, glow in work orange, dark radial fill.
  - `::after` scanlines (1 px dark every 3 px) plus a vignette; it flickers once per 4 s at 0.75.
  - The title has a ∓2 px red/cyan text-shadow.
  - Close is a `neon` button.
  - The body keeps today's content and its own scroll (`data-lenis-prevent`, `overscroll-contain`) with an orange scrollbar thumb.
- **`crtOpen`.**
  - Line: a white 4 px line element grows from `scaleX(0)` in 300 ms.
  - The card animates from `originTransform(from, finalRect)` and `clip-path: inset(49.5% 0 49.5% 0 round 26px)` with `brightness(4) saturate(0)` to identity, `inset(0 round 26px)` and `none` in 550 ms, starting at 280 ms.
  - The content glitches (`translateX` ±6 px, a hue-rotate 40°) for 450 ms from 750 ms.
  - `from` null → no transform, centre.
  - Reduced: a 150 ms opacity fade only.
- **`crtClose`.** The clip-path goes to a line (55 %), then a dot, with brightness up, over 450 ms. Reduced: a 150 ms fade.
- **Close sequence.** The overlay's close (button, Esc, backdrop) awaits `crtClose` before `router.push('/')`. A second close while closing is ignored.
- **Origin on mount:** `store.caseOrigin`, or `screenRectFor(stopAt(progress))` when `activeSection(progress) === 'work'` and `webgl`, or null. Then clear `caseOrigin`.

- [ ] **Step 4: Run them and watch them pass**

Run: the Step 2 commands.
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "feat(case): the case switches on like a CRT, from the very TV that was clicked"`

---

### Task 9: Sharp TV sets

**Files:**
- Modify: `scripts/assets.manifest.json`: both models `"res": "2k"`, `"maps": { "diff": 2048, "nor_gl": 1024, "arm": 1024 }` instead of `"texture": 512`
- Modify: `scripts/fetch-assets.mjs`: the size per map comes from `m.maps[key]`, where key is `/_(diff|nor_gl|arm)_/` in the filename; the fallback is 1024
- Replace: `public/models/tv/**` (fetch the 2k glTFs, delete the 1k files)
- Modify: `src/scene/tvwall/layout.ts`: `TV_MODELS.*.url` → the `_2k.gltf` files
- Modify: `src/scene/tvwall/screenGlow.ts`: the Lambert body also takes `normalMap` and `normalScale` from the source
- Modify: `src/scene/tvwall/TvWall.tsx`: body `map.anisotropy` = renderer max on high, 4 otherwise
- Test: `tests/unit/tvTextures.test.ts` (new), `tests/unit/tvWall.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it('each set carries a 2k colour map and a 1k normal map', async () => {
  for (const url of [TV_MODELS.tv1.url, TV_MODELS.tv2.url]) {
    const gltf = JSON.parse(readFileSync(`public${url}`, 'utf8'));
    const dir = dirname(`public${url}`);
    const diff = gltf.images.find((i: { uri: string }) => /_diff_/.test(i.uri)).uri;
    const nor = gltf.images.find((i: { uri: string }) => /_nor_gl_/.test(i.uri)).uri;
    expect((await sharp(join(dir, diff)).metadata()).width).toBe(2048);
    expect((await sharp(join(dir, nor)).metadata()).width).toBe(1024);
  }
});
it('the lighter body keeps the relief', () => {
  // withScreenGlow(new MeshStandardMaterial({ normalMap: tex }), createGlowUniforms(), false, makeRevealUniforms(0)).normalMap === tex
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run tests/unit/tvTextures.test.ts tests/unit/tvWall.test.ts`
Expected: FAIL (the textures are 512 px; Lambert has no normal map).

- [ ] **Step 3: Implement**

Edit the manifest and the script, then run `node scripts/fetch-assets.mjs`. Delete the old `*_1k.*` TV files, then update the URLs and the materials.

- [ ] **Step 4: Verify**

Run: `npx vitest run` (`assetBudget` included), `npx playwright test tests/e2e/tvwall.spec.ts --project=chromium` and `npm run perf`
Expected:
- PASS;
- assets ≤ 6 MB;
- perf median ≤ 33.4 ms on the journey and at a stop.

If the budget breaks, drop tv2's diffuse to 1024 and record a ledger ruling.

Then capture `stop(0)` and `stop(1)` at 1440×900 with `tests/e2e/_scratch/mock.shots.spec.ts`-style captures into `.superpowers/look/` for the gate.

- [ ] **Step 5: Commit**

`git commit -m "feat(tvwall): 2k colour maps and relief on every tier: the VTECH badge and knobs read"`

---

### Task 10: Clean-up, the blur decision, verification and the gate

**Files:**
- Modify: `src/app/globals.css`: delete `.plate*`, `.board*`, `.board-label`, `.well` and `--plate*` tokens once `grep -rn "plate\b\|plate-\|board" src` finds no consumer
- Delete: `src/ui/plates.ts`, `tests/unit/plates.test.ts`
- Modify: `tests/e2e/perf.spec.ts`: add "standing in About with its boxes on screen keeps at least 30 fps" (scrollTo 0.48, wheel ±60 inside the hold, same report)
- Modify: `docs/superpowers/gates/2026-11-12-m2-gate.md`: round 2 record and round 3 agenda

- [ ] **Step 1: Remove the enamel styles.** Run `npx tsc --noEmit` and `npm run lint`.
Expected: clean, with no reference to `plateStyle` or `board`.

- [ ] **Step 2: Measure the blur.**
- Run `npm run perf` with `.nbox` as specified (no blur), then with `html[data-tier="high"] .nbox { backdrop-filter: blur(5px) }`.
- Keep the blur only if both perf medians stay ≤ 33.4 ms with it.
- Ledger the numbers as a `Ruling:`.

- [ ] **Step 3: Full verification.**
Run:
- `npm run lint`
- `npm run typecheck`
- `npx vitest run`
- `npx playwright test --project=chromium`
- `npx playwright test --project=mobile`
- `npm run perf`
- `npm run prod`

Expected: every command passes, and prod JS ≤ 1.6 MB.

- [ ] **Step 4: Gate record.** Append to the round 2 section of the gate log:
- Rustam's six points and the overall "everything is popups" note;
- his choices (A neon boxes, header tubes with rarer flicker, Stack blades with no wraps, the neon form, the CRT case, the Next button), the spec and plan paths;
- the round 3 agenda.

Round 3 is the last allowed.

- [ ] **Step 5: Commit**

`git commit -m "chore: drop the enamel plates; perf and gate record for round 3"`
