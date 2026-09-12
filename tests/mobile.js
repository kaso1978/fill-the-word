'use strict';
// On a phone this has to be the app, not a picture of a phone.
const H = require('./lib/harness');

module.exports = { name: 'mobile layout and persistence', run };

async function run(browser, url) {
  const notes = [];
  const allErrors = [];

  for (const device of ['iPhone 13', 'iPhone SE']) {
    const { page, ctx, errors } = await H.open(browser, { url, device });
    const layout = await page.evaluate(() => {
      const shell = document.querySelector('.fw-shell');
      const r = shell.getBoundingClientRect();
      return {
        w: Math.round(r.width), h: Math.round(r.height),
        radius: getComputedStyle(shell).borderRadius,
        introHidden: getComputedStyle(document.querySelector('.fw-intro')).display === 'none',
        chipsHidden: getComputedStyle(document.querySelector('.fw-chips')).display === 'none',
        vw: innerWidth, vh: innerHeight,
        pageScrolls: document.documentElement.scrollHeight > innerHeight + 2,
      };
    });
    const fullBleed = layout.w === layout.vw && layout.h === layout.vh &&
      layout.radius === '0px' && layout.introHidden && layout.chipsHidden && !layout.pageScrolls;
    notes.push(`${device}: ${layout.w}x${layout.h} full-bleed ${fullBleed}`);
    if (!fullBleed) allErrors.push(`${device} did not go full-bleed: ${JSON.stringify(layout)}`);
    allErrors.push(...errors);
    await ctx.close();
  }

  // Reach the game with no screen chips, then reload and expect to be offered a resume.
  const { page, ctx, errors, screen } = await H.open(browser, { url, device: 'iPhone 13' });
  await page.getByRole('button', { name: 'Choose verses' }).first().tap();
  await H.sleep(500);
  await H.pick(page, screen, 'Psalms', 23, 1, null);
  await screen.locator('button', { hasText: 'Start memorizing' }).click();
  await H.sleep(650);
  const reachedGame = /Hint ·/.test(await screen.innerText());

  await page.reload();
  await H.sleep(1900);
  const afterReload = await screen.innerText();
  const resumed = /Resume Psalms 23:1/.test(afterReload);

  // Start over should clear it.
  await page.getByRole('button', { name: 'Settings' }).last().tap();
  await H.sleep(500);
  await page.getByRole('button', { name: 'Start over' }).tap();
  await H.sleep(600);
  const cleared = !/Resume Psalms/.test(await screen.innerText());

  allErrors.push(...errors);
  await ctx.close();
  notes.push(`no-chip navigation ${reachedGame}, resume after reload ${resumed}, start over clears ${cleared}`);

  return {
    pass: reachedGame && resumed && cleared && allErrors.length === 0,
    detail: notes.join('; '),
    errors: allErrors,
  };
}
