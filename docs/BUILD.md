# Build and test

Two outputs come from one source file, `src/Fill the Word.dc.html`.

```
src/Fill the Word.dc.html ──┬─> dist/artifact.html                    (publish as a Claude Artifact)
                            ├─> dist/preview.html                     (same page, wrapped — open it locally)
                            └─> dist/Fill the Word (standalone).html  (self-unpacking, works offline)
```

## Requirements

- Python 3 (standard library only — no pip installs)
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
npm run build          # both outputs
npm run build:artifact # dist/artifact.html + dist/preview.html
npm test               # build the artifact, then run every suite against dist/preview.html
npm run test:all       # build both, run the suites against the preview and the offline bundle
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

## Publishing

`dist/artifact.html` is the file to publish. Republish to the **same artifact URL** so the
link already shared with testers keeps working.

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
