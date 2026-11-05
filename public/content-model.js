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
    [11061, 'hunter-x-hunter', 'Охотник х Охотник', 148],
    [1535, 'death-note', 'Тетрадь смерти', 37],
    [38000, 'demon-slayer', 'Клинок, рассекающий демонов', 26],
    [31964, 'my-hero-academia', 'Моя геройская академия', 13],
  ]) titles[slug] = { id: String(id), slug, title, episodes_total: episodes, episodes_aired: status === 'announced' ? 0 : episodes, status, kind: 'tv', poster_url: poster(id), related: [], description: 'Демонстрационные данные карточки из каталога шаблона. Полные сведения, описание и доступные релизы загружаются из Anime response при интеграции.' };
  // У «Ван-Пис» число серий заранее неизвестно (episodes_total = null в API); полоса серий в демо всё равно рисует вышедшие.
  titles['one-piece'].episodes_total_api = null;
  // ОДНА оценка на тайтл для всех мест демо (постер каталога, слайдер, поиск, ханко, профиль, «Закладки»):
  // у сервера это одно поле anime.score, значит и в шаблоне одно и то же число. Показывается через formatScore.
  const SCORES = { monster: 8.88, frieren: 9.31, 'fullmetal-alchemist-brotherhood': 9.1, 'steins-gate': 9.07, 'cowboy-bebop': 8.75, 'attack-on-titan': 8.55,
    'jujutsu-kaisen': 8.6, 'one-piece': 8.7, mushishi: 8.7, 'vinland-saga': 8.75, 'violet-evergarden': 8.68, 'hunter-x-hunter': 9.04, 'death-note': 8.62,
    'demon-slayer': 8.45, 'my-hero-academia': 7.9 };
  Object.entries(SCORES).forEach(([slug, score]) => { if (titles[slug]) titles[slug].score = score; });
  // ЕДИНЫЙ словарь статусов закладки: порядок, подписи и значки. Им пользуются все места, где статус выбирают
  // или показывают (кнопка и меню на постере, меню на странице тайтла, профиль, «Закладки»). Порядок — как в API.
  const bookmarkStatuses = [
    { key: 'watching', label: 'Смотрю', icon: 'play' },
    { key: 'completed', label: 'Просмотрено', icon: 'check' },
    { key: 'planned', label: 'Запланировано', icon: 'clock' },
    { key: 'on_hold', label: 'Отложено', icon: 'pause' },
    { key: 'dropped', label: 'Брошено', icon: 'minus' },
  ];
  const bookmarkRemove = { label: 'Убрать из списка', icon: 'bookmark-minus' };
  // ЕДИНЫЙ формат оценки: как отдаёт API, но без хвостовых нулей — 8.88, 9.1, 9.
  const scoreFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  const formatScore = value => (Number(value) > 0 ? scoreFormat.format(Number(value)) : '');
  // ЕДИНАЯ карточка тайтла — та же разметка, что у карточек каталога на главной (.anime-card). Кнопку закладки,
  // метку статуса на постере и меню к ней подключает app.js: window.KitsuBookmarks.bind(контейнер).
  // facts — строка под названием (по умолчанию «N эп.»); оценка — только на постере, второй раз не пишется.
  const escHtml = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function episodesShort(a) {
    if (a.status === 'announced' || a.status === 'anons') return 'Анонс';
    const n = a.episodes_total || a.episodes_aired; return n ? `${n} эп.` : '';
  }
  // Подпись под карточкой закладки — одна для профиля и «Закладок»: в «Смотрю» — на какой серии остановились
  // (из GET /interactions/watch-history/me), иначе — то же, что в каталоге («N эп.»).
  function bookmarkFacts(f, progress) {
    const total = f.anime.episodes_total;
    return f.category === 'watching' && progress?.episode ? `Серия ${progress.episode}${total ? ` из ${total}` : ''}` : episodesShort(f.anime);
  }
  function animeCard(a, { facts = episodesShort(a), extra = '', style = '' } = {}) {
    const href = `./anime.html?title=${encodeURIComponent(a.slug)}`; const score = formatScore(a.score);
    return `<article class="anime-card" data-status="${escHtml(a.status || 'released')}"${style ? ` style="${escHtml(style)}"` : ''}>
      <a class="poster-frame" href="${href}"><img decoding="async" src="${escHtml(a.poster_url)}" alt="Постер аниме «${escHtml(a.title)}»" loading="lazy" referrerpolicy="no-referrer" />${score ? `<span class="poster-score" aria-label="Оценка ${score}">${score}</span>` : ''}</a>
      <div class="card-title-row"><a href="${href}"><h3>${escHtml(a.title)}</h3></a><button class="bookmark-button" type="button" data-bookmark aria-label="Добавить «${escHtml(a.title)}» в список"><i data-lucide="bookmark"></i></button></div>
      ${facts ? `<p class="card-facts"><span>${escHtml(facts)}</span></p>` : ''}${extra}
    </article>`;
  }
  // Демо-закладки — одни на весь шаблон: кнопка «В закладки» на тайтле и в каталоге (app.js), раздел закладок
  // в профиле и страница «Закладки». Хранилище — то же, что у app.js: localStorage["kitsu-demo-bookmark-status-<id>"]
  // = статус или "none"; время правки — "kitsu-demo-bookmark-updated-<id>". В приложении всё это — GET/POST/DELETE /interactions/favorites.
  const LIBRARY_SEED = [
    // slug, статус, user_score, часов назад изменено, часов назад добавлено (оценка тайтла — из SCORES выше)
    ['monster', 'watching', null, 3, 900], ['jujutsu-kaisen', 'watching', 8, 40, 600], ['one-piece', 'watching', null, 90, 2000], ['vinland-saga', 'watching', 9, 15, 300],
    ['steins-gate', 'completed', 10, 210, 2800], ['cowboy-bebop', 'completed', 9, 220, 2600], ['fullmetal-alchemist-brotherhood', 'completed', 10, 230, 2500],
    ['hunter-x-hunter', 'completed', 9, 240, 2400], ['attack-on-titan', 'completed', 8, 250, 2300], ['death-note', 'completed', 8, 260, 2200],
    ['frieren', 'planned', null, 12, 50], ['mushishi', 'planned', null, 5, 60], ['violet-evergarden', 'planned', null, 6, 70], ['demon-slayer', 'planned', null, 7, 80],
    ['my-hero-academia', 'on_hold', 6, 30, 1500],
  ];
  const LIBRARY_STATUSES = ['watching', 'completed', 'planned', 'on_hold', 'dropped'];
  const librarySeedById = () => Object.fromEntries(LIBRARY_SEED.map(row => [titles[row[0]].id, row]));
  const library = {
    statuses: LIBRARY_STATUSES,
    // Статус по умолчанию для кнопки «В закладки» (app.js): тот, что в демо-закладках, иначе «нет».
    defaults() { return Object.fromEntries(LIBRARY_SEED.map(([slug, category]) => [titles[slug].id, category])); },
    // Список в форме ответа GET /interactions/favorites; storage — localStorage или его заменитель.
    list(storage, now = Date.now()) {
      const read = key => { try { return storage.getItem(key); } catch (_) { return null; } };
      const naive = ms => new Date(ms).toISOString().slice(0, 19);
      const seed = librarySeedById(); const ids = new Set(Object.keys(seed));
      try { for (let i = 0; i < storage.length; i += 1) { const m = /^kitsu-demo-bookmark-status-(\d+)$/.exec(storage.key(i) || ''); if (m) ids.add(m[1]); } } catch (_) { /* приватный режим */ }
      const out = [];
      for (const id of ids) {
        const title = Object.values(titles).find(t => t.id === id); if (!title) continue;
        const row = seed[id]; const saved = read(`kitsu-demo-bookmark-status-${id}`);
        const category = LIBRARY_STATUSES.includes(saved) ? saved : saved === 'none' ? null : row?.[1];
        if (!category) continue;
        const updated = read(`kitsu-demo-bookmark-updated-${id}`);
        out.push({
          id: `f-${id}`, anime_id: `a-${title.slug}`, category, user_score: row?.[2] ?? null,
          created_at: row ? naive(now - row[4] * 3600000) : updated || naive(now), updated_at: updated || (row ? naive(now - row[3] * 3600000) : naive(now)),
          anime: { id: `a-${title.slug}`, slug: title.slug, title: title.title, poster_url: title.poster_url, episodes_total: 'episodes_total_api' in title ? title.episodes_total_api : title.episodes_total,
            episodes_aired: title.episodes_aired ?? title.episodes_total, score: title.score ?? null, status: title.status || 'released', kind: title.kind || 'tv' },
        });
      }
      return out;
    },
    // POST (статус) или DELETE ("none") закладки; пишет те же ключи, что кнопка «В закладки».
    set(storage, slug, category) {
      const id = titles[slug]?.id; if (!id) return null;
      const at = new Date().toISOString().slice(0, 19);
      try { storage.setItem(`kitsu-demo-bookmark-status-${id}`, category || 'none'); storage.setItem(`kitsu-demo-bookmark-updated-${id}`, at); } catch (_) { /* приватный режим */ }
      return at;
    },
  };
  // «Где продолжить чтение» (плашка на странице тайтла). Сервер отдаёт только код статуса и числа
  // (coverage: { status, unit, covered_up_to, source_url, is_last_season }); текст собирается здесь,
  // чтобы его можно было локализовать, а числа не выдумывались: next = covered_up_to + 1 только при status = known.
  const CONTINUE_READING_TEXT = {
    ru: {
      label: 'Где продолжить чтение',
      known_chapter: 'Аниме закончилось на главе {n}. Продолжайте читать с главы {next}.',
      known_volume: 'Аниме закончилось на томе {n}. Продолжайте читать с тома {next}.',
      partial_cut_chapter: 'Аниме оборвалось на середине главы {n}. Продолжайте с этой главы или с начала арки.',
      caught_up: 'Аниме догнало источник: продолжения пока нет.',
      original_ending: 'У аниме оригинальная концовка: прямого продолжения в источнике нет.',
      no_data: 'Данных о том, где продолжить чтение, нет.',
      source: 'Источник: {url}'
    },
    en: {
      label: 'Where to continue reading',
      known_chapter: 'The anime ended at chapter {n}. Continue reading from chapter {next}.',
      known_volume: 'The anime ended at volume {n}. Continue reading from volume {next}.',
      partial_cut_chapter: 'The anime stopped mid-chapter {n}. Continue from that chapter or the start of the arc.',
      caught_up: 'The anime has caught up with the source: no continuation yet.',
      original_ending: 'The anime has an original ending: no direct continuation in the source.',
      no_data: 'There is no data on where to continue reading.',
      source: 'Source: {url}'
    }
  };
  // Демо-coverage по slug. Адреса в source_url — ЗАГЛУШКИ на зарезервированном домене example.org, НЕ реальные источники.
  // Объекта нет → плашка не рендерится. У всех демо-тайтлов is_last_season: true.
  const readingCoverage = {
    frieren: { status: 'known', unit: 'chapter', covered_up_to: 118, source_url: 'https://example.org/stub/frieren-manga', is_last_season: true },
    'steins-gate': { status: 'known', unit: 'volume', covered_up_to: 3, source_url: 'https://example.org/stub/steins-gate-source', is_last_season: true },
    'one-piece': { status: 'caught_up', unit: 'chapter', covered_up_to: null, source_url: null, is_last_season: true },
    monster: { status: 'original_ending', unit: 'chapter', covered_up_to: null, source_url: null, is_last_season: true },
    'vinland-saga': { status: 'no_data', unit: 'chapter', covered_up_to: null, source_url: null, is_last_season: true }
  };
  // Текст плашки по (coverage, locale). null — плашку не показывать (нет объекта или не последний сезон).
  // Склонять единицу не нужно (глава/том стоят в готовых фразах), поэтому plural() здесь не нужен.
  function continueReadingText(coverage, locale = 'ru') {
    if (!coverage || typeof coverage !== 'object' || coverage.is_last_season !== true) return null;
    const dict = CONTINUE_READING_TEXT[locale] || CONTINUE_READING_TEXT.ru;
    const unit = coverage.unit === 'volume' ? 'volume' : 'chapter';
    const n = coverage.covered_up_to;
    const hasN = typeof n === 'number' && Number.isFinite(n) && n >= 0;
    let key = 'no_data';
    if (coverage.status === 'known' && hasN) key = `known_${unit}`;
    else if (coverage.status === 'partial_cut' && hasN && unit === 'chapter') key = 'partial_cut_chapter';
    else if (coverage.status === 'caught_up' || coverage.status === 'original_ending') key = coverage.status;
    // Всё остальное (в т. ч. known без числа или неизвестный код) честно сводится к «данных нет»: чисел не выдумываем.
    const vars = key.startsWith('known_') ? { n, next: n + 1 } : key === 'partial_cut_chapter' ? { n } : {};
    const text = dict[key].replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ''));
    const url = key !== 'no_data' && typeof coverage.source_url === 'string' && /^https?:\/\//i.test(coverage.source_url) ? coverage.source_url : null;
    const shown = url ? url.replace(/^https?:\/\//i, '').replace(/\/$/, '') : '';
    return { status: key, tone: key === 'no_data' ? 'muted' : 'accent', label: dict.label, text, source: url ? { url, text: dict.source.replace('{url}', shown) } : null };
  }
  window.KitsuContent = { animeCard, bookmarkFacts, episodesShort, bookmarkStatuses, bookmarkRemove, formatScore, library, ageLabel, seasonLabel, weekdayLabel, episodesLabel, lastUpdateLabel, relations, relationShort, relationKanji, relationTone, plural, airLabel, kindLabel, parseDateAsUtc, dateKey, formatCountdown, countdownState, watchOrder, mergeSchedule, scheduleDays, updateLabel, titles, poster, readingCoverage, continueReadingText };
})();
