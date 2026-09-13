'use strict';
// Every verse at one level, then the whole passage again a level higher.
const H = require('./lib/harness');

module.exports = { name: 'memorize / breadth-first sweep', run };

async function run(browser, url) {
  const { page, ctx, errors, screen } = await H.open(browser, { url });
  const verses = H.corpus()['Ephesians 2'];

  await page.locator('button', { hasText: /^Choose verses$/ }).first().click();
  await H.sleep(500);
  await H.pick(page, screen, 'Ephesians', 2, 8, 9);
  await page.locator('.fw-screen button', { hasText: 'Start memorizing' }).click();
  await H.sleep(700);

  const steps = [];

  await H.solveRound(page, screen, verses[8]);
  steps.push(await H.overlayButtons(screen));
  await screen.locator('.fw-overlay button', { hasText: /^Next Verse$/ }).click();
  await H.sleep(600);
  const atVerse2 = /Verse 2 of 2/.test(await screen.innerText());

  await H.solveRound(page, screen, verses[9]);
  steps.push(await H.overlayButtons(screen));
  await screen.locator('.fw-overlay button', { hasText: /^Whole passage at Medium$/ }).click();
  await H.sleep(600);
  const backAtStart = await screen.innerText();
  const level = await H.activeLevel(page);

  await ctx.close();
  const pass =
    steps[0].includes('Next Verse') &&
    atVerse2 &&
    steps[1].includes('Whole passage at Medium') &&
    /Verse 1 of 2/.test(backAtStart) &&
    level === 'Medium' &&
    errors.length === 0;

  return {
    pass,
    detail: `carry across: ${steps[0].join(' | ')} -> sweep up: ${steps[1].join(' | ')} -> back at verse 1 on ${level}`,
    errors,
  };
}
