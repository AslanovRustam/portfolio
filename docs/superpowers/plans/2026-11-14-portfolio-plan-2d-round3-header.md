# Plan 2d: Round 3 header refinements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The name's flicker alternates words and single letters. On phones the header becomes the name on the left with a language picker and a neon section menu on the right. The message field no longer resizes.

**Architecture:**
- The flicker is CSS on spans that `NameTubes` renders inside the name link.
- The phone header uses two new client components: `LanguagePicker`, a dropdown blade sign, and `MobileMenu`, a burger and an overlay dialog. They share link building with `LanguageSwitch` and navigation with `SiteHeader`.
- The desktop header is unchanged.

**Tech Stack:** Next.js 16, React 19, Tailwind 4, next-intl 4, Vitest, Playwright (chromium + Pixel 7).

**Spec:** `docs/superpowers/specs/2026-11-14-neon-street-content-design.md` §9 (and §6.3 for the header it refines).

## Global Constraints

- **Flicker:**
  - at most 2 drops per burst;
  - steady on hover, focus and `aria-current`;
  - none under `prefers-reduced-motion`.
- **Touch targets:** every phone header control is ≥ 44×44 px.
- **Accessible names stay unchanged:** the name link is "Rustam Aslanov"; the section buttons and language links keep their labels.
- **New strings come in EN/RU/UK.** Restart :3200 after editing `messages/*.json`.
- **Scripted CSS edits:** after a scripted edit of `globals.css`, `touch` the file and check the served CSS with curl. If it stays stale, delete `.next/dev` and restart.
- **Commits** end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **An open menu over an open case.** Choosing a section must close the case first, exactly like the header does today.
2. **Rotating the phone to landscape (≥ md) while the menu or the picker is open.** The desktop header comes back with nothing stuck open or invisible on top of it.

---

### Task 1: The name flickers by words and letters

**Files:**
- Create: `src/ui/NameTubes.tsx`
- Modify: `src/ui/SiteHeader.tsx`, `src/app/globals.css`
- Tests: `tests/unit/neon.test.ts`, `tests/e2e/neon.spec.ts`

**Interfaces:**
- Produces `NameTubes({ name }: { name: string })`.
- It renders one inline `<span>` wrapper:
  - each word as `<span class="neon-word">`, the second with `neon-word-2`;
  - single letters as `<span class="neon-letter">`: index 3 of the first word, indices 0 and 4 of the second; the second word's letters carry the modifiers `b` and `c`;
  - the words separated by a plain space.

- [ ] **Step 1: Write the failing tests**
  - **Unit:** the `@keyframes neon-word` and `@keyframes neon-letter` blocks each contain at most 2 `opacity: 0.x` drops.
  - **e2e** `the name flickers by words and letters`:
    - the header link named exactly "Rustam Aslanov" has 2 `.neon-word` elements, each with a running CSSAnimation, and their `animation-delay` values differ;
    - it has 3 `.neon-letter` elements;
    - hovering it leaves 0 running CSSAnimations inside.
- [ ] **Step 2: Run them and watch them fail.**
  `npx vitest run tests/unit/neon.test.ts`, then `npx playwright test tests/e2e/neon.spec.ts --project=chromium`.
- [ ] **Step 3: Implement.**
  - `.neon-word`: `animation: neon-word 8s steps(1,end) var(--word-delay, 0s) infinite`; the second word has `--word-delay: -4s`.
  - `.neon-letter`: `animation: neon-letter 11s …`; modifier `.b` runs 13 s with delay −6 s, `.c` runs 17 s with delay −2 s.
  - Hover, focus and `aria-current` stop both. Reduced motion stops both and sets opacity 1.
  - `SiteHeader` uses `NameTubes` in place of `NeonText dead={3}`.
- [ ] **Step 4: Run the tests and watch them pass.** Use the same commands, plus `npx playwright test --project=mobile`.
- [ ] **Step 5: Commit** `feat(ui): the name flickers by words, then by single letters`.

### Task 2: Phone header: language picker and section menu

