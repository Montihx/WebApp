import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const window = {};
runInNewContext(read('public/content-model.js'), {window, Date});
const M = window.KitsuContent;

test('title lookup rejects inherited object members', () => {
  const source = read('public/content.js');
  const lookup = source.slice(source.indexOf('    const requested'), source.indexOf('    document.body.dataset.animeId'));
  for (const slug of ['constructor', '__proto__', 'toString', 'unknown']) {
    const context = {M, URLSearchParams, location: {search: `?title=${slug}`}};
    runInNewContext(`${lookup}; result = title.slug;`, context);
    assert.equal(context.result, 'monster');
  }
});

test('no-episode disabling targets the real watch buttons and decorative alt remains empty', () => {
  const source = read('public/content.js'), html = read('public/anime.html');
  assert.equal((html.match(/data-scroll-player/g) || []).length, 2);
  assert.match(source, /querySelectorAll\('\[data-scroll-player\]'\).*button.disabled = true/);
  assert.match(source, /img.alt = img.closest\('\.title-poster'\) \? title.title : ''/);
});

test('midnight follows today but preserves an explicitly selected different day', () => {
  const source = read('public/content.js');
  const refresh = source.slice(source.indexOf('    function refresh()'), source.indexOf('    let timer'));
  for (const followToday of [true, false]) {
    const context = {
      document: {hidden: false}, M: {dateKey: () => '2026-09-09'}, Date,
      activeKey: '2026-09-08', renderedDate: '2026-09-08', followToday,
      days: 0, items: 0, airedCount: 0, clock: () => '00:00', $: () => ({querySelectorAll: () => [], querySelector: () => null}),
    };
    runInNewContext(`function renderDays(){days++;} function renderItems(){items++;} ${refresh}; refresh();`, context);
    assert.equal(context.activeKey, followToday ? '2026-09-09' : '2026-09-08');
    assert.equal(context.items, 1);
    runInNewContext('refresh()', context);
    assert.equal(context.items, 1, 'minute ticks do not replace focused links');
  }
});

test('search and continue entries retain their own title identity', () => {
  assert.equal(M.titles['attack-on-titan'].id, '16498');
  assert.match(read('public/content.js'), /\.landscape-card, \.search-result/);
});

