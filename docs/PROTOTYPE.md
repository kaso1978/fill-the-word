# Live prototype (historical — see README.md / CLAUDE.md for the current app)

**This file documents the project's original distribution phase**, when a single Claude
Artifact link (below) was the only published build and every verified behavior got
logged here as a running, append-only history. The project has since moved to a real
GitHub repo (`kaso1978/fill-the-word`) deployed to GitHub Pages as an installable PWA —
that's the build real testers use now (see README.md's "Testing on a phone, tablet, or
desktop" and "Progressive Web App" sections, and CLAUDE.md for the design rationale
behind every feature). **The "Verified" log below is kept as history and is NOT a
description of current behavior** — later entries reflect the app at the time they were
written, and the app has changed substantially since the most recent ones (Friends is
now a real feature with its own backend, not five hardcoded names; the token/Shop system
mentioned below was built and then removed entirely; badges now have four tiers each,
not the original 8 flat ones; the tab bar and Progress screen have been restructured).
Treat every claim below as "true as of when it was written," not "true today."

The playable Fill the Word prototype was originally published as a Claude Artifact:

**https://claude.ai/code/artifact/a52986b5-8f19-4572-acb0-9fadc718aa32**

Private to Andrew unless shared from the page's share menu. Opens on desktop or phone.
Seven screens, both themes, tap and drag both working, one four-level difficulty scale
(Easy / Medium / Hard / By Heart) shared by the daily challenge and memorize, and the ladder end to end.

## Verse data

The picker knows all 66 books and their real chapter counts, so navigation is complete.
Verse **text** now covers three full translations: KJV, BSB (Berean Standard Bible) and
WEB (World English Bible), each all 1,189 chapters. Both modes play from that corpus —
there is no dimmed/sample-set edge left in the picker. `corpus` is keyed by translation
(`corpus.KJV`, `corpus.BSB`, `corpus.WEB`) and read through `activeCorpus()`, which
resolves `state.version` (falling back to KJV).

KJV is sourced from [aruljohn/Bible-kjv](https://github.com/aruljohn/Bible-kjv), a
public-domain KJV text set as per-book JSON. Verse counts were spot-checked against known
totals (Psalms 119 = 176 verses, Revelation 22 = 21 verses, 1,189 chapters overall) and
several verses already hand-entered in the prior sample set were diffed
character-for-character against the fetched text with no mismatches, before the full set
replaced `corpus` in `Fill the Word.dc.html`.

BSB is sourced from [scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases)
(`formats/json/BSB.json`), a public-domain BSB text set (Bible Hub / Berean Bible) in the
same book/chapter/verse JSON shape. Verse and chapter counts matched the KJV corpus
exactly (66 books, 1,189 chapters, 31,102 verses) — same versification, so a reference
means the same thing regardless of which translation is active. Book names needed
renaming to match `chapterCounts`' convention (the source uses Roman-numeral prefixes —
"I Samuel", "II Kings" — and "Revelation of John" instead of "Revelation").

