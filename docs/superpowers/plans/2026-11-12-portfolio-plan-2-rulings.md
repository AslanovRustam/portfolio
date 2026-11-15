# Plans 2, 2b, 2c, 2d — rulings and deferred items

Copied from the execution ledgers (git-ignored `.superpowers/sdd/`, deleted after the merge to main on 2026-11-15). Every deviation from a plan, why, and its cost if wrong; the follow-up notes; then the minors each final review deferred. Some deferred minors were settled by a later plan or round: triage them in Plan 4 before acting.

## Plan 2 — content

Plan: `docs/superpowers/plans/2026-11-12-portfolio-plan-2-content.md`

### Rulings and notes

- T4→T5/T6/T7/T9/T10: PROJECTS/STACK/CONTACTS + copy. Ruling: EN copy is pinned by later tests — work.more contains "small part"; contact.name/email/message labels are exactly "Name"/"Email"/"Message", contact.send is "Send", contact.sent matches /sent|thanks/i; links named Telegram / CV; chip label "React" exact — the tests in T6/T10/T9 are written against them — cost if wrong: copy edits at the gate.
- Task 1: Ruling: getByRole('link', { name: 'RU' }) also matches the 'Rustam Aslanov' wordmark (substring, case-insensitive) — language links are located with exact: true here and in Task 7's case test — cost if wrong: none, test-only
- Task 3: Ruling: Tailwind's one-line @custom-variant with an @media query compiled to nothing; the 'wide' variant uses the block form with @slot — cost if wrong: none
- Task 4: Ruling: about.timeline.<key> is {years, what} instead of one 'years — what' string — the panel sets the years as their own element and the copy avoids dashes (humanize-text) — cost if wrong: one key shape in About (Task 8)
- Task 4: Ruling: UK moto.kind drops 'для України' to stay within the 40-char limit — cost if wrong: copy edit at the gate
- Task 5: Ruling: capture-posters.mjs imports src/content/projects.ts directly (Node 24 strips types) instead of duplicating the list — cost if wrong: a MODULE_TYPELESS warning on each run
- Task 6: Ruling: added progressForTrack() (inverse of trackProgress, unit-tested) so keyboard focus on a card clipped off the track scrolls the journey to it — cost if wrong: one extra pure function
- Task 6: Ruling: the case stub's generateStaticParams lists every project slug (was only 'altus') so /work/gipper renders before Task 7 — cost if wrong: none
- Task 7: Ruling: the case page reads params behind <Suspense> (Next 16.4's "URL data outside of Suspense" insight logged a console error otherwise); since notFound() inside Suspense can no longer set the status, proxy.ts answers unknown /<locale>/work/<slug> with a rewrite to an unrouted path (404) — cost if wrong: one regex in the proxy to keep in sync with the route
- Task 7: Ruling: the overlay sits under the header (z 25 vs 30) so the language switch stays usable on a case; main is inert while it is open; header nav and the wordmark over an open case close it and their scroll runs after unlock (lockScroll queues it) — cost if wrong: header stays outside aria-modal for screen readers
- Task 7: Ruling: the language-switch test locates RU with exact: true (see Task 1); the close test allows 15 s for the URL because a cold dev server compiles /en on the way back — cost if wrong: none
- Task 7: Ruling: Step 3 mentions "the store flag" — a leftover of overlayOpen, which the plan removed in self-review; nothing added — cost if wrong: none
- Task 7: Ruling: WorkSection's focus handler now ignores cards already in view — focus restored to the opening card after close was scrolling the journey (0.19→0.18), caught by the case test — cost if wrong: none
- Task 7: Ruling: devdigest.kind is now "Starter + my features" (badge already says "Course project"), so the card and case don't say "course project" twice — cost if wrong: copy edit at the gate
- Task 7: Ruling: html gets scrollbar-gutter: stable so locking scroll never changes the viewport width and re-measures the journey — cost if wrong: a 15px gutter on platforms with classic scrollbars (already there while scrolling)
- Task 8: Ruling: side panels widened to min(40rem, 40vw) and an overflowing panel fades its bottom edge (data-more) as a scroll cue — About did not fit at 1440×800 and gave no hint of more content — cost if wrong: panel width tweak at the gate
- Task 9: Ruling: overUi() moved to src/scene/uiPointer.ts and also guards sticker hover, so HTML over a sticker swallows the pointer like it does over a sign — cost if wrong: none
- Task 9: Ruling: only chips that have a pole sticker are focusable (tabIndex 0) — focus is what lights the sticker for keyboard users; the rest are plain text — cost if wrong: an extra tab stop per logo chip
- Task 10: Ruling: the green pulse is a pure, unit-tested celebrateBoost(t) multiplier on the green lens while store.celebrate is set — cost if wrong: none
- Task 10: Ruling: invalidFields() (schema → failing field names) is shared by the browser check and screenSubmission; the honeypot sits off-screen (not display:none) and startedAt is set as the input's defaultValue so React's form reset after a send keeps it — cost if wrong: none
- Task 10: Ruling: the mailer strips line breaks from the visitor's name before it goes into Subject/Reply-To (header injection), and passes replyTo as {name, address} — cost if wrong: none
- Task 10: Ruling: WorkSection's focus scroll now runs only for :focus-visible (keyboard) focus — a mouse click on a half-visible card moved the journey under an opening case (caught by case.spec); added work.spec "keyboard focus on a card clipped off the track brings it into view", watched it fail with the handler disabled — cost if wrong: none
- Task 10: Ruling: the case page's Suspense fallback is the dimmed backdrop (instant feedback on a card click), and case.spec waits up to 15 s for the dialog heading because dev compiles the case on first use — cost if wrong: none
- Final: Ruling: re-graded Minor 9 (damp(…, Infinity, 0) = NaN under reduced motion) to Important — a NaN camera/view offset would blank the scene for good for reduced-motion visitors — fixed in damp() itself
- Final: fixed I3 empty startedAt bypassed the fill-time guard / clock skew — contact.test "a post without a fill time … is spam" RED→GREEN; Ruling: screenSubmission now takes {trap, elapsed} (elapsed ms measured in the browser) instead of {company, startedAt} + now — cost if wrong: no-JS humans are screened as bots (the site needs JS anyway)
- Final: Ruling: perf median read 34.5 ms (limit 33.4) after the fix pass, but the pre-fix commit 1cfe578 now reads the same 34.6 ms while it read 27.9 ms at Task 11 → environmental GPU load, not code; re-measure on an idle machine at the gate — cost if wrong: a real ~6 ms regression slips to Plan 4's perf pass

### Deferred minors

- Final: minor (deferred): Close pushes a history entry; Back after Close reopens the case (plan's choice)
- Final: minor (deferred): case Close button scrolls away inside a long case on phones (no Esc there; Back works)
- Final: minor (deferred): client-side validation failure not announced in the status region nor focused
- Final: minor (deferred): logo chips are focusable <li tabIndex=0> with no role (27 tab stops)
- Final: minor (deferred): the HTML-over-sign test clicks the already-active sign, so its click half proves nothing
- Final: minor (deferred): no e2e opens a case or submits the form under ?webgl=0
- Final: minor (deferred): unknown case URL shows Next's unstyled default 404 (no not-found.tsx)
- Final: minor (deferred): the case-loading backdrop does not lock scroll
- Final: minor (deferred): a hovered sticker keeps its glow when HTML slides over it (no onPointerMove re-check) and masks chip highlights meanwhile
- Final: minor (deferred): rate key falls back to a shared 'local' bucket without XFF; CONTACT_RATE_LIMIT='' becomes 0; MAIL_TRANSPORT=json in production would swallow mail
- Final: minor (deferred): hreflang falls back to http://localhost:3000 without NEXT_PUBLIC_SITE_URL, not listed in .env.example
- Final: minor (deferred): copy — TUTI "not a single runtime dependency" contradicts its Next.js chip; stack.lead mentions the pole on the no-WebGL fallback
- Final: minor (deferred): the rate-limit message says "write in Telegram" without a link
- Final: minor (deferred): celebrate can stay true if the form unmounts within 2 s of a send
- Final: minor (deferred): the zod schema lives in src/server/ though a client component imports it; mailer.ts lacks import 'server-only'

## Plan 2b — TV wall and plates

Plan: `docs/superpowers/plans/2026-11-13-portfolio-plan-2b-tv-wall-and-plates.md`

### Rulings and notes

- Task 3: Ruling: the plan's Cyrillic check matched /U\+04/, but browsers normalise the range to 'U+400-45F' — matched /U\+0?400/ instead; the Cyrillic face was loaded all along — cost if wrong: none (a test regex).
- Task 5: Ruling: the TV models come through the existing scripts/fetch-assets.mjs + assets.manifest.json ('models' section) instead of a new scripts/fetch-tv-models.mjs — one CC0 pipeline, one manifest — cost if wrong: none (same output). Textures 512 px JPEG: both models ≈ 380 KB together.
- Task 5: Ruling: TvModelDef.screen gets a 'bulge' (m) next to 'z' — both CRT glasses bulge 1.6–2.2 cm in front of their edge, so a flat screen quad is either hidden by the glass or floats off the bezel; the screen quad is curved to follow it — cost if wrong: a flat quad would read as a sticker at oblique angles.
- Task 6: Ruling: the plan's first wall test read levels[3] right after levels[0] reached 1, but the wave reaches stop 3 ~0.6 s later — the test polls levels[3] — cost if wrong: none (a test timing).
- Task 6: Ruling: no manual dispose of the wall's materials/textures — R3F frees what meshes are given on unmount, and a cleanup-dispose also ran under StrictMode's trial unmount mid-compileAsync — cost if wrong: the two poster canvases leak on a Canvas remount (language switch), a few MB.
- Task 6: note: dev Chromium logs ~108 'GL_INVALID_VALUE: glGetProgramiv' warnings with or without the wall (pre-existing, from the main scene's compile); the wall's compileAsync adds one.
- Task 7: Ruling: the plan's 'a portrait screen comes closer' contradicts the geometry — a narrow frame has a narrow horizontal field, so filling 85% of its width needs MORE distance — the test now checks the fill share (0.55 wide, 0.85 portrait) — cost if wrong: none.
- Task 7: Ruling: WALL_OUT is [0.32, 0.36], not [0.32, 0.35] — the wall is ~9.6 m long and the way back must stay under 0.25 m per 0.0005 of story progress; it overlaps the first 0.015 of the turn to ABOUT (0.345–0.395) — cost if wrong: the pole starts turning while the camera is still flying in.
- Task 7: Ruling: interaction.spec 'hovering a sign…' moved from 0.2 to 0.165 (on the way to the wall, the WORK arrow still in frame) — at 0.2 the camera faces the wall — cost if wrong: none (the sign hover and click are still covered).
- Task 7: Ruling: added one point light (Lighting.tsx, name 'tv-wall-light', intensity 0 from the first frame) that TvWall moves to the current screen and tints with the poster's average colour — the sets far from the pole were black without it; created up front so the wall's arrival never changes the light count — cost if wrong: one more light in every lit material's shader (perf to watch in Task 10).
- Task 7: Ruling: screen quads are a flat-topped dome (1−n⁴) 4 mm proud of the measured glass, and tv2's picture area is 0.315×0.22 — the parabolic dome let the real glass show through the poster's middle — cost if wrong: none visible from the camera's straight-on poses.
- Task 8: Ruling: Review Focus 1's wall test lays its own data-ui block over stop 0's screen centre (as the sign test does) instead of clicking the caption's corner — only stop screens are clickable, and nothing guarantees a stop screen under the caption's corner — cost if wrong: none.
- Task 8: Ruling: frameShift('work') on wide screens is {x: 0.08·presence, y: 0}, not {0, 0} (Task 7) — with the real caption board in the lower-left the set's screen lost its lower-left corner behind it; 8% to the right clears it — cost if wrong: the set sits slightly right of centre.
- Task 9: Ruling: wallStreaks lives in src/scene/tvwall/layout.ts (tested in tvWall.test.ts), not street/layout.ts — the street layout would otherwise import the wall's; the drawing reuses street's streakPlacement and streakTexture — cost if wrong: none.
- Task 10: Ruling: TV bodies are PBR (normal + ARM maps) only on the high tier; medium/low use Lambert with the colour map — cost if wrong: flatter, less metallic sets on integrated GPUs.
- Task 10: Ruling: the pre-Plan-2b commit could not be re-measured in a separate worktree (Turbopack rejects a junctioned node_modules); the A/B was done in the main tree by unmounting the wall and its light — cost if wrong: none (the A/B isolates exactly the wall).
- Final: Ruling: "Private repo" on five projects (Gipper, gen-go, Speca.bike, Kolir, TUTI) stands — checked: TUTI's GitHub repo is private, Gipper's code is the company's — cost if wrong: none.
- Final: Ruling: visual choreography the reviewer left to the gate (25 svh dive from the pole to the wall, the wall appearing at the end of the reveal, caption vs set corner, landscape phone framing, wave ~1.8 s across 30 sets vs the spec's ~0.8 s) goes to Rustam at gate round 2 — the first visible sets light within ~0.4 s; the far end lights while the camera travels — cost if wrong: one constant (WAVE.step).
- Final: Ruling: no snap in the fly-in/out zones (0.15–0.18, 0.32–0.37) and no pager plate for the 10th stop stand (plan) — the "small part" stop is reached by scrolling or from stop 09 — cost if wrong: a 10th plate.
- Final: Ruling: the power-on flash stands — each set flares once for 0.12 s, small areas, reduced motion disables the wave — cost if wrong: WCAG 2.3.1 review of the flare.
- Final: Ruling: scrollbar drag / middle-click autoscroll not counted as visitor input for the snap stands (rare; the programmatic flag is false then anyway unless a site scroll was in flight) — cost if wrong: a drag right after a pager jump would not settle.
- Final: Ruling: pre-existing behaviours the reviewer set aside stand (hand cursor kept until the pointer moves after a scroll, language switch replaying the glide, stale #work-N in the address bar, subtle .well focus, English "NDA / + more" drawn in 3D) — cost if wrong: as before this range.
- Gate round 2 (Rustam): the sets must render out of the blueprint like the street — done (e2e 74/74, perf 27.9 / 27.7 ms). Ruling: the shared reveal shader skips its noise when uReveal ≥ 0.999 (uniform branch) — cost if wrong: none visible; a hair of seam glow at the very end of a part's reveal is dropped.

### Deferred minors

- Final: minor (deferred): a failed wall load leaves Work framing empty asphalt (no 'wall failed' state; one bad poster drops the whole wall; #work-N waits only for the main scene)
- Final: minor (deferred): the programmatic flag can stay set when a case opens mid-glide (mouse close then no snap until the next wheel)
- Final: minor (deferred): pager aria-label (project title) replaces the visible "01" (WCAG 2.5.3 label-in-name); spec said focus also scrolls, plan narrowed it to click
- Final: minor (deferred): the caption's aria-live announces every stop passed during a header glide across Work
- Final: minor (deferred): materials/canvases are not disposed on a runtime tier step-down (~31 MB once; R3F does not dispose objects passed via props/args — the Task 6 ruling's premise was wrong)
- Final: minor (deferred): the streaks' instanceColor is created in useFrame, likely after compileAsync (possible compile hitch on first entry into Work)
- Final: minor (deferred): uAge gets Infinity under reduced motion for the project screens (fillers clamp to 99)
- Final: minor (deferred): poster fallback '/projects/devdigest.webp' would show DevDigest on another project's TV (all posters exist today)
- Final: minor (deferred): the snap also runs on the no-WebGL card strip, nudging it to offsets not aligned with the cards
- Final: minor (deferred): .plate focus ring is box-shadow only — invisible in forced-colors mode
- Final: minor (deferred): tests — Focus 4 reads progress right after the URL changes; no reduced-motion wall e2e; Focus 3 covers models only (not a poster) and no console-error assertion; perf-work report file name

## Plan 2c — neon street

Plan: `docs/superpowers/plans/2026-11-14-portfolio-plan-2c-neon-street.md`

### Rulings and notes

- Task 1: Ruling: holdWindow/HoldId live in choreography.ts and journey.ts re-exports them — journey imports WORK_STOPS from workStops and workStops needs holdWindow, so defining it in journey made an import cycle (TDZ risk on load order) — cost if wrong: none, the plan's import path still works.
- Task 1: Ruling: scroll.spec "scrollToProgress lands on the section centre" kept on 0.48 — it tests scrollToProgress(0.48), not where a link lands — cost if wrong: none.
- Task 2: Ruling: NeonText wraps its letters in one inline <span> — .neon is a flex box, so a bare dead-letter span became its own flex item and the accessible name read "Rus t am Aslanov" / "Stac k" — cost if wrong: none.
- Task 2: Ruling: the top fade arrives with the street (opacity 0→1 over progress 0.075–0.15), so the blueprint keeps a clean top — the spec leaves the blueprint top open — cost if wrong: Rustam may want it from the first screen (one line).
- Task 2: Ruling: e2e flicker checks count CSSAnimation only (transitions excluded) — the tube's 0.2 s text-shadow/underline transitions are not flicker — cost if wrong: none.
- Task 3: Ruling: .flow-piece is display: flow-root — the column's negative bottom margin collapsed through the section and pulled the next piece up unmeasured (About/Stack lengths +12svh, Contact −24svh); pinned by "the measured pieces add up to the scroll track" (RED 96 px → GREEN) — cost if wrong: none.
- Task 3: Ruling: Contact's min-height is 130svh, not the plan's 150svh — at 1440×900 the 150svh floor lifted the last box to 73 % of the screen; the end test now runs at 800 and 900 px tall and wants > 85 % — cost if wrong: a very short Contact text gives the camera's final climb less scroll.
- Task 3: Ruling: the phone header places name/languages/nav with explicit grid cells — a row-locked item is placed before auto-placed ones, so the languages took the left cell; the phone test now also checks name is left of the languages — cost if wrong: none.
- Task 3: Ruling: work.spec's screenAt waits until the TV's projected position stops moving, and the sign-hover test re-aims until it hovers — with two GPU-bound workers the camera was still easing after the fixed 1.5 s wait; perf is unchanged (journey 27.9 ms, Work stop 27.8 ms) — cost if wrong: none.
- Task 3: Ruling: the "wheel over a long panel" test became "the wheel over a section's text carries on along the street" (aims at the first About box) — there is no panel left to trap the wheel — cost if wrong: none.
- Task 4: Ruling: an item without a sticker looks its logo up by its label (Cursor → siCursor); none → a dot (Zustand, Fabric.js, Skia, ChatGPT) — the plan said getIcon(sticker ?? slug) but items carry no slug field — cost if wrong: none.
- Task 4: note (env): a Python write to globals.css did not wake Turbopack's watcher — the served CSS stayed stale until `touch src/app/globals.css`; touch after scripted CSS edits from now on.
- Task 5: Ruling: the keyboard-focus test checks the link is a .neon tube and its ::after underline at opacity 1 with transitions switched off — the plan's "outline/box-shadow not none" does not apply to tubes (their focus is the lit underline), and the old plate also had an ::after at 1, so without the class check the test passed before the change — cost if wrong: none.
- Task 6: Ruling: accentFor lives in src/experience/next.ts as planned and imports NEON from src/ui/neon.ts (experience → ui, type-free data only) — keeps one colour table — cost if wrong: none.
- Task 6: note: the dev server log shows hydration-mismatch warnings forwarded from Rustam's own Chrome with attributes bis_skin_checked / cz-shortcut-listen (ColorZilla) injected by his extensions — that is the "3 Issues" badge he sees; a clean browser has 0 issues.
- Task 6: note (env): right after a dev-server restart the first e2e run can meet a cold /ru compile (> 5 s) or a not-yet-rebuilt CSS chunk; reruns on the warm server pass.
- Task 7: Ruling: on phones the pager digits are 2.05rem (≈33 px) wide × 44 px tall, not 44×44 — nine 44 px digits do not fit a 390 px caption and "09" wrapped to a second row; the spec's 44×44 floor names the header tubes and the Next button only, 33 px still clears WCAG 2.5.8 (24 px) — pinned by "the Work pager keeps its nine numbers on one row, down to a 390 px phone" (RED 2 rows → GREEN) — cost if wrong: a slightly smaller tap target on the pager.
- Task 7: Ruling: SectionPanel keeps only the Work layouts (caption, bottom) and drops the inner scroll and its fade mask — About/Stack/Contact moved to SectionFlow in Task 3 — cost if wrong: none.
- Task 8: Ruling: the store gains takeCaseOrigin() and requestCase(null) clears only the request — WorkWall clears pendingCase the moment it routes, which with the plan's "sets both" would have wiped the TV's rect before the case mounted — cost if wrong: none.
- Task 8: Ruling: the switch-on's white line is the card itself clipped to a 1 % band at brightness ×5 (no extra line element) — the same look with one animated element — cost if wrong: none.
- Task 8: Ruling: e2e waits up to 6 s for data-crt="open" — the open lasts ~1.0 s (pinned by crt.test constants and measured 1.1–1.8 s on direct links), but a busy GPU delays the animation's first frame — cost if wrong: none.
- Task 8: note (env): Turbopack sometimes ignores a scripted globals.css write even after `touch`; a dev-server restart picks it up (verified: Tailwind's own compile of the file had the rules).
- Task 9: Ruling: both sets take the 2k colour map (2048 px, ~230 KB each as JPEG q82) with 1k normal and ARM maps — 3D assets total 3.95 MB of the 6 MB budget, so tv2 did not need the 1k fallback — cost if wrong: none.
- Task 9: Ruling: the bodies' colour map gets the renderer's max anisotropy on high and ≤ 4 elsewhere — the sets are seen at a slant down the wall; perf after: journey 28.1 ms, Work stop 27.8 ms (budget 33.4) — cost if wrong: a little sampling cost on low tiers.
- Task 10: Ruling: the box glass blurs (backdrop-filter 5px) on every tier but low — measured on the Intel UHD (medium tier) without/with blur: journey 27.9/27.8 ms, Work stop 27.7/27.8 ms, reading About 28.0/28.1 ms (budget 33.4); phones (low tier) keep plain glass because they were not measured — pinned by "the boxes blur the street behind them on a laptop" (RED none → GREEN) and "a phone (low tier) keeps the boxes unblurred" — cost if wrong: phones look a touch flatter.
- Task 10: note: one perf run read 34.6 ms on the journey with the blur off and 27.8 ms with it on, then 27.9 off on the rerun — the GPU was shared (Rustam's own tab on :3200); the median across runs is the number.
- Final: note (env): Turbopack's persistent dev cache (.next/dev, 560 MB) served a stale stylesheet across restarts (it still had the deleted plates); deleting .next/dev fixed it. All e2e results after Task 10's cleanup were re-run on the fresh cache.
- Final: Ruling: Contact's scroll stays content-driven: 37 svh on a 1440×900 laptop (331 px), 70 svh on a phone, against the spec's "no shorter than now" (175 svh) — with the last box resting low at the end and the first box on screen when Contact is opened, a short Contact text leaves no room; lengthening it means either the form standing still while the camera finishes its climb to the green light, or the boxes arriving later — a design call for Rustam at round 3 — cost if wrong: the final climb to the green light is quick on laptops (≈3 wheel notches).
- Final: Ruling: reviewer's "declined to judge" — the 18 % dead letter is the approved design; no focus trap in the case and the header staying tabbable, the glide from the blueprint after a language switch, and Stack's li tabIndex without a role are pre-existing; extension hydration warnings are environment; the gate text and flicker taste are Rustam's — none becomes a finding — cost if wrong: none.

### Deferred minors

- Final: minor (deferred): JourneyTrack subtracts innerHeight while ScrollTrigger uses 100vh — on a phone with the address bar showing the story runs up to ~100 px ahead near Contact.
- Final: minor (deferred): remeasure sets lengths then calls refresh(), which ScrollTrigger defers while scrolling; a dragged resize refreshes every frame (coalesce with rAF; let refreshInit measure).
- Final: minor (deferred): growth inside Contact (validation errors, "copied", dragging the textarea larger) re-measures and restores story progress, so at the end of the page the form shifts up by the growth.
- Final: minor (deferred): NextButton.place() reads layout on every store change; run it only while the hero or Work caption is showing and cache the value.
- Final: minor (deferred): on a laptop the next section's first box peeks at 92 % of the screen as the turn starts (entry 42 svh + 50 svh turn); spec §6.1 says no text during the turn.
- Final: minor (deferred): the phone blade test cannot fail (max-width 100% + nowrap): compare scrollWidth to clientWidth; the plan's font step-down was not built (current copy fits).
- Final: minor (deferred): the dark Send label is ~2.5:1 against its background on an enabled button; tie the hint with aria-describedby.
- Final: minor (deferred): .progress-tube is 100svh tall and stops short once the phone's address bar collapses (use bottom: 0).
- Final: minor (deferred): phones also load the 2k TV colour maps (~+40 MB GPU with mipmaps on low tier); the spec allowed resolution by tier.
- Final: minor (deferred): Stack's blur (seven blurred layers) was not measured; About and the Work stop were.
- Final: minor (deferred): Rect's doc says "page px" but the values are viewport (client) px.
- Final: minor (deferred): pole "End key…" and scene "camera follows the choreography" read the damped pole/camera after a fixed wait — poll until settled to stop them flaking on a busy GPU.

## Plan 2d — round 3 header and follow-ups

Plan: `docs/superpowers/plans/2026-11-14-portfolio-plan-2d-round3-header.md`

### Rulings and notes

- Task 1: Ruling: word and letter spans are inline, not inline-block as in the mockup — inline-block split the accessible name into "Rus t am"; opacity animates inline spans just the same — cost if wrong: none.
- Task 2: Ruling: the menu pushes a history entry so the phone's Back closes it; the cross and Esc step back over it, but a choice only rewrites it (replaceState) — a popstate in the middle of the glide to the chosen section could let the router restore the old scroll — cost if wrong: after a choice, one Back press is spent on the empty entry.
- Task 2: Ruling: the menu is portalled to <body> at z-50 — inside the header (z-30) the Next button, a later sibling at z-30, painted over it — cost if wrong: none.
- Task 2: Ruling: the language tube's accessible name is "EN, Language" (visible text first) — "Language: EN" would hide the visible label at the end — cost if wrong: none.
- Final: Ruling: the menu no longer adds a browser-history entry (so Back no longer closes it, which spec §9 said; the spec now says why) — Back was my own addition, its pushState left a dead entry per choice, and its history.back() over a case page made Next restore the tree and leave the case stuck "opening" deaf to Esc (reproduced) — "choices leave no dead history behind, and focus goes back to the menu button" GREEN — cost if wrong: a phone's Back leaves the page while the menu is open.
- Final: Ruling: the reviewer's "declined to judge" (menu open after the CV download, blur on low phones, five staggered ignitions, Fast Refresh with a hook next to a component, edge cases of the removed history entry) — none becomes a finding — cost if wrong: none.
- Follow-up (Rustam, after round 3): the language sign swings back up before it goes (data-state="closing", 0.32 s; reduced motion: at once) — pinned on laptop and phone (RED → GREEN).
- Follow-up: the laptop header hides the languages in the same picker; LanguageSwitch (the row) is gone, its hook moved to src/ui/useLanguageLinks.ts; e2e switch languages through a helper (switchLanguage).
- Follow-up: About boxes and Stack blades swing in on entering the screen (IntersectionObserver → data-swing in/out; rotate/scale properties so a blade keeps its sway; nothing hidden without scripts or with reduced motion) — "…swing in as they reach the screen" RED → GREEN; "reduced motion: section boxes are simply there" guard.
- Follow-up Ruling: Contact boxes do not swing — Rustam named About and Stack — cost if wrong: one selector.
- Follow-up: Rustam's call on Contact's length — keep it; any contact link, Copy email, Download CV (in the Contact section) or a sent message glides the page to the end (the camera climbs to the green light) — "a contact link or the CV takes the street up to the green light" RED (0.825) → GREEN; the send test also checks it.
- Follow-up: fixed (found by that test) a site-made glide stopped short when the page had just grown: Lenis clamped to its old limit — scrollToProgress calls lenis.resize() first (RED 0.9836 → GREEN 0.998); a refresh during a site-made glide now carries it on to its target; JourneyTrack's ResizeObserver only asks ScrollTrigger to refresh and the lengths are measured on refreshInit (they no longer run ahead of a refresh ScrollTrigger defers while scrolling — the review's deferred minor 2).
- Follow-up Ruling: the header CV and the menu's CV do not glide to the green light — Rustam spoke of the Contact form's links — cost if wrong: one onClick each.
- Follow-up: fixed (test) "switching language on a case keeps the case" failed 2 of 3 after the picker change — root cause traced, not the picker: the street's first frames (R3F loop compiling shaders, then React work, then a second long frame) hold the dev page's main thread ~7 s (long tasks 3.4 s + 1.1 s + 1.9 s); the server answered the RSC in 140 ms but the page took it only after the hold; the picker's swing-in moved the test's click (~1 s later than the old direct link) into that hold. The test now waits for the scene (gotoScene + waitReady) like the other switch tests, as does the header-nav switch test in sections.spec — 8/8 on repeat.
- Follow-up: note (perf, for Plan 4): on this machine in dev the first street frames block input for ~7 s; check the production build's first-load long tasks (shader warm-up/compileAsync) in the polish plan.
- Follow-up: fixed (test) "switching language keeps the visitor at the same section" failed once in a full run (0.29 instead of About's 0.395); alone 6/6. Evidence: its wait (scrollY > 2000) can return mid-glide (seen: progress 0.239 at that moment), and a visitor's wheel during a site-made glide may take over by design; the test now waits for the landing (progress ≈ About's hold start) before its wheel. Not reproduced under 4 parallel workers (the machine saturates: 41 min, unrelated timeouts), so the mid-glide stop at 0.29 is inferred, not watched.
- Follow-up: fixed (test, caused by the swing-in) "hovering a stack chip lights its sticker on the pole" got "sass" for "react" once: traced — after scrollTo's 600 ms the React blade can still be swinging in (observer notified late on slow frames; seen: swing 1188→1729 ms, hover done at 1209 ms), so the chip moves away from a still pointer. Both sticker hover tests (sections, stack) now wait for the blade to rest (helper swungIn) — 10/10 on repeat.

### Deferred minors

- Final: minor (deferred): the picker announces aria-haspopup="true" (a menu) for a plain list of links, and does not close on focusout (Tab to the burger leaves it open).
- Final: minor (deferred): the dialog, the burger and (before) the nav inside shared the name "Menu" — the inner nav is gone; dialog and burger still share it.
- Final: minor (deferred): the landscape e2e covers only the menu, not the picker.
