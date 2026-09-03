import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext, Script} from 'node:vm';

const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const statuses = ['watching', 'planned', 'completed', 'dropped', 'on_hold'];
const labels = ['Смотрю', 'Запланировано', 'Просмотрено', 'Брошено', 'Отложено'];
function node(dataset = {}) {
  const classes = new Set();
  return {dataset, attrs: {}, children: {}, hidden: false,
    classList: {toggle(name, active) {active ? classes.add(name) : classes.delete(name)}, contains: name => classes.has(name)},
    setAttribute(name, value) {this.attrs[name] = value},
    querySelector(selector) {return this.children[selector] || null},
    querySelectorAll(selector) {return this.children[selector] || []}};
}
function fixture({failStorage = false} = {}) {
  const stored = new Map(), events = [], desktop = node(), mobile = node();
  desktop.children['.title-list-icon'] = node();
  const options = [...statuses, 'none'].map(listStatus => {
    const item = node({listStatus}); item.children['.list-selection-check'] = node(); return item;
  });
  const cards = ['19', '19', '52991'].map(bookmarkId => {
    const card = node({bookmarkId, bookmarkTitle: 'Монстр'}), menu = node();
    menu.children['[data-bookmark-option]'] = statuses.map(bookmarkOption => node({bookmarkOption}));
    menu.children['[data-bookmark-remove]'] = node();
    card._bookmarkMenu = menu;
    card.children['[data-bookmark-trigger]'] = node();
    card.children['[data-bookmark-status-bar]'] = node();
    return card;
  });
  const titleLabel = node(), mobileLabel = node();
  const counters = [node(), node()];
  for (const counter of counters) counter.children['[data-field="favorites_count"]'] = {textContent: '4 820'};
  const document = node();
  Object.assign(document.children, {'#list-label': titleLabel, '#mobile-list-label': mobileLabel,
    '#list-trigger, [data-open-mobile-list]': [desktop, mobile], '[data-list-status]': options,
    '[data-bookmark-card]': cards, '[data-title-bookmark-count]': counters});
  document.dispatchEvent = event => events.push(event.type);
  const context = createContext({document, bookmarkSheetQuery: {matches: true}, state: {listStatus: 'none'},
    storage: {get(key, fallback = null) {return stored.get(key) ?? fallback}, set(key, value) {if (failStorage) return false; stored.set(key, value); return true}},
    $: (selector, scope = document) => scope.querySelector(selector),
    $$: (selector, scope = document) => scope.querySelectorAll(selector),
    setIcon(target, name) {if (target) target.icon = name},
    CustomEvent: class {constructor(type) {this.type = type}}});
  const constants = source.slice(source.indexOf('  const BOOKMARK_STATUSES'), source.indexOf('  const bookmarkSheetQuery'));
  const readStatus = source.slice(source.indexOf('  function getBookmarkStatus'), source.indexOf('  function refreshIcons'));
  const paint = source.slice(source.indexOf('  function syncBookmarkCard'), source.indexOf('  function initBookmarks'));
  const listLabels = source.slice(source.indexOf('  const listLabels'), source.indexOf('  const subscriptionLabels'));
  const title = source.slice(source.indexOf('  function syncListState'), source.indexOf('  function syncSubscriptionState'));
  new Script(constants + readStatus + paint + listLabels + title).runInContext(context);
  return {context, stored, events, desktop, mobile, options, cards, counters, titleLabel, mobileLabel};
}

test('every status updates desktop, mobile and duplicate cards immediately', () => {
  const f = fixture();
  statuses.forEach((status, index) => {
    assert.equal(f.context.setBookmarkStatus('19', status), true);
    for (const button of [f.desktop, f.mobile]) {
      assert.equal(button.dataset.bookmarkTone, status);
      assert.equal(button.classList.contains('is-active'), true);
      assert.match(button.attrs['aria-label'], new RegExp(labels[index]));
      if (button === f.desktop) assert.notEqual(button.children['.title-list-icon'].icon, 'bookmark-plus');
    }
    assert.equal(f.titleLabel.textContent, labels[index]);
    assert.equal(f.mobileLabel.textContent, labels[index]);
    for (const counter of f.counters) {
      assert.equal(counter.dataset.bookmarkTone, status);
      assert.equal(counter.classList.contains('is-bookmarked'), true);
      assert.match(counter.attrs['aria-label'], new RegExp(`Ваш статус: ${labels[index]}`));
      assert.equal(counter.children['[data-field="favorites_count"]'].textContent, '4 820');
    }
    assert.equal(f.options.filter(option => option.attrs['aria-pressed'] === 'true').length, 1);
    for (const card of f.cards.slice(0, 2)) {
      assert.equal(card.dataset.bookmarkTone, status);
      assert.equal(card.children['[data-bookmark-status-bar]'].textContent, labels[index]);
    }
    assert.equal(f.cards[2].dataset.bookmarkTone, undefined);
    assert.equal(f.stored.get('kitsu-demo-bookmark-status-19'), status);
  });
  assert.equal(f.events.length, 5);
});

