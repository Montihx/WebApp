import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const publicCss = read('public/styles.css');
const adminCss = read('admin/styles.css');

// Structural guards for the existing CSS cascade, not a replacement for browser QA.
function rules(css, selector) {
  return [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, selectors]) => selectors.split(',').some(value => value.trim() === selector))
    .map(([, , body]) => body);
}

test('public and admin buttons use one size scale through every cascade layer', () => {
  const tokens = read('tokens.css');
  assert.match(tokens, /--control-height:\s*40px;/);
  assert.match(tokens, /--control-touch-height:\s*44px;/);
  assert.match(tokens, /--mobile-nav-height:\s*54px;/);
  for (const css of [publicCss, adminCss]) {
    const buttonSizes = rules(css, '.button').filter(body => body.includes('min-height:'));
    assert.ok(buttonSizes.length >= 2);
    for (const body of buttonSizes) assert.match(body, /min-height:\s*var\(--control-(?:touch-)?height\);/);
    assert.match(buttonSizes.at(-1), /--control-touch-height/);
  }
});

test('large standalone title, player and drawer actions retain compact touch targets', () => {
  for (const selector of ['.wide-link', '.title-list-dialog__options > button', '.title-list-dialog__remove',
    '.player-main-button', '.drawer-search', '.mobile-drawer-nav a', '.title-mobile-watch', '.load-more-button']) {
    const body = rules(publicCss, selector).filter(body => body.includes('min-height:')).at(-1);
    assert.ok(body, selector);
    assert.match(body, /min-height:\s*var\(--control-touch-height\);/, selector);
  }
  const toolbar = rules(publicCss, '.title-mobile-toolbar__button').join('\n');
  assert.match(toolbar, /width:\s*var\(--control-touch-height\);/);
  assert.match(toolbar, /height:\s*var\(--control-touch-height\);/);
});

test('both bottom bars and floating notifications account for the shared height and safe area', () => {
  for (const [css, selector] of [[publicCss, '.mobile-bottom-nav'], [adminCss, '.mobile-nav']]) {
    const body = rules(css, selector).join('\n');
    assert.match(body, /min-height:\s*calc\(var\(--mobile-nav-height\) \+ env\(safe-area-inset-bottom, 0px\)\)/);
    assert.doesNotMatch(body, /(?:^|\n)\s*height:\s*\d+px/);
    assert.match(rules(css, '.toast-region').join('\n'), /bottom:\s*calc\(var\(--mobile-nav-height\) \+ 12px \+ env\(safe-area-inset-bottom, 0px\)\)/);
  }
  assert.match(rules(publicCss, 'body').join('\n'), /padding-bottom:\s*calc\(var\(--mobile-nav-height\) \+ 8px \+ env\(safe-area-inset-bottom, 0px\)\)/);
});

test('both title counters are wired to the shared saved-state style without a permanent panel', () => {
  const html = read('public/anime.html');
  assert.equal((html.match(/data-title-bookmark-count\b/g) || []).length, 2);
  assert.match(rules(publicCss, '[data-title-bookmark-count].is-bookmarked').join('\n'), /color:\s*var\(--bookmark-text\)/);
  assert.match(rules(publicCss, '.title-community-action').join('\n'), /background:\s*transparent/);
  assert.match(rules(publicCss, '.title-mobile-count').join('\n'), /background:\s*transparent/);
});

test('all changed stylesheet entry points and public scripts share the new cache version', () => {
  const version = 'slider-mobile-cleanup-8';
  for (const page of ['public/index.html', 'public/anime.html', 'admin/index.html']) {
    assert.ok(read(page).includes(`./styles.css?v=${version}`), page);
    if (page.startsWith('public/')) assert.ok(read(page).includes(`./app.js?v=${version}`), page);
  }
  for (const css of [publicCss, adminCss]) assert.ok(css.includes(`../tokens.css?v=${version}`));
});
