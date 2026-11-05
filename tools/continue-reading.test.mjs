import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const window = {};
runInNewContext(read('public/content-model.js'), { window, Date });
const M = window.KitsuContent;
const base = { status: 'known', unit: 'chapter', covered_up_to: 118, source_url: 'https://example.org/stub', is_last_season: true };

test('known: next = covered_up_to + 1, unit decides chapter/volume', () => {
  assert.match(M.continueReadingText(base).text, /главе 118.*с главы 119/);
  assert.match(M.continueReadingText({ ...base, unit: 'volume', covered_up_to: 3 }).text, /томе 3.*с тома 4/);
  assert.match(M.continueReadingText(base, 'en').text, /chapter 118.*chapter 119/);
  assert.equal(M.continueReadingText(base, 'xx').label, 'Где продолжить чтение', 'неизвестная локаль -> ru');
});

test('numbers are never invented: only status known gets next, missing number falls back to no_data', () => {
  for (const status of ['caught_up', 'original_ending', 'no_data']) {
    const view = M.continueReadingText({ ...base, status });
    assert.doesNotMatch(view.text, /\d/, status);
  }
  const partial = M.continueReadingText({ ...base, status: 'partial_cut' });
  assert.match(partial.text, /главы 118/); assert.doesNotMatch(partial.text, /119/);
  for (const broken of [{ covered_up_to: null }, { covered_up_to: NaN }, { covered_up_to: -1 }, { covered_up_to: '118' }, { status: 'weird' }]) {
    const view = M.continueReadingText({ ...base, ...broken });
    assert.equal(view.status, 'no_data'); assert.equal(view.tone, 'muted'); assert.equal(view.source, null);
  }
});

test('tone and source link: no_data is muted without link, the rest accent; link only for http(s)', () => {
  assert.equal(M.continueReadingText(base).tone, 'accent');
  assert.equal(M.continueReadingText({ ...base, status: 'no_data' }).source, null);
  assert.equal(M.continueReadingText({ ...base, source_url: null }).source, null);
  assert.equal(M.continueReadingText({ ...base, source_url: 'javascript:alert(1)' }).source, null);
  assert.equal(M.continueReadingText(base).source.url, 'https://example.org/stub');
});

test('no object or not the last season: nothing is rendered', () => {
  for (const value of [undefined, null, {}, { ...base, is_last_season: false }, { ...base, is_last_season: 'true' }]) assert.equal(M.continueReadingText(value), null);
});

test('demo coverage matches the spec and uses placeholder (example.org) sources only', () => {
  const c = M.readingCoverage;
  assert.deepEqual([c.frieren.status, c.frieren.unit, c.frieren.covered_up_to], ['known', 'chapter', 118]);
  assert.deepEqual([c['steins-gate'].status, c['steins-gate'].unit, c['steins-gate'].covered_up_to], ['known', 'volume', 3]);
  assert.equal(c['one-piece'].status, 'caught_up'); assert.equal(c.monster.status, 'original_ending'); assert.equal(c['vinland-saga'].status, 'no_data');
  for (const item of Object.values(c)) { assert.equal(item.is_last_season, true); if (item.source_url) assert.match(item.source_url, /^https:\/\/example\.org\//); }
  assert.equal(c['death-note'], undefined);
});

test('the notice is rendered only on the title page, before «Похожее», escaped, with a borderless icon', () => {
  const source = read('public/content.js');
  const render = source.slice(source.indexOf('function renderContinueReading'), source.indexOf('function initTitle'));
  assert.match(render, /beforebegin/); assert.match(render, /related-title/); assert.match(render, /data-lucide="book-open"/);
  assert.match(render, /esc\(view\.text\)/); assert.match(render, /esc\(view\.source\.url\)/); assert.match(render, /noopener noreferrer/);
  assert.match(source, /renderFacts\(title\);\s*renderContinueReading\(title\);/);
  for (const page of ['index', 'bookmarks', 'profile', 'user', 'profile-settings', 'auth']) assert.doesNotMatch(read(`public/${page}.html`), /continue-read/, page);
  assert.equal((source.match(/renderContinueReading\(/g) || []).length, 2, 'объявление + один вызов');
});