test('watch order hides empty or external-only relations and never invents a sequel', () => {
  assert.equal(M.watchOrder([], M.titles.monster).length, 0);
  assert.equal(M.watchOrder([{id: 2}], M.titles.monster).length, 0);
  assert.equal(M.titles.monster.related.length, 0);
});
test('watch order inserts current, deduplicates slugs, sorts and preserves metadata', () => {
  const list = M.watchOrder([{id:'30',slug:'future',year:2020,score:8.2,relation:'Sequel'}, {id:'2',slug:'past',year:2000}, {id:'30',slug:'future',year:2020}], {id:'10',slug:'now',year:2010});
  assert.deepEqual(Array.from(list, r=>r.slug), ['past','now','future']);
  assert.equal(list[1].is_current, true);
  assert.equal(list[2].score, 8.2);
  assert.equal(list[2].relation, 'Sequel');
});
test('all franchise links resolve to independent local title identities', () => {
  for(const title of Object.values(M.titles)) for(const row of title.related) {
    assert.equal(M.titles[row.slug].id, row.id);
    assert.equal(M.watchOrder(title.related,title).filter(r=>r.is_current).length,1);
  }
  assert.equal(M.titles['steins-gate-movie'].episodes_total,1);
});
test('timestamps without offset are UTC; explicit offsets are preserved', () => {
  assert.equal(M.parseDateAsUtc('2026-09-03T19:30:00').toISOString(),'2026-09-03T19:30:00.000Z');
  assert.equal(M.parseDateAsUtc('2026-09-03T19:30:00+05:00').toISOString(),'2026-09-03T14:30:00.000Z');
  for(const value of [null, '', 'garbage', '2026-09-03', '2026-99-99T12:00:00']) assert.equal(M.parseDateAsUtc(value),null);
});
test('schedule merge filters nonlocal/invalid rows and deduplicates only the same title-day', () => {
  const a={local_slug:'one',anime:{id:1},next_episode_at:'2026-09-03T12:00:00Z'};
  const b={...a,next_episode_at:'2026-09-04T12:00:00Z'};
  assert.equal(M.mergeSchedule([a],[a,b,{...a,local_slug:null},{...a,next_episode_at:null}]).length,2);
});
test('date strip keeps today, one following day, counts and original -7/+14 bounds', () => {
  const now=new Date(2026,8,3,12);
  const items=[-7,0,14,15].map(d=>({next_episode_at:new Date(2026,8,3+d,12).toISOString()}));
  const days=M.scheduleDays(items,now);
  assert.equal(days.length,22);
  assert.equal(days[0].key,M.dateKey(new Date(2026,7,27)));
  assert.equal(days[7].count,1);
  assert.equal(M.scheduleDays([],now).length,2);
});
test('countdown handles days, release time, old releases and missing data', () => {
  const now=Date.parse('2026-09-03T00:00:00Z');
  assert.equal(M.formatCountdown(90061000),'1 д. 1 ч. 1 мин.');
  assert.equal(M.countdownState('2026-09-03T00:00:00Z',now).status,'past');
  assert.equal(M.countdownState('2026-09-01T00:00:00Z',now).status,'hidden');
  assert.equal(M.countdownState(null,now).status,'hidden');
});
test('updates preserve independent nullable episode/team fields', () => {
  assert.equal(M.updateLabel({last_episode_number:7,last_translation_team:' Team '}),'Серия 7 · Team');
  assert.equal(M.updateLabel({last_episode_number:7}),'Серия 7');
  assert.equal(M.updateLabel({last_translation_team:'Team'}),'Озвучка: Team');
  assert.equal(M.updateLabel({}),'Обновление');
});
test('watch order precedes the player and old fake franchise/CSS are removed', () => {
  const html=read('public/anime.html'), css=read('public/styles.css');
  assert.ok(html.indexOf('id="watch-order"') < html.indexOf('id="player"'));
  assert.match(html,/aria-controls="watch-order-list"/);
  assert.doesNotMatch(html+css,/franchise-rail|Монстр: Другая история/);
});
test('schedule clock updates preserve focus and restart after bfcache restoration', () => {
  const source=read('public/content.js');
  const refresh=source.slice(source.indexOf('    function refresh()'),source.indexOf('    let timer'));
  assert.doesNotMatch(refresh,/innerHTML/);
  assert.match(refresh,/if \(today !== renderedDate\)/);
  assert.match(refresh,/if \(followToday\) activeKey = today/);
  assert.match(source,/event.persisted/);
  assert.match(source,/60000/);
  assert.match(source,/last_release_at/);
});
test('review harness follows actual DOM views and history navigation, including nested tabs', () => {
  const html=read('tools/visual-review.html');
  assert.match(html,/MutationObserver/);
  assert.match(html,/addEventListener\('popstate',ready\)/);
  assert.match(html,/candidate.hash === current.hash/);
  assert.match(html,/url:doc.URL/);
});
test('next episode reads in plain words and disappears a day after release', () => {
  const now = Date.parse('2026-09-03T00:00:00Z');
  assert.equal(M.airLabel('2026-09-03T00:20:00Z', now).label, 'через 20 мин');
  assert.equal(M.airLabel('2026-09-03T05:10:00Z', now).label, 'через 5 ч 10 мин');
  assert.equal(M.airLabel('2026-09-03T05:00:00Z', now).label, 'через 5 ч');
  assert.equal(M.airLabel('2026-09-05T00:00:00Z', now).label, 'через 2 дня');
  assert.equal(M.airLabel('2026-09-08T00:00:00Z', now).label, 'через 5 дней');
  assert.equal(M.airLabel('2026-09-04T00:00:00Z', now).label, 'через 1 день');
  assert.equal(M.airLabel('2026-09-02T20:00:00Z', now).status, 'past');
  for (const value of ['2026-09-01T00:00:00Z', null, 'garbage']) assert.equal(M.airLabel(value, now), null);
});
test('every relation has a caption, a kanji for its ofuda and a tone', () => {
  for (const key of Object.keys(M.relations)) {
    assert.ok(M.relationKanji[key], key);
    assert.match(M.relationTone(key), /^(before|after|side)$/);
  }
  assert.equal(M.relationTone('Prequel'), 'before');
  assert.equal(M.relationTone('Sequel'), 'after');
  assert.equal(M.plural(2, 'тайтл', 'тайтла', 'тайтлов'), 'тайтла');
  assert.equal(M.plural(11, 'тайтл', 'тайтла', 'тайтлов'), 'тайтлов');
  assert.equal(M.plural(21, 'тайтл', 'тайтла', 'тайтлов'), 'тайтл');
});
test('related titles render as row cards with an order index and the current one is marked', () => {
  const source = read('public/content.js');
  assert.match(source, /class="relation-card is-current" aria-current="page"/);
  assert.match(source, /class="relation-index" aria-hidden="true">\$\{index \+ 1\}/);
  assert.doesNotMatch(source, /thread-knot|relation-kanji/);
  assert.match(source, /alt="Постер «\$\{esc\(row.title\)\}»"/);
});
test('schedule is a day timeline (time, axis node, card, now marker); the clock sits in the card header', () => {
  const source = read('public/content.js');
  assert.match(source, /class="air-backdrop" aria-hidden="true"><img src="\$\{esc\(row.local_poster\)\}" alt=""/);
  assert.match(source, /schedule-item--update" href="\$\{href\(row.slug\)\}"><span class="air-backdrop" aria-hidden="true">/);
  assert.match(source, /closest\('\.schedule-head'\)\?\.querySelector\('\.section-kicker'\)\?\.insertAdjacentHTML\('afterend', `<p class="air-clock"/);
  assert.match(source, /class="air-now" aria-hidden="true"><span class="air-now__time">\$\{clock\(\)\}<\/span><span class="air-now__dot">/, 'now marker between past and future events');
  assert.match(source, /<time class="air-time"[^`]*<\/time><span class="air-card"><img class="air-poster"/, 'time sits before the card, outside it');
  assert.match(source, /is-next/);
  const refresh = source.slice(source.indexOf('    function refresh()'), source.indexOf('    let timer'));
  assert.match(refresh, /#schedule-now/);
  assert.doesNotMatch(refresh, /innerHTML/);
});

test('day strip says how busy each day is and the list is headed by the date in words', () => {
  const source = read('public/content.js');
  assert.match(source, /day-tab__load\$\{day.count \? '' : ' is-quiet'\}">\$\{day.count \? `\$\{day.count\} \$\{M.plural\(day.count, 'серия', 'серии', 'серий'\)\}` : 'затишье'\}/);
  assert.match(source, /data-calendar-day="\$\{day.key\}" aria-label="/, 'aria-label sits inside the button tag');
  assert.match(source, /id="schedule-today" hidden>К сегодня/);
  assert.match(source, /\$\('#schedule-today'\).hidden = activeKey === M.dateKey\(new Date\(\)\)/);
});

test('related titles are a compact card grid: no arrows, relation chip in the copy, collapsed by default', () => {
  const html = read('public/anime.html'), source = read('public/content.js');
  assert.match(html, /<ol class="relation-track" id="watch-order-list"/);
  assert.doesNotMatch(html + source, /data-relation-scroll|relation-nav|watch-order-path/);
  assert.match(html, /id="watch-order-toggle" aria-expanded="false" aria-controls="watch-order-list"/);
  assert.match(html, /id="watch-order-list"[^>]*hidden><\/ol>/);
  assert.match(source, /class="relation-band relation-band--\$\{tone\}" title="[^"]*"><b>\$\{esc\(label\)\}<\/b>/);
  assert.match(source, /classList.toggle\('has-more-right'/);
})
test('every relation has a short band label that fits a small poster', () => {
  for (const key of Object.keys(M.relations)) {
    assert.ok(M.relationShort[key], key);
    assert.ok(M.relationShort[key].length <= 13, `${key}: ${M.relationShort[key]}`);
  }
});
test('release details block is gone from the title page', () => {
  assert.doesNotMatch(read('public/anime.html'), /Сведения о релизе|class="player-release"/);
});

test('title facts come only from Anime fields', () => {
  // rating: Shikimori enum or free text typed in the admin panel.
  assert.equal(M.ageLabel('pg_13').short, '13+');
  assert.equal(M.ageLabel('r_plus').short, '18+');
  assert.equal(M.ageLabel('R+').short, '18+');
  assert.equal(M.ageLabel('PG-13').short, '13+');
  assert.equal(M.ageLabel('R-17').short, '17+');
  assert.equal(M.ageLabel(null), null);
  // Season from aired_on: December belongs to the next year's winter.
  assert.equal(M.seasonLabel('2004-04-07'), 'Весна 2004');
  assert.equal(M.seasonLabel('2023-12-20'), 'Зима 2024');
  assert.equal(M.seasonLabel(null, 2011), '2011 г.');
  assert.equal(M.episodesLabel({ status: 'ongoing', episodes_aired: 6, episodes_total: 12 }), '6 из 12 эп.');
  assert.equal(M.episodesLabel({ status: 'ongoing', episodes_aired: 1155, episodes_total: null }), '1155 эп., всего неизвестно');
  assert.equal(M.episodesLabel({ status: 'released', episodes_aired: 74, episodes_total: 74 }), '74 эп.');
  // GET /anime/{slug}/last-update: all-null answer means no releases yet.
  assert.equal(M.lastUpdateLabel({ episode_number: 6, season: 1, translation_team: 'AniLibria' }), 'Добавлено: 6 серия · AniLibria');
  assert.equal(M.lastUpdateLabel({ episode_number: 3, season: 2, translation_team: '' }), 'Добавлено: 2 сезон, 3 серия');
  assert.equal(M.lastUpdateLabel({ episode_number: null, season: null, translation_team: null }), '');
  assert.ok(M.weekdayLabel('2026-11-07T15:00:00').startsWith('по '));
});

test('demo bookmarks are one store for the title page, profile and the bookmarks page', () => {
  const data = new Map();
  const storage = { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), get length() { return data.size; }, key: i => [...data.keys()][i] ?? null };
  const L = M.library;
  // Defaults match the title-page button (app.js): Monster «Смотрю», Frieren «В планах».
  assert.equal(L.defaults()['19'], 'watching');
  assert.equal(L.defaults()['52991'], 'planned');
  const before = L.list(storage).length;
  // Every seeded bookmark links to a title the anime page knows (unknown slugs fall back to Monster).
  for (const f of L.list(storage)) assert.ok(M.titles[f.anime.slug], f.anime.slug);
  // What the title-page button writes shows up in the list, and "none" removes it.
  storage.setItem('kitsu-demo-bookmark-status-54857', 'planned');
  assert.equal(L.list(storage).length, before + 1);
  L.set(storage, 'monster', null);
  assert.equal(storage.getItem('kitsu-demo-bookmark-status-19'), 'none');
  assert.ok(!L.list(storage).some(f => f.anime.slug === 'monster'));
  L.set(storage, 'monster', 'dropped');
  assert.equal(L.list(storage).find(f => f.anime.slug === 'monster').category, 'dropped');
});
