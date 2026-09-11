'use strict';
// First-open walkthrough: shows once on a fresh install, three distinct
// steps, dismissible either by finishing or by Skip, and stays dismissed
// after a reload — persisted via state.onboardingVersion, not a one-off
// session flag.
const H = require('./lib/harness');

module.exports = { name: 'onboarding walkthrough', run };

async function run(browser, url) {
  const notes = [];

  // --- primary path: step through to the end ---
  const { page, ctx, errors, screen } = await H.open(browser, { url, keepOnboarding: true });
  const title = () => screen.locator('h2').first().innerText();

  const shownOnLoad = (await screen.locator('button', { hasText: /^Skip$/ }).count()) === 1;
  const step0 = await title();

  await screen.locator('button', { hasText: /^Next$/ }).click();
  await H.sleep(300);
  const step1 = await title();

  await screen.locator('button', { hasText: /^Next$/ }).click();
  await H.sleep(300);
  const step2 = await title();
  const finalCtaShown = (await screen.locator('button', { hasText: /^Let's go$/ }).count()) === 1;

  await screen.locator('button', { hasText: /^Let's go$/ }).click();
  await H.sleep(400);
  const reachedHome = (await page.locator('button', { hasText: /^Play this verse$/ }).count()) === 1;
  const dismissed = (await screen.locator('button', { hasText: /^Skip$/ }).count()) === 0;

  await page.reload();
  await H.sleep(1900);
  const staysGoneAfterReload = (await screen.locator('button', { hasText: /^Skip$/ }).count()) === 0;
  await ctx.close();

  notes.push(`steps: "${step0}" -> "${step1}" -> "${step2}"; finished -> home ${reachedHome}, gone ${dismissed}, stays gone after reload ${staysGoneAfterReload}`);

  // --- skip path: dismiss immediately from step 0, same persistence check ---
  const skipRun = await H.open(browser, { url, keepOnboarding: true });
  const skipShown = (await skipRun.screen.locator('button', { hasText: /^Skip$/ }).count()) === 1;
  await skipRun.screen.locator('button', { hasText: /^Skip$/ }).click();
  await H.sleep(300);
  const skipDismissed = (await skipRun.screen.locator('button', { hasText: /^Skip$/ }).count()) === 0;
  await skipRun.page.reload();
  await H.sleep(1900);
  const skipStaysGone = (await skipRun.screen.locator('button', { hasText: /^Skip$/ }).count()) === 0;
  const skipErrors = skipRun.errors;
  await skipRun.ctx.close();

  notes.push(`skip path: shown ${skipShown}, dismissed ${skipDismissed}, stays gone after reload ${skipStaysGone}`);

  return {
    pass: shownOnLoad && step0 !== step1 && step1 !== step2 && finalCtaShown &&
          reachedHome && dismissed && staysGoneAfterReload &&
          skipShown && skipDismissed && skipStaysGone &&
          errors.length === 0 && skipErrors.length === 0,
    detail: notes.join('; '),
    errors: errors.concat(skipErrors),
  };
}
