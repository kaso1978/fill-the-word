# Fill the Word — project context

Mobile app concept. A Bible verse appears with words missing; the player puts the words back. Two ways in: a daily challenge on a fixed verse that rotates once a day, and a memorization ladder that takes a passage from a few blanks to the whole thing from memory.

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
- **Translations:** KJV, NKJV, NIV, NLT are the planned set, but **only KJV is selectable right now.** The other three show in Settings greyed out with a "future feature" note — don't wire them up to real text until they're actually ready (see docs/PROTOTYPE.md on what full-Bible coverage for them would take).
- **Tone:** playful and game-like, not devotional-solemn.
- **Interaction:** **tap a word, then tap a blank, or drag it.** Both always work simultaneously — there is no "Tap only" vs. "Tap + drag" setting anymore. A press-and-release with no movement resolves as tap-select; a press-move-release resolves as a drag. Don't reintroduce the toggle.
- **Two modes, one game:** the daily challenge (a fixed verse, same for every player, that rotates once a day) and memorize (a chosen passage taken up the ladder). They share the board, the word bank and the difficulty scale.
- **The daily challenge's verse is not chosen by the player.** It's picked deterministically from a curated pool of ~77 well-known passages (see `dailyPool`/`dailyRef` in the logic class), seeded by the calendar date so every player sees the same verse on the same day — no picker, no shuffle, nothing random per device. Memorize is the opposite: **the user chooses the verse there** — book, then chapter, then a verse. There is no onboarding flow; translation and default difficulty live in Settings.
- **Picking a verse range is a tap-or-drag, not two taps.** Tapping a verse always selects just that one. Pressing on a verse and dragging builds a range from wherever you started to wherever you release; grabbing the current start or end of an existing range and dragging it moves just that edge, keeping the other one fixed (`pickVerseDown`/`onMove`/`onUp` in the logic class — the same tap-vs-drag movement-threshold pattern as the word bank, reusing the existing global `pointermove`/`pointerup` listeners). "Select whole chapter" is still there as a one-tap shortcut. Don't bring back the old "tap a second verse to extend" model — a tap has to mean one verse, unambiguously.
- **One difficulty scale, four levels, both modes:** **Easy** (25% of the verse blanked), **Medium** (50%), **Hard** (75%), **By Heart** (100%). The level sets HOW MANY words are blanked. Percentages are internal — the UI says the names.
- **Difficulty and rank are different things.** Easy→By Heart is chosen, per round. Novice→Apprentice→Disciple→Teacher→Scholar are *earned* XP ranks and no longer set difficulty. The old "skill tier" picker is gone; don't reintroduce a second difficulty vocabulary.
- **Difficulty is changeable on the game screen in both modes** — a four-way segmented control. Changing it mid-round rebuilds the round; in memorize mode it moves you along the ladder. The verse picker button only appears in memorize mode now; the daily challenge shows its (fixed) reference as plain text.
- **Casual and memorize share everything but progression and verse choice.** Same board, same bank, same four levels. The daily challenge is one fixed verse with its own step-up/repeat ladder (see below); memorize is a chosen passage with the ladder plus the after-level choice.
- **The app tracks the highest level cleared per verse, for both modes.** Memorize already had this (`mem.cleared`); the daily challenge now has the same thing (`state.casualCleared`, keyed by "Book Chapter:Verse"), persisted, and surfaced on Home as "Best: `<level>` cleared" (or "Not started yet" / "Mastered — By Heart cleared"). Because the daily pool repeats over time, this is real per-verse history, not just "today's" state.
- **Clearing a level in the daily challenge offers two ways forward: step up a level on this verse, or repeat.** There's no "next verse" option — it's one fixed verse a day. This is deliberately the same feeling as "I know this one, give me the next difficulty" vs. "let me run it again," which was the whole point of tracking per-verse level history.
- **Clearing a level in memorize always offers three ways forward:** step up a level on this verse, carry the same level across to the next verse, or repeat. The player is never forced to finish a verse before moving on.
- **Both routes through a passage are first-class.** Depth-first (one verse all the way up, then the next) and breadth-first (every verse at Easy, then the whole passage again at Medium). Clearing the last verse mid-ladder offers "Whole passage at <next>", which is what closes the breadth-first loop. Don't remove one route to simplify the overlay.
- **Distractors taper.** Four extra words at Easy, none at By Heart — the crutch goes away as the verse goes in. Distractors are pulled from the rest of the chapter so they read as scripture, not noise.
- **Penalty:** hearts. A wrong drop costs one. At zero the answers reveal and the level ends.
- **Blank appearance:** dashed outline. Not a filled pill, not an underline.
- **Word-type filtering is no longer a Settings option.** The level still sets how many words are blanked; `state.types` (which word-types are eligible) still exists internally with its defaults and the blank-picking algorithm in `buildCasualGame`/`buildMemGame` still reads it, but the "What gets blanked" toggle UI is gone — with the corpus untagged, it had nothing real to bite on and just looked like a working setting that wasn't. Don't re-add the UI without also tagging the corpus.
- **Leaderboard:** friends only. No global.
- **Theme:** light and dark both required; default follows the phone setting.
- **Settings stays minimal on purpose.** Translation, Default difficulty, This device (Start over) and Appearance are the whole screen. Verse audio, Reverse mode, Reference-only mode and Daily reminder — the old "Extras" section — are removed, not hidden; none of them were implemented behind the toggle anyway. Re-add a setting only alongside the feature it controls, not ahead of it.

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
