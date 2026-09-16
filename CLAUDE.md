# Fill the Word — project context

Mobile app concept. A Bible verse appears with words missing; the player puts the words back. Two ways in: a daily challenge on a fixed verse that rotates once a day, and a memorization ladder that takes a passage from a few blanks to the whole thing from memory. On Home, the daily challenge card comes first, Memorize second — that's a deliberate order (daily challenge fits the "one thing to do today" habit loop), not an accident of how they were added.

## Repo layout

```
src/Fill the Word.dc.html   the one source of truth — markup + logic class
src/support.js              vendored Design Component runtime — DO NOT EDIT
build/                      three Python builds + the vendored asset bundle + PWA icon generator
dist/                       generated, gitignored — never edit, never commit
tests/                      Playwright suites, plain Node, no framework
docs/BUILD.md               how the builds work and why
docs/PROTOTYPE.md           the live artifact, its limits, what has been verified
```

## Working on this

```bash
npm test               # build the artifact and run every suite — do this before claiming done
npm run build          # all three outputs (artifact, standalone, pwa)
npm run test:all       # also exercise the offline bundle
```

`src/Fill the Word.dc.html` is a **Design Component**: HTML with `{{ }}` bindings, `sc-if`
and `sc-for`, plus a `class Component extends DCLogic` at the bottom whose `renderVals()`
returns every binding the markup names. Two rules follow from that:

- **Every `{{ binding }}` in the markup must exist in `renderVals()`.** A missing one fails
  silently — the element just renders blank. Check both ends when adding UI.
- **Inline styles only**, with theme values from CSS custom properties on the phone root
  (`--ink`, `--card`, `--orange`) that flip on `data-theme="dark"`. The single exception is
  the mobile media query in the helmet `<style>` block, which needs `!important` to beat
  the inline styles.

`support.js` is vendored and matched byte-for-byte against the runtime inside
`build/vendor/dc-bundle-shell.html`; the builds warn if they diverge. Don't edit it.

Never hand-edit anything in `dist/`. It is regenerated from source every build.

## Decisions already made — don't relitigate these

