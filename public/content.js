(() => {
  'use strict';
  const M = window.KitsuContent;
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const href = slug => `./anime.html?title=${encodeURIComponent(slug)}`;
  const fmt = (date, options) => new Intl.DateTimeFormat('ru-RU', options).format(date);
  // Demo timestamps relative to the visitor's today, so the examples never go stale.
  const at = (day, hour, minute = 0) => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), now.getDate() + day, hour, minute).toISOString(); };
  // Next aired episode for ongoing demo titles (in the app: anime.next_episode_at).
  const nextEpisode = { 'one-piece': { episode: 1156, at: at(2, 19, 30) } };

  function initTitle() {
    const requested = new URLSearchParams(location.search).get('title');
    const title = Object.hasOwn(M.titles, requested) ? M.titles[requested] : M.titles.monster;
    document.body.dataset.animeId = title.id;
    document.body.dataset.episodesTotal = title.episodes_total;
    document.body.dataset.animePoster = title.poster_url;
    if (title.slug !== 'monster') {
      document.title = `${title.title} — Kitsu`;
      $('#title-name').textContent = title.title;
      $('#title-name').nextElementSibling.textContent = title.title_en || '';
      $('.breadcrumbs span:last-child')?.replaceChildren(document.createTextNode(title.title));
      $('#mobile-list-title').textContent = title.title;
      document.querySelectorAll('.title-backdrop img, .title-poster img, .title-poster-wrap img, .player-stage-art img, .episode-thumb img').forEach(img => { img.src = title.poster_url; img.alt = img.closest('.title-poster') ? title.title : ''; });
      const status = title.status || 'released';
      const statusLabel = {released:'Завершён',ongoing:'Онгоинг',announced:'Анонс'}[status];
      const ofuda = $('.title-poster .ofuda');
      if (ofuda) {
        ofuda.className = `ofuda ofuda--${status}`;
        ofuda.querySelector('.ofuda__jp').textContent = {released:'完結',ongoing:'放送中',announced:'予告'}[status];
        ofuda.querySelector('.ofuda__ru').textContent = statusLabel;
      }
      const hanko = $('.title-poster .hanko');
      if (hanko) {
        hanko.hidden = !(title.score > 0);
        if (title.score > 0) { hanko.textContent = title.score; hanko.setAttribute('aria-label', `Оценка ${title.score}`); }
      }
      const next = nextEpisode[title.slug], air = next && M.airLabel(next.at);
      const nextChip = air ? `<span class="next-episode next-episode--${air.status}" data-next-at="${next.at}" title="${esc(fmt(M.parseDateAsUtc(next.at), { weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }))}"><span class="next-episode__fire" aria-hidden="true"></span><b>${next.episode} серия</b><span data-next-label>${air.label}</span></span>` : '';
      $('.title-status-line').innerHTML = `<span class="status-pill status-pill--${status}">${statusLabel}</span><span>${M.kindLabel(title.kind)}</span>${title.year ? `<span>${title.year}</span>` : ''}`;
      // Under the title on every width (the status line itself is hidden on phones).
      if (nextChip) $('.title-heading-row').insertAdjacentHTML('afterend', nextChip);
      if (air) setInterval(() => { const chip = $('.next-episode'), state = M.airLabel(chip?.dataset.nextAt); if (!chip || !state) return; chip.className = `next-episode next-episode--${state.status}`; chip.querySelector('[data-next-label]').textContent = state.label; }, 60000);
      const facts = $('.title-meta-list');
      facts.innerHTML = `${title.year ? `<li><i data-lucide="map-pin"></i><span>Япония, ${title.year} г.</span></li>` : ''}<li><i data-lucide="monitor-play"></i><span>${title.episodes_total} эп. в примере</span></li><li><i data-lucide="calendar-days"></i><span>${M.kindLabel(title.kind)}, ${statusLabel.toLowerCase()}</span></li>${title.studio ? `<li><i data-lucide="users"></i><span>Студия ${esc(title.studio)}</span></li>` : ''}${title.rating ? `<li><i data-lucide="shield-check"></i><span>Возрастной рейтинг ${esc(title.rating)}</span></li>` : ''}`;
      $('.genre-links').textContent = title.slug.startsWith('steins-gate') ? 'Фантастика, триллер' : '';
      $('#title-description p').textContent = title.description;
      $('#title-description-more').textContent = 'Демонстрационная карточка связанного тайтла. В рабочем проекте здесь отображается полное описание из Anime response.';
      const names = [title.title, title.title_en, title.title_jp, title.title_en, ''];
      document.querySelectorAll('.title-name-value').forEach((node, index) => { node.textContent = names[index] || ''; node.closest('div')?.toggleAttribute('hidden', !names[index]); });
      document.querySelectorAll('[data-field="favorites_count"], [data-field="comments_count"]').forEach(node => { node.textContent = '—'; const control = node.closest('[aria-label]'); if (control) control.setAttribute('aria-label', node.dataset.field === 'comments_count' ? 'Перейти к обсуждению' : 'Количество сохранений неизвестно'); });
      document.querySelectorAll('[data-episode]').forEach((node, i) => { if (i >= title.episodes_total) node.remove(); });
      if (!title.episodes_total) {
        $('#player').hidden = true;
        document.querySelectorAll('[data-scroll-player]').forEach(button => { button.disabled = true; button.title = 'В демонстрационных данных пока нет эпизодов'; });
      }
    }
    const section = $('#watch-order');
    const list = M.watchOrder(title.related, title);
    section.hidden = list.length < 2;
    if (!list.length) return;
    $('#watch-order-count').textContent = `${list.length} ${M.plural(list.length, 'тайтл', 'тайтла', 'тайтлов')}`;
    // Posters with the relation on an ofuda: 前 before, 続 after, 今 for the page you are on.
    $('#watch-order-list').innerHTML = list.map((row, index) => {
      const label = row.is_current ? 'Вы здесь' : (M.relations[row.relation] || row.relation || 'Связано');
      const tone = row.is_current ? 'current' : M.relationTone(row.relation);
      const kanji = row.is_current ? '今' : (M.relationKanji[row.relation] || '縁');
      const meta = [row.year, row.kind ? M.kindLabel(row.kind) : '', row.episodes_total > 1 ? `${row.episodes_total} эп.` : ''].filter(Boolean).map(part => `<span>${esc(part)}</span>`).join('');
      const content = `<span class="relation-poster"><img src="${esc(row.poster_url)}" alt="Постер «${esc(row.title)}»" width="150" height="216" loading="lazy" referrerpolicy="no-referrer"><span class="ofuda ofuda--relation ofuda--rel-${tone}"><span class="ofuda__jp" aria-hidden="true">${kanji}</span><span class="ofuda__ru">${esc(label)}</span></span><span class="relation-step" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span></span><span class="relation-copy"><strong>${esc(row.title)}</strong><span class="relation-meta">${meta}</span></span>`;
      return `<li>${row.is_current ? `<div class="relation-card is-current" aria-current="page">${content}</div>` : `<a class="relation-card" href="${href(row.slug)}">${content}</a>`}</li>`;
    }).join('');
    // Decorative route over the same list: years above numbered stops, films as diamonds.
    const currentIndex = list.findIndex(row => row.is_current);
    $('#watch-order-path').innerHTML = list.map((row, index) => `<li class="watch-path__step${row.is_current ? ' is-current' : ''}${index <= currentIndex ? ' is-reached' : ''}${row.kind === 'movie' ? ' is-movie' : ''}"><span class="watch-path__label">${row.is_current ? 'Вы здесь' : (row.year || '—')}</span><span class="watch-path__node"><span>${index + 1}</span></span></li>`).join('');
    $('#watch-order-toggle').addEventListener('click', event => {
      const expanded = event.currentTarget.getAttribute('aria-expanded') !== 'true';
      event.currentTarget.setAttribute('aria-expanded', String(expanded));
      $('#watch-order-list').hidden = !expanded;
      $('#watch-order-path').hidden = !expanded;
    });
  }

  function initSchedule() {
    const section = $('#schedule');
    if (!section) return;
    const now = new Date();
    const item = (slug, id, title, episode, time, genres = '') => ({ local_slug: slug, local_poster: M.poster(id), next_episode: episode, next_episode_at: time, genres, anime: { id, russian: title, episodes_aired: episode - 1 } });
    const schedule = M.mergeSchedule([
      item('monster', 19, 'Монстр', 73, at(-2, 17, 30), 'Детектив · Драма'),
      item('frieren', 52991, 'Фрирен', 1, at(0, 9, 30), 'Приключения · Фэнтези'),
    ], [
      item('one-piece', 21, 'Ван-Пис', 1156, at(0, 19, 30), 'Приключения · Комедия'),
      item('jujutsu-kaisen', 40748, 'Магическая битва', 12, at(0, 21), 'Экшен · Сверхъестественное'),
      item('frieren', 52991, 'Фрирен', 2, at(1, 18, 30), 'Приключения · Фэнтези'),
      item('steins-gate', 9253, 'Врата Штейна', 8, at(4, 23), 'Фантастика · Триллер'),
    ]);
    let activeKey = M.dateKey(now);
    let followToday = true;
    function renderDays() {
      const today = M.dateKey(new Date());
      const days = M.scheduleDays(schedule);
      if (!days.some(day => day.key === activeKey)) activeKey = today;
      $('#schedule-days').innerHTML = days.map(day => `<button type="button" class="day-tab${day.key === activeKey ? ' is-active' : ''}${day.key === today ? ' is-today' : ''}" role="tab" id="day-${day.key}" aria-controls="schedule-items" aria-selected="${day.key === activeKey}" tabindex="${day.key === activeKey ? '0' : '-1'}" data-calendar-day="${day.key}"><span class="day-tab__dow">${fmt(day.date, { weekday: 'short' })}</span><span class="day-tab__num">${day.date.getDate()}</span><span class="day-tab__mon">${fmt(day.date, { month: 'short' })}</span>${day.count ? `<span class="day-tab__count">${day.count}</span>` : ''}</button>`).join('');
    }
    // One row per episode: big local time, poster, title over a blurred still of the same title.
    function airRow(row) {
      const date = M.parseDateAsUtc(row.next_episode_at), diff = date.getTime() - Date.now(), air = M.airLabel(row.next_episode_at);
      return `<a class="schedule-item schedule-item--air${diff > 0 ? '' : ' is-aired'}" href="${href(row.local_slug)}"><span class="air-backdrop" aria-hidden="true"><img src="${esc(row.local_poster)}" alt="" loading="lazy" referrerpolicy="no-referrer"></span><time class="air-time" datetime="${row.next_episode_at}"><b>${fmt(date, { hour: '2-digit', minute: '2-digit' })}</b><span>${fmt(date, { weekday: 'short' })}</span></time><img class="air-poster" src="${esc(row.local_poster)}" alt="" loading="lazy" referrerpolicy="no-referrer"><span class="air-copy"><strong>${esc(row.anime.russian)}</strong><small>${row.next_episode} серия${row.genres ? `<span class="air-genres"> · ${esc(row.genres)}</span>` : ''}</small><small class="schedule-countdown"${air && air.status !== 'past' ? '' : ' hidden'}>${air && air.status !== 'past' ? `Выйдет ${air.label}` : ''}</small><small class="air-done"${diff > 0 ? ' hidden' : ''}>Вышла</small></span></a>`;
    }
    const nowLine = () => `<div class="air-now" role="presentation"><span>Сейчас у вас <b data-now-clock>${fmt(new Date(), { hour: '2-digit', minute: '2-digit' })}</b></span></div>`;
    function renderItems() {
      const rows = schedule.filter(row => M.dateKey(M.parseDateAsUtc(row.next_episode_at)) === activeKey);
      const panel = $('#schedule-items');
      panel.setAttribute('aria-labelledby', `day-${activeKey}`);
      if (!rows.length) {
        const upcoming = schedule.find(row => M.parseDateAsUtc(row.next_episode_at) > new Date());
        panel.innerHTML = `<div class="schedule-empty"><i data-lucide="moon-star"></i><strong>Затишье</strong><span>${upcoming ? `В этот день серий нет. Ближайшая — ${esc(upcoming.anime.russian)}, ${fmt(M.parseDateAsUtc(upcoming.next_episode_at), { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}.` : 'В этот день серий нет.'}</span></div>`;
        window.lucide?.createIcons?.({ attrs: { 'aria-hidden': 'true' } });
        return;
      }
      const isToday = activeKey === M.dateKey(new Date());
      const firstFuture = rows.findIndex(row => M.parseDateAsUtc(row.next_episode_at) > new Date());
      panel.innerHTML = rows.map((row, index) => `${isToday && index === (firstFuture < 0 ? rows.length : firstFuture) ? nowLine() : ''}${airRow(row)}`).join('') + (isToday && firstFuture < 0 ? nowLine() : '');
    }
    function selectDay(key, focus = false) {
      activeKey = key;
      followToday = key === M.dateKey(new Date());
      $('#schedule-days').querySelectorAll('[role="tab"]').forEach(button => {
        const active = button.dataset.calendarDay === key;
        button.classList.toggle('is-active', active); button.setAttribute('aria-selected', String(active)); button.tabIndex = active ? 0 : -1;
        if (active && focus) button.focus();
      });
      renderItems();
    }
    $('#schedule-days').addEventListener('click', event => { const button = event.target.closest('[data-calendar-day]'); if (button) selectDay(button.dataset.calendarDay); });
    $('#schedule-days').addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const tabs = [...$('#schedule-days').querySelectorAll('[role="tab"]')], index = tabs.indexOf(event.target);
      if (index < 0) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      selectDay(tabs[next].dataset.calendarDay, true);
    });
    const updates = [
      { id: 19, title: 'Монстр', slug: 'monster', kind: 'tv', last_episode_number: 74, last_translation_team: 'AniLibria', last_release_at: at(0, 14, 20) },
      { id: 9253, title: 'Врата Штейна', slug: 'steins-gate', kind: 'tv', last_episode_number: null, last_translation_team: 'AniDUB', last_release_at: at(-1, 20, 40) },
      { id: 11577, title: 'Врата Штейна: Зона загрузки дежавю', slug: 'steins-gate-movie', kind: 'movie', last_episode_number: 1, last_translation_team: null, last_release_at: at(-2, 9, 12) },
      { id: 5114, title: 'Стальной алхимик: Братство', slug: 'fullmetal-alchemist-brotherhood', kind: 'tv', last_episode_number: 64, last_translation_team: 'AniDUB', last_release_at: at(-3, 11, 30) },
      { id: 1, title: 'Ковбой Бибоп', slug: 'cowboy-bebop', kind: 'tv', last_episode_number: null, last_translation_team: null, last_release_at: at(-4, 18) },
    ];
    $('#update-items').innerHTML = updates.map(row => { const date = M.parseDateAsUtc(row.last_release_at); return `<a class="schedule-item" href="${href(row.slug)}"><img src="${M.poster(row.id)}" alt="" loading="lazy" referrerpolicy="no-referrer"><span><strong>${esc(row.title)}</strong><small>${esc(M.updateLabel(row))}</small><small>${M.kindLabel(row.kind)}</small></span><time datetime="${row.last_release_at}"><span>${fmt(date, { day: 'numeric', month: 'short' })}</span><b>${fmt(date, { hour: '2-digit', minute: '2-digit' })}</b></time></a>`; }).join('');
    renderDays(); renderItems();
    let renderedDate = M.dateKey(new Date());
    function refresh() {
      if (document.hidden) return;
      const today = M.dateKey(new Date());
      if (today !== renderedDate) {
        if (followToday) activeKey = today;
        renderDays();
        renderItems();
        renderedDate = today;
      }
      // Update only the clock text, preserving focused links and the date strip.
      $('#schedule-items').querySelectorAll('time').forEach(time => {
        const diff = M.parseDateAsUtc(time.dateTime) - Date.now(), air = M.airLabel(time.dateTime);
        const row = time.closest('.schedule-item'), countdown = row.querySelector('.schedule-countdown'), done = row.querySelector('.air-done');
        row.classList.toggle('is-aired', diff <= 0);
        if (countdown) { countdown.hidden = diff <= 0; if (air && diff > 0) countdown.textContent = `Выйдет ${air.label}`; }
        if (done) done.hidden = diff > 0;
      });
      // The "now" line moves by moving the node itself, so links and focus stay put.
      $('#schedule-items').querySelectorAll('.air-now').forEach(line => {
        line.querySelectorAll('[data-now-clock]').forEach(clock => { clock.textContent = fmt(new Date(), { hour: '2-digit', minute: '2-digit' }); });
        const next = [...line.parentElement.querySelectorAll('.schedule-item:not(.is-aired)')][0];
        if (next && next.previousElementSibling !== line) line.parentElement.insertBefore(line, next);
        if (!next && line.nextElementSibling) line.parentElement.append(line);
      });
    }
    let timer = setInterval(refresh, 60000);
    addEventListener('pagehide', () => clearInterval(timer));
    addEventListener('pageshow', event => { if (event.persisted) { refresh(); timer = setInterval(refresh, 60000); } });
    document.addEventListener('visibilitychange', refresh);
  }
  if (document.body.dataset.page === 'anime') initTitle();
  if (document.body.dataset.page === 'home') initSchedule();
  // Preserve the template entrypoint while giving the franchise a coherent example.
  document.querySelectorAll('.anime-card, .feature-slide, .continue-card, .landscape-card, .search-result').forEach(card => {
    const id = card.querySelector('img')?.src.match(/\/(\d+)\.[^/]+$/)?.[1];
    const title = Object.values(M.titles).find(title => title.id === id);
    if (!title) return;
    const links = [...card.querySelectorAll('a[href*="anime.html"]')];
    if (card.matches('a[href*="anime.html"]')) links.push(card);
    links.forEach(link => { link.href = href(title.slug); });
  });
})();
