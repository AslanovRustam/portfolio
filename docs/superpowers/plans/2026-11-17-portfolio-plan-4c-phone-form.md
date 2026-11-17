# Plan 4c — the form on a phone

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Contact's form is easy to fill in on a phone: the dive's screen keeps the form in reach (16 px fields, room for the keyboard, a margin before the camera backs out), and a phone gets the form one field at a time.

**Architecture:** A is CSS plus the dive's arithmetic: a `backSvh` stretch between the dive's end and where Contact's text starts (the camera stays inside over it), more room under the text. B is a `steps` mode of the same `ContactForm` — all three fields stay in one `<form>` (one submission, one honeypot, one fill time, one draft), only the current step's field shows; the step logic is a pure module. ContactSection picks it on dive windows narrower than 640 px; ContactScreen's picture shows the first step there.

**Tech Stack:** Next.js 16 / React 19, next-intl 4, Tailwind 4, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-17-phone-form-design.md` (approved «ок»); it builds on `docs/superpowers/specs/2026-11-16-ride-round-1-design.md` §5. Branch `plan-4/ride`.

## Global Constraints

- The server side, the form's copy, the honeypot, the fill-time screen and the draft that survives a move stay as they are; the billboard's compact form on a laptop does not change.
- Steps: «Имя / Name / Ім'я» → «Email» → «Сообщение / Message / Повідомлення»; a step does not let the visitor on while its field fails the same schema the server uses; a server error on a field takes the form to that step.
- No inner scroll; the dive's other behaviour (Plan 4b) unchanged; reduced motion works; text stays selectable and read by screen readers ("Step 2 of 3" in the page's language).
- Restart :3200 with `.next/dev` deleted after CSS edits and check the served CSS; restart after editing `messages`.

## Review Focus

1. **A phone in the middle of the steps, turned to landscape and back** (412×839 ↔ 839×412: landscape is ≥ 640 px wide, so the full form): what was typed and the step survive. Test in Task 2.
2. **The keyboard up on step 3** (the window 40 % shorter): the message field and Send can be brought above its edge. Test in Task 1.
3. **A server answer naming a field** (a too-short name that passes nothing on the client is impossible, so: the server's `invalid` with fields): the form goes to the first named step. Unit test in Task 2.
4. **Scrolling up a little inside the screen** (60 px, then a third of a screen): the form stays; only beyond that the camera backs out. Test in Task 1.
5. **Reduced motion on a phone**: the steps work, Contact lands at its text. Test in Task 2.

---

### Task 1: A — the form in the screen

**Files:**
- Modify: `src/experience/diveStages.ts` (`DIVE.backSvh = 33`; `contactLanding` adds it), `src/ui/sections/ContactScreen.tsx` (`--entry` adds it), `src/app/globals.css` (the dive's room under the text; 16 px / 48 px fields below 640 px)
- Test: `tests/unit/dive.test.ts`, `tests/e2e/mobile.spec.ts`

**Interfaces:**
- Produces: `DIVE.backSvh` (33): the stretch after the dive's end before Contact's text reaches the frame's top; `contactLanding(view)` = the dive's end + `backSvh` (still `CONTACT_FROM` when `still`).

- [ ] **Step 1: Failing tests.**
  - Unit (`dive.test.ts`): `contactLanding(view)` lies `backSvh` of a screen after the dive's end; at `contactLanding(view)` less 0.3 of a screen the stage is still `inside`.
  - E2E (`mobile.spec.ts`, Pixel 7):
    - the fields' computed font size is 16 px and their height ≥ 48 px;
    - after landing, scrolling up 60 px keeps `data-stage="inside"` and the form visible;
    - with the window 40 % shorter, scrolling the Send sign into view puts its bottom above the window's bottom edge, inside the frame.
- [ ] **Step 2: Run** `npx vitest run tests/unit/dive.test.ts` and `npx playwright test tests/e2e/mobile.spec.ts --project=mobile -g "<the new titles>"`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - `backSvh` into the stages and the landing.
  - ContactScreen's `--entry` = arrive + dive + back (svh of the pinned height) + TOP + PAD. The `min-height` follows from it.
  - CSS: `#contact.flow-piece[data-dive] { padding-bottom: 50svh }`; `@media (max-width: 639.98px) { .nfield { font-size: 16px; min-height: 48px } }`.