One real content quirk: this BSB source folds Psalm superscriptions ("A Psalm of
David.", sometimes with musical direction or a historical note) into verse 1's text,
where the KJV corpus omits them entirely — e.g. raw BSB Psalm 23:1 is "A Psalm of David.
The LORD is my shepherd; I shall not want." This was hand-fixed (title stripped) for the
~16 most commonly memorized psalms only (8, 19, 22, 23, 24, 27, 34, 46, 51, 90, 100, 103,
121, 130, 139, 145) rather than attempted with a regex — superscriptions are too
irregular in shape (some are one clause, some chain three or four together, some
include a full historical aside like Psalm 51's "When Nathan the prophet came to him
after his adultery with Bathsheba") for one pattern to safely catch all ~115 affected
psalms without risking a mangled edit to real scripture text. Everywhere else in Psalms,
the title stays part of verse 1, faithful to the source — this is a known, accepted
tradeoff, not a bug, and not something to "fix" with an automated pass without manually
checking each one.

WEB is sourced from [seven1m/open-bibles](https://github.com/seven1m/open-bibles)'
`eng-web.usfx.xml` — the World English Bible, public domain by explicit design (it was
translated specifically to have no copyright restriction). USFX is an XML markup: `<c
id="N"/>` marks a chapter, `<v id="N"/>` starts a verse, `<ve/>` ends one. Parsed by
walking those markers directly (no general XML library needed) — verse text is
whatever falls between a `<v>` tag and the next `<c>`/`<v>` marker. Footnotes (`<f
caller="+">...</f>`) and cross-references (`<x caller="+">...</x>`) are stripped
entirely, content included; `<add>...</add>` (translator-supplied words, printed
italicized) has its tag removed but its text kept, same as every other translation
handles added words. The source file also includes the Apocrypha (`TOB`, `JDT`, `WIS`,
`SIR`, `1MA`...) between Malachi and Matthew — skipped, per this app's traditional
66-books-only scope. WEB keeps Psalm superscriptions in a separate `<d>` (descriptive
title) tag that sits *before* `<v id="1">`, structurally outside the verse — so unlike
BSB, WEB never had the superscription-in-verse-1 problem at all; no per-psalm fixing
was needed.

**Both BSB and WEB include a handful of verses their source renders as an empty
string** — well-documented spots where the manuscript tradition each translation
follows places a verse differently than the Textus Receptus KJV is based on, most
often because modern critical-text scholarship (Nestle-Aland/UBS) considers the
traditional verse number absent from the earliest manuscripts. Examples: Mark
7:16/9:44/9:46/11:26/15:28, Acts 8:37/15:34/24:7/28:29, Luke 17:36, John 5:4, Matthew
17:21/18:11/23:14 — and, distinctly, the Romans 16:25-27 doxology, which WEB's source
places instead at Romans 14:24-26 (so WEB's Romans 16 has 24 verses and its Romans 14
has 26, while KJV is 27 and 23 respectively — genuinely different manuscript
placement, not a numbering bug). These empty entries were **removed from the corpus
outright** (16 from BSB, 5 from WEB) rather than shipped as blank, unplayable
"verses" that would break the fill-in-the-blank mechanic with zero words to blank.
The result: BSB has 31,086 verses and WEB has 31,098, against KJV's 31,102 — the gap
is exactly these well-attested spots, verified chapter-by-chapter against KJV (see
`compare_counts`-style check in git history / session log if this needs re-auditing).
This is real, sourced translation variance — don't "fix" the count mismatch by
inventing filler text for these verses.

The older 7-verse tagged `verses` set (KJV/NKJV/NIV/NLT, `~name`/`~verb`/`~noun` markup)
is untouched and still exists for its `~name`/`~verb`/`~noun` markup — see CLAUDE.md's
"Technical shape" section — but it is not what Settings' translation picker reads from,
and it does not represent the app's real translation coverage (`versions`), which is now
KJV, BSB and WEB. NKJV, NIV and NLT are not planned as free options anymore: they're
copyrighted, and getting them to full-Bible coverage the way KJV/BSB/WEB now have would
require a paid publisher license per translation, not just a data drop-in. A biblegateway.com-style
scrape was considered and rejected — most of what's there is the same copyrighted text,
and BibleGateway's Terms of Service prohibit automated/systematic access even for the
public-domain translations it also hosts.

## How the artifact is built

It is the same code as `Fill the Word.dc.html` — not a reimplementation. The design
component needs `support.js`, which fetches React from unpkg, and the bundler's
self-unpacking blob machinery does not survive the Artifact host's CSP. So the artifact
is a flattened build:

1. Start from `Fill the Word.dc.html`.
2. Replace `<script src="./support.js">` with three inline `<script>` blocks:
   React 18.3.1 UMD, ReactDOM 18.3.1 UMD, then `support.js`. The DC runtime skips its
   unpkg fetch when `window.React` and `window.ReactDOM` already exist, so nothing is
   loaded from the network.
3. Replace the Google Fonts `<link>` with the `@font-face` block carrying the four
   Figtree woff2 files as `data:font/woff2;base64,` URIs (lifted from the shipped bundle).
4. Set `window.__resources = {}` before the runtime so `boot()` skips its
   `fetch(location.href)` re-parse of the page.
5. Strip `<!DOCTYPE>`, `<html>`, `<head>`, `<body>` — the Artifact tool supplies that
   skeleton — and prepend `<title>Fill the Word</title>`.

Result: ~12.9 MB (three full Bible translations' text is most of that), zero external requests, zero console errors.

## How the standalone bundle is regenerated

`Fill the Word (standalone).html` was rebuilt without the publisher's tooling, by
swapping the payload inside the existing bundle:

1. Read the `__bundler/template` script tag out of the old standalone (it is a
   JSON-encoded string).
2. Take the new `Fill the Word.dc.html`, point its runtime `<script src>` at the
   runtime asset's uuid, and swap the Google Fonts `<link>` for the old template's
   `@font-face` block (which already references the font uuids).
3. Encode camelCase attributes the way the publisher does: `onClick` →
   `sc-camel-on-click`, `onInput` → `sc-camel-on-input`, `onPointerDown` →
   `sc-camel-on-pointer-down`, `viewBox` → `sc-camel-view-box`.
4. Write it back as the template payload, escaping `</script>` as `</script>`.

The manifest (runtime, React, ReactDOM, four fonts) is untouched. The result was tested
in headless Chromium and plays identically to the artifact. If the publisher's own
bundler is available, re-running it from the source is still the cleaner path.

## Regenerating after a design change

Edit `Fill the Word.dc.html`, then redo both builds above and republish to the SAME
artifact URL (pass it as `url`) so the link Andrew has keeps working.

## Test build

Published for friend testing over a public link — no install, opens in any phone, tablet
or desktop browser.

- Responsive: the app fills the viewport (`100dvh`, `viewport-fit=cover`, safe-area
  insets top and bottom) at any width, phone through desktop — no separate phone-mockup
  "design preview" mode at wider sizes, that's gone. The screen-jump dev nav from
  earlier development is still there but hidden; hold the Settings tab to reveal it,
  tap anywhere outside the bar to close it.
- Progress persists per device in `localStorage` (`filltheword.v1`): settings, per-verse
  cleared levels for both modes, points and the stockpiled revive/hint tokens, streak,
  stats and the passage in flight — never the board mid-round, and never the daily
  challenge's verse itself (that's derived fresh from the date on every load). All reads
  and writes are wrapped in try/catch.
  Settings → "Start over" clears it.
- Home shows a real date, a time-based greeting with no invented name, and counters that
  start at zero and move as the tester plays. Badges and Library mastery are computed
  from real play now (`state.mastered`); the friends leaderboard is still five
  hardcoded names, since real friends need accounts this app doesn't have.
- No capabilities are declared, so the page needs no Claude account and works for any
  viewer with the link.

To share: open the artifact and use its share menu. Artifacts are private until shared.

## Verified

Headless Chromium, on both the artifact build and the standalone bundle:

- Depth-first run of Ephesians 2:8–9 — both verses, all four levels each (8 rounds),
  ending at "Passage complete". Each level-up is a tap on the next level chip in the
  level-complete popup's own selector, then Repeat verse; moving to verse 9 is a tap on
  Next Verse. Zero page errors, zero console errors.
- Breadth-first run of the same passage — verse 8 at Easy, Next Verse (carries Easy to
  verse 9), then on verse 9 (last verse, not yet top level) the popup's "Whole passage at
  Medium" link appears and lands back on verse 8 at Medium. The sweep loop closes
  correctly.
- Game-screen controls, daily challenge: the difficulty switch rebuilds the round; the
  verse reference is fixed, non-interactive text (no verse button, no shuffle); clearing
  a level lands directly on the Results screen offering one "Play again" button plus its
  own Easy/Medium/Hard/By Heart selector — picking a level there stages it (stays on
  Results), and Play again drops you back into a fresh round at whichever level is
  selected, same verse. Home shows "Best: `<level>` cleared" per verse afterward.
- Game-screen controls, memorize: the difficulty switch moves the ladder level while
  holding verse position ("Verse 1 of 3"), and its own verse button still opens the
  picker (memorize is the only mode that can still choose a verse mid-round).
- iPhone 13 and iPhone SE emulation: full-bleed shell at 390x664 and 320x568, zero border
  radius, intro and chips hidden, page not scrollable, every screen reachable without the
  chips, and a reload restores the resume card for the passage in flight.
- Counters: a fresh install reads 0 points and "—" accuracy; after one cleared level Home
  reads 100% accuracy, 1 verse, 89 points and a 1-day streak.
- Picker: search → Ephesians → chapter 2 → verses 8 and 9 (press-drag-release) → live
  preview → start. Confirmed dragging the end anchor of an existing range (1–31) down to
  verse 8 keeps the start fixed and yields 1–8, not a fresh range at the dragged point.
- Picker, Psalms 119 (176 verses), two-tap range: tapped verse 55 (hint read "Now tap
  the last verse", "Clear" appeared), tapped verse 50 second, landed on 119:44–55 (12
  verses) — confirmed by screenshot. Confirmed the verse grid scrolled on its own (rows
  past 36 reachable by scrolling inside the grid) while "Whole chapter", "Clear", the
  preview card and "Start memorizing" all stayed on-screen the whole time, at both a
  full-chapter selection and a 12-verse one — the button bar no longer gets pushed off
  the bottom of the screen on a long chapter.
- Chapter grid (Step 2): every chapter renders in the same neutral, compact style as the
  verse chips — confirmed visually that it no longer reads as "all selected" now that
  every chapter has text.
- Badges: all 8 render their own SVG icon (flame, star, open book, crossed-out lightbulb,
  calendar-check, grad cap, book stack, crescent moon) at both earned and unearned
  opacity/color, confirmed by screenshot. On a fresh install every badge, every Library
  book (0% mastered), and the 5-week calendar are honestly all-unearned — none of the
  old random/hardcoded fake-progress patterns remain.
- Full test suite (6 suites, both build targets — standalone skips the layout-only
  mobile suite) passes after the badge/mastery-ledger/streak-grace rewrite of `finish()`
  and the tap-to-fill interaction change — depth-first, breadth-first, game-screen
  controls, both input modes, mobile/persistence and onboarding all exercise the app
  with zero console errors.
- All seven screens plus dark theme.
- Both input modes: a tap fills the highlighted (first open) blank directly — no second tap on the blank — and a drag places into whichever blank it's dropped on. Confirmed the highlight moves to the next open blank after each correct placement, and that a wrong tap shakes the highlighted blank and costs a heart.
- Memorize's level-complete popup has no icon anymore, just title/subtitle, then
  Next Verse (primary) and Repeat verse (secondary), then its own Easy/Medium/Hard/By
  Heart selector, confirmed by screenshot. On the last verse of a passage, below the top
  level, a "Whole passage at `<level>`" link appears under the selector and correctly
  jumps back to verse 1 at that level — confirmed by screenshot and by the sweep test.
- The daily challenge's Results screen gets the same treatment: no icon, one "Play
  again" button, and its own Easy/Medium/Hard/By Heart selector. Confirmed by screenshot
  that picking "By Heart" on the selector while still on Results (no navigation happens),
  then tapping Play again, launches a fresh round at By Heart (14 blanks on Galatians
  5:22, up from 4 at the level just cleared) — the staged level actually carries through,
  not just cosmetic. Memorize's own Passage-complete Results screen keeps its icon,
  unaffected — only the daily-challenge branch changed.
- Memorize's level-complete popup now has an X (top-right) and a "Done for now" link
  (bottom), both going Home. Confirmed by screenshot that the X renders cleanly without
  overlapping the title, and that tapping it lands on Home with the in-progress passage
  still showing as "Resume `<passage>`" on the Memorize card — nothing lost, just exited.
- The real app (no phone mockup, no intro copy) is now the only appearance at every
  width. Confirmed by screenshot at the default preview width and at 1440px in a plain
  (non-installed) browser tab: same full-bleed layout both times, centered at ~560px
  wide on the desktop-sized one, no phone frame or "Interactive prototype" wrapper
  either way. Confirmed holding the Settings tab reveals a floating dev screen-jump
  bar at the top of the viewport at both sizes, that a chip in it (Progress) correctly
  navigates, and that the rest of the app underneath is unaffected by the overlay.
- Onboarding: shown on a fresh install, three distinct steps via Next, dismissible either
  by finishing ("Let's go") or by Skip from any step, and confirmed **not** to reappear
  after a reload either way — `state.onboardingVersion` persists the dismissal, it isn't
  a session-only flag. Confirmed by screenshot (scrubbing the animations directly) that
  step 1's demo runs the full sequence over John 3:16: tap the wrong word first ("world"),
  the blank shakes red with no fill, then tap the right one ("loved") and it fills, then
  the second blank lights up and fills correctly too — not a static mockup, and not just
  a single always-correct fill. Step 2 ("Two ways to play") now shows Daily Challenge and
  Memorize as two separate labeled blocks (chip + one sentence each), confirmed by
  screenshot, instead of one paragraph with the names just bolded inline.
- Home's "Play this verse" button is now the same filled-orange treatment as "Choose
  verses" above it, confirmed by screenshot.
- Home's "Daily challenge" label is now the same orange chip treatment as the
  "Memorize" label above it (was plain muted text before), confirmed by screenshot.
- Game screen: the verse-and-hint block now sits directly against the word bank
  regardless of verse length (`justify-content:flex-end` on the scrollable verse
  container) — confirmed on both a 17-blank and an 8-blank round that there's no gap
  between the Hint button and the bank tray either way.
- Hearts render as real heart-shaped SVGs now — filled red for alive, an outline for
  lost — confirmed both states by screenshot after deliberately missing one.
- Word bank caps at 8 visible tiles instead of showing the whole pool. Confirmed on a
  375×812 viewport with By Heart on Psalms 1:3 (34 bank tiles, zero distractors): exactly
  8 tiles render, the tray stays a fixed ~160px, and the header reads "8 of 34" — the
  verse above it keeps its room regardless of how long the verse or how high the level.
- Home's streak pill is a flame icon + count now, not an unlabeled pulsing dot + count.
  Confirmed by screenshot at 375px and no horizontal overflow at 320px width.
- Word bank tiles reshuffle on every correct placement — confirmed by reading the bank's
  DOM order before and after a placement: 6 of 8 visible tiles changed, not just the last
  slot. The bank tray's header is the round's progress bar now (moved down from above the
  verse); the "Word bank" title and the "N of M" count are gone.
- Results screen's primary button now reads "Practice another verse" and rebuilds a
  casual round after a Verse-complete finish, or "Memorize another verse" and opens the
  picker after a memorize Passage-complete finish — it used to say "Practice" and
  restart a casual round either way, which was wrong for memorize.
- Daily challenge no longer shows a separate "level cleared" popup before the Results
  screen — finishing a round goes straight to the one Results screen, which now carries
  the Step up/Repeat (or Try again/Back a step) buttons itself. Confirmed clicking
  "Step up to Medium" from that screen returns to a live, freshly-built Medium round,
  not a stale board. Memorize's own between-verse popup (moving through a passage) is
  unchanged.
- Home's two cards are reordered: Daily challenge first, Memorize second, confirmed by
  screenshot.
