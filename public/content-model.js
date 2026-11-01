/* Pure contracts shared by the static examples and regression checks. No API calls. */
(() => {
  'use strict';
  const relations = { Prequel: 'Предыстория', Sequel: 'Продолжение', Parent: 'Основная история', 'Side story': 'Другая история', Summary: 'Обобщение', Alternative: 'Альтернативная история', 'Alternative setting': 'Альтернативная история', Other: 'Прочее', Franchise: 'Франшиза', Adaptation: 'Адаптация' };
  // Kanji on the ofuda over a related poster; the Russian caption next to it is the real label.
  const relationKanji = { Prequel: '前', Sequel: '続', Parent: '本', 'Side story': '外', Summary: '総', Alternative: '異', 'Alternative setting': '異', Other: '他', Franchise: '系', Adaptation: '原' };
  // One word for the band on a related poster; the full name stays in the accessible label.
  const relationShort = { Prequel: 'Предыстория', Sequel: 'Продолжение', Parent: 'Основа', 'Side story': 'Ответвление', Summary: 'Пересказ', Alternative: 'Альтернатива', 'Alternative setting': 'Альтернатива', Other: 'Связано', Franchise: 'Франшиза', Adaptation: 'Первоисточник' };
  // Tone of the ofuda stripe: what came before, what comes after, everything else.
  const relationTone = relation => ({ Prequel: 'before', Parent: 'before', Sequel: 'after' }[relation] || 'side');
  function plural(n, one, few, many) {
    const a = Math.abs(n) % 100, b = a % 10;
    return a > 10 && a < 20 ? many : b > 1 && b < 5 ? few : b === 1 ? one : many;
  }
  // "через 2 дня", "через 3 ч 10 мин", "через 25 мин"; a fresh release reads "вышла сегодня".
  function airLabel(value, now = Date.now()) {
    const date = parseDateAsUtc(value);
    if (!date) return null;
    const diff = date.getTime() - now;
    if (diff <= 0) return -diff < 26 * 3600000 ? { status: 'past', label: 'вышла' } : null;
    const minutes = Math.max(1, Math.ceil(diff / 60000));
    if (minutes < 60) return { status: 'soon', label: `через ${minutes} мин` };
    if (minutes < 1440) { const h = Math.floor(minutes / 60), m = minutes % 60; return { status: 'today', label: `через ${h} ч${m ? ` ${m} мин` : ''}` }; }
    const days = Math.round(minutes / 1440);
    return { status: 'later', label: `через ${days} ${plural(days, 'день', 'дня', 'дней')}` };
  }
  const kindLabel = kind => ({ tv: 'ТВ-сериал', tv_13: 'ТВ-сериал', tv_24: 'ТВ-сериал', movie: 'Фильм', film: 'Фильм', ova: 'OVA', ona: 'ONA', special: 'Спешл', tv_special: 'ТВ-спешл', music: 'Клип' }[String(kind).toLowerCase()] || kind || 'Аниме');
  function parseDateAsUtc(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value)) return null;
    const date = new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`);
    return Number.isFinite(date.getTime()) ? date : null;
  }
  function dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  function formatCountdown(diff) {
    const total = Math.max(0, Math.floor(diff / 60000));
    const days = Math.floor(total / 1440), hours = Math.floor(total / 60) % 24, minutes = total % 60;
    return `${days ? `${days} д. ` : ''}${days || hours ? `${hours} ч. ` : ''}${minutes} мин.`;
  }
  function countdownState(value, now = Date.now()) {
    const date = parseDateAsUtc(value);
    if (!date) return { status: 'hidden' };
    const diff = date.getTime() - now;
    if (diff > 0) return { status: 'counting', label: formatCountdown(diff) };
    return -diff < 26 * 3600000 ? { status: 'past', label: 'Вышла' } : { status: 'hidden' };
  }
  function watchOrder(related, current) {
    if (!Array.isArray(related) || !related.length) return [];
    const seen = new Set();
    const rows = related.filter(row => row?.slug && !seen.has(row.slug) && seen.add(row.slug)).map(row => ({ ...row, is_current: row.slug === current.slug }));
    if (!rows.some(row => row.is_current)) rows.push({ ...current, relation: '', is_current: true });
    rows.sort((a, b) => a.year && b.year && a.year !== b.year ? a.year - b.year : (parseInt(a.id, 10) || 0) - (parseInt(b.id, 10) || 0));
    return rows.length > 1 ? rows : [];
  }
  function mergeSchedule(history = [], future = []) {
    const seen = new Set();
    return [...history, ...future].filter(row => {
      const date = parseDateAsUtc(row?.next_episode_at);
      if (!row?.local_slug || !date) return false;
      const key = `${row.anime?.id ?? row.local_slug}:${dateKey(date)}`;
      if (seen.has(key)) return false;
      seen.add(key); return true;
    }).sort((a, b) => parseDateAsUtc(a.next_episode_at) - parseDateAsUtc(b.next_episode_at));
  }
  function scheduleDays(items, now = new Date()) {
    const days = Array.from({ length: 22 }, (_, i) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7 + i));
    const counts = new Map();
    items.forEach(item => { const d = parseDateAsUtc(item.next_episode_at); if (d) counts.set(dateKey(d), (counts.get(dateKey(d)) || 0) + 1); });
    let first = 7, last = 7;
    days.forEach((day, i) => { if (counts.has(dateKey(day))) { first = Math.min(first, i); last = Math.max(last, i); } });
    return days.slice(first, last + 2).map(day => ({ date: day, key: dateKey(day), count: counts.get(dateKey(day)) || 0 }));
  }
  function updateLabel(item) {
    const episode = item.last_episode_number > 0 ? `Серия ${item.last_episode_number}` : '';
    const team = typeof item.last_translation_team === 'string' ? item.last_translation_team.trim() : '';
    return episode && team ? `${episode} · ${team}` : episode || (team ? `Озвучка: ${team}` : 'Обновление');
  }
  // Возрастной рейтинг. Поле `rating` у тайтла — строка Shikimori (g, pg, pg_13, r, r_plus, rx) или то,
  // что ввели в админке («PG-13», «R-17»). Синхронизация с Kodik его не заполняет, поэтому часто пусто.
  function ageLabel(rating) {
    const key = String(rating ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_').replace(/\+$/, '_plus');
    if (!key) return null;
    const map = { g: ['0+', 'G — для всех'], pg: ['6+', 'PG — детям с родителями'], pg_13: ['13+', 'PG-13 — с 13 лет'], r: ['17+', 'R — с 17 лет'], r_17: ['17+', 'R — с 17 лет'], r_plus: ['18+', 'R+ — с 18 лет'], rx: ['18+', 'Rx — только для взрослых'] };
    const hit = map[key];
    if (hit) return { short: hit[0], full: `Возрастной рейтинг ${hit[1]}` };
    const age = /(\d{1,2})/.exec(key);
    return age ? { short: `${age[1]}+`, full: `Возрастной рейтинг ${rating}` } : { short: String(rating).trim(), full: `Возрастной рейтинг ${rating}` };
  }
  // Сезон выхода по дате начала показа (`aired_on`, YYYY-MM-DD): декабрь относится к зиме следующего года.
  function seasonLabel(airedOn, year) {
    const m = /^(\d{4})-(\d{2})/.exec(airedOn || '');
    if (!m) return year ? `${year} г.` : '';
    const month = Number(m[2]); const y = Number(m[1]) + (month === 12 ? 1 : 0);
    const name = month === 12 || month <= 2 ? 'Зима' : month <= 5 ? 'Весна' : month <= 8 ? 'Лето' : 'Осень';
    return `${name} ${y}`;
  }
  // «по субботам» — день недели следующей серии в часовом поясе зрителя.
  function weekdayLabel(nextAt) {
    const date = parseDateAsUtc(nextAt);
    return date ? ['по воскресеньям', 'по понедельникам', 'по вторникам', 'по средам', 'по четвергам', 'по пятницам', 'по субботам'][date.getDay()] : '';
  }
  function episodesLabel({ status, episodes_aired: aired, episodes_total: total }) {
    if (status === 'announced') return total ? `${total} эп. запланировано` : 'Число серий неизвестно';
    if (status === 'ongoing') return total ? `${aired || 0} из ${total} эп.` : `${aired || 0} эп., всего неизвестно`;
    return total ? `${total} эп.` : aired ? `${aired} эп.` : 'Число серий неизвестно';
  }
  // GET /anime/{slug}/last-update → {episode_number, season, translation_team, updated_at}; без релизов все поля null.
  function lastUpdateLabel(update) {
    if (!update || !update.episode_number) return '';
    const episode = `${update.season > 1 ? `${update.season} сезон, ` : ''}${update.episode_number} серия`;
    const team = typeof update.translation_team === 'string' && update.translation_team.trim() ? ` · ${update.translation_team.trim()}` : '';
    return `Добавлено: ${episode}${team}`;
  }
  const poster = id => `https://shikimori.one/system/animes/original/${id}.jpg`;
  // Illustrative local catalog, not a claim about the owner's production database.
  const titles = {
    monster: { id: '19', slug: 'monster', title: 'Монстр', title_en: 'Monster', poster_url: poster(19), kind: 'tv', status: 'released', aired_on: '2004-04-07', year: 2004, episodes_aired: 74, episodes_total: 74, score: 8.88, score_count: 12400, studios: ['Madhouse'], rating: 'r', related: [] },
    'steins-gate': { id: '9253', slug: 'steins-gate', title: 'Врата Штейна', title_en: 'Steins;Gate', title_jp: 'シュタインズ・ゲート', year: 2011, kind: 'tv', episodes_total: 24, score: null, studio: 'White Fox', rating: 'PG-13', poster_url: poster(9253), description: 'Окабэ Ринтаро и его друзья обнаруживают способ отправлять сообщения в прошлое. Каждое изменение событий имеет последствия.', relation: 'Parent' },
    'steins-gate-movie': { id: '11577', slug: 'steins-gate-movie', title: 'Врата Штейна: Зона загрузки дежавю', title_en: 'Steins;Gate: Fuka Ryouiki no Déjà vu', title_jp: 'シュタインズ・ゲート 負荷領域のデジャヴ', year: 2013, kind: 'movie', episodes_total: 1, score: null, studio: 'White Fox', rating: 'PG-13', poster_url: poster(11577), description: 'История Окабэ Ринтаро и Макисэ Курису после событий сериала.', relation: 'Sequel' },
    'steins-gate-0': { id: '30484', slug: 'steins-gate-0', title: 'Врата Штейна 0', title_en: 'Steins;Gate 0', title_jp: 'シュタインズ・ゲート ゼロ', year: 2018, kind: 'tv', episodes_total: 23, score: null, studio: 'White Fox', rating: 'PG-13', poster_url: poster(30484), description: 'Альтернативная ветвь истории Окабэ Ринтаро и его друзей.', relation: 'Alternative' },
  };
  const franchise = Object.values(titles).filter(title => title.slug.startsWith('steins-gate'));
  franchise.forEach(title => { title.related = franchise.filter(row => row.slug !== title.slug).map(({ related, ...row }) => row); });
  // Existing poster/catalog examples get their own identity instead of opening Monster.
  for (const [id, slug, title, episodes, status = 'released'] of [
    [16498, 'attack-on-titan', 'Атака титанов', 25],
    [21, 'one-piece', 'Ван-Пис', 1155, 'ongoing'],
    [40748, 'jujutsu-kaisen', 'Магическая битва', 47],
    [52991, 'frieren', 'Провожающая в последний путь Фрирен', 28],
    [5114, 'fullmetal-alchemist-brotherhood', 'Стальной алхимик: Братство', 64],
    [1, 'cowboy-bebop', 'Ковбой Бибоп', 26],
    [457, 'mushishi', 'Мастер муси', 26],
    [37521, 'vinland-saga', 'Сага о Винланде', 24],
    [33352, 'violet-evergarden', 'Вайолет Эвергарден', 13],
    [54857, 're-zero-3', 'Re:Zero 3', 0, 'announced'],
  ]) titles[slug] = { id: String(id), slug, title, episodes_total: episodes, episodes_aired: status === 'announced' ? 0 : episodes, status, kind: 'tv', poster_url: poster(id), related: [], description: 'Демонстрационные данные карточки из каталога шаблона. Полные сведения, описание и доступные релизы загружаются из Anime response при интеграции.' };
  // У «Ван-Пис» число серий заранее неизвестно (episodes_total = null в API); полоса серий в демо всё равно рисует вышедшие.
  titles['one-piece'].episodes_total_api = null;
  window.KitsuContent = { ageLabel, seasonLabel, weekdayLabel, episodesLabel, lastUpdateLabel, relations, relationShort, relationKanji, relationTone, plural, airLabel, kindLabel, parseDateAsUtc, dateKey, formatCountdown, countdownState, watchOrder, mergeSchedule, scheduleDays, updateLabel, titles, poster };
})();
