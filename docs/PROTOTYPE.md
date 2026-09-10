# Live prototype

The playable Fill the Word prototype is published as a Claude Artifact:

**https://claude.ai/code/artifact/79c400cd-2f2d-4769-817d-0b228602c00f**

Private to Andrew unless shared from the page's share menu. Opens on desktop or phone.
Seven screens, both themes, tap and drag both working, one four-level difficulty scale
(Easy / Medium / Hard / By Heart) shared by casual and memorize, and the ladder end to end.

## Verse data — read this before demoing to anyone

The picker knows all 66 books and their real chapter counts, so navigation is complete.
Verse **text** is a sample set: **77 KJV verses across 43 chapters**, chosen as the
passages people actually set out to memorize (Psalm 23, the Beatitudes, Romans 8,
1 Corinthians 13:4-8, Ephesians 2:8-10, Philippians 4:6-7, and so on). Chapters with
no text are dimmed in the picker rather than hidden, so the edge of the sample set is
visible instead of a dead end.

That text was written from knowledge, not imported from a source file. **Neither the
build container nor Andrew's machine has outbound network access**, and the package
registries are blocked, so a real KJV could not be fetched. Ahead of friend testing the
corpus was trimmed from 86 verses to 77, dropping the entries whose exact KJV wording was
least certain — long list-structured verses and passages with heavy proper-noun content
(Acts 1:8, Romans 8:38-39, 1 Corinthians 10:13 and 13:8, Galatians 2:20, Hebrews 12:1-2,
2 Timothy 3:17).

**It still has not been diffed against an authoritative KJV.** The fix is to drop any KJV
text or JSON file into the project folder and replace `corpus` in `Fill the Word.dc.html`
with it. The KJV is public domain, so this is a sourcing job, not a licensing one.

Both modes now play from that corpus.

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

Result: ~403 KB, zero external requests, zero console errors.

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
- Progress persists per device in `localStorage` (`filltheword.v1`): settings, casual
  verse, XP, streak, stats and the passage in flight — never the board mid-round. All
  reads and writes are wrapped in try/catch. Settings → "Start over" clears it.
- Home shows a real date, a time-based greeting with no invented name, and counters that
  start at zero and move as the tester plays. Badges, the friends leaderboard and Library
  mastery are still static demo content.
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
- Game-screen controls, casual: the difficulty switch rebuilds the round (John 3:16
  goes 13 → 19 → 25 blanks across Medium/Hard/By Heart), shuffle moves to a different
  verse, and the verse button opens the picker with a "Play this verse" CTA that
  returns to the game on the chosen verse at the current level.
- Game-screen controls, memorize: the difficulty switch moves the ladder level while
  holding verse position ("Verse 1 of 3"), and the shuffle button is correctly absent.
- iPhone 13 and iPhone SE emulation: full-bleed shell at 390x664 and 320x568, zero border
  radius, intro and chips hidden, page not scrollable, every screen reachable without the
  chips, and a reload restores the resume card for the passage in flight.
- Counters: a fresh install reads 0 XP and "—" accuracy; after one cleared level Home
  reads 100% accuracy, 1 verse, 89 XP and a 1-day streak.
- Picker: search → Ephesians → chapter 2 → verses 8 and 9 → live preview → start.
- All seven screens plus dark theme.
- Both input modes: tap-a-word-then-tap-a-blank, and drag-and-drop.
- Level-complete overlay offers "Step up to 40%" / "Repeat 20%" as designed.
