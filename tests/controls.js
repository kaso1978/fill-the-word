'use strict';
// The difficulty switch in both modes, the daily challenge's fixed verse and its
// step-up/repeat ladder, and the memorize picker.
const H = require('./lib/harness');

module.exports = { name: 'game-screen controls', run };

const blanksTotal = async (screen) => ((await screen.innerText()).match(/0 \/ (\d+)/) || [])[1];

async function run(browser, url) {
  const { page, ctx, errors, screen } = await H.open(browser, { url });
  const notes = [];

  // --- daily challenge (casual) ---
  const noChangeButton = (await page.locator('button', { hasText: /^Change$/ }).count()) === 0;
  await page.locator('button', { hasText: /^Play this verse$/ }).first().click();
  await H.sleep(700);

  const noShuffle = (await screen.locator('button[title="Another verse"]').count()) === 0;
  const noVersePicker = (await screen.locator('button', { hasText: /▾/ }).count()) === 0;
  const refBefore = await H.currentRef(screen);

  const counts = {};
  for (const level of ['Medium', 'Hard', 'By Heart']) {
    await screen.locator('button', { hasText: new RegExp('^' + level + '$') }).click();
    await H.sleep(600);
    counts[level] = Number(await blanksTotal(screen));
  }
  const rises = counts.Medium < counts.Hard && counts.Hard < counts['By Heart'];
  const refAfter = await H.currentRef(screen);
  notes.push(`blanks Medium/Hard/By Heart = ${counts.Medium}/${counts.Hard}/${counts['By Heart']}`);

  await screen.locator('button', { hasText: /^Easy$/ }).click();
  await H.sleep(600);
  const m = refAfter.match(/^(.+) (\d+):(\d+)$/);
  const verseText = H.corpus()[m[1] + ' ' + m[2]][Number(m[3])];
  await H.solveRound(page, screen, verseText);
  const clearButtons = await H.overlayButtons(screen);
  const offeredStepUp = clearButtons.some((t) => t.startsWith('Step up to'));
  const offeredRepeat = clearButtons.some((t) => t.startsWith('Repeat'));
  await page.locator('button', { hasText: /^Step up to/ }).click();
  await H.sleep(700);
  const steppedUp = await H.activeLevel(page);
  const refAfterStepUp = await H.currentRef(screen);
  notes.push(`daily: cleared Easy -> offered [step up ${offeredStepUp}, repeat ${offeredRepeat}] -> ${steppedUp}, verse unchanged ${refAfterStepUp === refAfter}`);

  await page.locator('button', { hasText: /^Home$/ }).last().click();
  await H.sleep(500);
  const bestLine = /Best:/.test(await page.locator('body').innerText());
  notes.push(`home shows best-level tracking ${bestLine}`);

  // --- memorize ---
  await page.locator('button', { hasText: /^Choose verses$/ }).last().click();
  await H.sleep(500);
  await H.pick(page, screen, 'Psalms', 23, 1, 3);
  await screen.locator('button', { hasText: 'Start memorizing' }).click();
  await H.sleep(700);
  await screen.locator('button', { hasText: /^Hard$/ }).click();
  await H.sleep(600);
  const memText = await screen.innerText();
  const heldPosition = /Verse 1 of 3/.test(memText);
  const shuffleStillGone = (await screen.locator('button[title="Another verse"]').count()) === 0;
  notes.push(`memorize: level ${await H.activeLevel(page)}, position held ${heldPosition}, shuffle absent ${shuffleStillGone}`);

  await ctx.close();
  return {
    pass: noChangeButton && noShuffle && noVersePicker && rises && refBefore === refAfter &&
          offeredStepUp && offeredRepeat && refAfterStepUp === refAfter && steppedUp === 'Medium' &&
          bestLine && heldPosition && shuffleStillGone && errors.length === 0,
    detail: notes.join('; '),
    errors,
  };
}
