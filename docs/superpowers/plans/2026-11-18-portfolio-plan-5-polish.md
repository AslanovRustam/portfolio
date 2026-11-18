# Plan 5 — Polish (M6): the statue egg, SEO, the intro's end, the minors — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A marble sticker on the pole that opens a statue showcase, link previews and search metadata in three languages, the intro's end inside the frame budget, and ten visitor-facing minors fixed.

**Architecture:** The egg is one more sticker with a fixed place (stickers.ts) whose click flips `eggOpen` in the experience store; an HTML dialog in the (site) layout renders from that flag, modelled on CaseOverlay (lockScroll, inert, Esc). SEO is a pure `siteUrl()` + `pageMeta()` helper used by the locale layout and the case page, Next's file conventions for `opengraph-image`, `sitemap` and `robots`, and a JSON-LD script on the home page. The intro is measured first, then cut only where the measurement points.

**Tech Stack:** Next 16.4 (Turbopack, cacheComponents), next-intl 4, R3F/three, zustand, Tailwind 4, `next/og` ImageResponse, sharp (already in node_modules), Vitest, Playwright (chromium, mobile, perf, prod projects).

**Spec:** `docs/superpowers/specs/2026-11-18-polish-design.md` (Russian). Read the relevant guide in `node_modules/next/dist/docs/` before Next-specific code (AGENTS.md): `01-app/03-api-reference/03-file-conventions/01-metadata/{opengraph-image,sitemap,robots}.md`, `01-app/02-guides/json-ld.md`, `01-app/03-api-reference/04-functions/generate-metadata.md`.

## Global Constraints

- Work on branch `plan-5/polish`. Merging to `main` or pushing needs Rustam's explicit OK.
- Captions, verbatim:
  - EN: «The Mentor» / «Has been reviewing pull requests since antiquity.»
  - RU: «Наставник» / «Ревьюит пулл-реквесты с античных времён.»
  - UK: «Наставник» / «Рев'юїть пул-реквести з античних часів.»
- The statue image is `examples/Mentor in the Museum Gallery.png` (1024×1536) as WebP, ~1000 px tall, ≤ 160 KB, requested only on the first open.
- The egg is not reachable by keyboard and does not exist without WebGL.
- OG image: 1200×630 PNG, per locale; name and role as in that locale's `meta.title` (EN «Rustam Aslanov» / «Front-end engineer», RU «Рустам Асланов» / «Front-end разработчик», UK «Рустам Асланов» / «Front-end розробник»).
- Site URL: `NEXT_PUBLIC_SITE_URL`, else `https://${VERCEL_PROJECT_PRODUCTION_URL}`, else `http://localhost:3000`.
- JSON-LD never carries the email.
- Frame budget: median ≤ 33.4 ms on the `perf` project (integrated GPU), run alone after a pause.
- Billboard hints render at ≥ 11 px at the smallest billboard scale (0.75).
- Secrets and the LAN IP never enter the repo; `.env*` is never read.
- Copy shown to visitors follows the humanize-text rules (no AI tells), in all three languages.

## Review Focus

1. A language switch keeps the old page hidden but mounted (Next 16 Activity): the egg must open exactly one visible dialog after a switch, and its close must return focus inside the visible page. → test in Task 2.
2. The image fails to load (offline, blocked): the frame, the caption and the close button still show, no broken-image glyph, and the dialog still closes. → test in Task 2.
3. A phone rotated or a window resized while the dialog is open: it still fits without inner scroll. → test in Task 2.
4. Case pages: their canonical, `og:url` and hreflang name the case URL, not the home page, and the sitemap lists every project in `src/content/projects.ts`. → tests in Task 3 and Task 4.
5. A click on the sticker where HTML lies over it (a bill, the header) opens nothing, as the signs do. → test in Task 1.

---

### Task 1: The marble sticker on the pole

