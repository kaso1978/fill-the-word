# Fill the Word

A mobile app concept: a Bible verse appears with words missing. Tap a word in the tray, tap a blank, and it locks in. Wrong word costs a heart.

Two ways to play. **Daily challenge** is one fixed verse — the same for every player, rotating once a day — that you can take from Easy up to By Heart. **Memorize** is the real point: pick a verse or a passage and work it up from Easy to By Heart, until you're placing every word from memory.

## Getting started

```bash
npm install
npx playwright install chromium
pip install pillow   # only needed for build:pwa, which draws the app icons
npm test
```

Then open `dist/preview.html` in a browser. Needs Python 3 and Node 18+.

## Files

| Path | What it is |
|---|---|
| `src/Fill the Word.dc.html` | The source — all screens, all logic. This is the one to edit. |
| `src/support.js` | Vendored Design Component runtime. Do not edit. |
| `build/build_artifact.py` | → `dist/artifact.html` (publish this) and `dist/preview.html` (open this) |
| `build/build_standalone.py` | → `dist/Fill the Word (standalone).html`, self-contained, works offline |
| `build/build_pwa.py` | → `dist/pwa/`, installable — deploy this to real HTTPS hosting for "Add to Home Screen" |
| `build/vendor/` | The published bundle the builds pull React and the fonts out of |
| `supabase/schema.sql` | Friends' backend: `profiles`/`friendships` tables, `redeem_friend_code` RPC |
| `tests/` | Playwright suites — `npm test` |
| `CLAUDE.md` | Design decisions and product rules |
| `docs/BUILD.md` | How the builds work and why |
| `docs/PROTOTYPE.md` | Historical dev log from the original single-Artifact-link phase — not current-state docs |

## What's in the prototype

Eight screens, navigated by the bottom tab bar (Home / Progress / Friends / Feedback / Settings) plus in-context links (Choose verses and Game from Home, Results from the game itself):

