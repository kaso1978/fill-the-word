# Build and test

Three outputs come from one source file, `src/Fill the Word.dc.html`.

```
src/Fill the Word.dc.html ──┬─> dist/artifact.html                    (publish as a Claude Artifact)
                            ├─> dist/preview.html                     (same page, wrapped — open it locally)
                            ├─> dist/Fill the Word (standalone).html  (self-unpacking, works offline)
                            └─> dist/pwa/                             (installable — deploy to real HTTPS hosting)
```

## Requirements

- Python 3, standard library only for two of the three builds. `build_pwa.py` additionally
  needs Pillow (`pip install pillow`) — it draws the app icons itself rather than shipping
  checked-in PNGs, so there's one source of truth instead of images that can drift from
  the code that makes them.
- Node 18+ and `npm install` for the tests, plus `npx playwright install chromium`

**If this repo lives on a Google Drive mount (a `My Drive\...` path on Windows):**
`npm install` will silently corrupt files there — Drive's virtual filesystem can't keep
up with npm extracting thousands of small files, and it fails differently every time
(`TAR_ENTRY_ERROR` warnings, then a truncated `package.json` somewhere under
`node_modules`). Symlinks and junctions don't work either (`New-Item` fails with "Access
is denied" / "Incorrect function") because the mount isn't real NTFS. The fix is to
install `node_modules` on local disk and point Node at it:

```bash
mkdir -p "$LOCALAPPDATA/dev-node-modules/fill-the-word"
cp package.json "$LOCALAPPDATA/dev-node-modules/fill-the-word/"
cd "$LOCALAPPDATA/dev-node-modules/fill-the-word" && npm install && node node_modules/playwright/cli.js install chromium
cd - && NODE_PATH="$LOCALAPPDATA/dev-node-modules/fill-the-word/node_modules" node tests/run-all.js
```

The Python builds (`npm run build` under the hood) don't touch `node_modules` and always
work fine directly on the Drive mount.

## Commands

```bash
npm run build          # all three outputs
npm run build:artifact  # dist/artifact.html + dist/preview.html
npm run build:standalone
npm run build:pwa      # dist/pwa/ — needs Pillow, see Requirements
npm test               # build the artifact, then run every suite against dist/preview.html
npm run test:all       # build artifact + standalone, run the suites against both
node tests/run-all.js controls        # only suites whose name matches "controls"
node tests/run-all.js --target=both
```

## What the artifact build does, and why

`src/Fill the Word.dc.html` is a Design Component: markup with `{{ }}` bindings plus a
logic class, driven by `src/support.js`. Two things about it don't survive publishing:

1. `support.js` fetches React from unpkg at runtime, which the Artifact host's CSP blocks.
   The build inlines React, ReactDOM and the runtime as plain `<script>` blocks, in that
   order. `loadReactUmd()` short-circuits when `window.React` and `window.ReactDOM`
   already exist, so the fetch never fires.
2. The page pulls Figtree from Google Fonts. The build swaps that `<link>` for an
   `@font-face` block carrying the four woff2 faces as `data:` URIs.

It also sets `window.__resources = {}` before the runtime so `boot()` skips its
`fetch(location.href)` re-parse, and strips the document skeleton, because the Artifact
tool supplies its own `<!doctype html><head></head><body>`. The one thing it deliberately
keeps from `<head>` is our `viewport` meta — it carries `viewport-fit=cover`, which the
host's does not, and landing later in the document it wins.

`dist/preview.html` is the same content wrapped in a copy of that host skeleton. That is
what the tests drive, and what to open in a browser while working.

## What the standalone build does

The published bundle format is a loader, a manifest of gzipped assets, and the page
template as a JSON string. The build keeps the vendored loader and manifest and replaces
only the template, after encoding camelCase attributes the way the publisher does
(`onClick` → `sc-camel-on-click`, `viewBox` → `sc-camel-view-box`).

If the Design Component publisher's own tooling is available, re-running that is cleaner.
This exists so the offline build can be regenerated without it.

## What the PWA build does, and why it's a separate target

`dist/pwa/index.html` is built exactly like the artifact — React, ReactDOM, the runtime
and the fonts all inlined, same `_shared.py` helpers, zero network calls once loaded —
but kept as a full standalone HTML document (its own `<!doctype>`/`<head>`/`<body>`)
rather than a fragment, with a `<link rel="manifest">`, an apple-touch-icon, and a
service-worker registration script added to `<head>`/`<body>`.

Alongside it: `manifest.webmanifest` (name, icons, `display: standalone`), `sw.js` (an
app-shell cache — install caches `index.html` + the manifest; the document itself is then
fetched network-first with `cache:"no-store"` on every load, falling back to the cached
copy only when offline, so a returning visitor with connectivity always gets whatever's
currently deployed rather than whatever happened to be cached at install time — see
CLAUDE.md's PWA section for why cache-first-forever isn't safe to use here. Everything
else, like the manifest, stays cache-first, falling back to network and caching what
comes back), and `icons/` (192/512 regular + maskable, an apple-touch-icon, a favicon —
all drawn by `build/pwa-assets/make_icons.py`, not committed since the script regenerates
them deterministically every build).

This has to be a separate target, not just extra tags on the existing artifact, because a
Claude Artifact runs inside a sandboxed iframe: no top-level navigation, no service worker
registration, no install prompt, regardless of what markup or manifest the page carries.
`dist/pwa/` only becomes a real installable PWA once its contents are deployed to actual
HTTPS hosting (GitHub Pages, Netlify, Vercel, anywhere with its own origin) — there's
nothing more to configure at that point, `index.html` is the entry point and the rest are
plain static files sitting next to it.

Verified: manifest fetches with the right content-type; service worker registers,
activates and populates its cache (`caches.keys()` → the app-shell entries) under real
Chromium via Playwright — the sandboxed preview browser used for quick visual checks
during development blocks service worker registration entirely (a tooling limitation of
that preview surface, not of the built output), so use a real browser or Playwright to
verify service-worker behavior, not that preview. Confirmed a full reload with the network
forced offline still renders the complete app. Confirmed the responsive full-bleed layout
holds at 820px (iPad portrait) and at 1440px in a plain, non-installed browser tab — the
app is full-bleed and centered at every width now, there is no separate "design preview"
mode at wider sizes anymore (see CLAUDE.md on `devNav` for how to reach the old
screen-jump chips, hidden behind a tap on the Home greeting).

## Publishing

`dist/artifact.html` is the file to publish as a Claude Artifact. Republish to the **same
artifact URL** so the link already shared with testers keeps working. For a real
installable PWA, deploy `dist/pwa/` to static hosting instead — see above.

## Tests

Plain Node scripts driving Playwright — no test framework. `tests/lib/harness.js` reads
the verse corpus straight out of the source, so the tests cannot drift from the text the
app ships, and answers each round by index-aligning the rendered tokens against the verse.
That means they test the real game without knowing the blanking algorithm.

| Suite | Covers |
|---|---|
| `memorize-depth.js` | One verse up all four levels, then the next; ends at "Passage complete" |
| `memorize-sweep.js` | Carrying a level across verses, and "Whole passage at Medium" closing the loop |
| `controls.js` | Difficulty switch changes blank count; shuffle; picker round-trip; memorize holds verse position |
| `input-modes.js` | Tap-a-word-then-a-blank, and drag-and-drop |
| `mobile.js` | Full-bleed layout on two phone sizes, navigation without the screen chips, persistence across reload, Start over |

Every suite also fails on any console error or page error.
