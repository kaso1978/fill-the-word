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
- **Translations:** KJV, NKJV, NIV, NLT are the planned set, but **only KJV is selectable right now.** The other three show in Settings greyed out with a "future feature" note — don't wire them up to real text until they're actually ready (see docs/PROTOTYPE.md on what full-Bible coverage for them would take).
- **Tone:** playful and game-like, not devotional-solemn.
- **Interaction: tap a word to fill the highlighted blank, or drag it to place it anywhere.** The first open blank, in reading order, is highlighted (`activeBlankId()`) — a plain tap on any bank tile is an immediate attempt against that blank, no second tap needed. Dragging a tile and dropping it on a *different* blank targets that one instead, open or not. This is deliberately built for speed once a player knows the verse: tap straight down the bank in order for a fast clear, drag only when you want to place out of order. There is no "Tap only" vs. "Tap + drag" setting — both always work. Don't reintroduce a select-then-tap-the-blank step; that's the two-tap flow this replaced.
- **Two modes, one game:** the daily challenge (a fixed verse, same for every player, that rotates once a day) and memorize (a chosen passage taken up the ladder). They share the board, the word bank and the difficulty scale.
- **The daily challenge's verse is not chosen by the player.** It's picked deterministically from a curated pool of ~77 well-known passages (see `dailyPool`/`dailyRef` in the logic class), seeded by the calendar date so every player sees the same verse on the same day — no picker, no shuffle, nothing random per device. Memorize is the opposite: **the user chooses the verse there** — book, then chapter, then a verse. Translation and default difficulty live in Settings.
- **Picking a verse range is two-tap-or-drag.** This reverses an earlier decision in this same doc history ("don't bring back the old tap-a-second-verse-to-extend model") — it came back because a 176-verse chapter made single-verse-only tapping impractical for anything but a drag, and drag itself got harder to trust once the verse grid became scrollable (see below). Current model, in `onUp`: a tap with no movement sets the start if there's no selection yet; a second tap on a different verse closes the range; tapping again once a range exists starts over from that new verse. Dragging still works exactly as before — press-drag-release from the first verse to the last, or grab an existing range's start/end to move just that edge (`pickVerseDown`/`onMove`). "Whole chapter" (renamed from "Select whole chapter") is still a one-tap shortcut, and a "Clear" button (`clearPickRange`) now appears once there's a selection. A `pickHint` line ("Now tap the last verse" / "Tap a verse to start over") narrates which half of the two-tap gesture you're in.
- **The verse-range grid scrolls on its own; a long chapter can't push "Start memorizing" off-screen.** Before this, the whole Step 3 column was one unbroken flex stack — a 176-verse chapter (Psalm 119) made the grid tall enough to shove the preview card and the Start button past the bottom of the phone, with no way to scroll down to them (the outer screens are `overflow:hidden`). Now the grid is its own `overflow-y:auto` region with `overscroll-behavior:contain` (so panning it doesn't bleed into the page), sized `flex:0 1 auto;min-height:104px` with a `flex:1 1 0` spacer after it — the grid takes only the space it needs (or scrolls once it doesn't fit), and the spacer pushes the preview card + Start button to the bottom the rest of the time. Because the grid now scrolls, a vertical swipe over it needed a way to mean "scroll" instead of "extend my drag-selected range": `onMove` bails out of a pending range-drag the first time it sees mostly-vertical movement before any real movement was recorded, letting the browser take over the scroll. A `pointercancel` listener (`_cancel`, alongside the existing `pointermove`/`pointerup` ones) resets `_rangeAnchor` too, so a gesture the browser interrupts to take over scrolling can't leave the picker stuck mid-drag.
- **One difficulty scale, four levels, both modes:** **Easy** (25% of the verse blanked), **Medium** (50%), **Hard** (75%), **By Heart** (100%). The level sets HOW MANY words are blanked. Percentages are internal — the UI says the names.
- **Difficulty and rank are different things.** Easy→By Heart is chosen, per round. Novice→Apprentice→Disciple→Teacher→Scholar are *earned* XP ranks and no longer set difficulty. The old "skill tier" picker is gone; don't reintroduce a second difficulty vocabulary.
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
- **The old design-review wrapper (`.fw-intro` marketing copy + `.fw-chips` dev screen-jump buttons) still exists, but hidden — tap the Home greeting (`toggleDevNav`, `state.devNav`) to reveal `.fw-chips` as a floating overlay bar (`position:fixed`, top of viewport, any screen, any width).** `.fw-intro` was removed outright (pure marketing copy, no functional use). The chips are still genuinely useful for this session's own testing — jumping directly to any screen, including ones with fabricated placeholder data via the `go()` closure's `results`/`game` special-casing — so they're one tap away, just not shown by default. Real users never see or discover this; there's no visible affordance, just the known gesture. If you add a new screen, add it to `navChips`/`screens` as before — nothing else about the reveal mechanism needs to change.
- **`build/build_pwa.py` is a third, separate build target (`dist/pwa/`) — not just extra `<head>` tags on the artifact.** A Claude Artifact runs inside a sandboxed iframe and cannot register a service worker or trigger an install prompt no matter what the page contains, so real PWA installability needs its own deployable output: `index.html` (built the same inlined-single-file way as the artifact — zero network calls), plus a real `manifest.webmanifest`, `sw.js` (app-shell cache-first — the whole app is one file, so caching that file is caching everything), and `icons/` (192/512 regular + maskable, apple-touch-icon, favicon). Icons are drawn by `build/pwa-assets/make_icons.py` from the app's own flame mark (same shape language as the streak pill / "Seven Straight" badge) — generated on every `build_pwa.py` run via `generate_icons()`, not committed, so there's one source of truth instead of images that can drift from the code that makes them (needs Pillow — the one Python dependency in this repo, only for this build). `dist/pwa/` only becomes installable once deployed to real HTTPS static hosting (GitHub Pages, Netlify, Vercel, etc.) — it is not meant to replace `dist/artifact.html` as the quick-share link, it's the target for whoever actually wants "Add to Home Screen" to work.
- **Settings stays minimal on purpose.** Translation, Default difficulty, This device (Start over) and Appearance are the whole screen. Verse audio, Reverse mode, Reference-only mode and Daily reminder — the old "Extras" section — are removed, not hidden; none of them were implemented behind the toggle anyway. Re-add a setting only alongside the feature it controls, not ahead of it.
- **There is now a first-open walkthrough — the earlier "no onboarding" decision is reversed.** Three skippable screens (tap-to-fill-the-highlighted-blank, the two modes, real progress tracking), shown once, gated by `state.onboardingVersion` against the `ONBOARDING_VERSION` class constant. It is deliberately **versioned, not a one-time flag**: bump `ONBOARDING_VERSION` when a change is big enough that returning players should see the walkthrough again (a new mode, a reworked control — not a copy tweak or a bug fix), and update the step content to match *before* bumping the number, since the version alone decides who gets shown it, not a diff of the copy. Skipping marks the current version seen exactly like finishing does — skip means "I don't need this," not "ask again next launch." "Start over" in Settings also resets `onboardingVersion` to 0, so a full reset re-shows it immediately.
- **Step 1's illustration is a live demo, not an icon** — two real blanks over John 3:16 ("For God so \_\_\_ the \_\_\_"), with "world" and "loved" as word tiles beneath. It loops through tapping the wrong word first (the blank shakes red, exactly like a real wrong attempt — no fill, no fake success) before tapping the right ones, so new players see what a mistake looks like, not just the happy path. Six keyframes drive it (`demoTileWorld`/`demoTileLoved` for the tiles, `demoBlank1Shake`/`demoBlank1Text` and `demoBlank2Box`/`demoBlank2Text` for the two blanks), all sharing one 7s timeline so they stay in sync without JS. It settles on the "before" frame (both blanks empty, both tiles visible) under `prefers-reduced-motion` — same tradeoff as before: legible on its own, but reduced-motion viewers don't see the wrong-attempt illustration specifically, which was an accepted limitation rather than something worth a separate reduced-motion composition. If the tap-to-fill mechanic ever changes, update this demo, not just the paragraph next to it.
- **Onboarding step 2 ("Two ways to play") gives each mode its own label and its own sentence** — a small orange chip ("Daily Challenge" / "Memorize", matching the exact chip style used for those same labels on Home) each followed by one sentence, stacked — not one paragraph with the mode names just bolded inline. Do the same if a third mode is ever added: a chip + a sentence per mode, not another inline list.

### Open question — hearts

The old rule was a flat 3 hearts per verse. At Hard and By Heart that is close to unplayable, so both modes now use `3 + level` (3, 4, 5, 6). This is the one decided rule the memorization work changed. Flat 3 everywhere is a one-line revert if that's the call.

## Color

Church colors. The split is deliberate:

- `#f28a00` orange — the **game/reward layer**. Buttons, correct answers, streaks, XP, badges, active states, the level ladder.
- `#b4a59b` taupe — the **scripture/reading layer**. Blank outlines, references, verse chrome. Never used for a reward.

Do not introduce a third accent. Red appears only for hearts and error states.

## Type

Figtree throughout — all sans, app-native. No serif verse text; that was considered and rejected.

## Technical shape

Single Design Component. All seven screens are `sc-if` branches on `state.screen`, one phone frame, chips above it for navigation. Inline styles only; theme values come from CSS custom properties on the phone root (`--ink`, `--card`, `--orange`, etc.) which flip on `data-theme="dark"`.

Two verse sources in the logic class:

- `corpus` + `chapterCounts` — the verse set both modes now play from. `chapterCounts` holds all 66 books so the picker is fully navigable; `corpus` is keyed `"Book Chapter"` → verse number → KJV text, and now holds the **full KJV** (1,189 chapters, 31,102 verses), sourced from the public-domain [aruljohn/Bible-kjv](https://github.com/aruljohn/Bible-kjv) dataset — see docs/PROTOTYPE.md. There is no dimmed/sample-set edge in the picker anymore — which is also why the chapter grid (Step 2) no longer has an available/unavailable distinction to show at all. Every chapter chip renders in the same neutral style (matching the verse chips' default look, same compact size) rather than the old orange "available" highlight, which — now that every chapter is always available — used to make the whole grid look selected.
- `verses` — the original tagged set, kept for its four translations and its `~name` / `~verb` / `~noun` markup. **The corpus is untagged**, so word-type filtering currently has almost nothing to bite on and the blank picker falls back to longer-words-first. Tagging the corpus is the work that would make those toggles matter again.

Difficulty lives in `state.level` (shared) and, during a memorize session, in `mem.level`. Memorization state lives in `state.mem`: the reference, the verse list, which verse is active (`vi`), the current `level`, and `cleared` (highest level cleared per verse). `state.casual` holds the current daily-challenge reference — it's derived, not saved: `componentDidMount` sets it fresh every load from `dailyRef(new Date().toDateString())`, so it isn't part of `localStorage` at all. `state.casualCleared` (persisted) is the daily-challenge equivalent of `mem.cleared` — highest level cleared, keyed by verse reference instead of by position in a passage. `buildMemGame` and `buildCasualGame` pick the blanks — longer words first at low percentages, everything at 100%.

## Test build (friend testing, public link)

The published artifact is the test build. Rules it now follows:

- **Responsive, not a mockup — at every width, not just under some breakpoint.** The
  app fills the viewport (`100dvh`, safe-area insets, `viewport-fit=cover`) always; no
  phone frame, no intro copy, ever, for a real visitor. The hooks are `.fw-page`,
  `.fw-shell`, `.fw-screen`, `.fw-status`, `.fw-tabs`, `.fw-bank` — all unconditional
  now, not a media-query override needing `!important`.
- **Every screen must be reachable without the dev chips**, which are hidden behind a
  tap on the Home greeting (see Repo layout notes) and not something a real user
  discovers or needs. Home/Progress/Library/Settings from the tab bar; Choose verses
  and Game from Home; Results from the level overlay's "See the numbers"; back from
  Results via "Done". Adding a screen means giving it an in-app route, not a chip.
- **Progress persists on the tester's own phone** in `localStorage` under
  `filltheword.v1` — settings, per-verse cleared levels for both modes, XP, streak,
  stats and the passage in flight. Never the board mid-round, and never the daily
  challenge's verse itself (that's derived fresh from the date on every load — see
  Technical shape). Everything is wrapped in try/catch; blocked storage must not break
  the app. Settings has a "Start over" that clears it.
- **No fake user data on Home.** Real date, time-based greeting with no invented name,
  and XP/streak/accuracy that start at zero and move as the tester plays. Badges and
  Library mastery are real now too, computed from `state.mastered` (see Technical
  shape) — only the friends leaderboard on Progress is still five hardcoded names,
  because real friends need accounts this app doesn't have. If a tester asks why their
  friend isn't on it, that's why.
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
calendar day something was finished, win or lose. Library's per-book mastery %, the
5-week calendar, and `computeBadges()` (shared by `finish()` — which diffs a
before/after snapshot to find the one badge a round just earned — and `renderVals()`)
all read from these two fields. Don't reintroduce a fake/random percentage or pattern
here; if a stat can't be computed for real yet, it's better shown as an honest zero than
invented.

## Open work

Reverse mode, Reference-only mode, verse audio and daily reminders have no UI at all anymore (see the Settings bullet above) — they'd need both a real implementation and a settings toggle if picked back up. The friends leaderboard is still five hardcoded names — it needs accounts and a shared backend (Supabase/Firebase-class, not necessarily custom) that doesn't exist yet; see docs/PROTOTYPE.md for the fuller product review of what that would unlock. The corpus is now the full KJV; NKJV/NIV/NLT still only exist in the small 7-verse tagged `verses` set and aren't selectable in Settings.
