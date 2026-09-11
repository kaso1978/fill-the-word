# Fill the Word — project context

Mobile app concept. A Bible verse appears with words missing; the player puts the words back. Two ways in: a casual round on any verse, and a memorization ladder that takes a passage from a few blanks to the whole thing from memory.

## Repo layout

```
src/Fill the Word.dc.html   the one source of truth — markup + logic class
src/support.js              vendored Design Component runtime — DO NOT EDIT
build/                      two Python builds + the vendored asset bundle
dist/                       generated, gitignored — never edit, never commit
tests/                      Playwright suites, plain Node, no framework
docs/BUILD.md               how the builds work and why
docs/PROTOTYPE.md           the live artifact, its limits, what has been verified
```

## Working on this

```bash
npm test               # build the artifact and run every suite — do this before claiming done
npm run build          # both outputs
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
- **Translations:** KJV, NKJV, NIV, NLT. Nothing else.
- **Tone:** playful and game-like, not devotional-solemn.
- **Interaction:** **tap a word, then tap a blank.** Tap is the primary way in. Dragging still works and is a Settings toggle (Tap + drag / Tap only), but the design is no longer built around it.
- **Two modes, one game:** casual (a single round on any verse) and memorize (a chosen passage taken up the ladder). They share the board, the word bank, the difficulty scale and the verse picker.
- **The user chooses the verse in both modes:** book, then chapter, then a verse (memorize also takes a range). No cap on the range beyond what a chapter holds. There is no onboarding flow; translation and default difficulty live in Settings.
- **One difficulty scale, four levels, both modes:** **Easy** (25% of the verse blanked), **Medium** (50%), **Hard** (75%), **By Heart** (100%). The level sets HOW MANY words are blanked. Percentages are internal — the UI says the names.
- **Difficulty and rank are different things.** Easy→By Heart is chosen, per round. Novice→Apprentice→Disciple→Teacher→Scholar are *earned* XP ranks and no longer set difficulty. The old "skill tier" picker is gone; don't reintroduce a second difficulty vocabulary.
- **Difficulty and verse are changeable on the game screen** in both modes — a four-way segmented control and a verse button that opens the picker. Casual also gets a shuffle. Changing difficulty mid-round rebuilds the round; in memorize mode it moves you along the ladder.
- **Casual and memorize share everything but progression.** Same board, same bank, same four levels, same picker. Casual is one round with a shuffle; memorize is the ladder plus the after-level choice.
- **Clearing a level always offers three ways forward:** step up a level on this verse, carry the same level across to the next verse, or repeat. The player is never forced to finish a verse before moving on.
- **Both routes through a passage are first-class.** Depth-first (one verse all the way up, then the next) and breadth-first (every verse at Easy, then the whole passage again at Medium). Clearing the last verse mid-ladder offers "Whole passage at <next>", which is what closes the breadth-first loop. Don't remove one route to simplify the overlay.
- **Distractors taper.** Four extra words at Easy, none at By Heart — the crutch goes away as the verse goes in. Distractors are pulled from the rest of the chapter so they read as scripture, not noise.
- **Penalty:** hearts. A wrong drop costs one. At zero the answers reveal and the level ends.
- **Blank appearance:** dashed outline. Not a filled pill, not an underline.
- **Two dials, still kept independent:** the level sets how many words are blanked; word-type toggles (Names, Verbs, Nouns, Book, Chapter & verse) set which words are eligible. Never collapse these into one control.
- **Leaderboard:** friends only. No global.
- **Theme:** light and dark both required; default follows the phone setting.

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

- `corpus` + `chapterCounts` — the verse set both modes now play from. `chapterCounts` holds all 66 books so the picker is fully navigable; `corpus` is keyed `"Book Chapter"` → verse number → KJV text, and now holds the **full KJV** (1,189 chapters, 31,102 verses), sourced from the public-domain [aruljohn/Bible-kjv](https://github.com/aruljohn/Bible-kjv) dataset — see docs/PROTOTYPE.md. There is no dimmed/sample-set edge in the picker anymore.
- `verses` — the original tagged set, kept for its four translations and its `~name` / `~verb` / `~noun` markup. **The corpus is untagged**, so word-type filtering currently has almost nothing to bite on and the blank picker falls back to longer-words-first. Tagging the corpus is the work that would make those toggles matter again.

Difficulty lives in `state.level` (shared) and, during a memorize session, in `mem.level`. Memorization state lives in `state.mem`: the reference, the verse list, which verse is active (`vi`), the current `level`, and `cleared` (highest level cleared per verse). `state.casual` holds the current casual reference. `buildMemGame` and `buildCasualGame` pick the blanks — longer words first at low percentages, everything at 100%.

## Test build (friend testing, public link)

The published artifact is the test build. Rules it now follows:

- **Responsive, not a mockup.** Under 760px the phone frame, the intro copy and the
  screen chips are hidden and the app fills the viewport (`100dvh`, safe-area insets,
  `viewport-fit=cover`). Above 760px the phone frame stays for design review. The
  hooks are `.fw-page`, `.fw-intro`, `.fw-chips`, `.fw-shell`, `.fw-screen`,
  `.fw-status`, `.fw-tabs`, `.fw-bank`, driven by one media query in the helmet style
  block — the only place a stylesheet rule overrides inline styles, and it needs
  `!important` to do it.
- **Every screen must be reachable without the chips.** Home/Progress/Library/Settings
  from the tab bar; Choose verses and Game from Home; Results from the level overlay's
  "See the numbers"; back from Results via "Done". Adding a screen means giving it an
  in-app route, not a chip.
- **Progress persists on the tester's own phone** in `localStorage` under
  `filltheword.v1` — settings, the casual verse, XP, streak, stats and the passage in
  flight. Never the board mid-round. Everything is wrapped in try/catch; blocked storage
  must not break the app. Settings has a "Start over" that clears it.
- **No fake user data on Home.** Real date, time-based greeting with no invented name,
  and XP/streak/accuracy that start at zero and move as the tester plays. Badges, the
  friends leaderboard and Library mastery are still static demo content — if a tester
  asks, that's why.
- **A casual round never discards a passage in flight.** `startGame` and the casual
  branch of `confirmPick` leave `state.mem` alone, so the Home resume card survives.

## Open work

Reverse mode and Reference-only mode exist as Settings toggles but aren't playable rounds yet. Progress, badges and the friends leaderboard are still static apart from the live memorization panel. The corpus is now the full KJV; NKJV/NIV/NLT still only exist in the small 7-verse tagged `verses` set — see PROTOTYPE.md.
