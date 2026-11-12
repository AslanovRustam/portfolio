# Portfolio · Plan 2: Content (M2 + M4 + M5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The 3D street gets its content. Each sign the pole turns to the camera opens its section: Work (9 projects plus the "small part" strip), About, Stack and Contact (a working form). The site is in EN, RU and UK. Each project opens as a case overlay with its own URL, and a header carries the navigation and the language switch.

**Architecture:** The scene, scroll and section panels move into a persistent route-group layout (`[locale]/(site)/layout.tsx`), so navigating to `/[locale]/work/[slug]` only adds the case overlay page and never remounts the canvas. Section panels are fixed layers whose presence (opacity / inert) is a pure function of scroll progress inside each section's existing progress window. The camera shifts the rendered scene aside through `setViewOffset`, so the panel never covers the active sign, and the Plan 1 choreography stays untouched. Content lives in code (`src/content/*`) and copy lives in `messages/*.json`. The contact form is a React 19 Server Action with zod validation, spam guards and Nodemailer (Gmail App Password).

**Tech Stack:** as Plan 1, plus zod 4.6.7, nodemailer 10.5.0, @types/nodemailer 8.0.2.

**Spec:** `docs/superpowers/specs/2026-11-12-portfolio-design.md` (§6 content, §7 navigation, §8 i18n, §9 form). Also read `docs/superpowers/plans/2026-11-12-portfolio-plan-1-rulings.md`. It records every Plan 1 decision, among them that R3F listens on `document.body`, so clicks on HTML over a sign must be filtered.

**Out of scope (Plan 3: assets):** /brag project videos, the Gipper screen recording, the ChatGPT photo poster on the pole, decorative ChatGPT stickers. Plan 2 uses poster screenshots of the live sites and blueprint placeholders.
**Out of scope (Plan 4: polish and launch):** SEO extras (OG image, sitemap, JSON-LD), KTX2, static no-WebGL frames, Lighthouse, Vercel deploy, the deferred Plan 1 minors.

## Global Constraints

