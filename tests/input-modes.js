'use strict';
// Tap-a-word-then-a-blank and drag-and-drop both always work — there is no
// mode toggle to switch between them anymore.
const H = require('./lib/harness');

module.exports = { name: 'input modes (tap and drag)', run };

async function startPsalm(page, screen) {
  await page.locator('button', { hasText: /^Home$/ }).last().click();
  await H.sleep(400);
  await page.locator('button', { hasText: /^Choose verses$/ }).last().click();
  await H.sleep(450);
  await H.pick(page, screen, 'Psalms', 23, 1, null);
  await screen.locator('button', { hasText: 'Start memorizing' }).click();
  await H.sleep(650);
}

async function run(browser, url) {
  const { page, ctx, errors, screen } = await H.open(browser, { url });
  const text = H.corpus()['Psalms 23'][1];
  const results = [];

  for (const mode of ['tap', 'drag']) {
    await startPsalm(page, screen);

    const seq = await H.verseSequence(page);
    const words = H.tokens(text);
    const i = seq.findIndex((s) => s.blank);
    const answer = words[i];
    const tile = screen.locator('span', { hasText: new RegExp('^' + answer + '$') }).last();

    if (mode === 'tap') {
      await tile.click();
      await page.locator(`[data-blank="${seq[i].id}"]`).click();
    } else {
      const from = await tile.boundingBox();
      const to = await page.locator(`[data-blank="${seq[i].id}"]`).boundingBox();
      await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
      await page.mouse.down();
      await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 14 });
      await page.mouse.up();
    }
    await H.sleep(450);
    const filled = (await page.locator(`[data-blank="${seq[i].id}"]`).innerText()).trim();
    results.push({ mode, answer, filled, ok: filled.replace(/[;.,:]/g, '') === answer });
  }

  await ctx.close();
  return {
    pass: results.every((r) => r.ok) && errors.length === 0,
    detail: results.map((r) => `${r.mode}: "${r.answer}" -> "${r.filled}"`).join('; '),
    errors,
  };
}
