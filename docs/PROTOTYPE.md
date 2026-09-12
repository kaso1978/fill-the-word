# Live prototype

The playable Fill the Word prototype is published as a Claude Artifact:

**https://claude.ai/code/artifact/a52986b5-8f19-4572-acb0-9fadc718aa32**

Private to Andrew unless shared from the page's share menu. Opens on desktop or phone.
Seven screens, both themes, tap and drag both working, one four-level difficulty scale
(Easy / Medium / Hard / By Heart) shared by the daily challenge and memorize, and the ladder end to end.

## Verse data

The picker knows all 66 books and their real chapter counts, so navigation is complete.
Verse **text** is now the full KJV: all 1,189 chapters, 31,102 verses. Both modes play
from that corpus — there is no dimmed/sample-set edge left in the picker.

Sourced from [aruljohn/Bible-kjv](https://github.com/aruljohn/Bible-kjv), a public-domain
KJV text set as per-book JSON. Verse counts were spot-checked against known totals
(Psalms 119 = 176 verses, Revelation 22 = 21 verses, 1,189 chapters overall) and several
verses already hand-entered in the prior sample set were diffed character-for-character
against the fetched text with no mismatches, before the full set replaced `corpus` in
`Fill the Word.dc.html`.

The older 7-verse tagged `verses` set (KJV/NKJV/NIV/NLT, `~name`/`~verb`/`~noun` markup)
is untouched and still exists for its four translations — see CLAUDE.md's "Technical
shape" section. Getting NKJV/NIV/NLT to full-Bible coverage the way KJV now has requires
separate licensing per translation (NIV and NLT are not public domain), not just a data
drop-in.

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

Result: ~4.6 MB (full KJV text is most of that), zero external requests, zero console errors.

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

Published for friend testing over a public link — no install, opens in any phone browser.

- Responsive: under 760px the phone frame, intro copy and screen chips are hidden and the
  app fills the viewport (`100dvh`, `viewport-fit=cover`, safe-area insets top and bottom).
  Above 760px the frame stays for design review.
- Progress persists per device in `localStorage` (`filltheword.v1`): settings, per-verse
  cleared levels for both modes, XP, streak, stats and the passage in flight — never the
  board mid-round, and never the daily challenge's verse itself (that's derived fresh
  from the date on every load). All reads and writes are wrapped in try/catch.
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
  ending at "Passage complete". Zero page errors, zero console errors.
- Breadth-first run of the same passage — verse 8 at Easy, "Verse 9 at Easy", then
  "Whole passage at Medium" landing back on verse 8, which then offers
  "Verse 9 at Medium". The sweep loop closes correctly.
- Game-screen controls, daily challenge: the difficulty switch rebuilds the round; the
  verse reference is fixed, non-interactive text (no verse button, no shuffle); clearing
  a level lands directly on the Results screen offering "Step up to `<next>`" and
  "Repeat `<level>`" right there alongside the stats, and stepping up keeps the same
  verse and drops you back into a fresh round at the new level. Home shows
  "Best: `<level>` cleared" per verse afterward.
- Game-screen controls, memorize: the difficulty switch moves the ladder level while
  holding verse position ("Verse 1 of 3"), and its own verse button still opens the
  picker (memorize is the only mode that can still choose a verse mid-round).
- iPhone 13 and iPhone SE emulation: full-bleed shell at 390x664 and 320x568, zero border
  radius, intro and chips hidden, page not scrollable, every screen reachable without the
  chips, and a reload restores the resume card for the passage in flight.
- Counters: a fresh install reads 0 XP and "—" accuracy; after one cleared level Home
  reads 100% accuracy, 1 verse, 89 XP and a 1-day streak.
- Picker: search → Ephesians → chapter 2 → verses 8 and 9 (press-drag-release) → live
  preview → start. Confirmed dragging the end anchor of an existing range (1–31) down to
  verse 8 keeps the start fixed and yields 1–8, not a fresh range at the dragged point;
  confirmed a plain tap on a mid-range verse collapses the selection to that one verse.
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
- Level-complete overlay offers "Step up to 40%" / "Repeat 20%" as designed.
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
