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
      // Next episode sits on the poster itself, as a torn-off ticket stub along its bottom edge.
      const nextStub = air ? `<span class="air-stub air-stub--${air.status}" data-next-at="${next.at}" title="${esc(fmt(M.parseDateAsUtc(next.at), { weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }))}"><span class="air-stub__kanji" aria-hidden="true">次回</span><span class="air-stub__body"><b>${next.episode} серия</b><span data-next-label>${air.label}</span></span></span>` : '';
      $('.title-status-line').innerHTML = `<span class="status-pill status-pill--${status}">${statusLabel}</span><span>${M.kindLabel(title.kind)}</span>${title.year ? `<span>${title.year}</span>` : ''}`;
      if (nextStub) $('.title-poster').insertAdjacentHTML('beforeend', nextStub);
      if (air) setInterval(() => { const stub = $('.air-stub'), state = M.airLabel(stub?.dataset.nextAt); if (!stub || !state) return; stub.className = `air-stub air-stub--${state.status}`; stub.querySelector('[data-next-label]').textContent = state.label; }, 60000);
      const facts = $('.title-meta-list');
      facts.innerHTML = `${title.year ? `<li><i data-lucide="map-pin"></i><span>Япония, ${title.year} г.</span></li>` : ''}<li><i data-lucide="monitor-play"></i><span>${title.episodes_total} эп.</span></li><li><i data-lucide="calendar-days"></i><span>${M.kindLabel(title.kind)}, ${statusLabel.toLowerCase()}</span></li>${title.studio ? `<li><i data-lucide="users"></i><span>Студия ${esc(title.studio)}</span></li>` : ''}${title.rating ? `<li><i data-lucide="shield-check"></i><span>Возрастной рейтинг ${esc(title.rating)}</span></li>` : ''}`;
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
    $('#watch-order-count').textContent = `${list.length}`;
    $('#watch-order-count').setAttribute('aria-label', `${list.length} ${M.plural(list.length, 'тайтл', 'тайтла', 'тайтлов')}`);
    // "Red thread": the franchise hangs on one thread in watch order. Each poster carries its relation on itself.
    $('#watch-order-list').innerHTML = list.map((row, index) => {
      const label = row.is_current ? 'Вы здесь' : (M.relationShort[row.relation] || M.relations[row.relation] || row.relation || 'Связано');
      const tone = row.is_current ? 'current' : M.relationTone(row.relation);
      const kanji = row.is_current ? '今' : (M.relationKanji[row.relation] || '縁');
      const meta = [row.year, row.kind ? M.kindLabel(row.kind) : '', row.episodes_total > 1 ? `${row.episodes_total} эп.` : ''].filter(Boolean).map(part => `<span>${esc(part)}</span>`).join('');
      const content = `<span class="thread-knot" aria-hidden="true"><span>${index + 1}</span></span><span class="relation-poster"><img src="${esc(row.poster_url)}" alt="Постер «${esc(row.title)}»" width="150" height="216" loading="lazy" referrerpolicy="no-referrer"><span class="relation-kanji" aria-hidden="true">${kanji}</span><span class="relation-band relation-band--${tone}" title="${esc(row.is_current ? label : (M.relations[row.relation] || label))}"><b>${esc(label)}</b></span></span><span class="relation-copy"><strong>${esc(row.title)}</strong><span class="relation-meta">${meta}</span></span>`;
      return `<li class="thread-${tone}">${row.is_current ? `<div class="relation-card is-current" aria-current="page">${content}</div>` : `<a class="relation-card" href="${href(row.slug)}">${content}</a>`}</li>`;
    }).join('');
    const track = $('#watch-order-list');
    const syncEdges = () => {
      const max = track.scrollWidth - track.clientWidth - 2;
      track.classList.toggle('has-more-left', track.scrollLeft > 2);
      track.classList.toggle('has-more-right', track.scrollLeft < max);
    };
    track.addEventListener('scroll', syncEdges, { passive: true });
    addEventListener('resize', syncEdges);
    // Collapsed by default; on opening, the current title is brought into view without moving the page.
    const toggle = $('#watch-order-toggle');
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(expanded));
      track.hidden = !expanded;
      if (!expanded) return;
      const current = track.querySelector('.is-current')?.closest('li');
      if (current) track.scrollLeft = Math.max(0, current.offsetLeft - track.offsetLeft - 24);
      syncEdges();
    });
  }

  // Comments: GET /interactions/comments?anime_id=… returns a flat list (oldest first, deleted rows
  // excluded); the tree is built from parent_id, depth 0..3. The template signs in a demo user so
  // every action is visible; the guest sees .login-comment-box instead of the form.
  function initComments() {
    const list = $('#comment-thread'), form = $('[data-comment-form]');
    if (!list || !form) return;
    const ME = { id: 'me', username: 'kitsune_fan' };
    const ago = minutes => new Date(Date.now() - minutes * 60000).toISOString().slice(0, 19);
    const comments = [
      { id: 'c1', user: { id: 'u1', username: 'akira_k' }, content: 'Пересматриваю третий раз и каждый раз замечаю новые детали. Сцена в библиотеке до сих пор держит в напряжении.', parent_id: null, likes_count: 24, created_at: ago(3 * 1440 + 40) },
      { id: 'c2', user: ME, content: 'Согласен. Особенно музыка в этот момент — без неё сцена работала бы вдвое слабее.', parent_id: 'c1', likes_count: 6, created_at: ago(2 * 1440 + 300), is_edited: true },
      { id: 'c3', user: { id: 'u2', username: 'mononoke' }, content: 'Композитор тот же, что и у второго сезона, поэтому так узнаётся.', parent_id: 'c2', likes_count: 2, created_at: ago(1440 + 90) },
      { id: 'c4', user: { id: 'u3', username: 'neko_sensei' }, content: 'Кто смотрит впервые: не читайте описания следующих серий, там много раскрывают.', parent_id: null, episode: 3, likes_count: 41, created_at: ago(400) },
      { id: 'c5', user: ME, content: 'Озвучка AniLibria здесь лучше, чем субтитры передают характер героя.', parent_id: null, likes_count: 0, created_at: ago(35) },
    ].map(c => ({ ...c, liked: false }));
    const byId = new Map(comments.map(c => [c.id, c]));
    const depth = c => { let d = 0, p = c.parent_id; while (p && byId.has(p)) { d += 1; p = byId.get(p).parent_id; } return d; };
    const agoLabel = value => {
      const minutes = Math.max(0, Math.round((Date.now() - M.parseDateAsUtc(value)) / 60000));
      if (minutes < 1) return 'только что';
      if (minutes < 60) return `${minutes} мин назад`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours} ${M.plural(hours, 'час', 'часа', 'часов')} назад`;
      const days = Math.floor(hours / 24);
      return days === 1 ? 'вчера' : `${days} ${M.plural(days, 'день', 'дня', 'дней')} назад`;
    };
    const avatar = user => `<span class="comment-avatar${user.id === ME.id ? ' comment-avatar--me' : ''}" aria-hidden="true">${esc(user.username[0].toUpperCase())}</span>`;
    const editorHtml = (mode, value = '') => `<form class="comment-inline" data-inline="${mode}" novalidate><textarea rows="2" maxlength="2000" data-comment-input aria-label="${mode === 'edit' ? 'Изменить комментарий' : 'Ваш ответ'}">${esc(value)}</textarea><div class="comment-composer__foot"><span class="comment-limit" data-comment-limit aria-live="polite"></span><button class="button button--secondary" type="button" data-cancel>Отмена</button><button class="button button--primary" type="submit"${value.trim().length >= 3 ? '' : ' disabled'}>${mode === 'edit' ? 'Сохранить' : 'Ответить'}</button></div></form>`;
    function itemHtml(c) {
      const own = c.user.id === ME.id, d = depth(c);
      const children = comments.filter(row => row.parent_id === c.id);
      const body = c.deleted
        ? `<p class="comment-text comment-text--deleted">Комментарий удалён</p>`
        : `<p class="comment-text">${esc(c.content)}</p>
          <div class="comment-actions">
            <button type="button" class="comment-like${c.liked ? ' is-liked' : ''}" data-like aria-pressed="${c.liked}" aria-label="Нравится, ${c.likes_count}"><i data-lucide="heart"></i><span>${c.likes_count || ''}</span></button>
            ${d < 3 ? '<button type="button" data-reply><i data-lucide="reply"></i>Ответить</button>' : ''}
            ${own ? '<button type="button" data-edit><i data-lucide="pencil"></i>Изменить</button><button type="button" class="comment-delete" data-delete><i data-lucide="trash-2"></i>Удалить</button>' : ''}
          </div>`;
      return `<li class="comment" data-comment-id="${c.id}" style="--depth:${d}">
        <article class="comment-card${own ? ' is-own' : ''}" aria-label="Комментарий ${esc(c.user.username)}">
          ${avatar(c.user)}
          <div class="comment-main">
            <header class="comment-head"><strong>${esc(c.user.username)}</strong>${own ? '<span class="comment-tag">вы</span>' : ''}${c.episode ? `<span class="comment-tag comment-tag--episode">к ${c.episode} серии</span>` : ''}<time datetime="${c.created_at}">${agoLabel(c.created_at)}</time>${c.is_edited && !c.deleted ? '<span class="comment-edited">изменено</span>' : ''}</header>
            ${body}
          </div>
        </article>
        ${children.length ? `<ol class="comment-replies">${children.map(itemHtml).join('')}</ol>` : ''}
      </li>`;
    }
    function render() {
      const visible = comments.filter(c => !c.deleted || comments.some(r => r.parent_id === c.id));
      list.innerHTML = visible.filter(c => !c.parent_id).map(itemHtml).join('');
      const count = comments.filter(c => !c.deleted).length;
      $('#comments .section-count').textContent = count;
      document.querySelectorAll('[data-field="comments_count"]').forEach(node => { node.textContent = count; });
      $('#comments .comments-empty').hidden = count > 0;
      window.lucide?.createIcons?.({ attrs: { 'aria-hidden': 'true' }, root: list });
    }
    // Length rule from the API: 3..2000 characters; the counter appears near the limit.
    function watch(scope) {
      const input = scope.querySelector('[data-comment-input]'), submit = scope.querySelector('[type="submit"]'), limit = scope.querySelector('[data-comment-limit]');
      const sync = () => {
        const n = input.value.trim().length;
        submit.disabled = n < 3 || n > 2000;
        limit.textContent = n > 1800 ? `${n} / 2000` : n > 0 && n < 3 ? 'Минимум 3 символа' : '';
      };
      input.addEventListener('input', sync); sync();
      return input;
    }
    const mainInput = watch(form);
    form.addEventListener('submit', event => {
      event.preventDefault();
      const content = mainInput.value.trim();
      if (content.length < 3) return;
      comments.push({ id: `n${Date.now()}`, user: ME, content, parent_id: null, likes_count: 0, created_at: new Date().toISOString().slice(0, 19), liked: false });
      byId.set(comments.at(-1).id, comments.at(-1));
      mainInput.value = ''; mainInput.dispatchEvent(new Event('input'));
      render();
      list.lastElementChild?.scrollIntoView({ block: 'nearest' });
    });
    list.addEventListener('click', event => {
      const button = event.target.closest('button');
      const li = event.target.closest('[data-comment-id]');
      if (!button || !li) return;
      const c = byId.get(li.dataset.commentId), card = li.querySelector(':scope > .comment-card .comment-main');
      if (button.matches('[data-like]')) {
        // POST /comments/{id}/like toggles; the API does not say whether you already liked — state is local.
        c.liked = !c.liked; c.likes_count += c.liked ? 1 : -1;
        button.classList.toggle('is-liked', c.liked); button.setAttribute('aria-pressed', String(c.liked));
        button.setAttribute('aria-label', `Нравится, ${c.likes_count}`); button.querySelector('span').textContent = c.likes_count || '';
      } else if (button.matches('[data-reply], [data-edit]')) {
        card.querySelector('.comment-inline')?.remove();
        const mode = button.matches('[data-edit]') ? 'edit' : 'reply';
        card.insertAdjacentHTML('beforeend', editorHtml(mode, mode === 'edit' ? c.content : ''));
        const inline = card.querySelector('.comment-inline');
        const input = watch(inline); input.focus();
        inline.addEventListener('submit', submitEvent => {
          submitEvent.preventDefault();
          const content = input.value.trim();
          if (content.length < 3) return;
          if (mode === 'edit') Object.assign(c, { content, is_edited: true }); // PATCH /comments/{id}
          else { const reply = { id: `n${Date.now()}`, user: ME, content, parent_id: c.id, likes_count: 0, created_at: new Date().toISOString().slice(0, 19), liked: false }; comments.push(reply); byId.set(reply.id, reply); } // POST /comments/{id}/reply
          render();
        });
      } else if (button.matches('[data-cancel]')) {
        button.closest('.comment-inline')?.remove();
      } else if (button.matches('[data-delete]')) {
        // Two-step: the first press turns into a confirmation right in place.
        if (!button.classList.contains('is-confirming')) {
          button.classList.add('is-confirming'); button.lastChild.textContent = 'Точно удалить?';
          setTimeout(() => { if (button.isConnected) { button.classList.remove('is-confirming'); button.lastChild.textContent = 'Удалить'; } }, 4000);
          return;
        }
        c.deleted = true; // DELETE /comments/{id}: soft delete; the list stops returning it
        render();
      }
    });
    render();
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
      $('#schedule-days').innerHTML = days.map(day => `<button type="button" class="day-tab${day.key === activeKey ? ' is-active' : ''}${day.key === today ? ' is-today' : ''}" role="tab" id="day-${day.key}" aria-controls="schedule-items" aria-selected="${day.key === activeKey}" tabindex="${day.key === activeKey ? '0' : '-1'}" data-calendar-day="${day.key}" aria-label="${fmt(day.date, { weekday: 'long', day: 'numeric', month: 'long' })}: ${day.count ? `${day.count} ${M.plural(day.count, 'серия', 'серии', 'серий')}` : 'серий нет'}"><span class="day-tab__dow">${fmt(day.date, { weekday: 'short' })}</span><span class="day-tab__num">${day.date.getDate()}</span><span class="day-tab__load${day.count ? '' : ' is-quiet'}">${day.count ? `${day.count} ${M.plural(day.count, 'серия', 'серии', 'серий')}` : 'затишье'}</span></button>`).join('');
    }
    // One row per episode: big local time, poster, title over a blurred still of the same title.
    function airRow(row) {
      const date = M.parseDateAsUtc(row.next_episode_at), diff = date.getTime() - Date.now(), air = M.airLabel(row.next_episode_at);
      return `<a class="schedule-item schedule-item--air${diff > 0 ? '' : ' is-aired'}" href="${href(row.local_slug)}"><span class="air-backdrop" aria-hidden="true"><img src="${esc(row.local_poster)}" alt="" loading="lazy" referrerpolicy="no-referrer"></span><img class="air-poster" src="${esc(row.local_poster)}" alt="" loading="lazy" referrerpolicy="no-referrer"><span class="air-copy"><strong>${esc(row.anime.russian)}</strong><small>${row.next_episode} серия${row.genres ? `<span class="air-genres"> · ${esc(row.genres)}</span>` : ''}</small><small class="schedule-countdown"${air && air.status !== 'past' ? '' : ' hidden'}>${air && air.status !== 'past' ? `Выйдет ${air.label}` : ''}</small><small class="air-done"${diff > 0 ? ' hidden' : ''}>Вышла</small></span><time class="air-time" datetime="${row.next_episode_at}"><span>${fmt(date, { weekday: 'short' })}</span><b>${fmt(date, { hour: '2-digit', minute: '2-digit' })}</b></time></a>`;
    }
    // "Сейчас у вас" lives in the card header, not between rows.
    const clock = () => fmt(new Date(), { hour: '2-digit', minute: '2-digit' });
    $('#schedule-title')?.closest('.schedule-head')?.querySelector('.section-kicker')?.insertAdjacentHTML('afterend', `<p class="air-clock" aria-live="off"><span>Сейчас у вас</span><b id="schedule-now">${clock()}</b></p>`);
    // Over the list: the selected date in words and a way back to today.
    $('#schedule-items').insertAdjacentHTML('beforebegin', '<div class="air-dayhead"><strong id="schedule-date"></strong><button type="button" class="air-today" id="schedule-today" hidden>К сегодня<i data-lucide="arrow-right"></i></button></div>');
    $('#schedule-today').addEventListener('click', () => { selectDay(M.dateKey(new Date())); $('#schedule-days .is-active')?.scrollIntoView?.({ inline: 'center', block: 'nearest' }); });
    window.lucide?.createIcons?.({ attrs: { 'aria-hidden': 'true' } });
    function renderDayHead() {
      const [y, m, d] = activeKey.split('-').map(Number);
      const text = fmt(new Date(y, m - 1, d), { weekday: 'long', day: 'numeric', month: 'long' });
      $('#schedule-date').textContent = text.charAt(0).toUpperCase() + text.slice(1);
      $('#schedule-today').hidden = activeKey === M.dateKey(new Date());
    }
    function renderItems() {
      renderDayHead();
      const rows = schedule.filter(row => M.dateKey(M.parseDateAsUtc(row.next_episode_at)) === activeKey);
      const panel = $('#schedule-items');
      panel.setAttribute('aria-labelledby', `day-${activeKey}`);
      if (!rows.length) {
        const upcoming = schedule.find(row => M.parseDateAsUtc(row.next_episode_at) > new Date());
        panel.innerHTML = `<div class="schedule-empty"><i data-lucide="moon-star"></i><strong>Затишье</strong><span>${upcoming ? `В этот день серий нет. Ближайшая — ${esc(upcoming.anime.russian)}, ${fmt(M.parseDateAsUtc(upcoming.next_episode_at), { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}.` : 'В этот день серий нет.'}</span></div>`;
        window.lucide?.createIcons?.({ attrs: { 'aria-hidden': 'true' } });
        return;
      }
      panel.innerHTML = rows.map(airRow).join('');
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
    $('#update-items').innerHTML = updates.map(row => { const date = M.parseDateAsUtc(row.last_release_at); return `<a class="schedule-item schedule-item--air schedule-item--update" href="${href(row.slug)}"><span class="air-backdrop" aria-hidden="true"><img src="${M.poster(row.id)}" alt="" loading="lazy" referrerpolicy="no-referrer"></span><img class="air-poster" src="${M.poster(row.id)}" alt="" loading="lazy" referrerpolicy="no-referrer"><span class="air-copy"><strong>${esc(row.title)}</strong><small>${esc(M.updateLabel(row))}</small><small>${M.kindLabel(row.kind)}</small></span><time class="air-time" datetime="${row.last_release_at}"><span>${fmt(date, { day: 'numeric', month: 'short' })}</span><b>${fmt(date, { hour: '2-digit', minute: '2-digit' })}</b></time></a>`; }).join('');
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
      const nowClock = $('#schedule-now');
      if (nowClock) nowClock.textContent = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }
    let timer = setInterval(refresh, 60000);
    addEventListener('pagehide', () => clearInterval(timer));
    addEventListener('pageshow', event => { if (event.persisted) { refresh(); timer = setInterval(refresh, 60000); } });
    document.addEventListener('visibilitychange', refresh);
  }
  if (document.body.dataset.page === 'anime') { initTitle(); initComments(); }
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