test('removal resets the title controls, hides poster label and clears selected options', () => {
  const f = fixture();
  f.context.setBookmarkStatus('19', 'on_hold');
  f.context.setBookmarkStatus('19', 'none');
  for (const button of [f.desktop, f.mobile]) {
    assert.equal(button.dataset.bookmarkTone, undefined);
    if (button === f.desktop) assert.equal(button.children['.title-list-icon'].icon, 'bookmark-plus');
  }
  assert.equal(f.titleLabel.textContent, 'В закладки');
  assert.equal(f.cards[0].children['[data-bookmark-status-bar]'].hidden, true);
  assert.equal(f.options.at(-1).hidden, true);
  assert.equal(f.options.some(option => option.attrs['aria-pressed'] === 'true'), false);
  for (const counter of f.counters) {
    assert.equal(counter.dataset.bookmarkTone, undefined);
    assert.equal(counter.classList.contains('is-bookmarked'), false);
    assert.equal(counter.attrs['aria-label'], 'В списках у 4 820 пользователей');
  }
});

test('failed save leaves selected state intact and emits no success event', () => {
  const f = fixture({failStorage: true});
  f.context.syncBookmarkStatus('19', 'planned');
  const before = f.events.length;
  assert.equal(f.context.setBookmarkStatus('19', 'dropped'), false);
  assert.equal(f.desktop.dataset.bookmarkTone, 'planned');
  assert.equal(f.counters[0].dataset.bookmarkTone, 'planned');
  assert.equal(f.events.length, before);
  assert.equal(f.stored.size, 0);
});

test('restoring a saved status paints both title controls without writing storage', () => {
  const f = fixture();
  f.context.syncBookmarkStatus('19', 'completed');
  assert.equal(f.desktop.dataset.bookmarkTone, 'completed');
  assert.equal(f.mobile.dataset.bookmarkTone, 'completed');
  assert.equal(f.counters[1].dataset.bookmarkTone, 'completed');
  assert.equal(f.stored.size, 0);
});

test('bookmark text remains readable in both themes and on poster bands', () => {
  const styles = readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8');
  const bandStyles = styles.match(/\.bookmark-status-bar\s*\{([^}]+)\}/s)?.[1] || '';
  // Bind the contrast calculation to the actual shipped foreground/background.
  assert.match(bandStyles, /color:\s*#ffffff;/);
  assert.match(bandStyles, /background:\s*color-mix\(in srgb, var\(--bookmark-color\) 28%, #101012\)/);
  const css = readFileSync(new URL('../tokens.css', import.meta.url), 'utf8');
  const blocks = [...css.matchAll(/(:root|html\[data-theme="light"\])\s*\{([^}]+)\}/g)];
  const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const luminance = color => color.map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
  const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
  let tokens = {};
  for (const [, theme, block] of blocks) {
    tokens = {...tokens, ...Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[a-f\d]{6});/gi)].map(m => [m[1], m[2]]))};
    for (const status of statuses) {
      const key = 'bookmark-' + status.replace('_', '-'), fg = rgb(tokens[key + '-text']);
      for (const tint of [0, .1, .16, .2]) {
        const bg = rgb(tokens.surface).map((v, i) => rgb(tokens[key])[i] * tint + v * (1 - tint));
        assert.ok(contrast(fg, bg) >= 4.5, `${theme}: ${status} tint ${tint}`);
      }
      const band = rgb('#101012').map((v, i) => rgb(tokens[key])[i] * .28 + v * .72);
      assert.ok(contrast(rgb('#ffffff'), band) >= 4.5, `${theme}: poster ${status}`);
    }
  }
});

test('existing title status migrates on read and newer card status takes precedence', () => {
  const f = fixture();
  f.stored.set('kitsu-demo-list-status', 'on_hold');
  assert.equal(f.context.getBookmarkStatus('19'), 'on_hold');
  f.stored.set('kitsu-demo-bookmark-status-19', 'completed');
  assert.equal(f.context.getBookmarkStatus('19'), 'completed');
  f.stored.set('kitsu-demo-bookmark-status-19', 'none');
  assert.equal(f.context.getBookmarkStatus('19'), 'none');
  assert.equal(f.context.getBookmarkStatus('52991'), 'planned');
});

test('reference palette keeps the same semantic hues in every theme', () => {
  const css = readFileSync(new URL('../tokens.css', import.meta.url), 'utf8');
  const expected = {planned: '#3b82f6', watching: '#22c55e', completed: '#a855f7', 'on-hold': '#eab308', dropped: '#ef4444'};
  for (const [key, color] of Object.entries(expected)) {
    const values = [...css.matchAll(new RegExp('--bookmark-' + key + ':\\s*(#[a-f0-9]+)', 'g'))].map(match => match[1]);
    assert.deepEqual(values, [color], key);
  }
});

test('poster status bar stays compact and carries no decorative pulse', () => {
  const css = readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8');
  const block = css.match(/\.bookmark-status-bar\s*\{([^}]+)\}/s)?.[1] || '';
  assert.match(block, /min-height:\s*22px/);
  assert.match(block, /padding:\s*2px 8px/);
  assert.match(block, /border-top:\s*2px solid var\(--bookmark-color\)/);
  assert.doesNotMatch(css, /\.bookmark-status-bar::before/);
});
