'use strict';
const path = require('path');
const fs = require('fs');
const { chromium, devices } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const PREVIEW = 'file://' + path.join(ROOT, 'dist', 'preview.html');
const STANDALONE = 'file://' + path.join(ROOT, 'dist', 'Fill the Word (standalone).html');

/** Read the verse corpus straight out of the source, so the tests can never
 *  drift from the text the app actually ships. */
function corpus() {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'Fill the Word.dc.html'), 'utf8');
  const start = src.indexOf('corpus = {');
  if (start < 0) throw new Error('corpus not found in source');
  let i = src.indexOf('{', start), depth = 0, j = i;
  for (;; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}' && --depth === 0) break;
  }
  return new Function('return ' + src.slice(i, j + 1))();
}

/** Same trailing-punctuation rule the app's parse() uses. */
const tokens = (text) =>
  text.split(/\s+/).filter(Boolean).map((t) => t.replace(/[.,;:!?'"”’]+$/, ''));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function open(browser, { url = PREVIEW, device = null, colorScheme, keepOnboarding = false } = {}) {
  const opts = device ? { ...devices[device], hasTouch: true, isMobile: true } : { viewport: { width: 1200, height: 1200 } };
  if (colorScheme) opts.colorScheme = colorScheme;
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(url);
  await sleep(1900);
  // Every suite needs Home immediately; a fresh context has no
  // onboardingVersion saved, so the first-open walkthrough is always
  // showing at this point. Dismiss it once, here, rather than in every test
  // — unless the test is about onboarding itself (keepOnboarding: true).
  if (!keepOnboarding) {
    const skip = page.locator('.fw-screen button', { hasText: /^Skip$/ });
    if (await skip.count()) { await skip.click(); await sleep(300); }
  }
  return { page, ctx, errors, screen: page.locator('.fw-screen') };
}

/** The rendered verse line, in order, as {blank, id} — index-aligned with the
 *  verse's tokens, which is what lets the tests answer without knowing the
 *  blanking algorithm. */
function verseSequence(page) {
  return page.evaluate(() => {
    const first = document.querySelector('.fw-screen [data-blank]');
    if (!first) return null;
    return [...first.parentElement.children].map((c) => ({
      blank: c.hasAttribute('data-blank'),
      id: c.getAttribute('data-blank'),
    }));
  });
}

async function currentRef(screen) {
  const text = await screen.innerText();
  const m = text.match(/^([1-3] )?[A-Z][A-Za-z ]+ \d+:\d+$/m);
  return m ? m[0].trim() : null;
}

/** Fill every blank in the current round correctly. A tap on a bank tile
 *  alone now lands in the highlighted (first open) blank, which — filling
 *  left to right — is always the one this loop is up to, so there's no
 *  second click on the blank itself anymore. */
async function solveRound(page, screen, verseText) {
  const seq = await verseSequence(page);
  if (!seq) throw new Error('no verse line on screen');
  const words = tokens(verseText);
  if (seq.length !== words.length) {
    throw new Error(`rendered ${seq.length} tokens, verse has ${words.length}`);
  }
  for (let i = 0; i < seq.length; i++) {
    if (!seq[i].blank) continue;
    const escaped = words[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await page.locator('.fw-screen span', { hasText: new RegExp('^' + escaped + '$') }).last().click();
    await sleep(45);
  }
  await sleep(650);
}

/** Walk book -> chapter -> verse(s) in the picker. A single verse is a tap;
 *  a range is a press-drag-release from the first verse to the last, since
 *  tapping alone only ever selects one verse now. */
async function pick(page, screen, book, chapter, from, to) {
  await page.locator('.fw-screen input').fill(book);
  await sleep(350);
  await page.locator('.fw-screen button', { hasText: book }).first().click();
  await sleep(350);
  await page.locator('.fw-screen button', { hasText: new RegExp('^' + chapter + '$') }).first().click();
  await sleep(350);
  if (to == null) {
    await page.locator('.fw-screen button', { hasText: new RegExp('^' + from + '$') }).first().click();
    await sleep(220);
  } else {
    const fromBox = await page.locator('.fw-screen button', { hasText: new RegExp('^' + from + '$') }).first().boundingBox();
    const toBox = await page.locator('.fw-screen button', { hasText: new RegExp('^' + to + '$') }).first().boundingBox();
    await page.mouse.move(fromBox.x + fromBox.width / 2, fromBox.y + fromBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(toBox.x + toBox.width / 2, toBox.y + toBox.height / 2, { steps: 12 });
    await page.mouse.up();
    await sleep(300);
  }
}

/** Which difficulty chip is selected. */
function activeLevel(page) {
  return page.evaluate(() => {
    const names = ['Easy', 'Medium', 'Hard', 'By Heart'];
    const chips = [...document.querySelectorAll('.fw-screen button')]
      .filter((b) => names.includes(b.innerText.trim()));
    const on = chips.find((b) => getComputedStyle(b).backgroundColor !== 'rgba(0, 0, 0, 0)');
    return on ? on.innerText.trim() : null;
  });
}

async function overlayButtons(screen) {
  const all = await screen.locator('button').allInnerTexts();
  return all.map((t) => t.trim())
    .filter((t) => /^(Next Verse|Play again|Step up to|Verse \d+|Whole passage|Repeat|Run |Finish|Try |Back to|Another verse|See results)/.test(t));
}

module.exports = {
  ROOT, PREVIEW, STANDALONE, chromium, devices,
  corpus, tokens, sleep, open, verseSequence, currentRef, solveRound, pick,
  activeLevel, overlayButtons,
};