- **Scope:** traditional 66 books only. No apocrypha.
- **Translations: KJV, BSB (Berean Standard Bible) and WEB (World English Bible) — all three fully wired, all free.** The earlier planned set (NKJV, NIV, NLT) is dropped: all three are copyrighted and require a paid commercial license from their publishers to embed full text offline, which conflicts with this app's single-file/zero-network-calls build — don't reintroduce them as "future feature" placeholders without an actual license. `corpus` is keyed by translation (`corpus.KJV`, `corpus.BSB`, `corpus.WEB`), read through `activeCorpus()` (falls back to KJV) rather than a flat object — `chapterVerses`/`bookChapters`/`bookVerseCount`/`verseText` all go through it. Adding another translation means finding a complete, verified, public-domain (or actually licensed) dataset with matching versification — not scraping a site like BibleGateway, which prohibits automated access in its Terms of Service regardless of whether the underlying text is public domain.
  - **BSB** — public domain (Bible Hub/Berean Bible), sourced from [scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases). Folds Psalm superscriptions ("A Psalm of David.", sometimes with musical/historical notes) into verse 1's text, unlike KJV which omits them entirely — hand-fixed for the ~16 most commonly memorized psalms only (8, 19, 22, 23, 24, 27, 34, 46, 51, 90, 100, 103, 121, 130, 139, 145; see the comment above `corpus` in source) so e.g. Psalm 23:1 reads "The LORD is my shepherd..." not "A Psalm of David. The LORD is my shepherd...". Everywhere else in Psalms the title stays part of verse 1, faithful to the source — don't regex-strip the rest without checking each one individually, titles vary too much in shape for one pattern to catch safely.
  - **WEB** — public domain (commissioned explicitly to be so), sourced from [seven1m/open-bibles](https://github.com/seven1m/open-bibles)' `eng-web.usfx.xml` (USFX format, parsed for `<c>`/`<v>` markers; footnotes `<f>`/cross-refs `<x>` stripped, `<add>` unwrapped keeping its text). WEB keeps Psalm titles in a separate `<d>` (descriptive title) tag ahead of verse 1, so it never had BSB's superscription problem.
  - **Both BSB and WEB have a handful of verses the source translations render as empty strings** — spots where modern critical-text scholarship considers the traditional verse absent from the earliest manuscripts (Mark 16 long-ending-adjacent verses, Acts 8:37, the Romans 16:25 doxology which WEB instead places at Romans 14:24-26). These were removed from the corpus entirely rather than shipped as blank, unplayable "verses" — so BSB (16 verses removed) and WEB (5 removed) each have a few chapters with fewer verses than KJV's 31,102-verse total in these specific, well-documented spots. This is a real, sourced difference between manuscript traditions, not a bug — don't "fix" it by inventing text, and don't be surprised if `chapterVerses()` returns a different count per translation for e.g. Romans 14/16 or Mark 16.
- **Tone:** playful and game-like, not devotional-solemn.
- **Interaction: tap a word to fill the highlighted blank, or drag it to place it anywhere.** The first open blank, in reading order, is highlighted (`activeBlankId()`) — a plain tap on any bank tile is an immediate attempt against that blank, no second tap needed. Dragging a tile and dropping it on a *different* blank targets that one instead, open or not. This is deliberately built for speed once a player knows the verse: tap straight down the bank in order for a fast clear, drag only when you want to place out of order. There is no "Tap only" vs. "Tap + drag" setting — both always work. Don't reintroduce a select-then-tap-the-blank step; that's the two-tap flow this replaced.
- **Two modes, one game:** the daily challenge (a fixed verse, same for every player, that rotates once a day) and memorize (a chosen passage taken up the ladder). They share the board, the word bank and the difficulty scale.
- **The daily challenge's verse is not chosen by the player.** It's picked deterministically from a curated pool of ~77 well-known passages (see `dailyPool`/`dailyRef` in the logic class), seeded by the calendar date so every player sees the same verse on the same day — no picker, no shuffle, nothing random per device. Memorize is the opposite: **the user chooses the verse there** — book, then chapter, then a verse. Translation and default difficulty live in Settings.
- **Picking a verse range is two-tap-or-drag.** This reverses an earlier decision in this same doc history ("don't bring back the old tap-a-second-verse-to-extend model") — it came back because a 176-verse chapter made single-verse-only tapping impractical for anything but a drag, and drag itself got harder to trust once the verse grid became scrollable (see below). Current model, in `onUp`: a tap with no movement sets the start if there's no selection yet; a second tap on a different verse closes the range; tapping again once a range exists starts over from that new verse. Dragging still works exactly as before — press-drag-release from the first verse to the last, or grab an existing range's start/end to move just that edge (`pickVerseDown`/`onMove`). "Whole chapter" (renamed from "Select whole chapter") is still a one-tap shortcut, and a "Clear" button (`clearPickRange`) now appears once there's a selection. A `pickHint` line ("Now tap the last verse" / "Tap a verse to start over") narrates which half of the two-tap gesture you're in.
- **The verse-range grid scrolls on its own; a long chapter can't push "Start memorizing" off-screen.** Before this, the whole Step 3 column was one unbroken flex stack — a 176-verse chapter (Psalm 119) made the grid tall enough to shove the preview card and the Start button past the bottom of the phone, with no way to scroll down to them (the outer screens are `overflow:hidden`). Now the grid is its own `overflow-y:auto` region with `overscroll-behavior:contain` (so panning it doesn't bleed into the page), sized `flex:0 1 auto;min-height:104px` with a `flex:1 1 0` spacer after it — the grid takes only the space it needs (or scrolls once it doesn't fit), and the spacer pushes the preview card + Start button to the bottom the rest of the time. Because the grid now scrolls, a vertical swipe over it needed a way to mean "scroll" instead of "extend my drag-selected range": `onMove` bails out of a pending range-drag the first time it sees mostly-vertical movement before any real movement was recorded, letting the browser take over the scroll. A `pointercancel` listener (`_cancel`, alongside the existing `pointermove`/`pointerup` ones) resets `_rangeAnchor` too, so a gesture the browser interrupts to take over scrolling can't leave the picker stuck mid-drag.
- **One difficulty scale, four levels, both modes:** **Easy** (25% of the verse blanked), **Medium** (50%), **Hard** (75%), **By Heart** (100%). The level sets HOW MANY words are blanked. Percentages are internal — the UI says the names.
- **Difficulty is chosen, per round — it has nothing to do with points.** Easy→By Heart is picked directly; the old "skill tier" picker is gone, don't reintroduce a second difficulty vocabulary.
- **Points are spendable, not a one-way rank ladder.** The old Novice→Scholar XP-rank system is gone entirely — no cosmetic replacement, no rank name shown anywhere. `state.points` is earned in `finish()`: win = `(isMem?8:10) + level*15 + round(speed/10) - hintsUsed*3`, floored at 3; loss = flat 3. Scales with difficulty on purpose — Andrew asked for harder levels to be worth meaningfully more, not just a flat per-round amount — while By Heart's max still stays comfortably under `HINT_COST` so a single round never outright buys a spend. Two things to spend it on, each with its own named cost constant on the class (`REVIVE_COST=160`, `HINT_COST=80`, `STREAK_RESTORE_COST=400`) — if this ever needs re-tuning again, change both sides of the ratio together (the earn formula above and these constants), not just one:
  - **Extra heart** — when hearts hit 0 mid-round, a prompt offers to keep going (`reviveOffer` state) instead of ending the round immediately; the button itself is labeled `"Buy heart for " + REVIVE_COST + " points?"` (`reviveBtnLabel`) so the cost is never hidden behind a vague "Continue". The offer only ever appears when affordable (`canRevive` gates it before `reviveOffer` is set) — if you can't afford it, hearts hitting 0 goes straight to the loss flow instead of showing an unusable prompt. Declining runs the original reveal-answers-and-lose flow. **The prompt renders as a centered modal**, not a bottom-anchored card — a full-screen `position:absolute;inset:0` scrim (`rgba(0,0,0,.5)`) flex-centers the card, so it reads as an unmissable interrupt rather than something easy to miss at the bottom of the screen. Andrew asked for this after the original bottom placement wasn't obvious enough. **Its two buttons stack vertically, primary ("Buy heart...") on top, secondary ("End round") below** — not side by side; Andrew's call, matching a more standard mobile-modal button order.
  - **Extra hint** — once the free cap (`FREE_HINTS=3`) is used up, tapping Hint again spends `HINT_COST` points and reveals only the first letter of the next open blank (`p.word[0] + "···"`, same as a free hint — buying never reveals more). The hint button's own label always shows what tapping it will cost next (`"N left"` → `"Buy hint for 80 points?"` once affordable-or-not) — the label no longer collapses back to a plain "0 left" when unaffordable, since that looked identical to nothing having changed; only the button's enabled state reflects affordability now. **It also disables once every blank in the round is already hinted or filled** (`anyHintable` check in `renderVals`, mirroring the `open` lookup `useHint()` itself uses) — before this, a short verse could leave the button showing "Buy hint for 80 points?" and clickable with nothing left for it to actually do. The icon next to the label is a lightbulb outline, not the bordered circle it used to be — Andrew read the circle as looking like a coin and didn't want any hint of "pay to win" iconography.
  - **Streak restore** — a streak that resets (2+ days missed) isn't blocked mid-round; `finish()` commits the reset exactly as before but also flags `streakBroken`/`streakBrokenFrom`, and a dismissible banner on Home offers to buy it back afterward. This is deliberately *after the fact*, not a control-flow interrupt inside `finish()` — memorize mode never lands on a Results screen, so Home is the one place both modes reliably pass through.
  - **There is no pre-purchase Shop anymore.** A stockpiled-token system (`reviveTokens`/`hintTokens`, a `"shop"` tab between Library and Settings, back when Library was still its own tab) existed briefly and was removed — Andrew's call: pre-buying let points "disappear" into a token without a guaranteed use, versus spending them contextually only when a revive/hint/restore is actually needed. All three spends now go straight through the points balance, no intermediate stockpile.
  - Every spend increments `state.pointsSpent`, a lifetime total kept for potential future use (it fed a "Big Spender" badge that Andrew has since dropped from the badge roadmap — see the Badges section — but the counter itself is cheap to keep and does no harm sitting unused).
  - **A dev-only "+1000 pts" button lives in the hidden dev-nav bar** (`.fw-chips`, next to the theme toggle — see `devAddPoints`), for troubleshooting spend flows without grinding out real rounds. It is not reachable outside the long-press dev nav.
- **Friends is the app's first real backend — everything else is still `localStorage`-only.** Two people connect and see each other's **verses memorized** (`Object.keys(state.mastered).length`, the same lifetime mastery map badges/Library already read — this is the first thing to also show it as its own labeled number) and **accuracy** (the existing `Math.round(correct/attempts*100)` formula, unchanged). Backend is **Supabase** (Postgres + Row Level Security) — a standing decision from before this feature existed (relational fit for "I see my own stats and my connected friends', nothing else"), not something picked for this feature specifically. Schema lives in `supabase/schema.sql`: a `profiles` table (id, display_name, friend_code, verses_memorized, accuracy) and a `friendships` table, both RLS-scoped so a plain `select * from profiles` from the client already comes back as just "me + my friends" with no explicit filtering in application code; redeeming a code goes through a `redeem_friend_code` Postgres function specifically so a client never needs broad read access to other users' rows just to look one up by code.
  - **Sign-in is email magic-link, no password** (`signInWithOtp`) — chosen to match how low-friction the rest of the app is. A brand-new signer has no `profiles` row yet (`friendNeedsName` gates a one-time "pick a name" step that also generates their `friend_code` client-side — a 6-character code, ambiguous characters like 0/O and 1/I excluded on purpose, since a code only exists to be read off a screen and typed back in by someone else).
  - **Connecting is a shareable code, not a search.** Your code is always visible once signed in; sharing it reuses the exact `doShare` pattern (`navigator.share` with a clipboard-copy fallback) with different text, not a separate mechanism. Entering someone else's code calls the `redeem_friend_code` RPC.
  - **Sync is on-demand only, not real-time — a deliberate call, not a limitation.** Opening the Friends section pushes your current verses-memorized/accuracy up, then reads friends' profiles back (`syncFriends`). No sync on every round finish, no polling. This is the one place in the whole app that makes a network call by design; everywhere else remains exactly as offline-first as before.
  - **The Supabase JS client is lazy-loaded from a CDN at runtime, not vendored into the build like React/the runtime are.** Every build target inlines React specifically so the app makes zero network calls once loaded — that's for the *whole app*, not this one section, and bundling a database client into an already-large single file for every visitor who never touches Friends doesn't fit. `_loadSupabase()` injects `<script src="{{ SUPABASE_JS_CDN }}">` and is safe to call more than once; `componentDidMount` calls it eagerly in three cases, otherwise it waits for "Get started": a magic-link callback (`location.hash`/`location.search` containing `access_token`/`code=`), **and a returning signed-in player** — checked by looking for Supabase's own session cache key (`sb-<project-ref>-auth-token`, project-ref parsed out of `SUPABASE_URL`) already sitting in `localStorage` from a past sign-in, wrapped in try/catch same as every other storage read in this file. Without that second check, a signed-in player saw the signed-out "Get started" prompt on every fresh load until they tapped into Friends and the client finally got a chance to check — Andrew hit this directly after signing in once and seeing "Get started" persist across visits. `SUPABASE_URL`/`SUPABASE_ANON_KEY` are real class-field constants (not a build-time secret — the key is meant to be public, RLS is what actually enforces access) pointing at Andrew's Supabase project; if they're ever blanked out, `_loadSupabase()` fails fast with a clear message instead of trying to reach an empty URL.
  - **Scope is deliberately narrow for this first pass**: a flat connected-friends list, no removing a friend, no ranking, no real-time, no notifications. The old five-hardcoded-names "Friends this week" list is gone entirely, replaced by real sign-in/connect/list states — originally embedded at the bottom of Progress, now its own top-level tab (see the tab-bar bullet above).
- **Difficulty is changeable on the game screen in both modes** — a four-way segmented control. Changing it mid-round rebuilds the round; in memorize mode it moves you along the ladder. The verse picker button only appears in memorize mode now; the daily challenge shows its (fixed) reference as plain text.
- **Casual and memorize share everything but progression and verse choice.** Same board, same bank, same four levels. The daily challenge is one fixed verse with its own step-up/repeat ladder (see below); memorize is a chosen passage with the ladder plus the after-level choice.
- **The app tracks the highest level cleared per verse, for both modes.** Memorize already had this (`mem.cleared`); the daily challenge now has the same thing (`state.casualCleared`, keyed by "Book Chapter:Verse"), persisted, and surfaced on Home as "Best: `<level>` cleared" (or "Not started yet" / "Mastered — By Heart cleared"). Because the daily pool repeats over time, this is real per-verse history, not just "today's" state.
- **Clearing a level in the daily challenge offers one button, "Play again," plus the Results screen's own Easy/Medium/Hard/By Heart selector.** There's no "next verse" option — it's one fixed verse a day. This mirrors memorize's level-complete popup exactly (same selector pattern, same reasoning): the selector stages the level (`setCasualOverlayLevel`, no navigation, stays on Results), "Play again" (`startGame`) commits it. It used to be two hardcoded buttons ("Step up to X" / "Repeat X", or just "Run it again" at the top level) — that combinatorial branching is gone now that a generic selector covers every level, including the one you're already on.
- **Finishing a daily-challenge round goes straight to the Results screen — there is no separate "level cleared" popup for this mode anymore.** `finish()` sets `screen:"results"` directly instead of leaving you on the game screen under a modal; the Results screen itself now carries the "Play again" button and the selector alongside the stats, review text and badge banner (`isCasualGame` branch of the results-screen markup, sharing the `ovButtons` array the popup used to use, plus its own `resLevelChips`). `setLevel()` had to change to match — it now always rebuilds the round and forces `screen:"game"`, rather than only rebuilding when already on the game screen, since these buttons are clicked from the Results screen and need to jump back into play. **Memorize is untouched:** moving between verses within a passage still uses the on-game-screen popup (it's a faster, more frequent action there, and doesn't want a stats screen in between every verse) — only the final "Passage complete" state was already a dedicated screen, same as before.
- **Neither Results screen shows the plain rounded-square icon anymore.** `resIconStyle` is still computed (it sets the icon's color by win/loss) but the markup that renders it is now gated `sc-if value="{{ isMemGame }}"` — so it shows only for memorize's Passage-complete screen, and not at all for the daily challenge's Results screen. Applied after the same icon was removed from the memorize level-complete popup for the same reason: a plain colored box with no glyph in it wasn't adding anything.
- **Clearing a level in memorize offers two buttons, always: Next Verse (primary) and Repeat verse (secondary), plus the overlay's own Easy/Medium/Hard/By Heart selector right below them.** This replaced an earlier 3-4-button version (Step up to X / Verse N at X / Verse N from X / Finish passage) that spelled out every combination as its own button. Now the selector just stages the level for whichever action you tap next — `setMemOverlayLevel(level)` updates `mem.level` and rebuilds the round behind the still-open overlay, without touching `complete` (that's the whole reason it's a separate method from `setMemLevel`, which resets `complete` and would dismiss the overlay). "Step up on this verse" is now: tap the next level chip, then Repeat verse. "Move on carrying the level" is: leave the selector, tap Next Verse. `nextVerseSameLevel` (the button's handler) also finishes the passage when it's the last verse, so one label covers both "next verse" and "done."
- **Both routes through a passage are still first-class, but breadth-first now has exactly one dedicated affordance, not its own button set.** Depth-first falls out of the 2-button+selector design directly (see above). Breadth-first's one move that design can't express — jump back to verse 1 at a higher level once the whole passage is cleared at the current one — gets a single small link, "Whole passage at `<next level>`", shown only on the last verse when a level above the current one exists (`showSweepLink`/`sweepLabel`/`sweepGo`, still `passageAtNextLevel` underneath). Don't remove this link to simplify further — it's there specifically because the 2-button design has no other way to express it, and it's what the `memorize / breadth-first sweep` test suite exercises.
- **The memorize level-complete popup has a direct way out to Home: an X in its top-right corner, and a "Done for now" link at the bottom, both calling the same `goHome`.** Before this the popup was a dead end for leaving — the only way out was "See the numbers" into the Results screen, then Done from there. The X sits `position:absolute` in the (now `position:relative`) card, mirroring the Game screen's own top-left X exactly (same handler, same "just go home, everything in flight is saved" behavior). The Results screen didn't need this — it already had a Done button in its own action row.
- **Distractors taper.** Four extra words at Easy, none at By Heart — the crutch goes away as the verse goes in. Distractors are pulled from the rest of the chapter so they read as scripture, not noise.
- **The word bank renders at most `BANK_WINDOW` (8) tiles at once, not the whole pool.** A long verse at Hard/By Heart can have 25-30+ tiles with zero distractors, and showing them all was pushing the verse itself off-screen on a short phone. `visibleBankTiles(g)` caps the render list to the first 8 of `g.bank`, but always guarantees the tile matching the *active* blank's word is among them — swapping it in for the last slot if the natural first-8 slice would've buried it — so tap-to-fill (which always targets the active blank) can never get stuck. Using a visible tile shrinks the underlying pool, which naturally reveals the next tile in the same slot on the next render — no separate "reveal" logic needed. The one real tradeoff: a tile further back in the pool isn't drag-able out of order until it cycles into view; only the active blank's tile is ever guaranteed visible.
- **The bank pool reshuffles on every correct placement, not just shrinks.** `attempt()`'s winning branch does `this.shuffle(g.bank.filter(...))`, not a plain filter — so the tile that slides into view to replace the one just used doesn't reliably land in the same spot, which would make it easy to spot by position alone rather than by reading it.
- **The bank tray has no "Word bank" title or tile count anymore.** That header row is the round's progress bar (`progLabel`/`progStyle`) instead — moved down from its old spot above the verse, so the verse area starts right after the reference line, and the bank tray communicates round progress rather than a static label.
- **Penalty:** hearts. A wrong drop costs one. At zero the answers reveal and the level ends. They render as actual heart-shaped SVGs (filled red = alive, outline = lost), not colored dots.
- **Results screen's primary button** is mode-aware, not one hardcoded label/action: "Practice another verse" (casual, rebuilds a round via `startGame`) vs. "Memorize another verse" (memorize, sends you to the picker via `resPrimaryAction`) — it used to say "Practice" and call `startGame` unconditionally, which was both mislabeled and wrong-behaved for memorize's passage-complete screen.
- **Blank appearance:** dashed outline. Not a filled pill, not an underline.
- **Word-type filtering is no longer a Settings option.** The level still sets how many words are blanked; `state.types` (which word-types are eligible) still exists internally with its defaults and the blank-picking algorithm in `buildCasualGame`/`buildMemGame` still reads it, but the "What gets blanked" toggle UI is gone — with the corpus untagged, it had nothing real to bite on and just looked like a working setting that wasn't. Don't re-add the UI without also tagging the corpus.
- **Leaderboard:** friends only. No global.
- **Home's streak pill has a flame icon and an `aria-label`, not a bare pulsing dot.** It used to be an unlabeled animated dot + a number — genuinely unclear what it meant, and the animated `box-shadow` pulse sitting inside Home's `overflow:auto` container was also the likely cause of a reported "screen scrolls" jitter (no script anywhere calls `scrollIntoView`/`scrollTo`, so a CSS-only cause was the only real candidate). Fixed both at once: a static flame SVG (same path as the "Seven Straight" badge icon) replaces the dot, no animation, plus `aria-label="{{ streakLabel }}"` on the pill for screen readers.
- **Theme:** light and dark both required; default follows the phone setting.
- **The real app (full-bleed, no phone-mockup chrome) is now the only appearance, at any width — phone, tablet, or a plain desktop browser tab.** The earlier viewport-width breakpoint (first 760px, later 900px, plus a `display-mode:standalone` carve-out for installed PWAs) is gone; `.fw-page`/`.fw-shell`/`.fw-screen`/`.fw-status` are unconditionally full-bleed now, not `!important`-overridden under a media query. `.fw-shell` still caps at `max-width:560px` and centers (`margin:0 auto`) so a wide desktop window gets a comfortable column instead of the layout stretching edge to edge; a no-op on an actual phone. This is deliberate: the artifact link is what testers actually open, and a "design preview" wrapper around the real app on desktop was never something an end user should see — only this session's own review surface needed it.
- **The old design-review wrapper (`.fw-intro` marketing copy + `.fw-chips` dev screen-jump buttons) still exists, but hidden — hold the Settings tab for `DEV_NAV_HOLD_MS` (600ms; `settingsPressStart`/`settingsPressEnd`, `state.devNav`) to reveal `.fw-chips` as a floating overlay bar (`position:fixed`, top of viewport, any screen, any width); tap anywhere outside the bar (a full-screen backdrop, also gated on `devNav`, sharing the same `toggleDevNav` closer) to dismiss it.** `.fw-intro` was removed outright (pure marketing copy, no functional use). The chips are still genuinely useful for this session's own testing — jumping directly to any screen, including ones with fabricated placeholder data via the `go()` closure's `results`/`game` special-casing — so they're one gesture away, just not shown by default. This replaced an earlier "tap the Home greeting" version of the same idea: a plain tap on visible text was too easy to trigger by accident with no clue how it happened, so it moved to a long-press specifically (on the Settings tab, not anywhere on Home) plus an obvious way to close it if it does open unexpectedly. Real users never see or discover this; there's no visible affordance either way, just the known gesture. `settingsPressStart` calls `setPointerCapture` on the button — without it, the backdrop mounting mid-press (the instant the hold threshold fires) can steal the pointerup meant for the button, since capture is what keeps that release targeted correctly regardless of what renders on top while a finger is still down. `go()` swallows the one click that a long-press's own pointerup would otherwise also fire (checked via a plain instance flag, `_devNavLongPress`, not state — nothing here should trigger its own re-render). If you add a new screen, add it to `navChips`/`screens` as before — nothing else about the reveal mechanism needs to change. `screens` includes `"onboarding"` even though it isn't a real `state.screen` value — the walkthrough is an overlay (`state.showOnboarding`), so `go()` special-cases that key (alongside its existing `"game"`/`"results"` special-cases) to flip the overlay on at step 0 instead of doing a plain screen swap, letting it be previewed on demand without clearing storage to fake a first-time visit. Whether step 3 (install) shows up when using this chip still reflects the real browser/platform, same as it would for a genuine new visitor.
- **`build/build_pwa.py` is a third, separate build target (`dist/pwa/`) — not just extra `<head>` tags on the artifact.** A Claude Artifact runs inside a sandboxed iframe and cannot register a service worker or trigger an install prompt no matter what the page contains, so real PWA installability needs its own deployable output: `index.html` (built the same inlined-single-file way as the artifact — zero network calls), plus a real `manifest.webmanifest`, `sw.js`, and `icons/` (192/512 regular + maskable, apple-touch-icon, favicon). Icons are drawn by `build/pwa-assets/make_icons.py` from the app's own flame mark (same shape language as the streak pill / "Seven Straight" badge) — generated on every `build_pwa.py` run via `generate_icons()`, not committed, so there's one source of truth instead of images that can drift from the code that makes them (needs Pillow — the one Python dependency in this repo, only for this build). `dist/pwa/` only becomes installable once deployed to real HTTPS static hosting (GitHub Pages, Netlify, Vercel, etc.) — it is not meant to replace `dist/artifact.html` as the quick-share link, it's the target for whoever actually wants "Add to Home Screen" to work.
- **The service worker fetches the document (`./`, `./index.html`) network-first with `cache:"no-store"`, falling back to the cached copy only when offline** — deliberately not cache-first for the one file that actually changes. GitHub Pages (and most static hosts) sets its own `Cache-Control` on `sw.js` that can't be overridden, so relying on the browser's own "did sw.js change?" background check to notice a new build is slow and inconsistent — a returning visitor could relaunch several times before that happens to fire. Network-first for the document sidesteps the whole race: whenever there's connectivity, the next launch always gets the latest build immediately, with no dependency on service-worker update timing at all. `install`/`activate` still version the cache by content hash (`CACHE = "fill-the-word-<hash>"`) and delete old cache names, and `skipWaiting()`/`clients.claim()` still make a newly-activating worker take over immediately rather than waiting for every open tab to close — that combination is what makes the *offline* fallback and the manifest/icons (still cache-first, they rarely change) behave correctly; it's not what makes the online case fast, the network-first fetch is. A returning visitor who's actually offline still gets the last successfully-fetched build from cache, not a network error.
- **A one-time "Updated to the latest version" toast tells a returning visitor when they've landed on a newer build than the one they last saw.** Plain vanilla-JS in the PWA's `SW_REGISTER` script (not part of the DC app), comparing a version stamp — the same content hash used to bust the SW cache — against one stashed in `localStorage` under `filltheword.seenVersion`, deliberately a different key from the app's own save data (`filltheword.v1`) so this never touches real save state. Silent on first-ever visit (nothing to compare against yet) and on any later visit that's still the same build; it only speaks up when the version actually changed since last time. `build_pwa.py`'s `main()` computes the content hash from `index.html` *before* resolving the `__SW_VERSION__` placeholder the toast script reads (the placeholder text is constant so it doesn't feed back into its own hash), then substitutes the real value in — avoids a circular "hash depends on the thing that embeds the hash" problem.
- **Settings stays minimal on purpose.** Translation, Default difficulty, This device (Start over) and Appearance are the whole screen. Verse audio, Reverse mode, Reference-only mode and Daily reminder — the old "Extras" section — are removed, not hidden; none of them were implemented behind the toggle anyway. Re-add a setting only alongside the feature it controls, not ahead of it.
- **There is now a first-open walkthrough — the earlier "no onboarding" decision is reversed.** Three skippable screens (tap-to-fill-the-highlighted-blank, the two modes, real progress tracking), shown once, gated by `state.onboardingVersion` against the `ONBOARDING_VERSION` class constant. It is deliberately **versioned, not a one-time flag**: bump `ONBOARDING_VERSION` when a change is big enough that returning players should see the walkthrough again (a new mode, a reworked control — not a copy tweak or a bug fix), and update the step content to match *before* bumping the number, since the version alone decides who gets shown it, not a diff of the copy. Skipping marks the current version seen exactly like finishing does — skip means "I don't need this," not "ask again next launch." "Start over" in Settings also resets `onboardingVersion` to 0, so a full reset re-shows it immediately.
- **A 4th onboarding step nudges installing the PWA — but only when there's something real to offer, and it's kept deliberately separate from `ONBOARDING_VERSION`.** `showInstallStep` (`!this._isStandalone && (state.installAvailable || this._isIOSSafari)`) decides whether it exists at all: skipped entirely for anyone already running standalone, or on a browser/OS combo that can neither trigger a real install prompt nor offer working "Add to Home Screen" instructions (desktop Firefox, Chrome-for-iOS, etc.) — those players still get the original 3-step walkthrough, unchanged. `installAvailable` flips true from Chrome's `beforeinstallprompt` (Android/desktop Chrome/Edge — fires only when the page is genuinely installable *and not already installed*, which is exactly the signal needed here, for free); `_isIOSSafari` is plain UA sniffing, known synchronously at mount (see its comment in `componentDidMount` for the iPadOS-hides-its-UA and Chrome-for-iOS-uses-Safari's-engine gotchas it works around). Deliberately **not** folded into `ONBOARDING_VERSION`: bumping that would replay the *entire* 3-step walkthrough for existing testers just to show one new screen. Instead, `state.seenInstallNudge` (persisted, separate flag) tracks whether *any* player — new or returning — has been offered this at all. A brand-new player gets it as step 4 of the real walkthrough (`onboardStep` reaches 3, dots included). An existing tester who already finished onboarding gets shown *only* this one screen, no step dots (`onboardInstallOnly`), the next time `maybeShowInstallNudge()` finds it applicable — which may be moments after mount, since `beforeinstallprompt` fires on the browser's own schedule, not synchronously. `finishOnboarding()` sets `seenInstallNudge:true` unconditionally (whether or not step 4 ever applied to this player), so nobody sees both the walkthrough's version and the standalone nudge. Accepting the real prompt (`promptInstall` → `_triggerInstallPrompt()`, shared with the Settings row below) shows a brief "Installed!" confirmation (`justInstalled`) before the final tap actually leaves onboarding — declining, or there being nothing left to prompt, moves on immediately instead. The Settings screen carries an "Install" section with the same gating (`canInstall`) as a permanent fallback for anyone who skipped or dismissed the nudge — **`canInstall` has to also check `justInstalled`, not just `installAvailable`**, or the whole section (confirmation message included) disappears the instant `installAvailable` flips false right after a successful install; this was a real bug caught in testing, not a hypothetical.
- **Step 1's illustration is a live demo, not an icon** — two real blanks over John 3:16 ("For God so \_\_\_ the \_\_\_"), with "world" and "loved" as word tiles beneath. It loops through tapping the wrong word first (the blank shakes red, exactly like a real wrong attempt — no fill, no fake success) before tapping the right ones, so new players see what a mistake looks like, not just the happy path. Six keyframes drive it (`demoTileWorld`/`demoTileLoved` for the tiles, `demoBlank1Shake`/`demoBlank1Text` and `demoBlank2Box`/`demoBlank2Text` for the two blanks), all sharing one 7s timeline so they stay in sync without JS. It settles on the "before" frame (both blanks empty, both tiles visible) under `prefers-reduced-motion` — same tradeoff as before: legible on its own, but reduced-motion viewers don't see the wrong-attempt illustration specifically, which was an accepted limitation rather than something worth a separate reduced-motion composition. If the tap-to-fill mechanic ever changes, update this demo, not just the paragraph next to it.
- **Onboarding step 2 ("Two ways to play") gives each mode its own label and its own sentence** — a small orange chip ("Daily Challenge" / "Memorize", matching the exact chip style used for those same labels on Home) each followed by one sentence, stacked — not one paragraph with the mode names just bolded inline. Do the same if a third mode is ever added: a chip + a sentence per mode, not another inline list.

