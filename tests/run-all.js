#!/usr/bin/env node
'use strict';
/**
 * node tests/run-all.js                      # against dist/preview.html
 * node tests/run-all.js --target=standalone  # against the offline bundle
 * node tests/run-all.js --target=both
 * node tests/run-all.js controls             # just the suites whose name matches
 *
 * Build first: python3 build/build_artifact.py
 */
const fs = require('fs');
const H = require('./lib/harness');

const SUITES = [
  require('./memorize-depth'),
  require('./memorize-sweep'),
  require('./controls'),
  require('./input-modes'),
  require('./mobile'),
  require('./onboarding'),
];

(async () => {
  const args = process.argv.slice(2);
  const targetArg = (args.find((a) => a.startsWith('--target=')) || '--target=preview').split('=')[1];
  const filters = args.filter((a) => !a.startsWith('--'));

  const ALL = { preview: H.PREVIEW, standalone: H.STANDALONE };
  if (!['preview', 'standalone', 'both'].includes(targetArg)) {
    console.error(`unknown --target=${targetArg} (preview | standalone | both)`);
    process.exit(2);
  }
  const targets = targetArg === 'both'
    ? Object.entries(ALL)
    : [[targetArg, ALL[targetArg]]];

  for (const [, url] of targets) {
    const file = url.replace('file://', '');
    if (!fs.existsSync(file)) {
      console.error(`missing ${file}\nrun: python3 build/build_artifact.py && python3 build/build_standalone.py`);
      process.exit(2);
    }
  }

  const browser = await H.chromium.launch();
  let failed = 0;

  for (const [label, url] of targets) {
    console.log(`\n=== ${label} ===`);
    for (const suite of SUITES) {
      if (filters.length && !filters.some((f) => suite.name.includes(f))) continue;
      // The offline bundle is the same app; the mobile suite is layout-only, run it once.
      if (label === 'standalone' && suite.name.startsWith('mobile')) continue;
      let result;
      try {
        result = await suite.run(browser, url);
      } catch (err) {
        result = { pass: false, detail: err.message, errors: [] };
      }
      const mark = result.pass ? 'PASS' : 'FAIL';
      if (!result.pass) failed++;
      console.log(`${mark}  ${suite.name}`);
      if (result.detail) console.log(`      ${result.detail}`);
      for (const e of (result.errors || []).slice(0, 4)) console.log(`      ! ${e}`);
    }
  }

  await browser.close();
  console.log(failed ? `\n${failed} suite(s) failed` : '\nall suites passed');
  process.exit(failed ? 1 : 0);
})();
