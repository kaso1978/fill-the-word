'use strict';
// One verse taken all the way up the ladder before the next one starts.
const H = require('./lib/harness');

module.exports = { name: 'memorize / depth-first', run };

async function run(browser, url) {
  const { page, ctx, errors, screen } = await H.open(browser, { url });
  const verses = H.corpus()['Ephesians 2'];

  await page.locator('button', { hasText: /^Choose verses$/ }).first().click();
  await H.sleep(500);
  await H.pick(page, screen, 'Ephesians', 2, 8, 9);
  await page.locator('.fw-screen button', { hasText: 'Start memorizing' }).click();
  await H.sleep(700);

  // Depth-first via the overlay's Next Verse/Repeat verse + its own level
  // selector: step up by picking the next level chip then Repeat verse
  // (stays on this verse); move on from the top level by picking Easy then
  // Next Verse (restarts the next verse from scratch, same as the old
  // "Verse N from Easy" secondary button did); finish from the last verse
  // at the top level with a plain Next Verse.
  const LEVELS = ['Easy', 'Medium', 'Hard', 'By Heart'];
  let level = 0;
  const seen = [];
  for (let step = 0; step < 12; step++) {
    const header = await screen.innerText();
    const vNum = /Verse 2 of/.test(header) ? 9 : 8;
    await H.solveRound(page, screen, verses[vNum]);
    seen.push(LEVELS[level] + ' cleared');

    const isTop = level === LEVELS.length - 1;
    if (vNum === 9 && isTop) {
      await screen.locator('.fw-overlay button', { hasText: /^Next Verse$/ }).click();
      await H.sleep(600);
      break;
    }
    if (!isTop) {
      level += 1;
      await screen.locator('.fw-overlay button', { hasText: new RegExp('^' + LEVELS[level] + '$') }).click();
      await H.sleep(200);
      await screen.locator('.fw-overlay button', { hasText: /^Repeat verse$/ }).click();
    } else {
      level = 0;
      await screen.locator('.fw-overlay button', { hasText: /^Easy$/ }).click();
      await H.sleep(200);
      await screen.locator('.fw-overlay button', { hasText: /^Next Verse$/ }).click();
    }
    await H.sleep(600);
  }

  const end = await screen.innerText();
  const rounds = seen.length;
  await ctx.close();

  return {
    pass: /Passage complete/.test(end) && rounds === 8 && errors.length === 0,
    detail: `${rounds} rounds (expect 8), ends "${(end.match(/^.*complete.*$/m) || [''])[0]}"`,
    errors,
  };
}