- **Hearts: flat 3 at every difficulty level, both modes.** This was `3 + level` (3/4/5/6) for a while — more forgiving at Hard/By Heart, where a long verse on three hearts was closer to a coin flip than a memory test — but Andrew asked to go back to flat 3 across the board. `heartsPerVerse` (props schema, default 3) is the only source now; `buildMemGame`/`buildCasualGame`/`finish()`'s `results.maxHearts` no longer add `level`/`lvlIdx` to it. If Hard/By Heart start feeling too punishing again, that tradeoff is exactly what the old scaling existed to solve — don't reintroduce it without asking first, since this was a deliberate, explicit revert, not a bug fix.

## Color

Church colors. The split is deliberate:

- `#f28a00` orange — the **game/reward layer**. Buttons, correct answers, streaks, points, badges, active states, the level ladder.
- `#b4a59b` taupe — the **scripture/reading layer**. Blank outlines, references, verse chrome. Never used for a reward.

Do not introduce a third accent. Red appears only for hearts and error states.

## Type

Figtree throughout — all sans, app-native. No serif verse text; that was considered and rejected.

## Technical shape

Single Design Component. All eight screens are `sc-if` branches on `state.screen`, one phone frame, chips above it for navigation. Inline styles only; theme values come from CSS custom properties on the phone root (`--ink`, `--card`, `--orange`, etc.) which flip on `data-theme="dark"`.

