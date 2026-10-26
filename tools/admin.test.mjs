import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const app = read('admin/app.js');

/* Поднимает админку в песочнице без DOM: данные, контракты и всё до функции refreshIcons. */
function loadAdmin() {
  const window = { matchMedia: () => ({ matches: true }) };
  const context = createContext({
    window, URL, Date, Intl, Math, JSON, encodeURIComponent, requestAnimationFrame: () => 0, performance,
    location: { hash: '' },
    document: { documentElement: { dataset: {} }, querySelector: () => null, querySelectorAll: () => [], addEventListener() {} },
  });
  runInContext(read('admin/data.js'), context);
  runInContext(read('admin/contracts.js'), context);
  const cut = app.indexOf('  function refreshIcons(');
  runInContext(`${app.slice(0, cut)}window.audit = { renderers, state, sections, pages };})();`, context);
  return { ...window.audit, D: window.KitsuAdminData, C: window.KitsuAdminContracts };
}
const admin = loadAdmin();
const { C, D } = admin;

test('every section page has a renderer and every renderer is reachable from navigation', () => {
  const routes = [...admin.sections.flatMap(s => s.pages.map(p => p.id))].sort();
  assert.deepEqual(Object.keys(admin.renderers).sort(), routes);
  assert.equal(routes.length, 21);
});

test('every screen renders a heading and never prints undefined, null or NaN', () => {
  const filters = { titles: ['all', 'ongoing', 'announced', 'moderation', 'novideo'], conflicts: ['pending', 'auto_accepted', 'resolved'], jobs: ['all', 'running', 'failed'], logs: ['all', 'ERROR'], checks: ['all', 'warn'] };
  for (const [route, render] of Object.entries(admin.renderers)) {
    const runs = [() => {}];
    if (route === 'catalog/titles') filters.titles.forEach(v => runs.push(() => { admin.state.titles.filter = v; }));
    if (route === 'queues/conflicts') filters.conflicts.forEach(v => runs.push(() => { admin.state.conflicts.status = v; }));
    if (route === 'parser/jobs') filters.jobs.forEach(v => runs.push(() => { admin.state.jobs.status = v; }));
    if (route === 'parser/logs') filters.logs.forEach(v => runs.push(() => { admin.state.logs.level = v; }));
    if (route === 'stand/checks') filters.checks.forEach(v => runs.push(() => { admin.state.checks.state = v; }));
    for (const set of runs) {
      set();
      const html = render();
      assert.match(html, /<h1>/, route);
      assert.doesNotMatch(html.replace(/<[^>]+>/g, ' '), /\bundefined\b|\bnull\b|\bNaN\b/, route);
    }
  }
});

test('no emoji or symbol substitutes anywhere in the admin source', () => {
  const pattern = /[←-⇿☀-➿⬀-⯿\u{1F000}-\u{1FAFF}⌘★✓▶×]/u;
  for (const file of ['admin/app.js', 'admin/data.js', 'admin/index.html']) {
    const text = read(file).replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(text, pattern, file);
  }
});