**Files:**
- Create: `src/ui/LanguagePicker.tsx`, `src/ui/MobileMenu.tsx`
- Modify:
  - `src/ui/LanguageSwitch.tsx`: export `useLanguageLinks()`;
  - `src/ui/SiteHeader.tsx`;
  - `src/app/[locale]/(site)/layout.tsx`: pass the new labels;
  - `messages/*.json`: `nav.menu`, `nav.closeMenu`;
  - `src/app/globals.css`.
- Tests: `tests/e2e/mobile.spec.ts` (replace the two-row header test), `tests/e2e/neon.spec.ts`

**Interfaces:**
- `useLanguageLinks(): { locale: string; href: string; current: boolean; remember: () => void }[]`
- `LanguagePicker({ label }: { label: string })`
- `MobileMenu({ labels, active, go }: { labels: Labels & { menu: string; closeMenu: string }; active: SectionId | null; go: (id: SectionId) => void })`
- Copy:

  | Key | EN | RU | UK |
  |---|---|---|---|
  | `nav.menu` | Menu | Меню | Меню |
  | `nav.closeMenu` | Close menu | Закрыть меню | Закрити меню |

- [ ] **Step 1: Write the failing tests** in `mobile.spec`.
  - **Layout:**
    - the name link is left of the language button (`aria-haspopup`);
    - the burger button "Menu" sits at the right;
    - the section buttons are not visible;
    - every visible header control is ≥ 44×44 px.
  - **Picker:**
    - clicking "EN" shows three language links, with EN `aria-current`;
    - clicking RU lands on `/ru`.
  - **Menu:**
    - "Menu" opens a dialog with the 4 section buttons and CV;
    - at stop 0 Work is `aria-current`;
    - clicking About closes the dialog and progress ≈ `HOLD.about[0]`.
  - **Esc** closes both the menu and the picker, and focus returns to their buttons.
  - **Landscape** (Review Focus 2):
    - with the menu open, `setViewportSize(915×412)` leaves no open dialog;
    - the desktop nav buttons are visible.
  - **chromium** `neon.spec`: on a laptop the language tubes and section buttons stay visible, and there is no "Menu" button.
- [ ] **Step 2: Run them and watch them fail.**
- [ ] **Step 3: Implement.**
  - **Phone header:** the name on the left; on the right `LanguagePicker`, then `MobileMenu`'s burger. Both are `md:hidden`. The nav row and `LanguageSwitch` are `hidden md:flex`.
  - **Picker:** a `.lang-drop` blade on a bracket, swinging in.
    - Closes on outside `pointerdown`, on Esc (focus back to the button) and on a choice.
    - A choice calls `remember()`, as `LanguageSwitch` does.
  - **Menu:** `role="dialog" aria-modal`, rendered only while open, with `data-ui` and `data-lenis-prevent`.
    - Styled as `.mmenu`: dark, blurred, a pole down the left, the items in their neon colours igniting with a stagger of `--i × 90 ms`, `touch-action: none`.
    - Esc and the close button shut it, and focus goes back to the burger. Focus moves to the first item on open.
    - A choice closes the menu, then calls `go(id)`; `go` already closes an open case.
    - A matchMedia `(min-width: 768px)` listener closes the menu and the picker.
- [ ] **Step 4: Run them and watch them pass.**
  `npx playwright test --project=mobile`, then `npx playwright test tests/e2e/neon.spec.ts tests/e2e/sections.spec.ts tests/e2e/flow.spec.ts --project=chromium`.
- [ ] **Step 5: Commit** `feat(ui): a language picker and a neon section menu on phones`.

### Task 3: The message field does not resize

**Files:** `src/ui/sections/ContactForm.tsx`, `src/app/globals.css`, `tests/e2e/contact.spec.ts`

- [ ] **Step 1: Failing test.** The message textarea's computed `resize` is `none`.
- [ ] **Step 2: Implement** `resize-none` on the textarea, and `textarea.nfield { resize: none }`.
- [ ] **Step 3: Run** `npx playwright test tests/e2e/contact.spec.ts --project=chromium` and watch it pass, then commit `fix(contact): the message field keeps its size`.

### Task 4: Verify

- [ ] Run:
  - `npm run lint`
  - `npm run typecheck`
  - `npx vitest run`
  - `npx playwright test --project=chromium`
  - `npx playwright test --project=mobile`
- [ ] Record the result in the gate log's round 3 section.