Two verse sources in the logic class:

- `corpus` + `chapterCounts` — the verse set both modes now play from. `chapterCounts` holds all 66 books so the picker is fully navigable; `corpus` is keyed by translation first (`corpus.KJV`, `corpus.BSB`, `corpus.WEB`), then `"Book Chapter"` → verse number → text — read through `activeCorpus()` (`this.corpus[this.state.version] || this.corpus.KJV`), never `this.corpus` directly. All three are complete (1,189 chapters; KJV 31,102 verses, BSB/WEB a few fewer in specific well-documented spots) and public domain — see docs/PROTOTYPE.md and the Translations bullet above for sourcing and the Psalm-superscription / omitted-verse caveats. There is no dimmed/sample-set edge in the picker anymore — which is also why the chapter grid (Step 2) no longer has an available/unavailable distinction to show at all. Every chapter chip renders in the same neutral style (matching the verse chips' default look, same compact size) rather than the old orange "available" highlight, which — now that every chapter is always available — used to make the whole grid look selected.
- `verses` — the original tagged set, kept for its four translations and its `~name` / `~verb` / `~noun` markup. **The corpus is untagged**, so word-type filtering currently has almost nothing to bite on and the blank picker falls back to longer-words-first. Tagging the corpus is the work that would make those toggles matter again.

Difficulty lives in `state.level` (shared) and, during a memorize session, in `mem.level`. Memorization state lives in `state.mem`: the reference, the verse list, which verse is active (`vi`), the current `level`, and `cleared` (highest level cleared per verse). `state.casual` holds the current daily-challenge reference — it's derived, not saved: `componentDidMount` sets it fresh every load from `dailyRef(new Date().toDateString())`, so it isn't part of `localStorage` at all. `state.casualCleared` (persisted) is the daily-challenge equivalent of `mem.cleared` — highest level cleared, keyed by verse reference instead of by position in a passage. `buildMemGame` and `buildCasualGame` pick the blanks — longer words first at low percentages, everything at 100%.

## Test build (friend testing, public link)

The published artifact is the test build. Rules it now follows:

- **Responsive, not a mockup — at every width, not just under some breakpoint.** The
  app fills the viewport (`100dvh`, safe-area insets, `viewport-fit=cover`) always; no
  phone frame, no intro copy, ever, for a real visitor. The hooks are `.fw-page`,
  `.fw-shell`, `.fw-screen`, `.fw-status`, `.fw-tabs`, `.fw-bank` — all unconditional
  now, not a media-query override needing `!important`.
- **`.fw-page`'s real height comes from JS, not just `100dvh`.** `html`/`body` are
  `overflow:hidden` (the app scrolls internally instead) — which means Safari's own
  address bar and bottom toolbar never auto-hide the way they would on a normally
  scrolling page, since that behavior is tied to document-level scroll. They just sit
  there permanently occupying screen space. On iOS versions/cases where `100dvh`
  doesn't track that correctly, `.fw-page` ends up taller than what's actually
  visible — and since nothing can scroll the *outer* page to reveal the difference,
  the excess just hides content below a fixed cutoff. Andrew had iOS users reporting
  exactly this: unable to scroll past the device row on Settings, or past the top of
  Friends on Progress — any screen tall enough to hit it. Fixed in `componentDidMount`
  (see the `setAppVh` block near the top): reads `visualViewport.height` (falls back
  to `window.innerHeight`), writes it to a `--app-vh` CSS custom property, and
  `.fw-page`'s inline style prefers `var(--app-vh, 100dvh)` over the plain `100dvh`
  declaration ahead of it — so it degrades to the old behavior before JS runs or on a
  browser where this somehow doesn't apply, but otherwise tracks the *true* visible
  area, including on-screen-keyboard show/hide, which plain `dvh` doesn't handle well
  either. Kept in sync via `resize`/`orientationchange`/`visualViewport`'s own resize
  event, all registered once in `componentDidMount`.
- **Every screen must be reachable without the dev chips**, which are hidden behind a
  long-press on the Settings tab (see Repo layout notes) and not something a real user
  discovers or needs. Home/Progress/Friends/Settings from the tab bar; Choose
  verses and Game from Home; Results from the level overlay's "See the numbers"; back
  from Results via "Done". Adding a screen means giving it an in-app route, not a chip.
- **Progress has two sub-tabs, Badges (default) and Bible — not a screen split at the
  tab-bar level.** `state.progressSubTab` (`"badges"`/`"bible"`, not persisted — always
  starts back on Badges) gates `isProgressBadges`/`isProgressBible` inside the single
  `isProgress` screen block; a `progressTabs` pill-chip pair (same visual pattern as
  `testChips`) switches it, styled and positioned like a header row above whichever
  sub-tab's content is showing. **Bible is the old standalone Library screen, moved
  in wholesale, not rebuilt** — same `query`/`testChips`/`bookList` bindings, same
  markup, just reached a different way now. Andrew's call: Progress and Library felt
  like two disconnected halves of the same "how am I doing" question, and folding
  Library in as a sub-tab (with Friends promoted out to its own tab — see below) reads
  better than four flat top-level tabs did.
- **Friends is its own top-level tab now, not a section at the bottom of Progress.**
  Same `isFriends`/`friendShowSignIn`/`friendSignedIn`/etc. bindings and markup as
  before, just under its own `<!-- FRIENDS -->` screen block with its own `<h2>Friends
  </h2>` heading instead of a small uppercase label buried under Progress's badges
  grid — Andrew felt it deserved equal footing with Progress and Settings, not a
  scroll-past afterthought.
- **Progress persists on the tester's own phone** in `localStorage` under
  `filltheword.v1` — settings, per-verse cleared levels for both modes, points,
  streak, stats, a cached `friendCode`/
  `friendDisplayName` (just enough to show something before Friends' own network
  round-trip resolves — the actual session lives in Supabase's own separate
  `localStorage` key, not this one), and the passage in flight. Never
  the board mid-round, and never the daily
  challenge's verse itself (that's derived fresh from the date on every load — see
  Technical shape). Everything is wrapped in try/catch; blocked storage must not break
  the app. Settings has a "Start over" that clears it.