- Dark theme only. Palette: `#050507` night, neon `#ff5a1f`/`#ff7a1a`, blueprint `#0b1f38` / `#7fe3ff`, green `#1fd16a`/`#1c7a3c` only for the finale light and the CV sign.
- Locales `en` (default), `ru`, `uk`. Every user-facing string comes from `messages/*.json`, and all three files keep identical keys (the existing `messages.test.ts` enforces it). Sign labels in 3D stay English.
- All meaningful content is HTML in the DOM, reachable by keyboard: real `<section>`s with `<h2>`, labelled form fields and visible focus. The canvas stays `aria-hidden`.
- Copy: no AI tells. Load the `humanize-text` skill before writing copy. Facts come only from the spec (§6) and the résumé (`examples/Aslanov Rustam.pdf`). DevDigest is labelled honestly as a course project ("starter + my features"). The Work section ends with the "this is only a small part" line and the NDA list.
- Case overlay URL: `/[locale]/work/[slug]`. Closing it returns to `/[locale]` at the same scroll position.
- Form secrets (`GMAIL_USER`, `GMAIL_APP_PASSWORD`) live only in `.env.local` and the host env, never in the repo or chat. Tests use `MAIL_TRANSPORT=json`.
- CV: one English PDF, served in every locale at `/cv/rustam-aslanov-cv.pdf`.
- Contacts: Telegram `@AslanovRustam` (https://t.me/AslanovRustam), email `aslanovrg@gmail.com`, LinkedIn `https://www.linkedin.com/in/aslanovrustam` (the résumé gives only the handle, so confirm the URL at the M2 gate), GitHub `https://github.com/AslanovRustam`.
- Résumé facts used in copy: sales Mar 2007 – Apr 2021 (Henkel Ukraine, Colgate-Palmolive, Shabo; consultant → Senior Key Account Manager) · GoIT Full Stack Apr 2020 – Apr 2021 · Clickable Agency front-end Jun 2021 – Sep 2023 · GoIT React mentor Oct 2022 – now · Team Lead Sep 2023 – now · Gipper Full Stack Oct 2025 – Aug 2026 · languages UK native, RU fluent, EN B2.
- Performance guards stay green: prod JS ≤ 1,600,000 bytes (prod.spec), LCP ≤ 2.5 s, 3D asset budget ≤ 6 MB. Panels animate only `opacity`/`transform` from store subscriptions, never per-frame React re-renders.
- `prefers-reduced-motion`: panels switch without slides (opacity only). The Work track snaps per card instead of gliding.
- The dev server used by Playwright (`:3200`, started from PowerShell, see the Plan 1 rulings) must run with `NEXT_PUBLIC_TEST_HOOKS=1`, `MAIL_TRANSPORT=json` and `CONTACT_RATE_LIMIT=1000` (from Task 10 on). Add the same values to `webServer.env` in `playwright.config.ts`.

## Review Focus

1. **Clicking or hovering HTML that lies over a sign** (header nav, a panel, a card): the sign must not react (no scroll jump, no pointer cursor). → test in Task 3.
2. **Case overlay open, then wheel/touch scroll:** the page and scene must not move behind the overlay. After close, the scroll position is unchanged. → test in Task 7.
3. **Switching language on a case URL** (`/en/work/altus` → RU): you land on `/ru/work/altus` with Russian copy. → test in Task 7.
4. **The contact form against bots and impatience:** a filled honeypot returns "sent" without mailing, and rapid repeat sends get a rate-limit message. A missing Gmail config gives a clear fallback to email/Telegram instead of a crash. → tests in Task 10.
5. **No WebGL (`?webgl=0`):** all sections, the cases and the form still work on the fallback background. → test in Task 3 (sections) and Task 10 (form).

---

## File map

```
src/app/[locale]/layout.tsx                        (html/body/providers only) + metadataBase, hreflang alternates
src/app/[locale]/(site)/layout.tsx                 NEW persistent experience: gate, scroll, hero, header, sections
src/app/[locale]/(site)/page.tsx                   MOVED from [locale]/page.tsx → renders nothing (home = no overlay)
src/app/[locale]/(site)/work/[slug]/page.tsx       NEW case overlay page (+ generateStaticParams, generateMetadata)
src/app/[locale]/(site)/actions.ts                 NEW 'use server' submitContact
src/i18n/navigation.ts                             NEW createNavigation(routing): Link, usePathname, useRouter
src/experience/panels.ts                           NEW pure: sectionPresence, trackProgress, frameShift
src/experience/store.ts                            + highlight, celebrate
src/content/projects.ts · stack.ts · contacts.ts   NEW content data
src/server/contact.ts · mailer.ts                  NEW pure guards + transport
src/ui/SiteHeader.tsx · LanguageSwitch.tsx         NEW
src/ui/sections/SectionPanel.tsx · WorkSection.tsx · ProjectCard.tsx · AboutSection.tsx · StackSection.tsx · ContactSection.tsx · ContactForm.tsx · CaseOverlay.tsx
src/scene/CameraRig.tsx                            + view offset from frameShift
src/scene/pole/Sign.tsx                            + ignore pointer events that start on [data-ui] HTML
src/scene/stickers/PoleStickers.tsx                + glow when store.highlight matches
src/scroll/SmoothScroll.tsx                        + lockScroll(on), hash deep link
scripts/capture-posters.mjs                        NEW poster screenshots of live sites
public/projects/*.webp · public/cv/rustam-aslanov-cv.pdf
messages/en.json · ru.json · uk.json               + nav, work, projects, case, about, stack, contact
tests/unit/panels.test.ts · content.test.ts · contact.test.ts
tests/e2e/sections.spec.ts · work.spec.ts · case.spec.ts · contact.spec.ts
```

---

### Task 1: Persistent experience layout, case route, header with nav and language switch

**Files:**
- Create: `src/app/[locale]/(site)/layout.tsx`, `src/app/[locale]/(site)/work/[slug]/page.tsx` (placeholder `<CaseOverlay slug>` stub returning the slug in an `<h2>` for now), `src/i18n/navigation.ts`, `src/ui/SiteHeader.tsx`, `src/ui/LanguageSwitch.tsx`
- Move: `src/app/[locale]/page.tsx` → `src/app/[locale]/(site)/page.tsx` (returns `null`). Its current contents (ExperienceGate, SmoothScroll, HooksMount, Hero, `#journey`) move into the `(site)` layout.
- Modify:
  - `messages/*.json`: add `nav.*`.
  - `#journey` height `700svh` → `1100svh` (1000svh of scroll, about two viewport heights of reading per section). Existing e2e that swipe a fixed distance may need their expected deltas rescaled.
  - `src/app/[locale]/layout.tsx`: `metadataBase` = `new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000')`, `alternates.languages` = `{ en: '/en', ru: '/ru', uk: '/uk' }` (spec §8 hreflang). The case page overrides it with its own paths in Task 7.
- Test: `tests/e2e/sections.spec.ts` (new), and the existing `i18n.spec.ts` must stay green

**Interfaces:**
- Produces: `Link`, `usePathname`, `useRouter`, `getPathname` from `src/i18n/navigation.ts` (`createNavigation(routing)`).
- `SiteHeader` is a fixed top bar with `data-ui`. On the left, the name as a small mono wordmark that links to the top. On the right, the nav buttons `nav.work`, `nav.about`, `nav.stack`, `nav.contact` call `scrollToSection(id)`. `nav.cv` is a plain `<a href="/cv/rustam-aslanov-cv.pdf" download>`. Then `LanguageSwitch` (EN / RU / UK, the current one marked with `aria-current`), which links to the same pathname in the other locale via `Link` with `locale`.
- Messages, exact: `nav.work` Work / Проекты / Проєкти · `nav.about` About / Обо мне / Про мене · `nav.stack` Stack / Стек / Стек · `nav.contact` Contact / Контакты / Контакти · `nav.cv` CV / CV / CV · `nav.language` Language / Язык / Мова.

- [ ] **Step 1: Write the failing e2e test** `tests/e2e/sections.spec.ts`:

```ts
test('a case URL renders inside the same experience', async ({ page }) => {
  // canvas persistence across client navigation is pinned in Task 6, once cards exist to click
  await gotoScene(page, '/en/work/altus');
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 2, name: /altus/i })).toBeVisible();
});
test('each locale names its siblings for search engines', async ({ page }) => {
  await page.goto('/en');
  await expect(page.locator('link[rel="alternate"][hreflang="uk"]')).toHaveAttribute('href', /\/uk$/);
});
test('header nav scrolls to a section and the language switch keeps the path', async ({ page }) => {
  await gotoScene(page);
  await page.getByRole('button', { name: 'About' }).click();
  await expect.poll(() => progress(page), { timeout: 8000 }).toBeCloseTo(0.48, 1);
  await page.getByRole('link', { name: 'RU' }).click();
  await expect(page).toHaveURL(/\/ru$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
});
```

- [ ] **Step 2: Run** `npx playwright test tests/e2e/sections.spec.ts --project=chromium`. Expected: FAIL (no route, no header).
- [ ] **Step 3: Implement** the route group, the moved page, `navigation.ts`, `SiteHeader`, `LanguageSwitch` and the messages. Read `node_modules/next/dist/docs/` on route groups and on layouts persisting across navigations before writing.
- [ ] **Step 4: Run** the same command plus `npm test` and `npx playwright test tests/e2e/i18n.spec.ts --project=chromium`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(site): persistent experience layout, case route, header nav and language switch`

---

### Task 2: Panel math (pure)

**Files:**
- Create: `src/experience/panels.ts`
- Test: `tests/unit/panels.test.ts`

**Interfaces:**
- Consumes: `SECTIONS`, `SectionId` (Plan 1).
- Produces:

```ts
export function sectionPresence(p: number, id: SectionId): number; // 0..1
export function trackProgress(p: number): number;                    // Work-local 0..1
export function frameShift(id: SectionId | null, presence: number, viewport: { w: number; h: number }): { x: number; y: number };
```

Rules (not determined by the signatures):
- `sectionPresence`: 0 outside `[start, end]` of the section. It fades in with smoothstep over `[start + 0.01, start + 0.035]` and out over `[end − 0.035, end − 0.01]`, so it is 0 in the Plan 1 turn window around every boundary. `contact` never fades out (end = 1).
- `trackProgress`: linear, clamped, from `0.15 + 0.03` (0) to `0.37 − 0.05` (1).
- `frameShift` returns fractions of the viewport by which the scene moves.
  - Wide layout (`w ≥ 1024 && w / h ≥ 1`): `work` → `{ x: 0, y: 0.16·presence }` (scene up, cards below); other sections → `{ x: 0.2·presence, y: 0 }` (scene right, panel left).
  - Narrow layout: every section → `{ x: 0, y: 0.2·presence }` (panel is a bottom sheet).
  - `null` → `{ x: 0, y: 0 }`.

- [ ] **Step 1: Write the failing test:**

```ts
const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 6);
it('a section is present inside its window, absent in the turns', () => {
  close(sectionPresence(0.26, 'work'), 1);
  close(sectionPresence(0.15, 'work'), 0);
  expect(sectionPresence(0.1725, 'work')).toBeGreaterThan(0);
  expect(sectionPresence(0.1725, 'work')).toBeLessThan(1);
  close(sectionPresence(0.37, 'work'), 0);
  close(sectionPresence(0.37, 'about'), 0);
  close(sectionPresence(0.48, 'about'), 1);
  close(sectionPresence(0.48, 'work'), 0);
  close(sectionPresence(1, 'contact'), 1);
});
it('the work track runs through the middle of the work window', () => {
  close(trackProgress(0.1), 0);
  close(trackProgress(0.18), 0);
  close(trackProgress(0.25), 0.5);
  close(trackProgress(0.32), 1);
  close(trackProgress(0.9), 1);
});
it('the scene steps aside for the panel', () => {
  const wide = { w: 1440, h: 800 };
  const phone = { w: 412, h: 915 };
  expect(frameShift(null, 1, wide)).toEqual({ x: 0, y: 0 });
  expect(frameShift('about', 1, wide)).toEqual({ x: 0.2, y: 0 });
  expect(frameShift('work', 0.5, wide)).toEqual({ x: 0, y: 0.08 });
  expect(frameShift('about', 1, phone)).toEqual({ x: 0, y: 0.2 });
  expect(frameShift('contact', 1, { w: 900, h: 700 })).toEqual({ x: 0, y: 0.2 });
});
```

- [ ] **Step 2: Run** `npx vitest run tests/unit/panels.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `panels.ts`.
- [ ] **Step 4: Run** it again. Expected: PASS.
- [ ] **Step 5: Commit** `feat(experience): pure panel presence, work track and frame shift`