1. **Home** — memorize entry (and a resume card if a passage is in flight), today's daily challenge with its best-level-cleared line, streak, points balance
2. **Choose verses** — book → chapter → verse range, three steps with a live preview; serves both modes
3. **Game** — the core loop (see below), with difficulty and verse controls above the verse
4. **Results** — filled verse review, accuracy, time, points earned, a real badge unlock (only announced when one was actually just earned); Memorize's Results screen also has a share sheet that calls the device's native share (or copies to clipboard if that's not available) — the daily challenge's Results screen doesn't, see Daily challenge below
5. **Progress** — two sub-tabs, **Badges** (default) and **Bible**. Badges: the badge grid, each tile colored by its highest earned tier — Bronze/Silver/Gold/Platinum (see Badges below). Bible: all 66 books, searchable, filterable by testament, per-book mastery — the same content the standalone Library screen used to hold, now living here instead.
6. **Friends** — its own tab; sign in, get a code, connect with someone else's, and see each other's verses memorized and accuracy
7. **Feedback** — its own tab; a short message plus an optional email, no sign-in needed (see Feedback below)
8. **Settings** — translation (KJV, BSB or WEB), default difficulty, this device, theme, and install

A three-screen walkthrough shows once on first open — tap-to-fill, the two modes, and progress tracking — skippable, and gated by a version number rather than a one-time flag, so it can be shown again to existing players after a big enough change (see CLAUDE.md). The first screen is a small looping demo of the real interaction (a blank filling in, a word tile disappearing), not just an icon. Translation and default difficulty live in Settings.

**A 4th step offers to install the app, when there's actually something to offer.** On Android/Chrome/Edge it's a real one-tap install button; on iOS Safari (the only iOS browser that can create a real installed app at all) it's instructions, since Apple doesn't let any website trigger that programmatically; on an already-installed app, or a browser that supports neither, this step doesn't exist at all — those players see the same 3 steps as always. Anyone who skips it can still install later from a matching "Install" section in Settings.

## The game loop

- Verse renders with N words replaced by dashed blanks — the first open one is highlighted, glowing softly, so you always know where a tap will land
- Word bank at the bottom holds the answers plus a few distractors, shuffled
- **Tap a word to fill the highlighted blank** — one tap, no second tap on the blank needed. Built for speed: once you know the verse, tap straight down the bank in order for a fast clear
- **Drag a word to place it anywhere else** — the highlighted blank is just where a plain tap lands; dragging targets whichever blank you drop it on, in any order
- Correct → it locks in orange. Wrong → shake, lose a heart
- At zero hearts, a prompt offers to keep going by spending points — decline and all answers fill in, the level ends as a loss
- 3 free hints per round — reveals the first letter of the next open blank; tap again after that and it costs points instead (see Points economy)
- Timer runs; time under 60s becomes a speed bonus in the points calc

## Difficulty — one scale, both modes

| Level | Blanked | What it feels like |
|---|---|---|
| Easy | 25% | A quarter of the verse missing |
| Medium | 50% | Half the verse missing |
| Hard | 75% | Three quarters missing |
| By Heart | 100% | Every word, nothing given |

The level sets **how many** words go missing. Word-type eligibility (which words count as names/verbs/nouns/etc.) still exists internally, but the Settings toggle for it is gone for now — the corpus is untagged, so it had nothing real to control.

Distractors taper with the level, from four extra words at Easy to none at By Heart, so at the top the bank is exactly the verse, scrambled. Hearts stay flat at 3 regardless of level or mode.

Blanks are chosen longer-words-first below By Heart, so Easy takes out *shepherd* rather than *my*.

## On the game screen

Both modes carry a difficulty switch above the verse:

- **A four-way difficulty switch** — Easy / Medium / Hard / By Heart. Tapping one rebuilds the round at that level. In memorize mode it moves you along the ladder.
- **A verse button** showing the current reference (memorize only) — tapping it opens the book → chapter → verse picker. The daily challenge shows the same reference as plain, non-interactive text; its verse isn't changeable.
- **Verse 1 of 3** (memorize only) — where you are in the passage, with `‹`/`›` arrows on either side to step to any other verse already in range, at the same difficulty.

## Memorize mode

You choose the passage: **book → chapter → verse**. Tapping a verse always selects just that one; press on a verse and drag to build a range, and dragging the start or end of an existing range moves just that edge (the other stays put). "Select whole chapter" is a one-tap shortcut for the whole thing.

Clear a level and the popup offers **Next Verse** (primary) and **Repeat verse** (secondary), plus its own Easy/Medium/Hard/By Heart selector right below them — pick a level there first if you want to change it, then tap one of the two buttons to commit it.

So a passage can be worked two ways, and neither is the "right" one. Go **deep**: bump the selector and tap Repeat verse to push verse 8 from Easy all the way to By Heart, then tap Next Verse to start verse 9. Or go **wide**: leave the selector alone and tap Next Verse through every verse at Easy; on the last verse, a "Whole passage at Medium" link appears beneath the selector to come back around a level higher. You are never forced to finish a verse before moving on. An ✕ in the corner (or "Done for now" at the bottom) exits straight to Home without losing your place.

Run out of hearts and you can retake the level or drop back a step.

Picked up a long passage, made it partway through, and came back later? The `‹`/`›` arrows next to "Verse X of Y" step backward or forward through the passage at the same difficulty — no need to reselect the whole range just to get back to verse 1.

## Daily challenge

One fixed verse a day — picked deterministically from a curated pool of ~77 well-known passages, seeded by the calendar date, so every player gets the same verse on the same day. There's no picker and no shuffle; the only thing you choose is the difficulty.

Clear a level and you land on the Results screen with one **Play again** button and its own Easy/Medium/Hard/By Heart selector — pick a level, then Play again to run it. A **Random verse** button sits alongside it, win or lose — pulls a different verse from that same curated pool for bonus practice without touching today's actual challenge (or its streak/best-level history). There's no Share here — the daily challenge's Results screen is just Play again, Random verse, and Done; Share stays where Memorize's Results screen already has it.

The app remembers the highest level you've ever cleared on each verse (`state.casualCleared`, keyed by reference), shown on Home as "Best: Hard cleared" or similar — so when a verse comes back around in the rotation, you can see how far you'd already gotten and decide whether to push to the next level or run it again.

Missing a single day doesn't reset your streak to zero — one skipped day is forgiven automatically; miss two in a row and it resets to 1, though it can be bought back afterward (see Points economy).

## Points economy

Every round earns points, scaled by difficulty: a base amount for the mode plus a difficulty bonus (bigger at Medium/Hard/By Heart than Easy) and a small speed bonus, minus a small penalty per hint used; a loss still earns a flat, smaller consolation amount. Points are a real balance, spent contextually the moment you need them — there's no pre-buying and nothing to stockpile:

- **Extra heart** — out of hearts mid-round? A prompt offers "Buy heart for 160 points?" to keep going, right there on the button. It only shows up if you can afford it — otherwise the round just ends.
- **Extra hint** — past the free 3, tapping Hint again shows "Buy hint for 80 points?" — reveals the same first letter a free hint would, nothing more. Once you can't afford it, the button disables.
- **Streak restore** — if a streak just reset, Home shows a one-time offer to restore it for 400 points, right where it broke. Doing so also earns the Comeback Kid badge (see Badges below).

## Badges

Every badge is Bronze, Silver, Gold, or Platinum — the four tiers line up with Easy, Medium, Hard, and By Heart. A badge's requirement never changes across tiers; only the minimum difficulty it has to be met at does. Clear your first verse at Easy and First Verse turns Bronze; clear one By Heart and it's Platinum. Once a tier is earned it's permanent — playing at an easier difficulty later, or a streak breaking, never takes a tier away.

The 14 badges: **First Verse**, **Verse Vault** (10 verses mastered), **Psalms x10**, **66 Books**, **Whole Book** (every verse of one book), **No Hints**, **Perfect Round** (zero wrong taps), **Iron Will** (won after reviving from 0 hearts), **Seven Straight** (7-day streak), **Perfect Week** (7 days with no skips), **Night Owl**, **Century Club** (100 rounds played), **Marathon** (5 rounds in one day), and **Comeback Kid** (restored a broken streak).

## Verse data

The picker knows all 66 books and their real chapter counts, so you can navigate anywhere. Verse **text** covers three full translations now — KJV (all 1,189 chapters, 31,102 verses, from the public-domain [aruljohn/Bible-kjv](https://github.com/aruljohn/Bible-kjv) dataset), BSB (Berean Standard Bible, from the public-domain [scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases) dataset) and WEB (World English Bible, from the public-domain [seven1m/open-bibles](https://github.com/seven1m/open-bibles) dataset). BSB and WEB each have a handful fewer verses than KJV's 31,102 — a few spots (Mark 16, Acts 8:37, the Romans 16 doxology) where the underlying manuscript traditions genuinely differ, not a data error. See PROTOTYPE.md.

Both modes play from that corpus, which is now keyed by translation (`corpus.KJV`, `corpus.BSB`, `corpus.WEB`) and read through `activeCorpus()`. The older tagged 7-verse set is still in the source for its `~name`/`~verb`/`~noun` markup (kept for future word-type tagging, not translation coverage) — it isn't what Settings' translation picker uses. Settings lets you select any of the three, all free and public domain. NKJV, NIV and NLT aren't offered and won't be added as free options — they're copyrighted and would need a paid publisher license to embed full text offline, which doesn't fit this app's single-file/zero-network-calls build.

## Tweakable props

Exposed in the Tweaks panel:
- **Accent** — brand color, defaults to church orange `#f28a00`
- **Hearts per verse** — 1–5, defaults to 3, flat across every difficulty level in both modes

## Testing on a phone, tablet, or desktop

The published artifact is a real web page, not a mockup of one, at any size — phone, tablet, or a desktop browser window, installed as a PWA or not. On a phone, a small tablet held in portrait, or most installed-PWA windows, it fills the screen edge to edge, no chrome. On a wide tablet in landscape or a real desktop browser tab, it presents as a card floating on a soft backdrop instead of stretching the same narrow column down the full window height — same app, just framed to fit a much bigger screen. Settings, points, streak and the passage you're partway through are saved on that device, so a tester can close the tab and come back. Settings → **Start over** clears it.

## Progressive Web App

`npm run build:pwa` → `dist/pwa/` — `index.html` (same single self-contained file as the other two builds: React, the runtime and the fonts are all inlined, so it makes zero network calls once loaded), plus a real `manifest.webmanifest`, a service worker (`sw.js`), and generated icons (192/512, regular and maskable, an Apple touch icon, and a favicon — all drawn from the app's own flame mark by `build/pwa-assets/make_icons.py`, not checked into git since they're deterministic).

**This only becomes a real installable PWA once it's hosted somewhere with its own HTTPS origin** — GitHub Pages, Netlify, Vercel, any static host. Deploy the contents of `dist/pwa/` as-is. The claude.ai Artifact link (`dist/artifact.html`) can't do this no matter what's in it: it runs inside a sandboxed iframe, which blocks service worker registration and the install prompt regardless of manifest/meta tags. That link stays the easiest way to share a quick test link; `dist/pwa/` is the one to actually deploy and add to a home screen.

**Updates are automatic — no manual reinstall, no "clear cache" instructions to give anyone.** The service worker fetches the app's one HTML file network-first (falling back to the cached copy only when offline), so a returning visitor with connectivity gets whatever's currently deployed on their very next launch. A small one-time toast — "Updated to the latest version" — tells them when that just happened; it stays quiet on a build they've already seen. See CLAUDE.md for why this is network-first rather than the more typical cache-first (GitHub Pages' own `Cache-Control` on `sw.js` makes the usual "browser notices sw.js changed" update path too slow and inconsistent to rely on here).

## Not built yet

- Reverse mode, Reference-only mode, verse audio and daily reminders have no UI right now — Settings was trimmed down to just Translation, Default difficulty, This device and Appearance. Any of these would need both a real implementation and a settings toggle to come back.
- Friends is deliberately narrow for now — a flat connected-friends list, no removing a friend, no ranking, no real-time updates, no notifications. Natural follow-ups once the basic connect-and-compare flow is proven out.

## Friends

The first feature with a real backend — everything else in this
app is still `localStorage`-only, on this device, nothing sent anywhere.

Sign in with just an email (a magic link, no password), pick a name, and
you get a short code. Share it however you'd share anything else — the
native share sheet, a text, whatever — and whoever enters it becomes
connected to you. From then on you each see the other's **verses
memorized** and **accuracy**, refreshed whenever either of you opens the
Friends section (not continuously — there's no real-time sync or
notifications here).

Tap a friend to see their full badge grid and Bible mastery breakdown —
the same Progress screen you see for your own stats, just showing theirs.
"Back to Friends" (or just tapping the Progress tab) returns to your own
view.

Backend is [Supabase](https://supabase.com) (Postgres + Row Level
Security) — see `supabase/schema.sql` for the two tables and the one RPC
function this needs, and CLAUDE.md's Friends bullet for the fuller
architecture (why it's lazy-loaded from a CDN rather than bundled into the
build like everything else, why sync is on-demand only, why connecting is
a code rather than a username search).

## Feedback

"Feedback" is its own tab in the bottom nav — a short message, plus an
optional email if you want a reply. No sign-in needed. It reuses the same
Supabase backend and lazy-load approach as Friends, going into a
`feedback` table (see `supabase/schema.sql`) that anyone can insert into.
Reading and deleting submissions is restricted by Row Level Security to
one verified admin account, via a hidden "Feedback admin" screen (list +
delete, reachable only by long-pressing the Settings tab) — not exposed
to regular users at all.