- **No fake user data on Home.** Real date, time-based greeting with no invented name,
  and points/streak/accuracy that start at zero and move as the tester plays. Badges,
  Library mastery, and now Friends too are all real, computed from `state.mastered`/
  `state.stats` (see Technical shape) — nothing left hardcoded anywhere in the app.
- **The daily challenge never discards a passage in flight.** `startGame` leaves
  `state.mem` alone, so the Home resume card survives.
- **A missed day doesn't zero the streak.** `finish()` forgives exactly one skipped
  calendar day (`daysSince <= 2` still continues it); miss two or more and it resets to
  1. This is a standing rule, not a spendable/earnable "streak freeze" — that's a real
  product decision (how many, how earned) that hasn't been made yet, see PROTOTYPE.md.
- **Sharing is real.** The share sheet's button calls `navigator.share()` where the
  platform supports it (any app, not a fixed "friends" list), falling back to a
  clipboard copy with a button-label confirmation where it doesn't. No account, no
  backend — this is the honest ceiling on "social" until one exists.

## Technical shape — lifetime record

`state.mastered` is the one persisted, cumulative source of truth for "how far has this
player ever gotten on this verse" — keyed `"Book Chapter:Verse"` → highest level index
ever cleared, updated in `finish()` on every win in **either** mode, and never reset by
starting a new passage or a new daily verse (unlike `mem.cleared`/`casualCleared`, which
are scoped to whatever's currently in flight). `state.playedDates` is every distinct
calendar day something was finished, win or lose. The Bible sub-tab's per-book mastery %
and `computeBadges()` (shared by `finish()` — which diffs a before/after snapshot to find
the one badge a round just earned — and `renderVals()`) read from these two fields. Don't
reintroduce a fake/random percentage or pattern here; if a stat can't be computed for real
yet, it's better shown as an honest zero than invented. **Progress's Badges sub-tab used
to also show a 5-week play calendar and a stats grid (verses completed, accuracy, rounds
played, day streak) above the badge grid — Andrew asked for those removed so Badges shows
only badges.** The underlying data (`state.playedDates`, `state.stats`, `state.streak`)
is untouched and still feeds Home's own stat tiles and the streak badge; only the
duplicate display on this screen and its `cal`/`progStats` renderVals computations are
gone, along with the "Memorizing X" passage-progress card that used to sit above them.

## Badges — Bronze/Silver/Gold/Platinum tiers

Every badge has 4 tiers (index 0-3, `TIER_NAMES`) lining up with Easy/Medium/Hard/By
Heart. **The requirement itself never scales with tier — the exact same threshold applies
at every level, only the minimum difficulty it has to be met at changes.** First Verse
bronze is one verse cleared at Easy-or-harder; platinum is one verse cleared at By Heart.
This was a deliberate correction mid-design — an earlier draft scaled the threshold *up*
per tier (e.g. a 7-day streak for bronze, 365 days for platinum) and Andrew rejected that
outright: same count for every tier, difficulty is the only knob. **Every tier, once
earned, is permanent — tiers only ratchet upward, never down**, even for streak-based
badges where the underlying condition can later stop being true (a broken streak doesn't
un-earn a previously-earned Seven Straight tier). This was an explicit decision (asked
via AskUserQuestion, not assumed) specifically because a badge "un-earning" itself reads
as a bug/loss, not a fair reflection of a real one-time achievement.

`computeBadges(st)` in the source is the one source of truth — both `finish()` (diffing a
before/after snapshot to find the one badge that just tipped over, for the Results-screen
announcement) and `renderVals()` (for the live grid) call it rather than each keeping a
copy. It returns `{badgeKey: tier}`, `-1` meaning not yet earned. Four badges
(First Verse, Verse Vault, Psalms x10, 66 Books, Whole Book, Century Club) are computed
**live** from already-monotonic data (`state.mastered`, `state.roundsByLevel`) — no
separate ratchet needed, since the underlying counts only ever grow. The rest read a
dedicated ratcheted state field, each updated in `finish()` (or `restoreStreak()` for
Comeback Kid) the moment its condition is met at a given `lvlIdx`:

- **No Hints** (`noHintsLevel`) / **Perfect Round** (`perfectRoundLevel`, `g.wrong===0`) /
  **Iron Will** (`ironWillLevel`, `g.revived` — set by `reviveHeart()` on a successful
  revive) / **Night Owl** (`nightOwlLevel`, replaces the old plain `nightOwl` boolean) —
  each just `Math.max(current, lvlIdx)` on a qualifying win.
- **Seven Straight** (`sevenStraightLevel`) / **Perfect Week** (`perfectWeekLevel`) — four
  *parallel* streaks (`streakByLevel`/`strictStreakByLevel`, one entry per minimum-tier,
  plus `lastPlayedByLevel` tracking when each was last touched), maintained in
  `updateLevelStreaks()` using the exact day-since math the main `state.streak` already
  uses. A round at `lvlIdx` counts toward every tier from 0 up to `lvlIdx` (By Heart play
  extends the Easy-tier streak too). `streakByLevel` forgives one skipped day, matching
  the main streak; `strictStreakByLevel` (Perfect Week) forgives none — the only
  difference between the two badges is that forgiveness.
- **Marathon** (`marathonLevel`) — `updateMarathon()` keeps a `todayRoundCounts`
  `{date, counts[4]}` that resets when the date rolls over; needs no history beyond
  today, since once 5-in-a-day at tier D is hit once, it's ratcheted permanently.
- **Comeback Kid** (`comebackKidLevel`) — set in `restoreStreak()` to
  `Math.max(current, state.level)`, i.e. whatever difficulty you're currently set to play
  at when you buy the restore. The simplest honest proxy available, since a streak
  restore is a Home-screen action with no round/difficulty context of its own to read.

**Two ideas from the original roadmap were explicitly dropped, not forgotten:** Big
Spender (points spent has no natural difficulty axis to gate tiers on) and Friend Circle
(connecting with a friend has no difficulty axis at all). Both are candidates to revisit
later with a different mechanic, not aborted for a technical reason.

Tier colors are new CSS custom properties (`--bronze`/`--silver`/`--gold`/`--platinum`,
each with a `-soft` background and `-ink` text variant, defined for both themes) —
**Silver and Platinum needed two rounds of tuning to actually read as different colors.**
The first pass just varied lightness on the same blue-grey hue and Andrew immediately
flagged them as too close; the fix wasn't a lighter/darker version of the same color but
a genuinely different hue — Platinum is now lavender/purple, Silver stays neutral grey,
so all four tiers sit at different points around the color wheel (bronze
orange-brown / gold yellow / silver grey / platinum purple) rather than differing only in
lightness, which is what actually fixed the confusion. `badgeTile(tier)` picks the
triplet; a `tierLegend` row (4 colored dots + names) sits above the grid since tiles
carry no per-badge text label — color alone conveys tier, matching the pre-tier system's
plain on/off look.

**Icons fill ~70% of each tile** (`width="70%" height="70%"` on the SVG, not a fixed px
value, so it scales with the tile rather than assuming one screen width) — Andrew's
follow-up after the first pass read as too small relative to the tile. Five icons were
redrawn from generic shapes to literal ones per his "if we didn't have words, you'd know
by the icon" bar: Psalms x10 is a harp (not a generic open book — Whole Book already uses
a book shape, and the two looked identical before), Century Club is a plain circled "100"
(an SVG `<text>` element, not a glyph — most literal option for "played 100 rounds"),
Marathon is a running figure (was a lightning bolt, which read as "speed" not "volume in
a day"), Whole Book is a book with a small checkmark badge (distinguishes "complete" from
Psalms' plain book), and Comeback Kid is a dip-then-recover trend line (was a generic
circular refresh arrow).

