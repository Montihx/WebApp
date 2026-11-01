// Правило владельца (01.11.2026): «одна функция — один компонент». Элементы, которые делают одно и то же
// (статус закладки, меню выбора статуса, оценка, уведомление), выглядят и называются одинаково на всех страницах,
// а одно значение тайтла (оценка) показывается в одном месте экрана. Этот тест ловит возврат к копиям.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const pages = readdirSync(new URL('../public/', import.meta.url)).filter(name => /\.html$/.test(name));
const scripts = readdirSync(new URL('../public/', import.meta.url)).filter(name => /\.js$/.test(name) && !/lucide/.test(name));
const loadModel = () => {
  const window = {};
  new Function('window', read('public/content-model.js'))(window);
  return window.KitsuContent;
};

test('bookmark statuses come from one dictionary', () => {
  const M = loadModel();
  assert.deepEqual(M.bookmarkStatuses.map(s => s.key), ['watching', 'completed', 'planned', 'on_hold', 'dropped'], 'порядок — как validFavoriteCategories');
  assert.ok(read('public/app.js').includes('KitsuContent?.bookmarkStatuses'), 'app.js берёт статусы из общего словаря');
  for (const file of ['public/profile.js', 'public/bookmarks.js']) {
    const src = read(file);
    assert.ok(src.includes('bookmarkStatuses'), `${file}: статусы из общего словаря`);
    assert.ok(!/label:\s*"(Смотрю|Брошено|Отложено)"/.test(src), `${file}: своей копии подписей статусов нет`);
  }
  for (const file of [...pages, ...scripts]) {
    const src = read(`public/${file}`);
    assert.ok(!/В планах|Удалить из списка|Убрать из закладок/.test(src), `${file}: подписи статусов и удаления — только общие («Запланировано», «Убрать из списка»)`);
  }
});

test('bookmark cards and menus use the shared component, not page copies', () => {
  for (const file of [...pages, ...scripts]) {
    const src = read(`public/${file}`);
    assert.ok(!/\b(pf-card|pf-menu|bm-card|bm-row|pf-tabs)\b/.test(src), `${file}: своя карточка/меню/вкладки закладок вместо общих`);
  }
  for (const file of ['public/profile.js', 'public/bookmarks.js']) {
    const src = read(file);
    assert.ok(src.includes('M.animeCard(') && src.includes('KitsuBookmarks?.bind('), `${file}: карточка — KitsuContent.animeCard, меню — KitsuBookmarks`);
    assert.ok(src.includes('M.bookmarkFacts('), `${file}: подпись под карточкой — общая`);
  }
  assert.ok(read('public/profile.html').includes('class="bm-tabs" role="tablist" aria-label="Статус закладки" data-own-tabs'), 'вкладки статусов в профиле — те же .bm-tabs');
});

test('one toast for the whole site', () => {
  assert.ok(read('public/app.js').includes('window.KitsuToast = showToast'));
  for (const file of scripts.filter(name => name !== 'app.js')) {
    assert.ok(!/function toast\s*\(|className = `toast/.test(read(`public/${file}`)), `${file}: своё уведомление вместо window.KitsuToast`);
  }
});

test('score looks the same everywhere and is shown once per screen', () => {
  const M = loadModel();
  assert.equal(M.formatScore(9.1), '9.1');
  assert.equal(M.formatScore(8.88), '8.88');
  assert.equal(M.formatScore(0), '');
  for (const file of pages) {
    const src = read(`public/${file}`);
    assert.ok(!/class="(hero-score|search-result__score)"[^>]*>\s*<i data-lucide="star"/.test(src), `${file}: звезда оценки — общая маска, не иконка в разметке`);
    for (const [, value] of src.matchAll(/class="(?:poster-score|hero-score|search-result__score|hanko)"[^>]*>([\d.]+)</g)) {
      assert.equal(value, M.formatScore(Number(value)), `${file}: оценка ${value} — не в формате formatScore`);
    }
  }
  const anime = read('public/anime.html');
  const facts = anime.slice(anime.indexOf('class="title-meta-list"'), anime.indexOf('</ul>', anime.indexOf('class="title-meta-list"')));
  assert.ok(!/Оценка/.test(facts), 'на странице тайтла оценка — только на ханко постера, в фактах её нет');
  assert.ok(!/'star', `Оценка/.test(read('public/content.js')), 'renderFacts не добавляет строку оценки');
});

test('the same title has the same score on every page', () => {
  const seen = new Map();
  for (const file of pages) {
    const src = read(`public/${file}`);
    for (const m of src.matchAll(/alt="Постер[^«]*«([^»]+)»[^>]*\/>\s*<span class="poster-score" aria-label="Оценка ([\d.]+)">/g)) seen.set(`${m[1]}|${file}|card`, [m[1], m[2]]);
    for (const m of src.matchAll(/<strong>([^<]+)<\/strong><small>[^<]*<b class="search-result__score" aria-label="Оценка ([\d.]+)"/g)) seen.set(`${m[1]}|${file}|search`, [m[1], m[2]]);
    for (const m of src.matchAll(/hero-score" aria-label="Оценка ([\d.]+)">[\d.]+<\/span><span>\d+<\/span><\/div>\s*<h2>([^<]+)/g)) seen.set(`${m[2]}|${file}|hero`, [m[2], m[1]]);
  }
  const byTitle = new Map();
  for (const [title, value] of seen.values()) byTitle.set(title, (byTitle.get(title) || new Set()).add(value));
  for (const [title, values] of byTitle) assert.equal(values.size, 1, `«${title}»: разные оценки на разных страницах — ${[...values].join(', ')}`);
});
