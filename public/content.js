(() => {
  'use strict';
  const M = window.KitsuContent;
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const href = slug => `./anime.html?title=${encodeURIComponent(slug)}`;
  const fmt = (date, options) => new Intl.DateTimeFormat('ru-RU', options).format(date);

  function initTitle() {
    const requested = new URLSearchParams(location.search).get('title');
    const title = M.titles[requested] || M.titles.monster;
    document.body.dataset.animeId = title.id;
    document.body.dataset.episodesTotal = title.episodes_total;
    document.body.dataset.animePoster = title.poster_url;
    if (title.slug !== 'monster') {
      document.title = `${title.title} — Kitsu`;
      $('#title-name').textContent = title.title;
      $('#title-name').nextElementSibling.textContent = title.title_en || '';
      $('.breadcrumbs span:last-child')?.replaceChildren(document.createTextNode(title.title));
      $('#mobile-list-title').textContent = title.title;
      document.querySelectorAll('.title-backdrop img, .title-poster img, .title-poster-wrap img, .player-stage-art img, .episode-thumb img').forEach(img => { img.src = title.poster_url; img.alt = title.title; });
      const status = title.status || 'released';
      const statusLabel = {released:'Завершён',ongoing:'Онгоинг',announced:'Анонс'}[status];
      $('.title-status-line').innerHTML = `<span class="status-pill status-pill--${status}">${statusLabel}</span><span>${M.kindLabel(title.kind)}</span>${title.year ? `<span>${title.year}</span>` : ''}`;
      const facts = $('.title-meta-list');
      facts.innerHTML = `${title.year ? `<li><i data-lucide="map-pin"></i><span>Япония, ${title.year} г.</span></li>` : ''}<li><i data-lucide="monitor-play"></i><span>${title.episodes_total} эп. в примере</span></li><li><i data-lucide="calendar-days"></i><span>${M.kindLabel(title.kind)}, ${statusLabel.toLowerCase()}</span></li>${title.studio ? `<li><i data-lucide="users"></i><span>Студия ${esc(title.studio)}</span></li>` : ''}${title.rating ? `<li><i data-lucide="shield-check"></i><span>Возрастной рейтинг ${esc(title.rating)}</span></li>` : ''}`;
      $('.genre-links').textContent = title.slug.startsWith('steins-gate') ? 'Фантастика, триллер' : '';
      $('#title-description p').textContent = title.description;
      $('#title-description-more').textContent = 'Демонстрационная карточка связанного тайтла. В рабочем проекте здесь отображается полное описание из Anime response.';
      const names = [title.title, title.title_en, title.title_jp, title.title_en, ''];
      document.querySelectorAll('.title-name-value').forEach((node, index) => { node.textContent = names[index] || ''; node.closest('div')?.toggleAttribute('hidden', !names[index]); });
      document.querySelectorAll('[data-field="favorites_count"], [data-field="comments_count"]').forEach(node => { node.textContent = '—'; const control = node.closest('[aria-label]'); if (control) control.setAttribute('aria-label', node.dataset.field === 'comments_count' ? 'Перейти к обсуждению' : 'Количество сохранений неизвестно'); });
      document.querySelectorAll('[data-episode]').forEach((node, i) => {
        if (i >= title.episodes_total) node.remove();
        else { node.querySelector('.episode-copy strong').textContent = `Серия ${i + 1}`; node.querySelector('.episode-copy small').textContent = 'Сезон 1'; }
      });
      $('.episodes-title span').textContent = `${title.episodes_total} эпизодов`;
      const more = $('[data-load-episodes]');
      more.hidden = title.episodes_total <= 6;
      more.querySelector('small').textContent = `7–${Math.min(18, title.episodes_total)} из ${title.episodes_total}`;
      if (!title.episodes_total) {
        $('#player').hidden = true;
        document.querySelectorAll('[data-watch]').forEach(button => { button.disabled = true; button.title = 'В демонстрационных данных пока нет эпизодов'; });
      }
    }
    const section = $('#watch-order');
    const list = M.watchOrder(title.related, title);
    section.hidden = list.length < 2;
    if (!list.length) return;
    $('#watch-order-count').textContent = `${list.length} тайтла`;
    $('#watch-order-list').innerHTML = list.map(row => {
      const content = `<img src="${esc(row.poster_url)}" alt="" width="68" height="96" loading="lazy" referrerpolicy="no-referrer"><span class="watch-order-copy"><strong>${esc(row.title)}</strong><span class="watch-order-meta"><span class="watch-relation${row.is_current ? ' is-current' : ''}">${row.is_current ? 'Вы здесь' : esc(M.relations[row.relation] || row.relation)}</span>${row.year ? `<span>${row.year}</span>` : ''}${row.kind ? `<span>${M.kindLabel(row.kind)}</span>` : ''}${row.episodes_total > 0 ? `<span>${row.episodes_total} эп.</span>` : ''}${row.score > 0 ? `<span>★ ${row.score}</span>` : ''}</span></span>`;
      return `<li>${row.is_current ? `<div class="watch-order-row" aria-current="page">${content}</div>` : `<a class="watch-order-row" href="${href(row.slug)}">${content}</a>`}</li>`;
    }).join('');
    $('#watch-order-toggle').addEventListener('click', event => {
      const expanded = event.currentTarget.getAttribute('aria-expanded') !== 'true';
      event.currentTarget.setAttribute('aria-expanded', String(expanded));
      $('#watch-order-list').hidden = !expanded;
    });
  }

  function initSchedule() {
    const section = $('#schedule');
    if (!section) return;
    const now = new Date();
    const at = (day, hour, minute = 0) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + day, hour, minute).toISOString();
    const item = (slug, id, title, episode, time) => ({ local_slug: slug, local_poster: M.poster(id), next_episode: episode, next_episode_at: time, anime: { id, russian: title, episodes_aired: episode - 1 } });
    const schedule = M.mergeSchedule([
      item('monster', 19, 'Монстр', 73, at(-2, 17, 30)),
    ], [
      item('one-piece', 21, 'Ван-Пис', 1156, at(0, 19, 30)),
      item('jujutsu-kaisen', 40748, 'Магическая битва', 12, at(0, 21)),
      item('frieren', 52991, 'Фрирен', 2, at(1, 18, 30)),
      item('steins-gate', 9253, 'Врата Штейна', 8, at(4, 23)),
    ]);
    let activeKey = M.dateKey(now);
    function renderDays() {
      const today = M.dateKey(new Date());
      const days = M.scheduleDays(schedule);
      if (!days.some(day => day.key === activeKey)) activeKey = today;
      $('#schedule-days').innerHTML = days.map(day => `<button type="button" class="day-tab${day.key === activeKey ? ' is-active' : ''}${day.key === today ? ' is-today' : ''}" role="tab" id="day-${day.key}" aria-controls="schedule-items" aria-selected="${day.key === activeKey}" tabindex="${day.key === activeKey ? '0' : '-1'}" data-calendar-day="${day.key}"><span class="day-tab__dow">${fmt(day.date, { weekday: 'short' })}</span><span class="day-tab__num">${day.date.getDate()}</span><span class="day-tab__mon">${fmt(day.date, { month: 'short' })}</span>${day.count ? `<span class="day-tab__count">${day.count}</span>` : ''}</button>`).join('');
    }
    function renderItems() {
      const rows = schedule.filter(row => M.dateKey(M.parseDateAsUtc(row.next_episode_at)) === activeKey);
      const panel = $('#schedule-items');
      panel.setAttribute('aria-labelledby', `day-${activeKey}`);
      panel.innerHTML = rows.length ? rows.map(row => {
        const date = M.parseDateAsUtc(row.next_episode_at), diff = date.getTime() - Date.now();
        return `<a class="schedule-item" href="${href(row.local_slug)}"><img src="${esc(row.local_poster)}" alt="" loading="lazy" referrerpolicy="no-referrer"><span><strong>${esc(row.anime.russian)}</strong><small>${diff > 0 ? 'Выйдет' : 'Вышла'} ${row.next_episode} серия</small>${diff > 0 ? `<small class="schedule-countdown">До выхода: ${M.formatCountdown(diff)}</small>` : ''}</span><time datetime="${row.next_episode_at}">${fmt(date, { hour: '2-digit', minute: '2-digit' })}</time></a>`;
      }).join('') : '<div class="schedule-empty"><strong>В этот день релизов нет</strong><span>Выберите другую дату.</span></div>';
    }
    function selectDay(key, focus = false) {
      activeKey = key;
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
      if (today !== renderedDate) { renderDays(); renderedDate = today; }
      // Update only the clock text, preserving focused links and the date strip.
      $('#schedule-items').querySelectorAll('time').forEach(time => {
        const date = M.parseDateAsUtc(time.dateTime), diff = date - Date.now();
        const row = time.closest('.schedule-item'), countdown = row.querySelector('.schedule-countdown');
        if (countdown) { countdown.hidden = diff <= 0; countdown.textContent = `До выхода: ${M.formatCountdown(diff)}`; }
        if (diff <= 0) { const label = row.querySelector('small'); label.textContent = label.textContent.replace('Выйдет', 'Вышла'); }
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
