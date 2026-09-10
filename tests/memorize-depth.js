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

  const seen = [];
  for (let step = 0; step < 12; step++) {
    const header = await screen.innerText();
    const vNum = /Verse 2 of/.test(header) ? 9 : 8;
    await H.solveRound(page, screen, verses[vNum]);

    const buttons = await H.overlayButtons(screen);
    seen.push(buttons[0]);
    if (buttons.some((b) => /^Finish passage$/.test(b))) {
      await screen.locator('button', { hasText: /^Finish passage$/ }).click();
      await H.sleep(600);
      break;
    }
    const next = screen.locator('button', { hasText: /^(Step up to|Verse \d+ from)/ }).first();
    if (!(await next.count())) throw new Error('no way forward from: ' + buttons.join(', '));
    await next.click();
    await H.sleep(600);
  }

  const end = await screen.innerText();
  const rounds = seen.length;
  await ctx.close();

  return {
    pass: /Passage complete/.test(end) && rounds === 8 && errors.length === 0,
    detail: `${rounds} rounds (expect 8), ends "${end.split('\n')[1]}"`,
    errors,
  };
}