- [ ] **Step 4: Run** the same commands. Expected: PASS. Then `npx playwright test tests/e2e/contact.spec.ts tests/e2e/mobile.spec.ts --project=chromium --project=mobile`: the Plan 4b dive tests stay green; update any that pinned the old landing, with a ledger ruling each.
- [ ] **Step 5: Commit** `fix(contact): the form in the screen stays in reach on a phone`

### Task 2: B — the form one field at a time on a phone

**Files:**
- Create: `src/ui/sections/formSteps.ts`, `src/ui/sections/useNarrow.ts`
- Modify:
  - `src/ui/sections/ContactForm.tsx`: a `steps` prop;
  - `src/ui/sections/ContactSection.tsx`: the dive variant uses `steps` below 640 px;
  - `src/ui/sections/ContactScreen.tsx`: the picture shows step 1 there;
  - `messages/{en,ru,uk}.json`: `contact.next`, `contact.back`, `contact.step`;
  - `src/app/globals.css`: the step's controls.
- Test: `tests/unit/formSteps.test.ts`, `tests/e2e/mobile.spec.ts`, `tests/e2e/contact.spec.ts`

**Interfaces:**
- Produces:
  - `STEPS: readonly ContactField[]` = `['name', 'email', 'message']`.
  - `stepError(field: ContactField, value: string): boolean`: the server's schema, one field only.
  - `firstStepWith(fields: Partial<Record<ContactField, true>>): number | null`.
  - `useNarrow(): boolean`: `(max-width: 639.98px)`; false on the server and during hydration.
  - `ContactForm({ compact?, steps? })`: in `steps` mode a module-level `step` kept with `draft` (reset after a sent message); only the current step's field shows; the others stay in the form, hidden, so they submit.
- Copy:
  - `contact.next`: "Next" / «Далее» / «Далі»;
  - `contact.back`: "Back" / «Назад» / «Назад»;
  - `contact.step`: "Step {n} of {total}" / «Шаг {n} из {total}» / «Крок {n} з {total}».

- [ ] **Step 1: Failing tests.**
  - Unit (`formSteps.test.ts`):
    - `stepError('email', 'ann@')` is true and `stepError('email', 'ann@example.com')` false;
    - `stepError('name', '')` is true;
    - `firstStepWith({ message: true, email: true })` is 1 and `firstStepWith({})` is null.
  - E2E (`mobile.spec.ts`, Pixel 7, at the landing):
    - "1 / 3" and the Name field show; Email and Message don't.
    - Next with an empty name shows the name's error and stays.
    - Enter in a filled name goes to step 2 with focus in Email; a bad email doesn't pass.
    - Back keeps what was typed.
    - Step 3, a message, Send: a POST, the sent status, the form back at step 1 and empty.
    - The status reads "Step 2 of 3" for screen readers.
    - **Review Focus 1:** in step 2 with a name typed, turn to 839×412 (the full form, the name there), turn back (step 2, the name kept); then switch the language (step 2 and the name kept).
    - **Review Focus 5:** reduced motion: the steps work.
  - E2E (`contact.spec.ts`): on 1440×800 (billboard) and 1180×820 (dive) the full form shows all three fields.
- [ ] **Step 2: Run** `npx vitest run tests/unit/formSteps.test.ts` and the new e2e. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - **Steps mode.** Next validates the current field and moves on; Enter in name or email does the same. Back goes back. The last step shows the Send sign. A server `invalid` jumps to `firstStepWith(fields)`. Focus goes to the new step's field.
  - **Picture.** On narrow dive windows the picture mirrors step 1: the counter, the Name label and field, Next.
- [ ] **Step 4: Run** the same tests, then restart :3200 (messages changed). Expected: PASS.
- [ ] **Step 5: Commit** `feat(contact): a phone fills the form in one field at a time`

### Task 3: Verification

- [ ] **Step 1:** lint, typecheck, `npx vitest run`, `npx playwright test --project=chromium --project=mobile`. Expected: all green.
- [ ] **Step 2:** perf on its own after a pause (`--project=perf`). Expected: every median ≤ 33.4 ms.
- [ ] **Step 3:** `npm run prod`. Expected: 2/2, LCP within 10 % of 1036 ms.
- [ ] **Step 4:** the gate log's Round 2 records what was done for note 3, with the numbers.
- [ ] **Step 5: Commit** `docs(gate): M4 round 2, the form on a phone`
