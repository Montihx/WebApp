import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, Script } from 'node:vm';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const tokens = read('tokens.css');

for (const area of ['public', 'admin']) {
  test(`${area}: touch focus does not remove keyboard navigation or steal focus`, () => {
    const source = read(`${area}/app.js`);
    const start = source.indexOf('  function initInputModality()');
    const end = source.indexOf('  initInputModality();', start);
    const listeners = new Map();
    const root = { dataset: {} };
    const document = { documentElement: root, addEventListener(name, fn, options) { listeners.set(name, { fn, options }); } };
    new Script(source.slice(start, end) + '\ninitInputModality();').runInContext(createContext({ document }));
    assert.equal(root.dataset.inputModality, undefined, 'native focus remains the no-input default');
    assert.equal(listeners.get('pointerdown').options.capture, true);
    assert.equal(listeners.get('keydown').options, true);
    for (const pointerType of ['touch', 'pen', 'mouse']) {
      listeners.get('pointerdown').fn({ pointerType });
      assert.equal(root.dataset.inputModality, 'pointer');
      for (const key of ['Tab', 'Enter', ' ', 'Escape', 'ArrowDown', 'ArrowUp', 'Home', 'End']) {
        listeners.get('keydown').fn({ key });
        assert.equal(root.dataset.inputModality, 'keyboard', key);
      }
    }
    assert.doesNotMatch(source.slice(start, end), /\.blur\(|\.focus\(|preventDefault/);
  });
}

test('shared focus tokens cover both themes and restore a neutral keyboard ring', () => {
  assert.equal((tokens.match(/--focus-ring: #[0-9a-f]{6};/g) || []).length, 2);
  assert.match(tokens, /html\[data-input-modality="keyboard"\][^{]+\{\s*outline: 2px solid var\(--focus-ring\)/);
  assert.match(tokens, /html\[data-input-modality="pointer"\] :focus-visible:not\(input, textarea, select, \[contenteditable="true"\]\)/);
  assert.match(tokens, /forced-colors: active/);
  assert.match(tokens, /@media \(forced-colors: active\)\s*\{\s*:root, html\[data-theme="light"\] \{ --focus-ring: Highlight;/);
  for (const area of ['public', 'admin']) {
    assert.match(read(`${area}/styles.css`), /:focus-visible\s*\{\s*outline: 2px solid var\(--focus-ring\)/);
    assert.match(read(`${area}/index.html`), /app\.js\?v=quiet-controls-10/);
  }
});

test('bookmark menus share plain symbols and preserve labels and selection checks', () => {
  const html = read('public/anime.html');
  const icons = { watching: 'play', planned: 'clock', completed: 'check', on_hold: 'pause', dropped: 'minus' };
  for (const [status, icon] of Object.entries(icons)) {
    const rows = [...html.matchAll(new RegExp(`<button[^>]+data-list-status="${status}"[^>]*>(.*?)</button>`, 'g'))];
    assert.equal(rows.length, 2, status);
    for (const row of rows) assert.match(row[1], new RegExp(`data-lucide="${icon}"`));
    assert.match(read('public/app.js'), new RegExp(`key: "${status}", label: "[^"]+", icon: "${icon}"`));
  }
  assert.match(read('public/styles.css'), /\.title-list-dialog__options \[data-list-status\] > span\s*\{\s*background: transparent;/);
});

test('decorative icon wrappers do not regain boxes through older CSS layers', () => {
  const names = /(?:^|[\s,.])\.(?:notification-icon|toast-icon|player-setting-row__icon|data-freshness-icon|environment-icon|event-icon|attention-icon|mini-icon|empty-icon|ops-task__icon|job-glyph|operation-note__icon|role-card__icon|relation-card__icon|decision-icon|integration-card__icon|identity-verdict__icon|service-state__icon|maintenance-icon|cache-card__icon)(?:--[\w-]+)?$/;
  for (const area of ['public', 'admin']) {
    const css = read(`${area}/styles.css`).replace(/\/\*[\s\S]*?\*\//g, '');
    for (const [, selectors, body] of css.matchAll(/([^{}]+)\{([^{}]+)\}/g)) {
      if (!selectors.split(',').every(s => names.test(s.trim()))) continue;
      for (const [, property, value] of body.matchAll(/\b(background|border|box-shadow):\s*([^;]+);/g)) {
        assert.ok(['transparent', 'none', '0'].includes(value), `${area} ${selectors.trim()}: ${property}: ${value}`);
      }
    }
  }
});