**Files:**
- Modify: `src/scene/stickers/stickers.ts`, `src/scene/stickers/PoleStickers.tsx`, `src/experience/store.ts`
- Test: `tests/unit/stickers.test.ts`, `tests/e2e/egg.spec.ts` (new; runs in `chromium`), `tests/e2e/mobile.spec.ts`

**Interfaces:**
- Produces: `export const EGG: StickerDef` in stickers.ts (key `'statue'`, kind `'text'`, text `'</>'`, bg ≈ `#e6e1d6`, fg dark grey ≈ `#3a3a3c`, the `textSpec` size 0.15 / aspect 0.42, `angle = SIGNS.find(s => s.id === 'about')!.facing` (π/2: the side the About camera sees, since the pole holds the ABOUT sign towards the camera through About and under reduced motion), `roll = 0`, `y = EGG_Y`). `EGG` is the first entry of `STICKERS`; `placeStickers` treats it as already placed, so the random ones keep clear of it.
- Produces: store `eggOpen: boolean` (default false) and `setEggOpen(on: boolean): void`.
- Produces: probe `'egg'` → `{ rect: { x: number; y: number; width: number; height: number }; front: boolean } | null`: the sticker's projected bounding box on the page (CSS px) and whether its face points at the camera.
- Produces: e2e helper `eggInSight(page): Promise<{ x: number; y: number } | null>` in `tests/e2e/helpers.ts`: walks progress from 0.33 to `HOLD.about[0] + 0.03` in steps of 0.002 (scrollTo, then wait until the probe's rect is still for 250 ms), and returns the centre of the first rect that lies inside the window below the header (y ≥ 64) and whose 9 sample points (corners inset 2 px, edge midpoints, centre) all hit the `<canvas>` with `document.elementFromPoint`; null if none.

- [ ] **Step 1: Write the failing unit tests** in `tests/unit/stickers.test.ts`:
  - `'the statue sticker stands above About’s bills on the side About sees'`: `STICKERS[0].key === 'statue'`, `EGG.angle` equals the ABOUT sign's facing, and `Math.abs(EGG.y - 1.6) < 0.06`: the camera arrives level with the pole at `TOP = 1.6` m (aboutPole.ts) and the close-up shows only ±0.07–0.09 m around its height, so the sticker must sit there to be in frame before the bills come up under it.
  - The existing tests (signs' brackets, clamp bands, no overlap) now cover `EGG` because it is in `STICKERS`; add `'statue'` to the "every text sticker found a place" list.
- [ ] **Step 2: Run** `npx vitest run tests/unit/stickers.test.ts` — Expected: FAIL (`EGG` not exported).
- [ ] **Step 3: Implement** `EGG`, `EGG_Y` (start at 1.62; Step 7 may move it, one value for every window and language) and the "already placed" seeding in `placeStickers(specs, seed, fixed: StickerDef[] = [])`. Add `eggOpen`/`setEggOpen` to the store.
- [ ] **Step 4: Run** the unit test — Expected: PASS; `npm test` green.
- [ ] **Step 5: Write the failing e2e** in `tests/e2e/egg.spec.ts` (1440×900, for `en`, `ru`, `uk`):
  - `'the statue sticker shows uncovered as the camera reaches the pole (<lang>)'`: `eggInSight` is not null.
  - `'hovering the statue sticker lights it and shows a pointer; clicking it opens the showcase'`: hover the point → `probe('stickerGlow') === 'statue'` and `document.body.style.cursor === 'pointer'`; click → `state().eggOpen === true`.
  - `'a click on the sticker through HTML opens nothing'`: scroll to where a bill covers the egg's rect (progress `HOLD.about[0] + 0.05` or later, until `elementFromPoint` at the rect's centre is inside `.paper-bill`), click there → `eggOpen` stays false.
  - In `tests/e2e/mobile.spec.ts`: `'a phone sees the statue sticker uncovered and a tap opens it'` at 412×915 (the project's Pixel 7) and again with `page.setViewportSize({ width: 390, height: 844 })`, in all three languages: `eggInSight` not null, `page.touchscreen.tap` at it → `eggOpen === true`.
- [ ] **Step 6: Run** `npx playwright test tests/e2e/egg.spec.ts --project=chromium` — Expected: FAIL (no probe, no click).
- [ ] **Step 7: Implement** in PoleStickers: the egg glows on hover like a logo (the `kind !== 'logo'` guard lets `'statue'` through), sets `document.body.style.cursor` as Sign.tsx does (and clears it on out), `onClick`: `e.stopPropagation(); if (overUi(e)) return; setEggOpen(true)`; register the `'egg'` probe (project the patch's corners with the camera, as Pole.tsx's `face()` does). Draw the marble: a stone fill with a few thin darker veins and the `</>` cut in dark grey in StickerMono; no die-cut white edge is required (executor's look). If a combination of window × language never shows it uncovered, move `EGG_Y` (one value) and re-run all of them.
- [ ] **Step 8: Run** `npx playwright test tests/e2e/egg.spec.ts --project=chromium` and `npx playwright test tests/e2e/mobile.spec.ts --project=mobile -g "statue"` — Expected: PASS. Also run `tests/e2e/sections.spec.ts tests/e2e/stack.spec.ts tests/e2e/pole.spec.ts` (sticker glow, placement) — Expected: PASS.
- [ ] **Step 9: Commit** — `git commit -m "feat(egg): a marble sticker on the pole that opens the showcase"`

### Task 2: The showcase dialog

**Files:**
- Create: `src/ui/StatueEgg.tsx`, `public/egg/mentor.webp`, `scripts/egg-image.mjs`
- Modify: `src/app/[locale]/(site)/layout.tsx` (mount `<StatueEgg />` after `NextButton`), `src/app/globals.css`, `messages/{en,ru,uk}.json` (new `egg` namespace), `tests/unit/assetBudget.test.ts`
- Test: `tests/e2e/egg.spec.ts`, `tests/e2e/mobile.spec.ts`

**Interfaces:**
- Consumes: store `eggOpen` / `setEggOpen` (Task 1); `lockScroll(on)` from `src/scroll/SmoothScroll.tsx`; `neonStyle` from `src/ui/neon.ts`; the `[data-glitch='on']` animation in globals.css (already disabled under reduced motion).
- Produces: messages `egg.title`, `egg.line`, `egg.alt`, `egg.close` in all three files. `egg.alt` describes a marble statue of a bearded mentor in a toga holding a tablet carved with `</>`, an owl and scrolls at his feet — one sentence per language.

- [ ] **Step 1: Write the image script and asset.** `scripts/egg-image.mjs` resizes the PNG with sharp to height 1000 and writes WebP (quality tuned so the file is ≤ 160 KB). Run it, commit the output. Add to `assetBudget.test.ts`: `'the statue image stays small'` — `public/egg/mentor.webp` ≤ 160 KB and 1000 px tall (read the size with sharp's metadata).
- [ ] **Step 2: Write the failing e2e** in `tests/e2e/egg.spec.ts` (open via `page.evaluate(() => window.__portfolio.state().setEggOpen(true))` after the scene is ready, except where a test says "by the sticker"):
  - `'the statue image is not requested until the showcase opens'`: record requests from load to About; none ends in `/egg/mentor.webp`; open; one does.
  - `'the showcase shows the frame, the statue and the caption in the page’s language'` (en/ru/uk): `getByRole('dialog', { name: <title> })` visible; the caption line text is the verbatim one; `img` alt is `egg.alt`.
  - `'Esc, the close button and a click outside each close it, and focus comes back'`: focus a header link, open, the close button is focused; for each way of closing: dialog gone, `eggOpen` false, `document.activeElement` is the header link again.
  - `'Tab stays inside the showcase'`: press Tab 5 times; the focused element is inside the dialog each time.
  - `'the page does not scroll while it is open'`: at About, open; `mouse.wheel(0, 800)`, `keyboard.press('PageDown')`, `keyboard.press('Space')`; progress unchanged (±0.001); close; a wheel scroll moves progress again.
  - `'it switches on with a glitch, and without one under reduced motion'`: the frame element gets `data-glitch="on"`; with `page.emulateMedia({ reducedMotion: 'reduce' })` its computed `animation-name` is `none`.
  - Review Focus 1: `'after a language switch the sticker opens one visible showcase'`: `switchLanguage(page, 'RU')`, open; `page.getByRole('dialog').filter({ visible: true })` has count 1 with the RU title; close; `document.activeElement` is visible (`checkVisibility()`).
  - Review Focus 2: `'a failed image still leaves the caption and the close button'`: `page.route('**/egg/mentor.webp', r => r.abort())`; open; title, line and close button visible; the `img` is hidden (no broken glyph: its computed `visibility` is `hidden` or it is removed); Esc closes.
  - `'without WebGL there is no showcase'`: `/en?webgl=0`, `setEggOpen(true)` → no dialog in the page.
  - In `mobile.spec.ts`: `'the showcase fits a phone without scrolling inside'` at 412×915 and 390×844: dialog box inside the viewport, `innerScrollers(page)` empty; Review Focus 3: rotate to 915×412 while open → still inside the viewport, no inner scroller.
- [ ] **Step 3: Run** `npx playwright test tests/e2e/egg.spec.ts --project=chromium` — Expected: FAIL (no dialog).
- [ ] **Step 4: Implement `StatueEgg()`** (client component, renders nothing while `eggOpen` is false and while `webgl` is false). Portal into `document.body`, `data-ui` backdrop (click outside closes), inner `role="dialog" aria-modal="true" aria-labelledby` the title; a cool-white or cyan neon frame from the site's palette; the close button `×` with `aria-label={t('egg.close')}`; `<img src="/egg/mentor.webp" alt={t('egg.alt')} decoding="async">` rendered only while open (so nothing is fetched before), `onError` hides it; the image's height capped so frame + caption fit `100svh` minus margins. On open: remember `document.activeElement`, `lockScroll(true)`, set `inert` on every other child of `<body>` (header, main, the rest: the trap), focus the close button, `data-glitch="on"` on the frame (cleared after 0.7 s); Esc closes. On close: undo all of it in reverse and focus the remembered element with `preventScroll`. Under a language switch only the instance whose page is visible may render (filter by the `main` it belongs to being visible, or by the store flag being cleared on unmount — executor's call, Review Focus 1 test decides).
- [ ] **Step 5: Run** `npx playwright test tests/e2e/egg.spec.ts --project=chromium`, `npx playwright test tests/e2e/mobile.spec.ts --project=mobile -g "showcase|statue"`, `npx vitest run` — Expected: PASS.
- [ ] **Step 6: Commit** — `git commit -m "feat(egg): the Mentor's showcase, lazy image, focus trap, frozen page"`

### Task 3: Site URL, page metadata and JSON-LD

**Files:**
- Create: `src/i18n/site.ts`
- Modify: `src/app/[locale]/layout.tsx`, `src/app/[locale]/(site)/work/[slug]/page.tsx`, `src/app/[locale]/(site)/page.tsx`, `messages/{en,ru,uk}.json` (`meta.name`, `meta.role`, `meta.altName`)
- Test: `tests/unit/site.test.ts` (new), `tests/e2e/seo.spec.ts` (new, `chromium`)

**Interfaces:**
- Produces: `siteUrl(env: Record<string, string | undefined> = process.env): URL`.
- Produces: `pageMeta(o: { locale: Locale; path: string; title: string; description: string }): Metadata` — `metadataBase: siteUrl()`, `alternates: { canonical: '/<locale><path>', languages: { en, ru, uk: '/<l><path>', 'x-default': '/en<path>' } }`, `openGraph: { type: 'website', url: '/<locale><path>', title, description, siteName: <meta.name of the locale>, locale: OG_LOCALE[locale], alternateLocale: the other two }`, `twitter: { card: 'summary_large_image', title, description }`. `OG_LOCALE = { en: 'en_US', ru: 'ru_RU', uk: 'uk_UA' }`. `path` is `''` for home, `/work/<slug>` for a case.
- Produces: `personJsonLd(o: { locale: Locale; name: string; altName: string; role: string }): Record<string, unknown>` — `@context`, `@type: 'Person'`, `name`, `alternateName`, `jobTitle`, `url: new URL('/<locale>', siteUrl()).href`, `sameAs: [CONTACTS.linkedin, CONTACTS.github, CONTACTS.telegram]`; no `email` key.
- Messages: `meta.name` (EN «Rustam Aslanov», RU/UK «Рустам Асланов»), `meta.altName` (the other spelling), `meta.role` (as after «—» in `meta.title`). Task 4 consumes `meta.name` and `meta.role`.

- [ ] **Step 1: Write the failing unit tests** in `tests/unit/site.test.ts`:
  - `siteUrl({ NEXT_PUBLIC_SITE_URL: 'https://a.dev' }).origin === 'https://a.dev'`; `siteUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'b.vercel.app' }).origin === 'https://b.vercel.app'`; both set → the first wins; neither → `'http://localhost:3000'`.
  - `pageMeta({ locale: 'ru', path: '/work/gipper', … })`: canonical `/ru/work/gipper`, `languages['x-default'] === '/en/work/gipper'`, `openGraph.locale === 'ru_RU'`, `twitter.card === 'summary_large_image'`.
  - `personJsonLd(...)`: no `email` anywhere in `JSON.stringify` (no `@` followed by `gmail`), `sameAs` has the three URLs.
  - In `tests/unit/messages.test.ts` the parity test already covers the new keys; add `'meta.name matches the name in meta.title'` for each locale (`title.startsWith(name + ' — ')`).
- [ ] **Step 2: Run** `npx vitest run tests/unit/site.test.ts tests/unit/messages.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** `site.ts`, the messages, `generateMetadata` in the locale layout via `pageMeta({ path: '' })`, the case page via `pageMeta({ path: '/work/<slug>' })` (its title stays `<project> — <meta.name>`), and in the home page a `<script type="application/ld+json">` with `JSON.stringify(personJsonLd(...)).replace(/</g, '\\u003c')` as the json-ld guide shows (the home page becomes an async server component reading the locale).
- [ ] **Step 4: Write the failing e2e** `tests/e2e/seo.spec.ts`:
  - `'the home page names its own canonical, every language and x-default, as absolute URLs'` for `/ru`: `link[rel=canonical]` href ends `/ru`; hreflang `en|ru|uk|x-default` present, `x-default` ends `/en`; every href starts with `http`.
  - `'Open Graph and Twitter tags in the page’s language'`: `og:title` = RU `meta.title`, `og:locale` = `ru_RU`, `og:url` ends `/ru`, `og:image` present, `twitter:card` = `summary_large_image`.
  - Review Focus 4: `'a case page names itself, not the home page'` for `/uk/work/gipper`: canonical and `og:url` end `/uk/work/gipper`, hreflang `en` ends `/en/work/gipper`.
  - `'the home page carries a Person in JSON-LD without the email'`: parse the script; `@type` Person, `name` = RU `meta.name`, `alternateName` = «Rustam Aslanov», `sameAs` length 3; the script text does not contain the email.
- [ ] **Step 5: Run** `npx playwright test tests/e2e/seo.spec.ts tests/e2e/sections.spec.ts tests/e2e/i18n.spec.ts --project=chromium`, `npx vitest run`, `npm run typecheck` — Expected: PASS.
- [ ] **Step 6: Commit** — `git commit -m "feat(seo): the site's own URL, canonical, Open Graph, Twitter and a Person in JSON-LD"`

### Task 4: The link preview image, sitemap and robots

**Files:**
- Create: `src/app/[locale]/opengraph-image.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts`, `brand/og-street.jpg`, `brand/fonts/` (Oswald 700, Latin + Cyrillic, plus its `OFL.txt`), `tests/e2e/_scratch/og-frame.spec.ts` (git-ignored, the capture)
- Modify: `src/proxy.ts` only if a test below shows a redirect
- Test: `tests/e2e/seo.spec.ts`

**Interfaces:**
- Consumes: `siteUrl()` (Task 3), messages `meta.name`, `meta.role`, `meta.title`.
- Produces: `/<locale>/opengraph-image…` (PNG 1200×630), `/sitemap.xml`, `/robots.txt`.

- [ ] **Step 1: Capture the street frame.** A scratch spec at 1200×630 takes one screenshot of the live scene (executor's pick: the billboard «Let's go» or the street with the pole, no HTML text in it: hide `[data-ui]`, the header and the hero), saved as `brand/og-street.jpg` (≤ 200 KB). Fetch Oswald 700 in a format satori reads (TTF, OTF or WOFF, not WOFF2; one static file per subset is fine), e.g. from the `@fontsource/oswald` package files on jsdelivr, into `brand/fonts/` with `OFL.txt`.
- [ ] **Step 2: Write the failing e2e** in `tests/e2e/seo.spec.ts`:
  - `'each language’s preview image is a 1200×630 PNG'` for en/ru/uk: read `og:image` from the page, `request.get` it → 200, `content-type` `image/png`, and the PNG header's width/height (bytes 16–23) are 1200 and 630; the en and ru bodies differ.
  - `'sitemap lists the home and every case in three languages with alternates'`: `/sitemap.xml` → 200 XML, contains `<loc>` for `/<l>` and `/<l>/work/<slug>` for every locale and every slug in `PROJECTS`, each with `xhtml:link` alternates; every loc absolute.
  - `'robots allows everything and points at the sitemap'`: `/robots.txt` → 200, `Allow: /`, `Sitemap: …/sitemap.xml`.
  - None of the three answers is a redirect (`maxRedirects: 0` → status 200).
- [ ] **Step 3: Run** `npx playwright test tests/e2e/seo.spec.ts --project=chromium` — Expected: FAIL (404s).
- [ ] **Step 4: Implement** `opengraph-image.tsx` (`size`, `contentType = 'image/png'`, `alt` = EN `meta.title`; the default export reads the locale from `params`, the frame and the font with `readFile(join(process.cwd(), 'brand/…'))`, and lays the name large and the role under it, in Oswald, over the frame darkened at the text's side), `sitemap.ts` (`alternates.languages` per entry, absolute URLs from `siteUrl()`), `robots.ts`. Ruling already taken: `alt` is the English title in every locale (a static export; cost: an English alt under a Russian preview).
- [ ] **Step 5: Run** the e2e — Expected: PASS. Then `npm run prod` (build + prod project) — Expected: build succeeds (the image routes prerender per locale) and `prod.spec.ts` passes. Look at the three PNGs yourself (save them to the scratchpad and Read them): the name is whole, Cyrillic renders in Oswald, the text is readable over the frame.
- [ ] **Step 6: Commit** — `git commit -m "feat(seo): a preview image per language, sitemap and robots"`

### Task 5: The end of the intro inside the frame budget

**Files:**
- Modify: `tests/e2e/perf.spec.ts` (the test `'the end of the intro, measured'` becomes gated), scene files chosen by the measurement
- Test: `tests/e2e/perf.spec.ts`

**Interfaces:**
- Consumes: the perf spec's `standing(page, p, name)` helper.

- [ ] **Step 1: Measure.** Run `npx playwright test tests/e2e/perf.spec.ts --project=perf -g "intro"` three times, alone, with a pause between runs. Ledger the three medians. Then find where the time goes at p = 0.12: GPU vs CPU (DebugPerf / `renderer.info`: draw calls, triangles, programs), and the cost of each candidate switched off one at a time in a scratch run — shadow maps, the number of lights reaching the pole's materials, the post-processing resolution, objects behind the camera or under the fog. Ledger each candidate's saving.
- [ ] **Step 2: Turn the test into the gate**: rename to `'standing at the end of the intro keeps at least 30 fps'` and `expect(r.medianMs).toBeLessThanOrEqual(33.4)`. Run it — Expected: FAIL (35–41 ms per the Plan 4 ruling); if it passes three times out of three without a change, ledger that and skip to Step 5.
- [ ] **Step 3: Implement** the cheapest set of measured savings that applies only around p ≈ 0.10–0.14 (gate by progress, return to full quality after), without a visible change: take screenshots at p = 0.10, 0.12, 0.14 before and after (1440×900, scratchpad) and compare them yourself.
- [ ] **Step 4: Run** the gated test three times alone — Expected: PASS each time. Run the whole perf project once — Expected: no other case regresses past 33.4.
- [ ] **Step 5: Stop rule.** If no set of savings reaches 33.4 ms without a visible change, do not ship a degraded look: stop, and show Rustam the options with the before/after pictures and each option's median.
- [ ] **Step 6: Commit** — `git commit -m "perf(intro): the intro's end inside the frame budget"`

### Task 6: Minors in the scene and the scroll (1, 2, 3, 4, 6)

**Files:**
- Modify: `src/ui/flow/PaperBill.tsx`, `src/scene/tvwall/stopLoop.ts`, `src/scene/tvwall/TvWall.tsx`, `src/experience/stackStops.ts`, `src/scene/shop/Shop.tsx`, `src/scene/stack/Gantry.tsx` (share its font wait)
- Test: `tests/unit/tornEdge.test.ts` or a new `tests/unit/paperBill.test.ts`, `tests/unit/stopLoop.test.ts`, `tests/unit/stackStops.test.ts`, `tests/unit/shop.test.ts`

**Interfaces:**
- Produces: `billTilt(seed: number): number` (degrees, |tilt| ≤ 1.8) exported from PaperBill.tsx or `src/ui/flow/tornEdge.ts`.
- Produces: `plateFontReady(weight: number, sample: string): Promise<unknown>` in a shared module (e.g. `src/scene/plateFont.ts`), used by Gantry and Shop.
- Produces: `StopLoopPlayer` gains a dwell: `constructor(show, createVideo?, dwellMs = 300)`, with `update()` creating a video only after the same stop has been asked for `dwellMs`.

One commit per minor, each RED → GREEN:
- [ ] **1. Bill tilt.** Test `'About’s bills tilt different ways'`: for seeds 10, 17, 24, 31, 38, `billTilt` gives at least 3 distinct values, both signs, all within ±1.8. Fix the formula (seeds step by 7, so the current `seed·37 mod 7` is constant).
- [ ] **2. AbortError.** Test in stopLoop.test: a stand-in video whose `play()` rejects with `new DOMException('', 'AbortError')` → `update(sameStop)` later creates a new video (the stop is not in `failed`); a `NotAllowedError` still marks it failed.
- [ ] **3. Dwell.** Test with fake timers: `update(0)`, `update(1)`, `update(2)` within 300 ms → `made === 0`; holding `update(2)` past 300 ms → `made === 1`. TvWall calls `update` every frame already; keep the `loopTarget` env and `LoopSources` from being rebuilt every frame (compute them only when the target stop changes — minor 10's TvWall part).
- [ ] **4. Stack snap.** Test `'a gesture that starts in About settles on the first sign'`: `stackSnapTarget(stackStopProgress(0) + 0.002, 0.5) === null` or `=== stackStopProgress(0)`, never `stackStopProgress(1)`. Fix: measure the move from `max(from, STACK_FROM)`.
- [ ] **6. WORK sign font.** Test in shop.test (stub `document.fonts.load` with a deferred promise): the sign texture is painted (or repainted, `needsUpdate`) after the load resolves. Use `plateFontReady(600, 'WORK')` in Shop and the same helper in Gantry.
- [ ] **Run** `npx vitest run` and `npx playwright test tests/e2e/work.spec.ts tests/e2e/stack.spec.ts tests/e2e/tvwall.spec.ts tests/e2e/loops.spec.ts --project=chromium` — Expected: PASS.

### Task 7: Minors on the page (5, 7, 8, 9, 10)

**Files:**
- Modify: `src/ui/sections/ContactBillboard.tsx`, `src/ui/sections/ContactForm.tsx`, `src/ui/sections/ContactScreen.tsx`, `src/ui/sections/AboutBackdrop.tsx`, `src/scene/billboard/Billboard.tsx`, `src/scroll/SmoothScroll.tsx`, `src/app/globals.css`
- Test: `tests/e2e/contact.spec.ts`, `tests/e2e/mobile.spec.ts`, `tests/e2e/flow.spec.ts` (or wherever the dive's page-side tests live)

One commit per minor, each RED → GREEN:
- [ ] **5. Hints ≥ 11 px.** Test at 1280×600: the billboard's form hints (`.text-xs` inside the billboard form: errors and the status line) have `parseFloat(fontSize) × fit scale ≥ 11` (read the scale from the billboard node's transform). Fix: the billboard exposes its scale as a CSS variable and its hints use `max(0.75rem, calc(11px / var(--fit)))`.
- [ ] **7. Frame lights at ~0.99.** Test on a phone (the dive): sample the frame's `data-screen-tube` visibility and the picture's live scale while scrolling into Contact in small steps; when the tube first shows, the content's scale is ≥ 0.99 of its full size. Fix: `nowInside` in ContactScreen also requires the live scale `rect.width / BILLBOARD.panel.width / diveScale(h, w / h) ≥ 0.99`.
- [ ] **8. Focus after a Contact link.** Test on a phone: the header's Contact link (or `scrollToSection('contact')`) lands inside the screen; then `document.activeElement` is `#contact-title` (it gets `tabIndex={-1}` if it is not focusable). Laptop behaviour unchanged.
- [ ] **9. CSS leftovers.** Remove the empty `@media` with the stale "GO" comment, the redundant `@variant wide --entry` in `#about`, and give `.loader-title` a weight Oswald is loaded with (500, 600 or 700). Check: `npx playwright test tests/e2e/shots.spec.ts --project=shots` shows no change, or the changed shots are the loader title only.
- [ ] **10. Per-frame work.** Test `'outside Contact nothing on the page is rewritten every frame'` at p = 0.05, 0.12 and 0.5 (laptop and phone): a MutationObserver on `document.body` (attributes, subtree) over 1 s records no mutation on `[data-screen-frame]`, `[data-screen-picture]`, `#contact[data-dive]` or the About backdrop while progress is still; and the scene does not publish the screen rect (count `onScreenRect` calls through a probe, or listeners attached only from progress ≥ 0.79). Fix: ContactScreen listens only from p ≥ 0.79 and writes attributes only on change; AboutBackdrop writes styles only on change.
- [ ] **Run** `npx playwright test --project=chromium` and `npx playwright test --project=mobile` (the whole suites: these minors touch shared paths), `npx vitest run`, `npm run typecheck`, `npm run lint` — Expected: PASS (a known flake, the `ride.spec` fling at p 0.3067, passes on its own rerun; ledger it if it shows).

---

## Done when

- All seven tasks have their ledger lines; the whole chromium, mobile and unit suites pass; the perf project passes alone; `npm run prod` passes.
- The final whole-branch review has run and its Critical/Important findings are fixed.
- Rustam has seen the egg on his phone (LAN link via DEV_LAN_HOST) and a preview of the link in Telegram after the merge; merging waits for his OK.