---

### Task 3: Section panel shell, camera frame shift, HTML-over-sign filter, deep links

**Files:**
- Create: `src/ui/sections/SectionPanel.tsx`
- Modify:
  - `src/scene/CameraRig.tsx`: apply the view offset.
  - `src/scene/pole/Sign.tsx`: ignore events that start on `[data-ui]`.
  - `src/scroll/SmoothScroll.tsx`: a hash on load (`#work`, `#about`, `#stack`, `#contact`) → `scrollToSection` once the scene is `ready`, or right away when `webgl === false` (the fallback never becomes ready).
  - `(site)/layout.tsx`: mount four empty panels with their `<h2>` from messages.
  - `messages/*.json`: `work.title`, `about.title`, `stack.title`, `contact.title`.
- Test: `tests/e2e/sections.spec.ts` (extend)

**Interfaces:**
- Consumes: `sectionPresence`, `frameShift`, `activeSection`, store.
- Produces:
  - `<SectionPanel id={SectionId} layout="side" | "bottom" labelledBy={string}>`. It renders `<section id={id} aria-labelledby data-ui data-section={id}>`, fixed: a left column on wide layouts (`layout="side"`) or a bottom band (`layout="bottom"`, Work), and a bottom sheet on narrow layouts.
    - It subscribes to `experienceStore` (no React re-render per frame) and sets `opacity = presence` and `translateY = (1 − presence)·24px` (opacity only under reduced motion).
    - Below presence 0.01 it sets `visibility: hidden` and `inert`.
    - Probe `panel:<id>` returns the presence.
  - `CameraRig` damps a frame shift toward `frameShift(activeSection(p), sectionPresence(p, active), viewport)` (λ = 4) and applies `camera.setViewOffset(w, h, −x·w, y·h, w, h)`. It calls `clearViewOffset()` when both are ~0. Probe `viewOffset` returns `{ x, y }`.
  - Sign handlers return early when `(e.nativeEvent.target as Element | null)?.closest?.('[data-ui]')` is set.
- Messages, exact: `work.title` Selected work / Избранные проекты / Вибрані проєкти · `about.title` About / Обо мне / Про мене · `stack.title` Stack / Стек / Стек · `contact.title` Let's go / Поехали / Поїхали (spec §6.5: "Let's go" on the green light).

- [ ] **Step 1: Write the failing tests** (append to `sections.spec.ts`):