**Tapping any badge tile opens a modal** (`state.badgeDetail`, the tapped badge's key or
`null`) breaking down all 4 tiers at once — each row shows that tier's exact requirement
with the specific difficulty substituted in (`badgeMeta[i].desc.replace("this difficulty",
levels[i].name)`) and a checkmark if already earned, not just "here's your next goal." A
backdrop click or the ✕ closes it (`closeBadgeDetail`); the backdrop and the card are
**siblings**, not nested, with the backdrop's flex-centering wrapper set to
`pointer-events:none` and the card itself `pointer-events:auto` — this is the established
pattern in this file for backdrop-click-to-close (see the dev-nav chips bar), used instead
of a `stopPropagation` handler because this template layer has no such binding.

## Open work

Reverse mode, Reference-only mode, verse audio and daily reminders have no UI at all anymore (see the Settings bullet above) — they'd need both a real implementation and a settings toggle if picked back up. Friends (see the Friends bullet below) is deliberately scoped to a flat connected-friends list — no removing a friend yet, no ranking/leaderboard styling, no real-time updates, no push notifications; those are natural follow-ups once the basic connect-and-compare flow is proven out. The corpus now has full text for three translations, KJV, BSB and WEB (see the Translations bullet above); NKJV/NIV/NLT still only exist in the small 7-verse tagged `verses` set (kept for its `~name`/`~verb`/`~noun` markup, not for translation coverage) and were dropped from the real translation set — they'd need a paid publisher license, not just data entry, to ever be wired up for real.
