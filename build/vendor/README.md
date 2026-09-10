# Vendored assets

## `dc-bundle-shell.html`

A published Design Component bundle of this app. It is **not** a build output and
should not be opened as the app — treat it as an asset archive.

Both builds read it:

- Its `__bundler/manifest` script tag carries, gzipped and base64'd: the DC runtime
  (identical to `src/support.js`), React 18.3.1 UMD, ReactDOM 18.3.1 UMD, and the four
  Figtree woff2 faces. `build_artifact.py` inlines these so the published page makes
  no network calls.
- Its loader shell and manifest are reused wholesale by `build_standalone.py`, which
  swaps only the `__bundler/template` payload for a freshly encoded copy of
  `src/Fill the Word.dc.html`.

Replace it only when the Design Component publisher emits a newer bundle — for example
after a runtime upgrade. If you do, check that `src/support.js` still matches the
runtime inside it; the builds print a warning when they diverge.