```ts
test('each section panel shows only inside its window, and the scene steps aside', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  for (const [p, id] of [[0.26, 'work'], [0.48, 'about'], [0.695, 'stack'], [0.9, 'contact']] as const) {
    await scrollTo(page, p);
    await expect(page.locator(`section#${id}`)).toBeVisible();
    await expect.poll(() => page.evaluate((s) => window.__portfolio.probe(`panel:${s}`) as number, id)).toBeGreaterThan(0.95);
  }
  await expect.poll(() => page.evaluate(() => (window.__portfolio.probe('viewOffset') as { x: number }).x), { timeout: 8000 }).toBeGreaterThan(0.15);
  await scrollTo(page, 0.37); // a turn: no panel
  await expect(page.locator('section#about')).toBeHidden();
});
test('HTML over a sign swallows the pointer: no sign hover, no sign click', async ({ page }) => { // Review Focus 1
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, 0.26);
  const { x, y } = (await page.evaluate(() => window.__portfolio.probe('signScreen:work'))) as { x: number; y: number };
  await page.evaluate(([px, py]) => {
    const d = document.createElement('div');
    d.setAttribute('data-ui', '');
    Object.assign(d.style, { position: 'fixed', left: `${px - 40}px`, top: `${py - 40}px`, width: '80px', height: '80px', zIndex: '50' });
    document.body.appendChild(d);
  }, [x, y]);
  await page.mouse.move(x, y);
  await page.mouse.click(x, y);
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => document.body.style.cursor)).not.toBe('pointer');
  expect(await page.evaluate(() => window.__portfolio.state().hoveredSign)).toBeNull();
});
test('a hash deep link opens its section, also without WebGL', async ({ page }) => { // Review Focus 5
  await page.goto('/en?webgl=0#stack');
  await page.waitForFunction(() => !!window.__portfolio);
  await expect.poll(() => progress(page), { timeout: 8000 }).toBeCloseTo(0.695, 1);
  await expect(page.locator('section#stack')).toBeVisible();
});
```

- [ ] **Step 2: Run** `npx playwright test tests/e2e/sections.spec.ts --project=chromium`. Expected: FAIL.
- [ ] **Step 3: Implement** the panel shell, the view offset, the `[data-ui]` filter and the hash deep link.
- [ ] **Step 4: Run** the sections spec and the full `npm run e2e`. Expected: PASS (the Plan 1 interaction test still clicks a bare sign).
- [ ] **Step 5: Commit** `feat(ui): section panels, scene frame shift, HTML-over-sign filter, hash deep links`

---

### Task 4: Content data and copy (EN, then RU/UK)

**Files:**
- Create: `src/content/projects.ts`, `src/content/stack.ts`, `src/content/contacts.ts`
- Modify: `messages/*.json` (`hero.line`, `work.*`, `projects.*`, `case.*`, `about.*`, `stack.*`, `contact.*`), `src/ui/Hero.tsx` (+ a `line` prop rendered under the role; spec §6.1 "one positioning line")
- Test: `tests/unit/content.test.ts`, `tests/e2e/sections.spec.ts` (extend)

Load `humanize-text` before writing any copy. Write the EN copy first, then RU and UK as native-quality translations, not word-for-word.

**Interfaces:**

```ts
// projects.ts
export type ProjectSlug = 'gipper' | 'aslanair' | 'gengo' | 'moto' | 'altus' | 'aslan-can' | 'kolir' | 'tuti' | 'devdigest';
export interface Project {
  slug: ProjectSlug;
  featured: boolean;
  year: string;
  stack: readonly string[];
  links: { live?: string; repo?: string; site?: string };
  /** /projects/<slug>.webp, or null → blueprint placeholder card */
  poster: string | null;
  badge?: 'commercial' | 'course';
}
export const PROJECTS: readonly Project[];
export const NDA_KEYS: readonly ('port' | 'safety' | 'social' | 'architecture')[];
// stack.ts
export interface StackGroup { key: 'frontend' | 'state' | 'motion' | 'backend' | 'tools' | 'ai'; items: readonly { label: string; sticker?: string }[] }
export const STACK: readonly StackGroup[];
// contacts.ts
export const CONTACTS: { telegram: string; email: string; linkedin: string; github: string; cv: string };
```

The data, exact. Order and featured flags follow spec §6.2. Links:

| slug | featured | year | links | poster | badge |
|---|---|---|---|---|---|
| gipper | ✓ | 2025–2026 | site https://www.gipper.com/ | /projects/gipper.webp | commercial |
| aslanair | ✓ | 2026 | live https://aslanair.vercel.app · repo https://github.com/AslanovRustam/aslanair | /projects/aslanair.webp | — |
| gengo | ✓ | 2026 | live https://gen-go.ai/ · repo https://github.com/AslanovRustam/Dream-Weaver | /projects/gengo.webp | commercial |
| moto | ✓ | 2026 | — (private) | null | commercial |
| altus | — | 2026 | live https://altus-liard.vercel.app · repo https://github.com/AslanovRustam/altus | /projects/altus.webp | — |
| aslan-can | — | 2025 | live https://aslan-can.vercel.app | /projects/aslan-can.webp | — |
| kolir | — | 2026 | live https://www.kolir.agency · repo https://github.com/AslanovRustam/kolir-next | /projects/kolir.webp | commercial |
| tuti | — | 2026 | — | null | commercial |
| devdigest | — | 2026 | repo https://github.com/AslanovRustam/dev-digest | null | course |

Each project's `stack` is taken from spec §6.2. STACK groups follow spec §6.4. Chips are `label (sticker)`, and the sticker keys come from `src/scene/stickers/stickers.ts`:
- frontend: HTML (html5), CSS (css), SCSS (sass), Tailwind (tailwindcss), JavaScript (javascript), TypeScript (typescript), React (react), Next.js (nextdotjs)
- state: Redux / RTK (redux), MobX (mobx), Zustand (zustand)
- motion: Three.js / R3F (threedotjs), GSAP (greensock), Fabric.js (fabric), Skia / CanvasKit (skia)
- backend: Node.js (nodedotjs), Nest.js (nestjs), Prismic (prismic), Contentful (contentful), Sanity (sanity), Payload (payloadcms)
- tools: Git (git), GitHub (github), GitLab (gitlab), Bitbucket (bitbucket), n8n (n8n)
- ai: Claude (claude), Cursor, ChatGPT

`STACK_SLUGS` drops slugs that simple-icons lacks. If the content test reports a missing key, remove that chip's `sticker`; do not add a sticker.

Message keys (copy written in this task; lengths are hard limits):
- `hero.line` (≤ 90 chars; one positioning line, rendered by `Hero` under the role)
- `work.lead` (≤ 140 chars) · `work.more` ("This is only a small part of what I've built." in spirit; ≤ 80 chars) · `work.ndaTitle` · `work.nda.{port,safety,social,architecture}` (one line each, from the résumé) · `work.open` · `work.live` · `work.repo` · `work.site` · `work.course` · `work.commercial` · `work.private`
- `projects.<slug>.title` · `.kind` (≤ 40 chars) · `.summary` (≤ 160 chars). For featured projects add `.problem`, `.did`, `.result` (≤ 320 chars each).
- `case.close` · `case.problem` · `case.did` · `case.result` · `case.stack` · `case.links`
- `about.lead` (≤ 160) · `about.story` (≤ 600; sales → code as a strength) · `about.timelineTitle` · `about.timeline.{sales,goit,clickable,mentor,lead,gipper}` (each "years — what", from the résumé; chronological, so the mentor role from 2022 comes before the lead role from 2023) · `about.langsTitle` · `about.langs` · `about.how` (≤ 200; AI tools in daily work, n8n)
- `stack.lead` (≤ 140) · `stack.groups.{frontend,state,motion,backend,tools,ai}`
- `contact.lead` (≤ 160) · `contact.name` · `contact.email` · `contact.message` · `contact.send` · `contact.sending` · `contact.sent` · `contact.invalid` · `contact.rate` · `contact.config` · `contact.error` · `contact.fallback` · `contact.telegram` · `contact.linkedin` · `contact.github` · `contact.copyEmail` · `contact.copied` · `contact.cv` · `contact.errors.{name,email,message}`

- [ ] **Step 1: Write the failing test** `tests/unit/content.test.ts`:

```ts
const get = (o: unknown, path: string) => path.split('.').reduce<unknown>((a, k) => (a as Record<string, unknown>)?.[k], o);
it('projects: unique slugs, spec order, four featured first', () => {
  expect(PROJECTS.map((p) => p.slug)).toEqual(['gipper', 'aslanair', 'gengo', 'moto', 'altus', 'aslan-can', 'kolir', 'tuti', 'devdigest']);
  expect(PROJECTS.filter((p) => p.featured).map((p) => p.slug)).toEqual(['gipper', 'aslanair', 'gengo', 'moto']);
  expect(PROJECTS.find((p) => p.slug === 'devdigest')!.badge).toBe('course');
});
it('every project has its copy in every locale, within the limits', () => {
  for (const m of [en, ru, uk])
    for (const p of PROJECTS) {
      const keys = ['title', 'kind', 'summary', ...(p.featured ? ['problem', 'did', 'result'] : [])];
      for (const k of keys) expect(String(get(m, `projects.${p.slug}.${k}`) ?? '').trim()).not.toBe('');
      expect(String(get(m, `projects.${p.slug}.summary`)).length).toBeLessThanOrEqual(160);
    }
});
it('links are https and stack stickers exist on the pole', () => {
  for (const p of PROJECTS) for (const url of Object.values(p.links)) expect(url).toMatch(/^https:\/\//);
  const keys = new Set(STICKERS.map((s) => s.key));
  for (const g of STACK) for (const i of g.items) if (i.sticker) expect(keys.has(i.sticker)).toBe(true);
});
```

And append to `tests/e2e/sections.spec.ts` (import `en` from `messages/en.json`):

```ts
test('the hero carries the positioning line', async ({ page }) => {
  await gotoScene(page);
  await expect(page.locator('header[data-hero]')).toContainText(en.hero.line);
});
```

- [ ] **Step 2: Run** `npx vitest run tests/unit/content.test.ts` and `npx playwright test tests/e2e/sections.spec.ts --project=chromium -g "positioning"`. Expected: FAIL.
- [ ] **Step 3: Write** the data files and the EN copy, then the RU and UK copy. Render `hero.line` in `Hero`.
- [ ] **Step 4: Run** `npm test` (includes `messages.test.ts` key parity) and the hero e2e. Expected: PASS.
- [ ] **Step 5: Commit** `feat(content): projects, stack and contacts data; copy in en/ru/uk`

---

### Task 5: Posters and CV

**Files:**
- Create: `scripts/capture-posters.mjs`, `public/projects/*.webp`, `public/cv/rustam-aslanov-cv.pdf` (copied from `examples/Aslanov Rustam.pdf`)
- Modify: `package.json` (script `"posters": "node scripts/capture-posters.mjs"`)
- Test: `tests/unit/content.test.ts` (extend)

**Interfaces:**
- `capture-posters.mjs` launches Playwright Chromium at 1440×900 and opens each project with `poster !== null` at its `links.live ?? links.site`. It waits for `load` + 6 s, takes a screenshot, then sharp resizes it to 1200 px wide, WebP q78, `public/projects/<slug>.webp`. It is idempotent (skips existing files unless `--force`).

- [ ] **Step 1: Write the failing test** (append):

```ts
it('every poster file exists and stays small; the CV is there', () => {
  for (const p of PROJECTS.filter((x) => x.poster)) {
    const f = join('public', p.poster!);
    expect(existsSync(f)).toBe(true);
    expect(statSync(f).size).toBeLessThanOrEqual(200 * 1024);
  }
  expect(existsSync('public/cv/rustam-aslanov-cv.pdf')).toBe(true);
});
```

- [ ] **Step 2: Run** `npx vitest run tests/unit/content.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the script, run `npm run posters` and copy the CV. Open each poster with Read and recapture any that shows a cookie banner, an empty loader or an age gate. Use a click / longer wait per site in the script; do not edit images by hand.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(content): live-site poster captures and the CV download`

---

### Task 6: Work section: the card track

**Files:**
- Create: `src/ui/sections/WorkSection.tsx`, `src/ui/sections/ProjectCard.tsx`
- Modify: `(site)/layout.tsx` (Work panel content)
- Test: `tests/e2e/work.spec.ts`

**Interfaces:**
- Consumes: `PROJECTS`, `trackProgress`, `SectionPanel layout="bottom"`, messages `work.*`, `projects.*`.
- Produces:
  - `WorkSection` holds a horizontal track (`data-track`) of `ProjectCard`s:
    - featured cards are 2× wide;
    - a `badge` chip shows on cards that have one;
    - the last tile is `work.more` with the NDA list.
  - The track's `translateX` follows `trackProgress(p)` × (track width − viewport width), set from a store subscription. Under reduced motion it snaps to whole cards.
  - `ProjectCard` is a `Link` (next-intl) to `/work/<slug>` with `scroll={false}` and `data-ui`. It shows the poster as `next/image` (1200×750, `sizes` set, lazy) or a blueprint placeholder (grid background + mono title), plus title, kind and year.
  - Probe `track` returns the applied translateX in px.

- [ ] **Step 1: Write the failing test** `tests/e2e/work.spec.ts`:

```ts
test('the work track slides through all projects and ends on "a small part"', async ({ page }) => {
  await gotoScene(page);
  await scrollTo(page, 0.19);
  await expect(page.getByRole('link', { name: /Gipper/ })).toBeVisible();
  await scrollTo(page, 0.33);
  await expect(page.getByText(/small part/i)).toBeVisible();
  expect(await page.evaluate(() => window.__portfolio.probe('track') as number)).toBeLessThan(-200);
});
test('a card opens its case over the scene by client navigation', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await page.evaluate(() => document.querySelector('canvas')!.setAttribute('data-mark', 'same'));
  await scrollTo(page, 0.19); // the start of the track: the first card is on screen
  await page.getByRole('link', { name: /Gipper/ }).click();
  await expect(page).toHaveURL(/\/en\/work\/gipper$/);
  await expect(page.locator('canvas[data-mark="same"]')).toHaveCount(1);
});
```

- [ ] **Step 2: Run** `npx playwright test tests/e2e/work.spec.ts --project=chromium`. Expected: FAIL.
- [ ] **Step 3: Implement** `WorkSection` and `ProjectCard`.
- [ ] **Step 4: Run** the work spec and `npm run e2e:mobile` (the track must work on a phone). Expected: PASS.
- [ ] **Step 5: Commit** `feat(work): scroll-driven project track with posters and the NDA strip`

---

### Task 7: Case overlay

**Files:**
- Create: `src/ui/sections/CaseOverlay.tsx`
- Modify:
  - `(site)/work/[slug]/page.tsx`: real content, `generateStaticParams` over locales × slugs, `generateMetadata` (title = project title + name).
  - `src/scroll/SmoothScroll.tsx`: `export function lockScroll(on: boolean)` — Lenis stop/start + `overflow: hidden` on `<html>`.
- Test: `tests/e2e/case.spec.ts`

**Interfaces:**
- `CaseOverlay({ slug })`: `role="dialog"`, `aria-modal`, `aria-labelledby`, `data-ui`.
  - Content: title (`h2`), kind, badge; for featured projects problem / did / result, for compact ones the summary; stack chips; links (`work.live`, `work.repo`, `work.site`, opening in a new tab with `rel="noopener"`); the poster or placeholder.
  - Closing: the `case.close` button, Esc and a backdrop click all go back via `router.push('/', { scroll: false })` to the same locale.
  - It locks scroll while open, restores it on close and moves focus to the dialog.
- An unknown slug → `notFound()`.
- `generateMetadata` also sets `alternates.languages` to `/{en,ru,uk}/work/<slug>`.

- [ ] **Step 1: Write the failing test** `tests/e2e/case.spec.ts`:

```ts
test('a case opens over the scene, locks scrolling, and closes back to the same spot', async ({ page }) => { // Review Focus 2
  await gotoScene(page);
  await scrollTo(page, 0.19);
  const before = await progress(page);
  await page.getByRole('link', { name: /Gipper/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { level: 2 })).toHaveText(/Gipper/);
  await page.mouse.wheel(0, 1500);
  await page.waitForTimeout(600);
  expect(Math.abs((await progress(page)) - before)).toBeLessThan(0.01);
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/en$/);
  await expect(dialog).toHaveCount(0);
  expect(Math.abs((await progress(page)) - before)).toBeLessThan(0.01);
});
test('switching language on a case keeps the case', async ({ page }) => { // Review Focus 3
  await page.goto('/en/work/altus');
  await page.getByRole('link', { name: 'RU' }).click();
  await expect(page).toHaveURL(/\/ru\/work\/altus$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(page.getByRole('dialog').getByRole('heading', { level: 2 })).toBeVisible();
});
test('an unknown case is a 404', async ({ page }) => {
  const res = await page.goto('/en/work/nope');
  expect(res?.status()).toBe(404);
});
```

- [ ] **Step 2: Run** `npx playwright test tests/e2e/case.spec.ts --project=chromium`. Expected: FAIL.
- [ ] **Step 3: Implement** the overlay, the page, `lockScroll` and the store flag.
- [ ] **Step 4: Run** the case, work and sections specs. Expected: PASS.
- [ ] **Step 5: Commit** `feat(work): addressable case overlays with scroll lock and locale-aware close`

---

### Task 8: About section

**Files:**
- Create: `src/ui/sections/AboutSection.tsx`
- Modify: `(site)/layout.tsx`
- Test: `tests/e2e/sections.spec.ts` (extend)

**Interfaces:**
- `AboutSection` lives in `SectionPanel id="about" layout="side"`:
  - `about.lead`, `about.story`;
  - the timeline (`about.timeline.*`, in order sales → goit → clickable → mentor → lead → gipper) as an ordered list (`<ol>`, it is a real sequence);
  - languages and `about.how`;
  - a portrait slot (`data-portrait`, empty blueprint frame until Plan 3).

- [ ] **Step 1: Write the failing test** (append):

```ts
test('About tells the path from sales to code, in order', async ({ page }) => {
  await gotoScene(page);
  await scrollTo(page, 0.48);
  const about = page.locator('section#about');
  await expect(about.getByRole('heading', { level: 2 })).toBeVisible();
  const items = about.locator('ol > li');
  await expect(items).toHaveCount(6);
  await expect(items.first()).toContainText(/2007/);
  await expect(items.last()).toContainText(/Gipper/);
});
```

- [ ] **Step 2–4:** Run (FAIL) → implement → run (PASS).
- [ ] **Step 5: Commit** `feat(about): story, career timeline, languages`

---

### Task 9: Stack section with sticker highlight

**Files:**
- Create: `src/ui/sections/StackSection.tsx`
- Modify: store (`highlight`, `setHighlight`), `src/scene/stickers/PoleStickers.tsx` (glow when `highlight === s.key`; probe `stickerGlow` → the glowing key or null), `(site)/layout.tsx`
- Test: `tests/e2e/sections.spec.ts` (extend)

**Interfaces:**
- `StackSection` renders the groups with headings `stack.groups.*` and the items as chips (`<ul>`). Hovering or focusing a chip that has a `sticker` calls `setHighlight(sticker)`; leaving or blurring calls `setHighlight(null)`.

- [ ] **Step 1: Write the failing test** (append):

```ts
test('hovering a stack chip lights its sticker on the pole', async ({ page }) => {
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, 0.695);
  await page.locator('section#stack').getByText('React', { exact: true }).hover();
  await expect.poll(() => page.evaluate(() => window.__portfolio.probe('stickerGlow'))).toBe('react');
  await page.mouse.move(5, 5);
  await expect.poll(() => page.evaluate(() => window.__portfolio.probe('stickerGlow'))).toBeNull();
});
```

- [ ] **Step 2–4:** Run (FAIL) → implement → run (PASS).
- [ ] **Step 5: Commit** `feat(stack): grouped stack with sticker highlight on the pole`

---

### Task 10: Contact: form, guards, mailer, links, CV

**Files:**
- Create: `src/server/contact.ts`, `src/server/mailer.ts`, `src/app/[locale]/(site)/actions.ts`, `src/ui/sections/ContactSection.tsx`, `src/ui/sections/ContactForm.tsx`, `.env.example`
- Modify: `package.json` (`zod`, `nodemailer`, `@types/nodemailer`, exact versions), `(site)/layout.tsx`, store (`celebrate`, `setCelebrate`), `src/scene/pole/TrafficLight.tsx` (green pulse while `celebrate`), `playwright.config.ts` (`webServer.env`)
- Test: `tests/unit/contact.test.ts`, `tests/e2e/contact.spec.ts`

**Interfaces:**

```ts
// contact.ts (pure, no 'use server')
export const contactSchema: z.ZodType<{ name: string; email: string; message: string }>; // name 2–80, email ≤120 valid, message 10–4000, all trimmed
export type ContactStatus = 'idle' | 'sent' | 'invalid' | 'rate' | 'config' | 'error';
export interface ContactResult { status: ContactStatus; fields?: Partial<Record<'name' | 'email' | 'message', true>> }
export function screenSubmission(raw: { name: string; email: string; message: string; company: string; startedAt: string }, now: number):
  { verdict: 'ok'; data: { name: string; email: string; message: string } } | { verdict: 'spam' } | { verdict: 'invalid'; fields: Partial<Record<'name' | 'email' | 'message', true>> };
export function createRateLimiter(limit: number, windowMs: number): (key: string, now: number) => boolean; // true = allowed
// mailer.ts
export function sendContactMail(data: { name: string; email: string; message: string }): Promise<'sent' | 'config' | 'error'>;
// actions.ts ('use server')
export async function submitContact(prev: ContactResult, form: FormData): Promise<ContactResult>;
```

Rules:
- `screenSubmission` checks in this order: a filled honeypot field `company` → `spam`; invalid fields → `invalid`; `now − startedAt < 3000` ms → `spam`. A first impatient submit of an empty form therefore shows the field errors instead of a fake "sent".
- `spam` returns `{ status: 'sent' }` without mailing, so bots learn nothing.
- Rate limit: `Number(process.env.CONTACT_RATE_LIMIT ?? 3)` per 10 minutes per IP (`x-forwarded-for` first entry, else `'local'`). One module-level limiter per server instance is best-effort, as documented.
- Mailer:
  - `MAIL_TRANSPORT=json` → nodemailer `jsonTransport` (tests).
  - Otherwise Gmail SMTP with `GMAIL_USER`/`GMAIL_APP_PASSWORD`, to `CONTACT_TO ?? GMAIL_USER`, `replyTo` the visitor, subject `Portfolio — <name>`.
  - Missing env → `'config'`.
- `ContactForm` uses `useActionState(submitContact, { status: 'idle' })` on a `<form noValidate>`.
  - It has labelled fields with `aria-invalid` and `aria-describedby` on errors, a hidden honeypot (`tabIndex=-1`, `autoComplete="off"`, visually hidden, not `display:none`) and `startedAt` in a hidden input set on mount.
  - Spec §9 asks for zod on both sides. The form checks `contactSchema` on submit and shows field errors without a round-trip; the server action checks again.
  - On `sent` it shows `contact.sent` and sets the store's `celebrate` to true for 2 s. `TrafficLight` pulses the green lens brighter while it is set (spec §9 "green light animation").
  - On `config`/`error` it shows `contact.fallback` with the email and Telegram links.
- `ContactSection` lives in `SectionPanel id="contact"`: `contact.lead`, the form, the links (Telegram, LinkedIn, GitHub, copy-email button with a `contact.copied` live region) and `contact.cv` download.
- `.env.example` lists `GMAIL_USER=`, `GMAIL_APP_PASSWORD=`, `CONTACT_TO=` with no values.

- [ ] **Step 1: Write the failing unit test** `tests/unit/contact.test.ts`:

```ts
const now = 1_000_000;
const ok = { name: 'Ann', email: 'ann@example.com', message: 'Hello, I have a role for you.', company: '', startedAt: String(now - 10_000) };
it('accepts a real message, trimmed', () => {
  expect(screenSubmission({ ...ok, name: '  Ann ' }, now)).toEqual({ verdict: 'ok', data: { name: 'Ann', email: 'ann@example.com', message: ok.message } });
});
it('flags bots: honeypot or too fast', () => {
  expect(screenSubmission({ ...ok, company: 'ACME' }, now).verdict).toBe('spam');
  expect(screenSubmission({ ...ok, startedAt: String(now - 1000) }, now).verdict).toBe('spam');
});
it('names the invalid fields', () => {
  expect(screenSubmission({ ...ok, email: 'nope', message: 'hi' }, now)).toEqual({ verdict: 'invalid', fields: { email: true, message: true } });
});
it('rate-limits a sender, then lets them back after the window', () => {
  const allow = createRateLimiter(3, 600_000);
  expect([0, 1, 2, 3].map((i) => allow('1.2.3.4', now + i))).toEqual([true, true, true, false]);
  expect(allow('5.6.7.8', now)).toBe(true);
  expect(allow('1.2.3.4', now + 600_001)).toBe(true);
});
const mail = { name: 'Ann', email: 'ann@example.com', message: 'Hello, I have a role for you.' };
it('without Gmail settings the mailer reports config instead of throwing', async () => { // Review Focus 4
  vi.stubEnv('MAIL_TRANSPORT', '');
  vi.stubEnv('GMAIL_USER', '');
  vi.stubEnv('GMAIL_APP_PASSWORD', '');
  expect(await sendContactMail(mail)).toBe('config');
});
it('the json transport sends without a network', async () => {
  vi.stubEnv('MAIL_TRANSPORT', 'json');
  expect(await sendContactMail(mail)).toBe('sent');
});
afterEach(() => vi.unstubAllEnvs());
```

- [ ] **Step 2: Write the failing e2e test** `tests/e2e/contact.spec.ts`:

```ts
test('the form validates, then sends (json transport in tests)', async ({ page }) => {
  await gotoScene(page);
  await scrollTo(page, 0.9);
  const form = page.locator('section#contact form');
  await form.getByRole('button', { name: 'Send' }).click();
  await expect(form.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true');
  await page.waitForTimeout(3200); // the human-speed guard
  await form.getByLabel('Name').fill('Ann');
  await form.getByLabel('Email').fill('ann@example.com');
  await form.getByLabel('Message').fill('Hello, I have a front-end role for you.');
  await form.getByRole('button', { name: 'Send' }).click();
  await expect(page.locator('section#contact')).toContainText(/sent|thanks/i);
  await expect.poll(() => page.evaluate(() => window.__portfolio.state().celebrate)).toBe(true);
});
test('contacts and CV are there, also without WebGL', async ({ page }) => { // Review Focus 5
  await page.goto('/en?webgl=0#contact');
  const c = page.locator('section#contact');
  await expect(c.getByRole('link', { name: /Telegram/ })).toHaveAttribute('href', 'https://t.me/AslanovRustam');
  await expect(c.getByRole('link', { name: /CV/ })).toHaveAttribute('href', '/cv/rustam-aslanov-cv.pdf');
});
```
(The Playwright dev server must run with `MAIL_TRANSPORT=json` and `CONTACT_RATE_LIMIT=1000`, or repeated e2e runs hit the limiter. Add both to `webServer.env`, stop the shared PowerShell server and start it again with them.)

- [ ] **Step 3: Run** `npx vitest run tests/unit/contact.test.ts && npx playwright test tests/e2e/contact.spec.ts --project=chromium`. Expected: FAIL.
- [ ] **Step 4: Install** the deps exactly (`npm i --save-exact zod@4.6.7 nodemailer@10.5.0 && npm i -D --save-exact @types/nodemailer@8.0.2`), then implement the files above.
- [ ] **Step 5: Run** the same command plus `npm run prod` (the JS budget must hold: the mailer is server-only). Expected: PASS.
- [ ] **Step 6: Commit** `feat(contact): form with zod, spam guards, rate limit and Gmail mailer; links and CV`

---

### Task 11: Verification and the M2 gate with Rustam

**Files:**
- Create: `docs/superpowers/gates/2026-11-12-m2-gate.md`

- [ ] **Step 1: Run** the full suite: `npm run lint && npm run typecheck && npm test && npm run e2e && npm run e2e:mobile && npm run perf && npm run prod`. Expected: all pass; perf median ≤ 33.4 ms, prod JS ≤ 1.6 MB, LCP ≤ 2.5 s.
- [ ] **Step 2: Self-review shots** of each section on desktop 1440×800 and Pixel 7 (scratch look spec), against the anti-goals: text readable over the scene, panels never covering the active sign, no layout jumps, a consistent type scale, the copy free of AI tells.
- [ ] **Step 3: Gate session.**
  - Show Rustam the dev server (`:3200`, LAN URL for the phone).
  - Ask for: copy corrections in all three languages, layout, the LinkedIn URL, a TUTI deploy link if one exists (spec §6.2 "уточнить"), and whether the form should go live.
  - For the live form: Rustam creates a Google App Password himself and puts `GMAIL_USER`, `GMAIL_APP_PASSWORD` into `.env.local`, never in chat. Restart the server and send one real message.
- [ ] **Step 4: Log each round** in the gate file, apply changes with tests, commit. At most 3 rounds.
- [ ] **Step 5: On his "yes":** mark the gate passed, update the memory, and write Plan 3 (assets: /brag videos, Gipper recording, photo poster) with superpowers:writing-plans.
