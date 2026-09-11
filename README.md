# Fill the Word

A mobile app concept: a Bible verse appears with words missing. Tap a word in the tray, tap a blank, and it locks in. Wrong word costs a heart.

Two ways to play. **Daily challenge** is one fixed verse — the same for every player, rotating once a day — that you can take from Easy up to By Heart. **Memorize** is the real point: pick a verse or a passage and work it up from Easy to By Heart, until you're placing every word from memory.

## Getting started

```bash
npm install
npx playwright install chromium
npm test
```

Then open `dist/preview.html` in a browser. Needs Python 3 (standard library only) and Node 18+.

## Files

| Path | What it is |
|---|---|
| `src/Fill the Word.dc.html` | The source — all screens, all logic. This is the one to edit. |
| `src/support.js` | Vendored Design Component runtime. Do not edit. |
| `build/build_artifact.py` | → `dist/artifact.html` (publish this) and `dist/preview.html` (open this) |
| `build/build_standalone.py` | → `dist/Fill the Word (standalone).html`, self-contained, works offline |
| `build/vendor/` | The published bundle the builds pull React and the fonts out of |
| `tests/` | Playwright suites — `npm test` |
| `CLAUDE.md` | Design decisions and product rules |
| `docs/BUILD.md` | How the builds work and why |
| `docs/PROTOTYPE.md` | The live test build, its limits, what has been verified |

## What's in the prototype

Seven screens in a single phone frame, navigated by the chips above it:

1. **Home** — memorize entry (and a resume card if a passage is in flight), today's daily challenge with its best-level-cleared line, streak, XP toward next rank
2. **Choose verses** — book → chapter → verse range, three steps with a live preview; serves both modes
3. **Game** — the core loop (see below), with difficulty and verse controls above the verse
4. **Results** — filled verse review, accuracy, time, XP, a real badge unlock (only announced when one was actually just earned), and a share sheet that calls the device's native share (or copies to clipboard if that's not available)
5. **Progress** — the passage you're memorizing with per-verse level pips, 5-week calendar, lifetime stats, badges (each with its own icon), friends leaderboard
6. **Library** — all 66 books, searchable, filterable by testament, per-book mastery
7. **Settings** — translation (KJV only for now), default difficulty, this device, theme

There is no onboarding flow. Translation and default difficulty live in Settings.

## The game loop

- Verse renders with N words replaced by dashed blanks — the first open one is highlighted, glowing softly, so you always know where a tap will land
- Word bank at the bottom holds the answers plus a few distractors, shuffled
- **Tap a word to fill the highlighted blank** — one tap, no second tap on the blank needed. Built for speed: once you know the verse, tap straight down the bank in order for a fast clear
- **Drag a word to place it anywhere else** — the highlighted blank is just where a plain tap lands; dragging targets whichever blank you drop it on, in any order
- Correct → it locks in orange. Wrong → shake, lose a heart
- At zero hearts all answers fill in and the level ends as a loss
- 3 hints per round — reveals the first letter of the next open blank
- Timer runs; time under 60s becomes a speed bonus in the XP calc

## Difficulty — one scale, both modes

| Level | Blanked | What it feels like |
|---|---|---|
| Easy | 25% | A quarter of the verse missing |
| Medium | 50% | Half the verse missing |
| Hard | 75% | Three quarters missing |
| By Heart | 100% | Every word, nothing given |

The level sets **how many** words go missing. Word-type eligibility (which words count as names/verbs/nouns/etc.) still exists internally, but the Settings toggle for it is gone for now — the corpus is untagged, so it had nothing real to control.

Two things move with the level. Distractors taper from four extra words at Easy to none at By Heart, so at the top the bank is exactly the verse, scrambled. Hearts go the other way, 3 at Easy up to 6 at By Heart, because a 19-blank verse on three hearts isn't a memory test, it's a coin flip.

Blanks are chosen longer-words-first below By Heart, so Easy takes out *shepherd* rather than *my*.

## On the game screen

Both modes carry a difficulty switch above the verse:

- **A four-way difficulty switch** — Easy / Medium / Hard / By Heart. Tapping one rebuilds the round at that level. In memorize mode it moves you along the ladder.
- **A verse button** showing the current reference (memorize only) — tapping it opens the book → chapter → verse picker. The daily challenge shows the same reference as plain, non-interactive text; its verse isn't changeable.
- **Verse 1 of 3** (memorize only) — where you are in the passage.

## Memorize mode

You choose the passage: **book → chapter → verse**. Tapping a verse always selects just that one; press on a verse and drag to build a range, and dragging the start or end of an existing range moves just that edge (the other stays put). "Select whole chapter" is a one-tap shortcut for the whole thing.

Clear a level and you get three ways forward:

- **Step up** — same verse, next level
- **Next verse at the same level** — carry Easy across to the following verse
- **Repeat** — run this level again to set it deeper

So a passage can be worked two ways, and neither is the "right" one. Go **deep**: take verse 8 from Easy all the way to By Heart, then start verse 9. Or go **wide**: clear every verse at Easy, and on the last verse take "Whole passage at Medium" to come back around a level higher. You are never forced to finish a verse before moving on.

Run out of hearts and you can retake the level or drop back a step.

## Daily challenge

One fixed verse a day — picked deterministically from a curated pool of ~77 well-known passages, seeded by the calendar date, so every player gets the same verse on the same day. There's no picker and no shuffle; the only thing you choose is the difficulty.

Clear a level and you get two ways forward:

- **Step up** — same verse, next level
- **Repeat** — run this level again

The app remembers the highest level you've ever cleared on each verse (`state.casualCleared`, keyed by reference), shown on Home as "Best: Hard cleared" or similar — so when a verse comes back around in the rotation, you can see how far you'd already gotten and decide whether to push to the next level or run it again. Rank (Novice → Scholar) is earned through XP and no longer sets difficulty.

Missing a single day doesn't reset your streak to zero — one skipped day is forgiven automatically; miss two in a row and it resets to 1.

## Verse data

The picker knows all 66 books and their real chapter counts, so you can navigate anywhere. Verse **text** is now the full KJV — all 1,189 chapters, 31,102 verses, sourced from the public-domain [aruljohn/Bible-kjv](https://github.com/aruljohn/Bible-kjv) dataset. See PROTOTYPE.md.

Both modes play from that corpus. The older tagged 7-verse set is still in the source for its four translations (KJV/NKJV/NIV/NLT); the full corpus itself is untagged. Settings only lets you select KJV right now — NKJV, NIV and NLT show greyed out with a "future feature" note, since expanding them to full-Bible coverage the way KJV now has would need separate licensing per translation (NIV and NLT aren't public domain).

## Tweakable props

Exposed in the Tweaks panel:
- **Accent** — brand color, defaults to church orange `#f28a00`
- **Hearts per verse** — 1–5, defaults to 3 (both modes add one per difficulty level on top)

## Testing on a phone

The published artifact is a real mobile web page, not a mockup of one. On a phone the frame and the prototype chrome disappear and the app fills the screen; on a desktop the phone frame stays for design review. Settings, XP, streak and the passage you're partway through are saved on that device, so a tester can close the tab and come back. Settings → **Start over** clears it.

## Not built yet

- Reverse mode, Reference-only mode, verse audio and daily reminders have no UI right now — Settings was trimmed down to just Translation, Default difficulty, This device and Appearance. Any of these would need both a real implementation and a settings toggle to come back.
- The friends leaderboard is still five hardcoded names — real friends need accounts and a backend, which this app doesn't have. Badges and Library mastery percentages used to be in this category too; both are computed from real play now (see `state.mastered` in CLAUDE.md).
