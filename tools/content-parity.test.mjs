import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const window = {};
runInNewContext(read('public/content-model.js'), {window, Date});
const M = window.KitsuContent;
runInNewContext(read('admin/contracts.js'), {window, URL, Date});
const C = window.KitsuAdminContracts;

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
      days: 0, items: 0, $: () => ({querySelectorAll: () => []}),
    };
    runInNewContext(`function renderDays(){days++;} function renderItems(){items++;} ${refresh}; refresh();`, context);
    assert.equal(context.activeKey, followToday ? '2026-09-09' : '2026-09-08');
    assert.equal(context.items, 1);
    runInNewContext('refresh()', context);
    assert.equal(context.items, 1, 'minute ticks do not replace focused links');
  }
});

test('Almaty wall time uses historical offsets and validates dates', () => {
  assert.equal(C.localDateToUtc('2023-09-03T12:30'), '2023-09-03T06:30:00.000Z');
  assert.equal(C.localDateToUtc('2026-09-03T12:30'), '2026-09-03T07:30:00.000Z');
  assert.equal(C.localDateToUtc('2024-02-29T23:30'), '2024-02-29T17:30:00.000Z');
  assert.equal(C.localDateToUtc('2024-03-01T00:30'), '2024-02-29T19:30:00.000Z');
  assert.equal(C.localDateToUtc('2023-02-29T12:30'), null);
  assert.equal(C.localDateToUtc('2026-01-01T25:00'), null);
});

test('release format check uses the same relative URL policy as save', () => {
  const source = read('admin/app.js');
  assert.match(source, /const relative = !\['url', 'embed_url'\].includes\(input\?\.name\)/);
  assert.match(source, /contracts.validUrl\(input\?\.value \|\| '', relative\)/);
  for (const name of ['url', 'embed_url']) {
    assert.equal(C.validUrl('/video/14', !['url', 'embed_url'].includes(name)), false);
    assert.ok(C.errors('release', {[name]: '/video/14'}).some(error => error.startsWith(`${name}: нужен HTTP(S)`)));
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
test('manual and scheduled parser pairs match the two distinct backend dispatchers', () => {
  assert.equal(Object.keys(C.operations).length,4);
  assert.deepEqual(Object.keys(C.operations).filter(k=>C.operations[k].scheduled),['kodik:incremental','shikimori:calendar_snapshot']);
  assert.equal(C.operations['kodik:full_sync'].scheduled,false);
  assert.equal(C.operations['shikimori:shikimori_related_refresh'].scheduled,false);
});
test('local URL validation checks format without pretending to probe a stream', () => {
  for(const url of ['https://example.test/a','http://localhost/a','/media/poster.webp']) assert.equal(C.validUrl(url),true,url);
  for(const url of ['javascript:alert(1)','//evil.test/a','https://u:p@a.test','https://a.test/x y','/a\\b']) assert.equal(C.validUrl(url),false,url);
  assert.equal(C.validUrl('/media/a',false),false);
});
test('cron checks field count, ranges, lists and steps', () => {
  for(const v of ['0 4 * * *','*/30 * * * *','0 0 1,15 * 1-5']) assert.equal(C.validCron(v),true,v);
  for(const v of ['', '* * * *','60 * * * *','0 24 * * *','0 4 0 * *','*/0 * * * *','1-0 * * * *','0 4 * 13 *']) assert.equal(C.validCron(v),false,v);
});
test('forms reject missing fields, negative/invalid numbers and unsafe URLs', () => {
  assert.equal(C.errors('anime',{title:'Example',slug:'example',score:8}).length,0);
  assert.ok(C.errors('anime',{title:'',slug:'x',score:11}).length >= 2);
  assert.ok(C.errors('episode',{anime_id:'not-a-uuid',episode:-1}).length >= 2);
  assert.ok(C.errors('release',{episode_id:'id',source:'Kodik',url:'javascript:x'}).length >= 2);
  assert.equal(C.localDateToUtc('2026-09-03T12:30'),'2026-09-03T07:30:00.000Z');
  assert.equal(C.localDateToUtc('bad'),null);
});
test('all 20 admin renderers and every content-tab variant produce markup', () => {
  const admin=read('admin/app.js'), context={window,location:{hash:''},document:{documentElement:{dataset:{}},querySelector(){return null},addEventListener(){}},URL,Date};
  runInNewContext(admin.slice(0,admin.indexOf('  function refreshIcons()'))+'window.audit={renderers,state};})();',context);
  const {renderers,state}=window.audit;
  assert.equal(Object.keys(renderers).length,20);
  const variants={ 'anime-editor':['editorTab',['main','media','sources','review']], 'parser-settings':['parserSettingsTab',['general','kodik','shikimori','images','blacklist','schedule','advanced','player']], parsers:['parserTab',['jobs','logs','sources']], conflicts:['conflictTab',['pending','auto','resolved']], moderation:['moderationTab',['import','comments']], users:['usersTab',['accounts','roles']], assets:['assetTab',['avatars','decorations']] };
  for(const [name,render] of Object.entries(renderers)) {
    state.currentView=name;
    for(const value of (variants[name]?.[1] || ['default'])) {
      if(variants[name]) state[variants[name][0]]=value;
      const html=render();
      assert.match(html,/<h1[ >]/,`${name}/${value}`);
      assert.doesNotMatch(html,/>undefined</,`${name}/${value}`);
    }
  }
});
test('every rendered admin data-action has a handler or delegated click contract', () => {
  const admin=read('admin/app.js');
  const context={window,location:{hash:''},document:{documentElement:{dataset:{}},querySelector(){return null},addEventListener(){}},URL,Date};
  runInNewContext(admin.slice(0,admin.indexOf('  function refreshIcons()'))+'window.audit={renderers,state};})();',context);
  const {renderers,state}=window.audit;
  const variants={ 'anime-editor':['editorTab',['main','media','sources','review']], 'parser-settings':['parserSettingsTab',['general','kodik','shikimori','images','blacklist','schedule','advanced','player']], parsers:['parserTab',['jobs','logs','sources']], conflicts:['conflictTab',['pending','auto','resolved']], moderation:['moderationTab',['import','comments']], users:['usersTab',['accounts','roles']], assets:['assetTab',['avatars','decorations']] };
  const actions=new Set();
  for(const [name,render] of Object.entries(renderers)) {
    state.currentView=name;
    for(const value of (variants[name]?.[1] || ['default'])) {
      if(variants[name]) state[variants[name][0]]=value;
      for(const match of render().matchAll(/data-action="([^"]+)"/g)) actions.add(match[1]);
    }
  }
  const handler=admin.slice(admin.indexOf('  function handleAction('),admin.indexOf('\n  document.addEventListener("click"'));
  const delegated=new Set(['toggle-switch','validate-url-local']);
  const unhandled=[...actions].filter(action=>!delegated.has(action)&&!handler.includes(`"${action}"`)&&!handler.includes(`'${action}'`));
  assert.deepEqual(unhandled,[],`Unhandled admin actions: ${unhandled.join(', ')}`);
});
test('review harness follows actual DOM views and history navigation, including nested tabs', () => {
  const html=read('tools/visual-review.html');
  assert.match(html,/MutationObserver/);
  assert.match(html,/addEventListener\('popstate',ready\)/);
  assert.match(html,/current.hash.split\('\/'\)\[0\]/);
  assert.match(html,/url:doc.URL/);
});
