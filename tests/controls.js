'use strict';
// The difficulty switch, the verse button and the shuffle, in both modes.
const H = require('./lib/harness');

module.exports = { name: 'game-screen controls', run };

const blanksTotal = async (screen) => ((await screen.innerText()).match(/0 \/ (\d+)/) || [])[1];

async function run(browser, url) {
  const { page, ctx, errors, screen } = await H.open(browser, { url });
  const notes = [];

  // --- casual ---
  await page.locator('button', { hasText: /^Play this verse$/ }).first().click();
  await H.sleep(700);
  const counts = {};
  for (const level of ['Medium', 'Hard', 'By Heart']) {
    await screen.locator('button', { hasText: new RegExp('^' + level + '$') }).click();
    await H.sleep(600);
    counts[level] = Number(await blanksTotal(screen));
  }
  const rises = counts.Medium < counts.Hard && counts.Hard < counts['By Heart'];
  notes.push(`blanks Medium/Hard/By Heart = ${counts.Medium}/${counts.Hard}/${counts['By Heart']}`);

  const before = await H.currentRef(screen);
  await screen.locator('button[title="Another verse"]').click();
  await H.sleep(700);
  const after = await H.currentRef(screen);
  notes.push(`shuffle ${before} -> ${after}`);

  await screen.locator('button', { hasText: /▾/ }).click();
  await H.sleep(500);
  await H.pick(page, screen, 'Romans', 6, 23, null);
  const cta = await screen.locator('button', { hasText: /^Play this verse$/ }).count();
  await screen.locator('button', { hasText: /^Play this verse$/ }).click();
  await H.sleep(700);
  const picked = await H.currentRef(screen);
  const levelKept = await H.activeLevel(page);
  notes.push(`picker -> ${picked} at ${levelKept}`);

  // --- memorize ---
  await page.locator('button', { hasText: /^Home$/ }).last().click();
  await H.sleep(500);
  await page.locator('button', { hasText: /^Choose verses$/ }).last().click();
  await H.sleep(500);
  await H.pick(page, screen, 'Psalms', 23, 1, 3);
  await screen.locator('button', { hasText: 'Start memorizing' }).click();
  await H.sleep(700);
  await screen.locator('button', { hasText: /^Hard$/ }).click();
  await H.sleep(600);
  const memText = await screen.innerText();
  const heldPosition = /Verse 1 of 3/.test(memText);
  const shuffleHidden = (await screen.locator('button[title="Another verse"]').count()) === 0;
  notes.push(`memorize: level ${await H.activeLevel(page)}, position held ${heldPosition}, shuffle hidden ${shuffleHidden}`);

  await ctx.close();
  return {
    pass: rises && before !== after && cta === 1 && picked === 'Romans 6:23' &&
          levelKept === 'By Heart' && heldPosition && shuffleHidden && errors.length === 0,
    detail: notes.join('; '),
    errors,
  };
}