test('every rendered action has a handler and every request key has a contract and a description', () => {
  const html = Object.values(admin.renderers).map(r => r()).join('\n');
  const handler = app.slice(app.indexOf('  function handleAction('), app.indexOf('  function runRequest('));
  const actions = new Set([...html.matchAll(/data-action="([^"]+)"/g)].map(m => m[1]));
  for (const action of actions) assert.ok(handler.includes(`case "${action}"`), action);
  const describe = app.slice(app.indexOf('  function describeRequest('), app.indexOf('  /* ==========', app.indexOf('  function describeRequest(')));
  const keys = new Set([...app.matchAll(/request\("([a-zA-Z.]+)"/g), ...app.matchAll(/data-request-key="\$\{isNew \? "([a-zA-Z.]+)" : "([a-zA-Z.]+)"/g)].flatMap(m => m.slice(1).filter(Boolean)));
  for (const key of keys) {
    assert.ok(C.endpoints[key], `нет контракта ${key}`);
  }
  for (const key of [...app.matchAll(/request\("([a-zA-Z.]+)"/g)].map(m => m[1])) assert.ok(describe.includes(`"${key}"`), `нет описания ${key}`);
  for (const [key, [method, path]] of Object.entries(C.endpoints)) {
    assert.match(method, /^(GET|POST|PATCH|PUT|DELETE|WS)$/, key);
    assert.match(path, /^\//, key);
  }
});

test('cron helpers translate Almaty wall time to UTC cron and back', () => {
  assert.equal(C.buildCron({ kind: 'daily', local: '09:00' }), '0 4 * * *');
  assert.equal(C.buildCron({ kind: 'daily', local: '03:30' }), '30 22 * * *');
  assert.equal(C.buildCron({ kind: 'weekly', local: '03:00', weekday: 1 }), '0 22 * * 0');
  assert.equal(C.buildCron({ kind: 'every', minutes: 30 }), '*/30 * * * *');
  assert.equal(C.describeCron('0 4 * * *').text, 'Каждый день в 09:00');
  assert.equal(C.describeCron('30 22 * * *').text, 'Каждый день в 03:30');
  assert.equal(C.describeCron('0 22 * * 0').text, 'Каждый понедельник в 03:00');
  assert.equal(C.describeCron('0 10 * * 3').text, 'Каждую среду в 15:00');
  assert.match(C.describeCron('*/5 * * * *').note, /15 минут/);
  assert.equal(C.describeCron('61 * * * *').ok, false);
  assert.equal(C.validCron('*/30 * * * *'), true);
  assert.equal(C.validCron('0 3 * *'), false);
  assert.deepEqual([...C.fireMinutes('0 4 * * *')], [540]);
  assert.equal(C.fireMinutes('*/5 * * * *').length, 96, 'шаг пульса 15 минут');
});

test('time helpers read naive UTC and show Asia/Almaty', () => {
  assert.equal(C.fmtTime('2026-10-25T21:30:00'), '02:30');
  assert.equal(C.fmtDateTime('2026-10-25T21:30:00', '2026-10-25T21:40:00'), 'сегодня 02:30');
  assert.equal(C.fmtDateTime('2026-10-25T05:20:00', '2026-10-25T21:40:00'), 'вчера 10:20');
  assert.equal(C.localToUtc('2026-10-26T09:00'), '2026-10-26T04:00:00');
  assert.equal(C.utcToLocalInput('2026-10-26T04:00:00'), '2026-10-26T09:00');
  assert.equal(C.localToUtc('bad'), null);
  assert.equal(C.localToUtc('2026-02-30T10:00'), null);
  assert.equal(C.fmtTime('2023-12-28T14:56:00'), '20:56', 'до марта 2024 Алматы жила по UTC+6');
  assert.equal(C.localToUtc('2023-12-28T20:56'), '2023-12-28T14:56:00');
});

test('effective access mirrors authmw: only content.edit and comments.moderate are ever checked', () => {
  const role = name => D.roles.find(r => r.name === name);
  assert.equal(C.effectiveAccess({ is_superuser: true }, null).level, 'full');
  assert.deepEqual([...C.effectiveAccess({ is_superuser: false }, role('admin')).items], [...C.permissionEffects['content.edit']]);
  assert.equal(C.effectiveAccess({ is_superuser: false }, role('moderator')).items.length, 3);
  assert.equal(C.effectiveAccess({ is_superuser: false }, role('super_admin')).level, 'partial', 'роль * без флага не даёт полный доступ');
  assert.equal(C.effectiveAccess({ is_superuser: false }, role('user')).level, 'none');
  assert.equal(C.satisfies(['comments.*'], 'comments.moderate'), true);
  assert.equal(C.satisfies(['content.view'], 'content.edit'), false);
});

test('operations registry is honest about what the Go worker can run', () => {
  const op = key => D.operations.find(o => o.key === key);
  for (const key of ['shikimori:incremental', 'shikimori:full_sync']) assert.equal(op(key).works, false, key);
  assert.equal(op('kodik:full_sync').schedulable, false);
  assert.match(op('kodik:full_sync').scheduleNote, /Новые серии/);
  assert.ok(op('kodik:episodes_recompute').dry.endsWith('_dry'));
  for (const o of D.operations.filter(o => o.works)) assert.ok(o.duration && o.timeout, o.key);
  assert.ok(D.settings.site.every(s => s.wired === false));
});

test('forms reject missing fields, bad numbers, bad slugs and unsafe URLs', () => {
  assert.ok(C.errors('anime', { title: '', slug: 'Bad Slug', score: 11 }).length >= 3);
  assert.ok(C.errors('episode', { episode: -1 }).length >= 1);
  assert.ok(C.errors('release', { source: 'kodik', url: 'javascript:alert(1)' }).some(e => e.field === 'url'));
  assert.equal(C.validUrl('/media/x.webp', true), true);
  assert.equal(C.validUrl('/media/x.webp', false), false);
  assert.equal(C.validUrl('https://user:pw@x.test/'), false);
  assert.equal(C.errors('anime', { title: 'Монстр', slug: 'monster', score: 8.87, poster_url: '/media/posters/monster.webp' }).length, 0);
});

test('admin stylesheet keeps rectangular shapes and icon-only buttons without plates', () => {
  const css = read('admin/styles.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(css, /border-radius:\s*(?:50%|999px|9999px|100%)/);
  assert.doesNotMatch(css, /var\(--radius-pill\)/);
  const iconBtn = [...css.matchAll(/(^|\n)\.icon-btn\s*\{([^}]*)\}/g)].map(m => m[2]).join('\n');
  assert.match(iconBtn, /background:\s*transparent/);
  assert.match(iconBtn, /border:\s*0/);
});
