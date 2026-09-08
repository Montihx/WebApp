/* Static contract checks. These helpers never send a request or claim server success. */
(() => {
  'use strict';
  const operations = {
    'kodik:incremental': { label: 'Kodik · incremental', scheduled: true },
    'kodik:full_sync': { label: 'Kodik · full_sync', scheduled: false },
    'shikimori:shikimori_related_refresh': { label: 'Shikimori · related refresh', scheduled: false },
    'shikimori:calendar_snapshot': { label: 'Shikimori · calendar snapshot', scheduled: true },
  };
  function validUrl(value, relative = true) {
    if (typeof value !== 'string' || !value.trim()) return false;
    if (relative && /^\/(?!\/)/.test(value) && !/[\\\s]/.test(value)) return true;
    try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !!url.hostname && !url.username && !url.password && !/[\s\\]/.test(value); } catch { return false; }
  }
  function validCron(value) {
    const fields = String(value).trim().split(/\s+/);
    const ranges = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 7]];
    return fields.length === 5 && fields.every((field, i) => field.split(',').every(part => {
      const match = /^(\*|\d+(?:-\d+)?)(?:\/(\d+))?$/.exec(part);
      if (!match || match[2] !== undefined && (+match[2] < 1 || +match[2] > ranges[i][1] + 1)) return false;
      if (match[1] === '*') return true;
      const [start, end = start] = match[1].split('-').map(Number);
      return start >= ranges[i][0] && end <= ranges[i][1] && start <= end;
    }));
  }
  const fields = {
    'Kodik ID': 'kodik_id', 'Kodik URL': 'kodik_url', 'Shikimori ID': 'shikimori_id', 'MyAnimeList ID': 'mal_id',
    'Название': 'title', 'Название на английском': 'title_en', 'Название на японском': 'title_jp', 'Slug': 'slug', 'Kind': 'kind', 'Статус выхода': 'status', 'Rating': 'rating', 'Год': 'year', 'Дата начала': 'aired_on', 'Оценка': 'score', 'Эпизодов вышло': 'episodes_aired', 'Эпизодов всего': 'episodes_total', 'Описание': 'description', 'Жанры': 'genres', 'Студии': 'studios',
    'Сезон': 'season', 'Номер эпизода': 'episode', 'Дата и время выхода': 'aired_at', 'Thumbnail URL': 'thumbnail_url', 'Episode ID': 'episode_id', 'Source': 'source', 'Quality': 'quality', 'URL': 'url', 'Embed URL': 'embed_url', 'External ID': 'external_id', 'Verified': 'is_verified', 'Translation type': 'translation_type', 'Translation language': 'translation_language', 'Translation team': 'translation_team',
  };
  function hydrate(root) {
    root.querySelectorAll('.field').forEach(field => {
      const label = field.querySelector(':scope > span');
      const title = label?.textContent.replace(/\*/g, '').trim();
      const name = fields[title] || label?.querySelector('code')?.textContent || (/^[a-z][a-z_]*$/.test(title || '') ? title : null);
      const input = field.querySelector('input:not([type="color"]), select, textarea');
      if (!input) return;
      if (name) input.name = name;
      if (label?.querySelector('b')) input.required = true;
      if (name === 'year') { input.readOnly = true; input.title = 'Вычисляется из aired_on; не отправляется отдельно'; }
      if (input.type === 'number') { input.min = '0'; if (name !== 'score') input.step = '1'; }
    });
  }
  function read(root) {
    const payload = {};
    root.querySelectorAll('input[name],select[name],textarea[name]').forEach(input => {
      if (input.disabled || input.name === 'year') return;
      let value = input.value.trim();
      if (input.type === 'number') value = value === '' ? null : Number(value);
      if (input.name === 'aired_at' && value) value = localDateToUtc(value);
      if (input.name === 'is_verified') value = value === 'Да' || value === 'true';
      if (['genres', 'studios'].includes(input.name)) {
        const tokens = [...input.closest('.token-input').querySelectorAll(':scope > span')].map(node => node.textContent.trim());
        value = [...tokens, ...value.split(',').map(x => x.trim()).filter(Boolean)];
      }
      payload[input.name] = value;
    });
    root.querySelectorAll('.switch-row').forEach(row => {
      const label = row.querySelector('strong')?.textContent.trim(), control = row.querySelector('[role="switch"],.switch');
      const name = { 'Филлер': 'is_filler', 'Рекап': 'is_recap', 'Активный релиз': 'is_active' }[label];
      if (name && control) payload[name] = control.classList.contains('is-on');
    });
    return payload;
  }
  function errors(kind, payload) {
    const required = { anime: ['title', 'slug'], episode: ['episode', 'anime_id'], release: ['episode_id', 'source', 'url'] }[kind] || [];
    const errors = [];
    required.forEach(key => { if (payload[key] === undefined || payload[key] === null || String(payload[key]).trim() === '') errors.push(`${key}: обязательное поле`); });
    for (const [key, value] of Object.entries(payload)) {
      if (['anime_id', 'episode_id'].includes(key) && value && !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value)) errors.push(`${key}: нужен UUID`);
      if (key === 'aired_at' && value === null) errors.push('aired_at: некорректная дата');
      if (['score', 'season', 'episode', 'episodes_total', 'episodes_aired', 'shikimori_id', 'mal_id'].includes(key) && value !== null && value !== '' && (!Number.isFinite(Number(value)) || Number(value) < 0 || (key === 'score' ? Number(value) > 10 : !Number.isInteger(Number(value))))) errors.push(`${key}: недопустимое число`);
      if (/(?:^url$|_url$)/.test(key) && value && !validUrl(value, key !== 'url' && key !== 'embed_url')) errors.push(`${key}: нужен HTTP(S) URL${key !== 'url' && key !== 'embed_url' ? ' или локальный /путь' : ''}`);
    }
    return errors;
  }
  function localDateToUtc(value) {
    if (!value) return '';
    const date = new Date(`${value}+05:00`);
    return Number.isFinite(date.getTime()) ? date.toISOString() : null;
  }
  window.KitsuAdminContracts = { operations, validUrl, validCron, fields, hydrate, read, errors, localDateToUtc };
})();
