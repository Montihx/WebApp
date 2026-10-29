/* Kitsu Admin v5 — интерактивный шаблон. Запросы не отправляются: каждая
   кнопка с последствиями показывает точный запрос (метод, путь, тело) и
   честно сообщает, что это макет. Данные — admin/data.js, контракты — admin/contracts.js. */
(() => {
  "use strict";

  const D = window.KitsuAdminData;
  const C = window.KitsuAdminContracts;
  const NOW = D.NOW;
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- Утилиты ---------- */
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const icon = (name, cls = "") => `<i data-lucide="${name}"${cls ? ` class="${cls}"` : ""}></i>`;
  const num = value => (value == null ? "—" : Number(value).toLocaleString("ru-RU"));
  const tag = (text, tone = "neutral", ic = "") => `<span class="tag" data-tone="${tone}">${ic ? icon(ic) : ""}${esc(text)}</span>`;
  const dot = tone => `<span class="dot" data-tone="${tone}" aria-hidden="true"></span>`;
  const hash = value => [...String(value)].reduce((acc, ch) => (Math.imul(acc ^ ch.charCodeAt(0), 16777619) >>> 0), 2166136261);
  const at = value => C.fmtDateTime(value, NOW);
  const ago = value => C.fmtAgo(value, NOW);

  /* Единственный источник тона и подписи статуса. */
  const STATUS = {
    running: ["live", "Выполняется"], pending: ["info", "В очереди"], completed: ["success", "Готово"], failed: ["danger", "Ошибка"], cancelled: ["neutral", "Остановлена"],
    ok: ["success", "В норме"], warn: ["warning", "Внимание"], fail: ["danger", "Сбой"], waiting: ["info", "Ждёт стенд"], unknown: ["neutral", "Неизвестно"], no_sample: ["warning", "Нет выборки"], stale: ["warning", "Устарело"],
    online: ["success", "Работает"], offline: ["danger", "Не отвечает"], connection_fault: ["danger", "Нет связи"], unreachable: ["danger", "Недоступна"],
    ongoing: ["live", "Выходит"], released: ["success", "Вышел"], announced: ["info", "Анонс"], anons: ["info", "Анонс"], cancelled_title: ["neutral", "Отменён"], hiatus: ["warning", "Пауза"],
    pending_conflict: ["warning", "Ждёт решения"], auto_accepted: ["info", "Принят автоматически"], resolved: ["success", "Закрыт"],
    INFO: ["info", "INFO"], WARNING: ["warning", "WARN"], ERROR: ["danger", "ERROR"],
  };
  const toneForStatus = status => (STATUS[status] || ["neutral"])[0];
  const labelForStatus = status => (STATUS[status] || [null, status])[1];
  const statusTag = (status, ic = "") => tag(labelForStatus(status), toneForStatus(status), ic);

  const KIND = { tv: "Сериал", movie: "Фильм", ova: "OVA", ona: "ONA", special: "Спешл" };
  const REASON = { poster_url: "Нет постера", description: "Нет описания", no_video: "Нет видео" };
  const JOB_TITLE = {
    "kodik:incremental": "Новые серии и озвучки", "kodik:incremental_sync": "Новые серии и озвучки", "kodik:full_sync": "Полный обход Kodik",
    "kodik:episodes_recompute": "Пересчёт серий", "kodik:episodes_recompute_dry": "Пересчёт серий · пробный", "kodik:episodes_zero_fix": "Нулевой сезон в первый", "kodik:episodes_zero_fix_dry": "Нулевой сезон в первый · пробный",
    "shikimori:shikimori_related_refresh": "Связанные тайтлы и названия", "shikimori:calendar_snapshot": "Календарь выхода", "shikimori:incremental": "Инкремент Shikimori", "shikimori:full_sync": "Полная Shikimori",
  };
  const jobTitle = job => JOB_TITLE[`${job.parser_name}:${job.job_type}`] || `${job.parser_name} · ${job.job_type}`;
  /* Какие задачи пишут прогресс по ходу (parserworker: recompute и related_refresh), а какие только в конце. */
  function progressKind(job) {
    const op = D.operations.find(o => o.parser === job.parser_name && [o.job_type, o.dry].includes(job.job_type));
    return op?.progress || "end";
  }
  function liveBar(job, extra = "") {
    if (progressKind(job) !== "live") return `<span class="muted" style="font-size:12px">Процент появится в конце</span>`;
    return `<span class="progress live${extra}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${state.live.progress}" aria-label="Прогресс"><i style="--p:${state.live.progress}%" data-live-bar></i></span>`;
  }
  /* Расписание: подпись по тому, что реально запустит пульс (asynqtasks.ModeForScheduled). */
  const SPECIAL = ["shikimori:shikimori_related_refresh", "shikimori:calendar_snapshot", "shikimori:full_sync", "kodik:episodes_recompute", "kodik:episodes_recompute_dry", "kodik:episodes_zero_fix", "kodik:episodes_zero_fix_dry"];
  function scheduleTitle(s) {
    const key = `${s.parser_name}:${s.job_type}`;
    if (s.parser_name === "kodik" && !SPECIAL.includes(key)) return s.job_type.startsWith("incremental") ? "Новые серии и озвучки" : `Новые серии и озвучки · строка «${s.job_type}»`;
    return jobTitle(s);
  }

  /* Генеративная обложка: ночное небо, луна, гряда. Вместо пустой картинки. */
  function posterUri(title, w = 72, h = 104) {
    const seed = hash(title);
    const obs = root.dataset.palette === "obsidian";
    const hue = obs ? 210 + (seed % 30) : 250 + (seed % 90);
    const hue2 = obs ? 28 + (seed % 18) : (hue + 24) % 360;
    const mx = 18 + (seed % 36), my = 18 + ((seed >> 3) % 18), r = 9 + ((seed >> 5) % 6);
    const ridge = (base, amp, fill, k) => {
      let d = `M0 ${h} L0 ${base}`;
      for (let i = 1; i <= 5; i += 1) d += ` L${(i / 5) * w} ${base - (((seed >> (i + k)) % amp) - amp / 2)}`;
      return `<path d="${d} L${w} ${h} Z" fill="${fill}"/>`;
    };
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${hue},45%,14%)"/><stop offset="1" stop-color="hsl(${hue2},55%,30%)"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#s)"/><circle cx="${mx}" cy="${my}" r="${r}" fill="hsl(${hue2},90%,88%)" opacity=".92"/>${ridge(h * 0.68, 14, `hsl(${hue},30%,22%)`, 1)}${ridge(h * 0.82, 10, `hsl(${hue2},40%,10%)`, 3)}</svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }
  const thumb = item => item.poster === false || item.poster_url === null
    ? `<span class="thumb missing" title="Нет постера"><img src="${posterUri(item.title)}" alt="" loading="lazy" /><span class="sr-only">Нет постера</span></span>`
    : `<span class="thumb"><img src="${posterUri(item.title)}" alt="" loading="lazy" /></span>`;
  const artTile = (title, square = true) => {
    const seed = hash(title), hue = 250 + (seed % 100);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="hsl(${hue},40%,18%)"/><circle cx="${30 + (seed % 40)}" cy="${30 + ((seed >> 4) % 30)}" r="${18 + (seed % 10)}" fill="hsl(${(hue + 40) % 360},80%,72%)" opacity=".85"/><path d="M0 100 L0 ${70 + (seed % 10)} L35 ${58 + ((seed >> 2) % 12)} L70 ${72 + ((seed >> 5) % 10)} L100 ${60 + ((seed >> 7) % 14)} L100 100 Z" fill="hsl(${hue},45%,9%)"/></svg>`;
    return square ? svg : svg;
  };

  /* ---------- Разделы ---------- */
  const sections = [
    { id: "pult", label: "Пульт", icon: "gauge", kana: "操縦", lede: "Состояние стенда за сутки и всё, что ждёт решения.", pages: [{ id: "pult", title: "Пульт" }] },
    { id: "catalog", label: "Каталог", icon: "clapperboard", kana: "目録", lede: "Тайтлы, серии и источники видео.", pages: [
      { id: "catalog/titles", title: "Тайтлы", count: () => D.kodikStats.local_total },
      { id: "catalog/import", title: "Добавить из Kodik" },
      { id: "catalog/episodes", title: "Серии и источники" },
      { id: "catalog/collections", title: "Коллекции" },
    ] },
    { id: "queues", label: "Очереди", icon: "inbox", kana: "待機", lede: "То, что синхронизация не смогла решить сама.", pages: [
      { id: "queues/moderation", title: "Модерация", count: () => D.moderation.length, tone: "warn" },
      { id: "queues/conflicts", title: "Конфликты", count: () => D.conflicts.filter(c => c.status === "pending").length, tone: "warn" },
      { id: "queues/comments", title: "Комментарии" },
    ] },
    { id: "parser", label: "Парсер", icon: "radar", kana: "収集", lede: "Запуск синхронизаций, очередь, расписание.", pages: [
      { id: "parser/run", title: "Запуск" },
      { id: "parser/jobs", title: "Задачи", count: () => D.jobs.filter(j => ["running", "pending"].includes(j.status)).length, tone: "live" },
      { id: "parser/schedule", title: "Расписание" },
      { id: "parser/logs", title: "Журнал парсера" },
      { id: "parser/blacklist", title: "Исключения" },
    ] },
    { id: "stand", label: "Стенд", icon: "server", kana: "基盤", lede: "Проверки, ресурсы, резервные копии.", pages: [
      { id: "stand/checks", title: "Проверки", count: () => D.checks.filter(c => ["warn", "fail", "stale"].includes(c.state)).length, tone: "warn" },
      { id: "stand/resources", title: "Ресурсы" },
      { id: "stand/backups", title: "Резервные копии" },
      { id: "stand/audit", title: "Журнал действий" },
    ] },
    { id: "people", label: "Люди", icon: "users", kana: "人々", lede: "Пользователи, доступ, оформление профилей.", pages: [
      { id: "people/users", title: "Пользователи" },
      { id: "people/access", title: "Доступ" },
      { id: "people/cosmetics", title: "Оформление" },
    ] },
    { id: "settings", label: "Настройки", icon: "sliders-horizontal", kana: "設定", lede: "Поведение сайта и парсера.", pages: [
      { id: "settings", title: "Обзор", icon: "layout-grid" },
      { id: "settings/site", title: "Сайт", icon: "app-window", desc: "Название, регистрация, режим обслуживания" },
      { id: "settings/import", title: "Импорт", icon: "radar", desc: "Какие тайтлы брать и как часто искать новые" },
      { id: "settings/updates", title: "Обновления", icon: "refresh-cw", desc: "Что проверять у тайтлов, которые уже есть" },
      { id: "settings/images", title: "Изображения", icon: "image", desc: "Хранение, качество и размер постеров" },
      { id: "settings/texts", title: "Тексты", icon: "text-cursor-input", desc: "Заголовок и описание страницы тайтла" },
      { id: "settings/taxonomy", title: "Жанры и студии", icon: "tags", desc: "Как пополнять справочники" },
      { id: "settings/stopwords", title: "Стоп-слова", icon: "shield-ban", desc: "Жанры и слова, при которых тайтл не берётся" },
      { id: "settings/player", title: "Плеер", icon: "monitor-play", desc: "Источник и качество видео по умолчанию" },
      { id: "settings/notify", title: "Уведомления", icon: "bell", desc: "Куда сообщать о сбоях" },
      { id: "settings/network", title: "Сеть", icon: "plug", desc: "Прокси, скорость запросов, адрес Shikimori" },
    ] },
  ];
  const pages = Object.fromEntries(sections.flatMap(section => section.pages.map(page => [page.id, { ...page, section }])));

  /* ---------- Состояние ---------- */
  const state = {
    route: "pult",
    titles: { q: "", filter: "all", selected: new Set(), page: 1 },
    moderation: { selected: new Set() },
    conflicts: { status: "pending" },
    jobs: { status: "all" },
    logs: { level: "all" },
    checks: { state: "all" },
    users: { q: "" },
    importQ: "фармацевт",
    live: { progress: D.jobs.find(j => j.status === "running")?.progress ?? 0 },
    dirty: false,
    param: null,
    paramTitle: "",
    editing: { schedule: null, episode: null, release: null },
  };

  /* ---------- Каркас ----------
     Никаких выезжающих панелей: разделы — в левой колонке (на телефоне — нижняя полоса),
     страницы раздела — вкладками над заголовком, карточки и редакторы — отдельными страницами. */
  function currentSection() { return pages[state.route]?.section || sections[0]; }
  function railItem(section, mobile = false) {
    const active = currentSection().id === section.id;
    const first = section.pages[0].id;
    const attention = section.pages.reduce((sum, page) => sum + (page.tone === "warn" && page.count ? page.count() : 0), 0);
    return `<a class="rail-item" href="#/${first}" data-section="${section.id}" aria-current="${active}" ${mobile ? "" : `title="${esc(section.label)}"`}>
      ${icon(section.icon)}<span>${esc(mobile ? section.short || section.label : section.label)}</span>${attention ? `<b class="rail-badge" aria-label="${attention} требуют внимания">${attention}</b>` : ""}</a>`;
  }
  function sectionTabs() {
    const section = currentSection();
    if (section.pages.length < 2) return "";
    return `<nav class="section-tabs" aria-label="${esc(section.label)}">${section.pages.map(page => {
      const n = page.count ? page.count() : null;
      const current = state.route === page.id;
      return `<a href="#/${page.id}" class="section-tab" aria-current="${current ? "page" : "false"}">${esc(page.title)}${n ? `<span class="count ${page.tone === "warn" ? "warn" : ""}">${num(n)}</span>` : ""}</a>`;
    }).join("")}</nav>`;
  }
  function renderChrome() {
    $("#rail-list").innerHTML = sections.map(s => railItem(s)).join("");
    $("#mobile-nav").innerHTML = sections.map(s => railItem(s, true)).join("");
    $("#mobile-nav [aria-current='true']")?.scrollIntoView?.({ inline: "center", block: "nearest" });
    const page = pages[state.route];
    const crumbs = [];
    if (page.section.pages.length > 1) crumbs.push(`<a href="#/${page.section.pages[0].id}">${esc(page.section.label)}</a>`);
    if (state.param) crumbs.push(`<a href="#/${state.route}">${esc(page.title)}</a>`, `<b>${esc(state.paramTitle || "")}</b>`);
    else crumbs.push(`<b>${esc(page.title)}</b>`);
    $("#crumbs").innerHTML = crumbs.join(icon("chevron-right"));
    const running = D.jobs.find(j => j.status === "running");
    const chip = $("#live-chip");
    if (running) {
      chip.hidden = false;
      chip.href = `#/parser/jobs/${running.id}`;
      const live = progressKind(running) === "live";
      chip.innerHTML = `${dot("live")}<span class="label">${esc(jobTitle(running))}</span>${live ? `<span class="progress live thin"><i style="--p:${state.live.progress}%"></i></span><span class="mono" data-live-pct>${state.live.progress}%</span>` : ""}`;
      chip.setAttribute("aria-label", `Выполняется: ${jobTitle(running)}, ${state.live.progress}%`);
    } else chip.hidden = true;
    $("[data-palette-label]").textContent = root.dataset.palette === "obsidian" ? "Обсидиан" : "Сакура";
    $("[data-theme-label]").textContent = root.dataset.theme === "light" ? "Светлая" : "Тёмная";
  }

  function pageHead(title, lede, actions = "", back = "") {
    return `<header class="page-head"><div>${back ? `<a class="back-link" href="${back}">${icon("arrow-left")}Назад к списку</a>` : ""}<div class="page-title"><span class="beam" aria-hidden="true"></span><h1>${esc(title)}</h1></div>${lede ? `<p class="lede">${lede}</p>` : ""}</div>${actions ? `<div class="page-actions">${actions}</div>` : ""}</header>`;
  }
  const note = (tone, ic, html) => `<div class="note" data-tone="${tone}">${icon(ic)}<div>${html}</div></div>`;
  const empty = (ic, title, text, action = "") => `<div class="empty">${icon(ic)}<strong>${esc(title)}</strong><p>${text}</p>${action}</div>`;
  const seg = (name, value, options) => `<div class="seg" role="group" aria-label="Фильтр">${options.map(([v, label, n]) => `<button type="button" data-seg="${name}" data-value="${v}" aria-pressed="${v === value}">${esc(label)}${n != null ? `<span class="count">${n}</span>` : ""}</button>`).join("")}</div>`;
  const request = (key, extra = {}) => `data-request="${key}" ${Object.entries(extra).map(([k, v]) => `data-${k}="${esc(v)}"`).join(" ")}`;

  /* ==========================================================================
     Пульт
     ========================================================================== */
  function timeline() {
    const from = C.parseUtc(D.stack.window_from).getTime(), to = C.parseUtc(D.stack.window_to).getTime();
    const pos = value => Math.max(0, Math.min(100, ((C.parseUtc(value).getTime() - from) / (to - from)) * 100));
    const scale = Array.from({ length: 9 }, (_, i) => {
      const stamp = new Date(from + i * 3 * 3600000).toISOString().slice(0, 19);
      return `<span style="left:${(i * 3 / 24) * 100}%">${C.fmtTime(stamp)}</span>`;
    }).join("");
    const gaps = D.stack.gaps.map(gap => {
      const l = pos(gap.from), r = pos(gap.to);
      const hours = ((C.parseUtc(gap.to) - C.parseUtc(gap.from)) / 3600000).toFixed(1).replace(".", ",");
      return `<div class="tl-gap" style="left:${l}%;width:${r - l}%" title="Стенд выключен ${C.fmtTime(gap.from)}–${C.fmtTime(gap.to)}"><span>выключен ${hours} ч</span></div>`;
    }).join("");
    const jobs = D.stack.long_jobs.map(job => {
      const l = pos(job.from), r = pos(job.to);
      return `<div class="tl-job${job.tone === "live" ? " is-live" : ""}" style="left:${l}%;width:${r - l}%" title="${esc(job.label)} ${C.fmtTime(job.from)}–${C.fmtTime(job.to)}"><span>${esc(job.label)}</span></div>`;
    }).join("");
    const isDown = t => D.stack.gaps.some(g => t >= C.parseUtc(g.from).getTime() && t < C.parseUtc(g.to).getTime());
    const ticks = [];
    for (let t = Math.ceil(from / 1800000) * 1800000; t < to; t += 1800000) if (!isDown(t)) ticks.push(`<i class="tl-tick" style="left:${((t - from) / (to - from)) * 100}%"></i>`);
    return `<div class="timeline" aria-label="Сутки стенда: включён ${String(D.stack.uptime_24h_hours).replace(".", ",")} ч из 24">
      <div class="tl-scale" aria-hidden="true">${scale}</div>
      <div class="tl-track"><div class="tl-up-glow"></div>${gaps}${jobs}${ticks.join("")}<div class="tl-now" style="left:calc(100% - 1px)"></div></div>
      <div class="tl-legend"><span><i class="up"></i>Стенд работал</span><span><i class="down"></i>Выключен</span><span><i class="job"></i>Долгая задача держала очередь</span><span><i class="job live"></i>Идёт сейчас</span><span><i class="tick"></i>Синхронизация новинок</span></div>
    </div>`;
  }
  function attentionItems() {
    const items = [];
    const failing = D.checks.filter(c => ["fail", "warn", "stale", "no_sample"].includes(c.state));
    if (failing.length) items.push({ tone: failing.some(c => c.state === "fail") ? "danger" : "warning", icon: "shield-alert", n: failing.length, title: "Проверки стенда требуют внимания", text: failing.slice(0, 2).map(c => c.name).join(" · "), href: "#/stand/checks" });
    const pending = D.conflicts.filter(c => c.status === "pending").length;
    if (pending) items.push({ tone: "warning", icon: "git-compare-arrows", n: pending, title: "Конфликты сопоставления с Shikimori", text: "Строгая проверка не узнала тайтл. Нужен взгляд человека", href: "#/queues/conflicts" });
    if (D.moderation.length) items.push({ tone: "warning", icon: "image-off", n: D.moderation.length, title: "Тайтлы ждут модерации", text: "Нет постера, описания или видео. На сайте их не видно", href: "#/queues/moderation" });
    const failed = D.jobs.filter(j => j.status === "failed").length;
    if (failed) items.push({ tone: "danger", icon: "bug", n: failed, title: "Задачи с ошибкой за сутки", text: "Последняя: «Инкремент Shikimori» не перенесён в Go", href: "#/parser/jobs" });
    return items;
  }
  function renderPult() {
    const running = D.jobs.find(j => j.status === "running");
    const gapH = D.stack.gaps.reduce((s, g) => s + (C.parseUtc(g.to) - C.parseUtc(g.from)) / 3600000, 0);
    const kpis = [
      ["users", "Пользователи", D.overview.audience],
      ["clapperboard", "Тайтлы", D.overview.catalog],
      ["film", "Источники видео", D.overview.assets],
    ];
    const max = Math.max(...D.charts.map(d => d.kodik + d.shikimori));
    const DAY = { Mon: "Пн", Tue: "Вт", Wed: "Ср", Thu: "Чт", Fri: "Пт", Sat: "Сб", Sun: "Вс" };
    const gmax = D.genres[0].value;
    const pmax = D.popular[0].views;
    const attn = attentionItems();
    return `${pageHead("Пульт", "Сутки стенда, текущая работа и всё, что ждёт решения. Числа обновляются при входе на страницу.", `<a class="button" href="#/stand/checks">${icon("shield-check")}Проверки</a><a class="button primary" href="#/parser/run">${icon("play")}Запустить задачу</a>`)}
    <section class="hero reveal" aria-labelledby="hero-title">
      <div class="hero-top">
        <div class="hero-state">
          <span class="eyebrow">${dot("success")}Стенд в работе</span>
          <h2 id="hero-title">Работает с ${C.fmtTime(D.stack.up_since)}, за сутки был выключен ${gapH.toFixed(1).replace(".", ",")}\u00a0ч</h2>
          <p>Монитор пересчитал проверки ${ago(D.monitor.last_tick_at)}, следующий подсчёт в ${C.fmtTime(new Date(C.parseUtc(D.monitor.last_tick_at).getTime() + 900000).toISOString().slice(0, 19))}.</p>
        </div>
        <div class="hero-figures">
          <div class="figure"><b data-count="${D.stack.uptime_24h_hours}" data-decimals="1">${String(D.stack.uptime_24h_hours).replace(".", ",")}</b><span>часов работы из 24</span></div>
          <div class="figure"><b data-count="${D.checks.filter(c => c.state === "ok").length}">${D.checks.filter(c => c.state === "ok").length}</b><span>из ${D.checks.length} проверок в норме</span></div>
          <div class="figure"><b data-count="${D.kodikStats.local_total}">${num(D.kodikStats.local_total)}</b><span>тайтлов в каталоге</span></div>
        </div>
      </div>
      ${timeline()}
    </section>

    <div class="grid split reveal">
      <section class="card" aria-labelledby="attn-title">
        <div class="card-head"><h2 id="attn-title">${icon("bell-ring")}Требует внимания</h2><span class="card-meta">${attn.length ? `${attn.length} ${C.plural(attn.length, "пункт", "пункта", "пунктов")}` : "всё спокойно"}</span></div>
        <div class="card-body flush attention">${attn.length ? attn.map(item => `<a class="attn" data-tone="${item.tone}" href="${item.href}">${icon(item.icon)}<div><strong>${esc(item.title)}</strong><small>${esc(item.text)}</small></div><span class="big">${item.n}</span></a>`).join("") : empty("check-check", "Ничего не ждёт", "Очереди пусты, проверки в норме.")}</div>
      </section>
      <section class="card glow" aria-labelledby="live-title">
        <div class="card-head"><h2 id="live-title">${icon("activity")}Сейчас</h2><a class="link-btn" href="#/parser/jobs">Все задачи${icon("arrow-right")}</a></div>
        <div class="card-body">${running ? `<div class="live-job">
            <div class="live-job-head"><div><strong>${esc(jobTitle(running))}</strong><div class="muted">${esc(running.source)} · старт ${C.fmtTime(running.started_at)}</div></div>${statusTag("running")}</div>
            <div style="display:flex;align-items:center;gap:12px">${liveBar(running)}<span class="mono" data-live-pct>${state.live.progress}%</span></div>
            <div class="live-stats"><div><b>${num(running.items_processed)}</b><span>из ${num(running.total)} строк</span></div><div><b>${num(running.items_updated)}</b><span>обновлено</span></div><div><b>${num(running.items_skipped)}</b><span>без изменений</span></div><div><b>${num(running.items_failed)}</b><span>в конфликты</span></div></div>
            ${D.jobs.filter(j => j.status === "pending").map(j => note("info", "hourglass", `<strong>Ждёт очереди с ${C.fmtTime(j.created_at)}:</strong> ${esc(jobTitle(j))}. Очередь парсера одна, поэтому плановые задачи и суточный бэкап стоят, пока идёт эта.`)).join("")}
          </div>` : empty("moon-star", "Очередь пуста", "Следующий запуск по расписанию — в 22:00.")}</div>
      </section>
    </div>

    <div class="grid cols-3 kpis reveal">
      ${kpis.map(([ic, label, k]) => `<section class="card kpi"><span class="kpi-label">${icon(ic)}${label}</span><span class="kpi-value" data-count="${k.value}">${num(k.value)}</span><span class="kpi-foot"><span class="trend ${k.trend < 0 ? "down" : ""}">${icon(k.trend < 0 ? "trending-down" : "trending-up")}${k.trend > 0 ? "+" : ""}${String(k.trend).replace(".", ",")}%</span>рост за 30 дней</span></section>`).join("")}
    </div>

    <div class="grid split reveal">
      <section class="card" aria-labelledby="chart-title">
        <div class="card-head"><h2 id="chart-title">${icon("bar-chart-3")}Обработано парсерами за неделю</h2><div class="legend"><span><i class="a"></i>Kodik</span><span><i class="b"></i>Shikimori</span></div></div>
        <div class="card-body"><div class="bars" style="--n:${D.charts.length}" role="img" aria-label="Записей обработано по дням">${D.charts.map((d, i) => `<div class="bar" title="${DAY[d.name]}: Kodik ${num(d.kodik)}, Shikimori ${num(d.shikimori)}"><div class="bar-stack"><i class="a" style="height:${(d.kodik / max) * 100}%;--i:${i}"></i>${d.shikimori ? `<i class="b" style="height:${(d.shikimori / max) * 100}%;--i:${i}"></i>` : ""}</div><span>${DAY[d.name]}</span></div>`).join("")}</div></div>
      </section>
      <section class="card" aria-labelledby="pop-title">
        <div class="card-head"><h2 id="pop-title">${icon("flame")}Самое смотримое</h2></div>
        <div class="card-body"><ol class="rank">${D.popular.map((p, i) => `<li><span class="n">${String(i + 1).padStart(2, "0")}</span><span class="name">${esc(p.title)}</span><span class="v">${num(p.views)}</span><span class="hbar"><i style="--p:${(p.views / pmax) * 100}%"></i></span></li>`).join("")}</ol></div>
      </section>
    </div>
    <div class="grid split-even reveal">
      <section class="card" aria-labelledby="gen-title">
        <div class="card-head"><h2 id="gen-title">${icon("tags")}Жанры каталога</h2></div>
        <div class="card-body"><ol class="rank">${D.genres.map((g, i) => `<li><span class="n">${String(i + 1).padStart(2, "0")}</span><span class="name">${esc(g.name)}</span><span class="v">${num(g.value)}</span><span class="hbar"><i style="--p:${(g.value / gmax) * 100}%"></i></span></li>`).join("")}</ol></div>
      </section>
      <section class="card" aria-labelledby="cov-title">
        <div class="card-head"><h2 id="cov-title">${icon("database")}Покрытие Kodik</h2></div>
        <div class="card-body"><div class="gauge" style="padding:0"><div class="gauge-top"><strong>Тайтлов с видео из всего Kodik</strong><b>${String(D.kodikStats.coverage_pct).replace(".", ",")}%</b></div><div class="progress"><i style="--p:${D.kodikStats.coverage_pct}%"></i></div>
        <dl class="kv" style="margin-top:12px"><dt>Всего в Kodik</dt><dd class="mono">${num(D.kodikStats.kodik_total)}</dd><dt>В каталоге</dt><dd class="mono">${num(D.kodikStats.local_total)}</dd><dt>С видео Kodik</dt><dd class="mono">${num(D.kodikStats.local_with_kodik)}</dd><dt>Выходят сейчас</dt><dd class="mono">${num(D.kodikStats.local_ongoing)}</dd></dl></div></div>
      </section>
    </div>`;
  }

  /* ==========================================================================
     Каталог
     ========================================================================== */
  function filteredTitles() {
    const { q, filter } = state.titles;
    return D.anime.filter(item => {
      if (q && !`${item.title} ${item.title_en} ${item.title_romaji || ""} ${item.slug}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (filter === "moderation") return item.needs_moderation;
      if (filter === "novideo") return !item.kodik_id;
      if (filter === "ongoing") return item.status === "ongoing";
      if (filter === "announced") return item.status === "announced";
      return true;
    });
  }
  function titleRows() {
    const list = filteredTitles();
    if (!list.length) return `<tr><td colspan="7">${empty("search-x", "Ничего не нашлось", "Поиск идёт по русскому и английскому названию, ромадзи и адресу на сайте.")}</td></tr>`;
    return list.map(item => {
      const selected = state.titles.selected.has(item.id);
      return `<tr class="${selected ? "is-selected" : ""}">
        <td class="check"><input class="box-check" type="checkbox" data-select="titles" value="${item.id}" ${selected ? "checked" : ""} aria-label="Выбрать «${esc(item.title)}»" /></td>
        <td class="lead"><a class="cell-title cell-link" href="#/catalog/titles/${esc(item.slug)}">${thumb(item)}<div><strong>${esc(item.title)}</strong><small>${esc(item.title_en || "")}${item.aired_on ? ` · ${item.aired_on.slice(0, 4)}` : ""}</small></div></a></td>
        <td class="opt" data-label="Тип">${esc(KIND[item.kind] || item.kind)}</td>
        <td data-label="Статус">${statusTag(item.status)}${item.needs_moderation ? ` ${tag("Модерация", "warning")}` : ""}</td>
        <td class="num" data-label="Серии">${item.episodes_aired}${item.episodes_total ? ` / ${item.episodes_total}` : ""}</td>
        <td class="num opt" data-label="Оценка">${item.score ? String(item.score).replace(".", ",") : "—"}</td>
        <td class="num opt" data-label="Обновлён">${at(item.updated_at)}</td>
        <td class="actions"><a class="button s" href="#/catalog/titles/${esc(item.slug)}">${icon("pencil")}Открыть</a></td>
      </tr>`;
    }).join("");
  }
  function renderTitles() {
    const all = D.anime;
    const n = key => ({ all: all.length, moderation: all.filter(i => i.needs_moderation).length, novideo: all.filter(i => !i.kodik_id).length, ongoing: all.filter(i => i.status === "ongoing").length, announced: all.filter(i => i.status === "announced").length }[key]);
    return `${pageHead("Тайтлы", `В каталоге ${num(D.kodikStats.local_total)} тайтлов. Большую часть полей пишет синхронизация; руками правят то, что она не знает или знает неверно.`, `<a class="button" href="#/catalog/import">${icon("download")}Из Kodik</a><a class="button primary" href="#/catalog/titles/new">${icon("plus")}Новый тайтл</a>`)}
    <div class="toolbar">
      <label class="search grow">${icon("search")}<span class="sr-only">Поиск</span><input class="input" type="search" data-input="titles-q" value="${esc(state.titles.q)}" placeholder="Название на любом языке или адрес" /></label>
      ${seg("titles", state.titles.filter, [["all", "Все", n("all")], ["ongoing", "Выходят", n("ongoing")], ["announced", "Анонсы", n("announced")], ["moderation", "На модерации", n("moderation")], ["novideo", "Без видео", n("novideo")]])}
    </div>
    <section class="card">
      <div class="table-wrap"><table class="data cards"><thead><tr><th class="check"><input class="box-check" type="checkbox" data-select-all="titles" aria-label="Выбрать все" /></th><th>Тайтл</th><th class="opt">Тип</th><th>Статус</th><th class="num">Серии</th><th class="num opt">Оценка</th><th class="num opt">Обновлён</th><th class="actions"><span class="sr-only">Действия</span></th></tr></thead><tbody id="title-rows">${titleRows()}</tbody></table></div>
      <div class="pager"><span>Показано ${filteredTitles().length} из ${num(D.kodikStats.local_total)} · страницы по 50</span><span class="page-actions" style="width:auto"><button type="button" class="button s" disabled>${icon("chevron-left")}Назад</button><button type="button" class="button s">Дальше${icon("chevron-right")}</button></span></div>
    </section>
    <div id="bulk-slot">${bulkBar()}</div>`;
  }
  function bulkBar() {
    const n = state.titles.selected.size;
    if (!n) return "";
    const ids = [...state.titles.selected].join(",");
    return `<div class="bulkbar" role="region" aria-label="Действия с выбранным"><strong>${n} ${C.plural(n, "тайтл выбран", "тайтла выбрано", "тайтлов выбрано")}</strong>
      <label class="sr-only" for="bulk-status">Новый статус</label>
      <select class="select" id="bulk-status" style="width:auto"><option value="ongoing">Выходит</option><option value="released">Вышел</option><option value="anons">Анонс (запишется как anons)</option><option value="hiatus">Пауза</option><option value="cancelled">Отменён</option></select>
      <button type="button" class="button s" ${request("bulk.anime", { ids, action: "update_status" })}>${icon("refresh-ccw")}Сменить статус</button>
      <button type="button" class="button s danger" ${request("bulk.anime", { ids, action: "delete" })}>${icon("trash-2")}Удалить</button>
      <button type="button" class="icon-btn s" data-action="clear-selection" aria-label="Снять выбор">${icon("x")}</button></div>`;
  }

  function renderImport() {
    const q = state.importQ.trim().toLowerCase();
    const results = q ? D.kodikSearch.filter(r => `${r.title} ${r.title_orig}`.toLowerCase().includes(q) || q.length < 3) : [];
    return `${pageHead("Добавить из Kodik", "Найдите тайтл в Kodik и заберите его вместе с данными Shikimori. Для уже добавленных тайтлов импорт обновит поля.")}
    <div class="steps reveal">
      <section class="card step"><span class="step-n" aria-hidden="true">01</span><strong>Найдите в Kodik</strong><p>Поиск по названию. В выдаче видно, сколько серий и озвучек уже есть.</p></section>
      <section class="card step"><span class="step-n" aria-hidden="true">02</span><strong>Импортируйте</strong><p>Kodik даёт видео, Shikimori — описание, жанры, постер. Если чего-то нет, тайтл уйдёт на модерацию.</p></section>
      <section class="card step"><span class="step-n" aria-hidden="true">03</span><strong>Проверьте результат</strong><p>Ответ скажет: создан, обновлён или пропущен, и каких полей не хватает.</p></section>
    </div>
    <section class="card">
      <div class="import-hero">
        <form class="import-row" data-form="import-search">
          <label class="search">${icon("search")}<span class="sr-only">Название</span><input class="input" type="search" name="q" value="${esc(state.importQ)}" placeholder="Например: фармацевт" /></label>
          <button type="submit" class="button primary">${icon("search")}Найти в Kodik</button>
        </form>
        <p class="muted" style="font-size:12px">Тайтлы, которые уже есть в каталоге, помечены. В макете поиск идёт по четырём заготовленным результатам.</p>
      </div>
      <div class="results">${results.length ? results.map(r => `<div class="result">
          ${thumb({ title: r.title })}
          <div><h4>${esc(r.title)}</h4><div class="meta"><span>${esc(r.title_orig)}</span><span class="mono">${r.year}</span><span>${r.type === "anime" ? "Фильм" : "Сериал"} · ${r.episodes} ${C.plural(r.episodes, "серия", "серии", "серий")}</span><span>${r.translations} ${C.plural(r.translations, "озвучка", "озвучки", "озвучек")}</span>${r.shikimori_id ? "" : tag("Нет в Shikimori", "warning")}</div></div>
          <div class="op-actions">${r.in_catalog ? `${tag("Уже в каталоге", "success", "check")}<button type="button" class="button s" ${request("import.single", { shikimori: r.shikimori_id ?? "", kodik: r.kodik_id })}>${icon("refresh-cw")}Обновить</button>` : `<button type="button" class="button s primary" ${request("import.single", { shikimori: r.shikimori_id ?? "", kodik: r.kodik_id })}>${icon("download")}Импортировать</button>`}</div>
        </div>`).join("") : empty("telescope", "Введите название", "Поиск идёт по русскому и оригинальному названию.")}</div>
    </section>`;
  }

  function renderEpisodes() {
    return `${pageHead("Серии и источники", "Свежие серии всех тайтлов. Их создаёт синхронизация Kodik; править и добавлять серии удобнее на странице тайтла — там все его серии и озвучки.")}
    <section class="card">
      <div class="table-wrap"><table class="data cards"><thead><tr><th>Тайтл и серия</th><th class="num opt">Сезон</th><th>Отметки</th><th class="num opt">Источников</th><th class="num">Вышла</th><th class="actions"><span class="sr-only">Действия</span></th></tr></thead><tbody>
      ${D.episodes.map(e => `<tr>
        <td class="lead"><a class="cell-title cell-link" href="#/catalog/titles/${esc(e.anime_slug)}?ep=${e.id}"><div><strong>${esc(e.anime)} · ${e.episode} серия</strong><small>${esc(e.title || "Без названия")}</small></div></a></td>
        <td class="num opt" data-label="Сезон">${e.season}</td>
        <td data-label="Отметки">${e.is_filler ? tag("Филлер", "warning") : ""}${e.is_recap ? tag("Рекап", "info") : ""}${!e.is_filler && !e.is_recap ? '<span class="muted">—</span>' : ""}</td>
        <td class="num opt" data-label="Источников">${e.releases}</td>
        <td class="num" data-label="Вышла">${at(e.aired_at)}</td>
        <td class="actions"><a class="button s" href="#/catalog/titles/${esc(e.anime_slug)}?ep=${e.id}">${icon("pencil")}Изменить</a></td>
      </tr>`).join("")}</tbody></table></div>
      <div class="pager"><span>Свежие серии сверху</span></div>
    </section>`;
  }

  function renderCollections() {
    return `${pageHead("Коллекции", "Подборки пользователей. Создавать, править и отмечать их как «избранные» из админки сейчас нельзя: в API есть только чтение.")}
    ${note("warning", "lock", "Отметку «избранная» (для показа на главной) поставить пока нельзя: на сервере нет такого действия. Это задача для бэкенда.")}
    <section class="card"><div class="table-wrap"><table class="data cards"><thead><tr><th>Подборка</th><th>Видимость</th><th class="num">Тайтлов</th><th class="num">Просмотры</th><th class="num opt">Лайки</th><th class="num">Обновлена</th></tr></thead><tbody>
    ${D.collections.map(c => `<tr><td class="lead"><div class="cell-title"><div><strong>${esc(c.title)}</strong><small>${esc(c.user)}</small></div></div></td><td data-label="Видимость">${c.is_public ? tag("Публичная", "success") : tag("Личная", "neutral")}${c.is_featured ? ` ${tag("Избранная", "info")}` : ""}</td><td class="num" data-label="Тайтлов">${c.items_count}</td><td class="num" data-label="Просмотры">${num(c.views_count)}</td><td class="num opt" data-label="Лайки">${c.likes_count}</td><td class="num" data-label="Обновлена">${at(c.updated_at)}</td></tr>`).join("")}
    </tbody></table></div></section>`;
  }

  /* ==========================================================================
     Очереди
     ========================================================================== */
  function eligible(item) {
    if (item.moderation_reason === "no_video") return item.status === "announced" || !!item.kodik_url;
    return !!item.poster_url && !!item.description;
  }
  function renderModeration() {
    const list = D.moderation;
    const ok = list.filter(eligible);
    return `${pageHead("Модерация", "Синхронизация ставит тайтл сюда, если у него нет постера, описания или видео. Пока тайтл здесь, на сайте его не видно.", `<button type="button" class="button primary" ${request("moderation.approve", { ids: ok.map(i => i.id).join(",") })} ${ok.length ? "" : "disabled"}>${icon("check-check")}Одобрить готовые · ${ok.length}</button>`)}
    ${note("info", "lightbulb", "Без постера или описания тайтл одобрить нельзя, без видео — только если это анонс или есть ссылка Kodik. Проще всего нажать «Заполнить»: когда у тайтла появятся постер и описание, он уйдёт из очереди сам.")}
    ${list.some(i => i.moderation_reason === "no_video") ? note("neutral", "archive", "Причину «Нет видео» ставила старая Python-синхронизация. Go-код её больше не ставит: тайтл без видео он просто не импортирует. Такие строки могли остаться в базе.") : ""}
    <section class="card"><div class="mod-list">
    ${list.map(item => {
      const okay = eligible(item);
      const reasons = String(item.moderation_reason || "").split(",").filter(Boolean);
      return `<div class="mod-item">
        <input class="box-check" type="checkbox" data-select="moderation" value="${item.id}" ${okay ? "" : "disabled"} aria-label="Выбрать «${esc(item.title)}»" />
        ${thumb({ title: item.title, poster_url: item.poster_url })}
        <div><h4>${esc(item.title)}</h4><div class="why">${reasons.map(r => tag(REASON[r] || r, "warning", r === "no_video" ? "video-off" : r === "poster_url" ? "image-off" : "file-x")).join("")}${statusTag(item.status)}<span class="muted" style="font-size:12px">${ago(item.updated_at)}</span></div></div>
        <div class="mod-actions">${okay ? `<button type="button" class="button s" ${request("moderation.approve", { ids: item.id })}>${icon("check")}Одобрить</button>` : `<span class="muted" style="font-size:12px;align-self:center">Сначала заполните</span>`}<a class="button s ${okay ? "ghost" : "primary"}" href="#/catalog/titles/${esc(item.slug)}">${icon("pencil")}Заполнить</a></div>
      </div>`;
    }).join("")}</div></section>`;
  }

  function renderConflicts() {
    const status = state.conflicts.status;
    const counts = s => D.conflicts.filter(c => c.status === s).length;
    const list = D.conflicts.filter(c => c.status === status);
    const why = { season_mismatch: "Сезоны не совпали", no_match: "Названия не совпали", metadata: "Принят по году и числу серий" };
    return `${pageHead("Конфликты", "Проход «Связанные тайтлы» сверяет каждый тайтл с Shikimori. Если строгая проверка не уверена, что это тот же тайтл, данные не пишутся, а строка попадает сюда.")}
    ${note("info", "lightbulb", "<strong>Как решать.</strong> Если слева и справа один и тот же тайтл — «Верно, закрыть». Если нет — откройте тайтл и поправьте номер Shikimori: при следующем проходе данные подтянутся сами.")}
    <div class="toolbar">${seg("conflicts", status, [["pending", "Ждут решения", counts("pending")], ["auto_accepted", "Приняты автоматически", counts("auto_accepted")], ["resolved", "Закрыты", counts("resolved")]])}</div>
    <section class="card">${list.length ? list.map(c => {
      const ex = c.existing_data, inc = c.incoming_data;
      const seasonMismatch = ex.season_number != null && inc.season_number != null && ex.season_number !== inc.season_number;
      return `<article class="conflict">
        <div class="conflict-head"><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">${tag(why[c.reason] || c.reason, c.reason === "metadata" ? "info" : "warning")}<span class="muted mono" style="font-size:12px">shikimori ${esc(c.external_id)} · ${at(c.created_at)}</span></div>
        <div class="conflict-actions">${c.status === "pending" ? `<a class="button s ghost" href="#/catalog/titles/${esc(ex.slug)}">${icon("pencil")}Исправить номер Shikimori</a><button type="button" class="button s" ${request("conflicts.resolve", { id: c.id, strategy: "keep" })}>${icon("check")}Верно, закрыть</button>` : c.status === "auto_accepted" ? `<a class="button s ghost" href="#/catalog/titles/${esc(ex.slug)}">${icon("arrow-right")}Открыть тайтл</a>` : ""}</div></div>
        <div class="diff">
          <div class="diff-side"><h5>${icon("home", "icon-s")}У нас</h5><div class="t">${esc(ex.title)}</div><div class="s">${esc(ex.title_en || "")}</div>
            <dl class="kv"><dt>Номер Shikimori</dt><dd class="mono">${esc(ex.shikimori_id)}</dd>${ex.season_number !== undefined ? `<dt>Сезон</dt><dd class="mono ${seasonMismatch ? "mismatch" : ""}">${ex.season_number ?? "не найден"}</dd>` : ""}${ex.aired_on_year ? `<dt>Год / серий</dt><dd class="mono">${ex.aired_on_year} / ${ex.episodes_total}</dd>` : ""}<dt>Адрес</dt><dd class="mono">/anime/${esc(ex.slug)}</dd></dl></div>
          <div class="diff-mid${seasonMismatch ? " is-mismatch" : ""}" aria-hidden="true">${icon(seasonMismatch ? "equal-not" : "arrow-left-right")}</div>
          <div class="diff-side"><h5>${icon("cloud", "icon-s")}Shikimori</h5><div class="t">${esc(inc.russian)}</div><div class="s">${esc(inc.english || inc.name || "")}</div>
            <dl class="kv"><dt>Номер</dt><dd class="mono">${esc(inc.id)}</dd>${inc.season_number !== undefined ? `<dt>Сезон</dt><dd class="mono ${seasonMismatch ? "mismatch" : ""}">${inc.season_number ?? "не найден"}</dd>` : ""}${inc.aired_on_year ? `<dt>Год / серий</dt><dd class="mono">${inc.aired_on_year} / ${inc.episodes}</dd>` : ""}</dl></div>
        </div>
      </article>`;
    }).join("") : empty("check-check", "Пусто", "В этом состоянии конфликтов нет.")}</section>`;
  }

  function renderComments() {
    return `${pageHead("Комментарии", "Лента всех комментариев, свежие сверху. Удалить комментарий может только суперпользователь; текст станет «[удалено]».")}
    ${note("info", "eye", "Комментарии появляются на сайте сразу, предварительной проверки нет. Модератор может читать ленту, а удалять — только суперпользователь.")}
    <section class="card">${D.comments.map(c => `<article class="comment ${c.is_deleted ? "is-deleted" : ""}">
      <span class="letter" aria-hidden="true">${esc(c.user[0].toUpperCase())}</span>
      <div><div class="comment-meta"><strong style="color:var(--text)">${esc(c.user)}</strong><span>${esc(c.anime)} · ${c.episode} серия</span><span>${at(c.created_at)}</span><span>${icon("heart", "icon-s")} ${c.likes_count}</span><span>ответов ${c.replies_count}</span></div><p>${esc(c.content)}</p></div>
      <div>${c.is_deleted ? tag("Удалён", "neutral") : `<button type="button" class="icon-btn s danger" ${request("comments.delete", { id: c.id, name: `комментарий ${c.user}` })} aria-label="Удалить комментарий ${esc(c.user)}">${icon("trash-2")}</button>`}</div>
    </article>`).join("")}</section>`;
  }

  /* ==========================================================================
     Парсер
     ========================================================================== */
  function lastRunOf(op) {
    const types = [op.job_type, op.dry, op.job_type === "incremental" ? "incremental_sync" : null].filter(Boolean);
    return D.jobs.filter(j => j.parser_name === op.parser && types.includes(j.job_type)).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
  }
  function opCard(op) {
    const last = lastRunOf(op);
    const running = last?.status === "running", queued = last?.status === "pending";
    const facts = op.works ? [
      tag(op.duration, "neutral", "hourglass"),
      op.blocks ? tag("Занимает очередь", "warning", "lock") : tag("Не мешает очереди", "success", "zap"),
      op.schedulable ? tag("Можно по расписанию", "info", "calendar-check") : tag("Только вручную", "neutral", "hand"),
    ].join("") : tag("Не перенесено в Go", "danger", "ban");
    const dry = op.dry ? `<div class="seg" role="group" aria-label="Режим запуска"><button type="button" data-dry="${op.key}" data-value="dry" aria-pressed="true">Пробный</button><button type="button" data-dry="${op.key}" data-value="real" aria-pressed="false">Настоящий</button></div>` : "";
    return `<article class="card op-card ${op.works ? "" : "is-off"}">
      <div class="op-card-head">${icon(op.icon)}<div><h4>${esc(op.title)}</h4><small>${esc(op.parser)} · ${esc(op.dry || op.job_type)}</small></div></div>
      <p>${esc(op.summary)}</p>
      <div class="op-facts">${facts}</div>
      ${op.guard ? note("info", "shield", esc(op.guard)) : ""}
      ${op.dry ? note("info", "flask-conical", "Сначала запустите пробный прогон: он ничего не пишет, а в журнале покажет, что изменится.") : ""}
      <div class="op-actions">${op.works ? `${dry}<button type="button" class="button ${op.danger ? "" : "primary"}" ${request("jobs.trigger", { parser: op.parser, type: op.dry || op.job_type, op: op.key })} ${running || queued ? "disabled" : ""}>${icon(running ? "loader" : queued ? "hourglass" : "play")}${running ? "Уже идёт" : queued ? "В очереди" : "Запустить"}</button>` : `<button type="button" class="button" disabled>${icon("ban")}Недоступно</button>`}
        <span class="op-last">${last ? `Последний раз: ${at(last.created_at)} · ${esc(labelForStatus(last.status)).toLowerCase()}` : "Ещё не запускали"}</span></div>
    </article>`;
  }
  function renderRun() {
    const running = D.jobs.find(j => j.status === "running");
    const groups = [["daily", "Регулярные"], ["long", "Долгие проходы"], ["repair", "Починка данных"], ["missing", "Есть в старом дашборде, но не работают"]];
    return `${pageHead("Запуск", "Каждая операция описана так, чтобы было понятно, что она сделает, сколько займёт и кому помешает. Список операций в шаблоне живёт в одном месте и при переносе должен приходить с сервера.")}
    ${running ? `<section class="card glow queue-banner">${dot("live")}<strong>Сейчас выполняется: ${esc(jobTitle(running))}</strong>${liveBar(running)}<span class="mono" data-live-pct>${state.live.progress}%</span><a class="link-btn" href="#/parser/jobs">Открыть${icon("arrow-right")}</a></section>` : ""}
    <div class="op-groups">${groups.map(([id, title]) => `<section class="op-group"><h3>${esc(title)}</h3><div class="op-grid reveal">${D.operations.filter(op => op.group === id).map(opCard).join("")}</div></section>`).join("")}</div>`;
  }

  function renderJobs() {
    const st = state.jobs.status;
    const list = D.jobs.filter(j => st === "all" || j.status === st);
    const n = s => D.jobs.filter(j => j.status === s).length;
    return `${pageHead("Задачи", "Очередь и история запусков. Откройте задачу, чтобы увидеть её журнал и подробности.", `<button type="button" class="button" ${request("jobs.clear", { status: "completed" })}>${icon("eraser")}Очистить готовые</button>`)}
    <div class="toolbar">${seg("jobs", st, [["all", "Все", D.jobs.length], ["running", "Идут", n("running")], ["pending", "Ждут", n("pending")], ["completed", "Готово", n("completed")], ["failed", "Ошибки", n("failed")], ["cancelled", "Остановлены", n("cancelled")]])}</div>
    <section class="card"><div class="table-wrap"><table class="data cards"><thead><tr><th>Задача</th><th>Статус</th><th class="opt">Прогресс</th><th class="num">Обработано</th><th class="num opt">Длительность</th><th class="num">Создана</th><th class="actions"><span class="sr-only">Действия</span></th></tr></thead><tbody>
    ${list.length ? list.map(j => `<tr>
      <td class="lead"><a class="cell-title cell-link" href="#/parser/jobs/${esc(j.id)}"><div><strong>${esc(jobTitle(j))}</strong><small>${esc(j.source)}</small></div></a></td>
      <td data-label="Статус">${statusTag(j.status)}</td>
      <td class="opt" data-label="Прогресс" style="min-width:120px">${j.status === "running" ? liveBar(j) : j.status === "pending" ? `<span class="muted" style="font-size:12px">Ждёт своей очереди</span>` : j.error_message ? `<span class="${j.status === "failed" ? "" : "muted"}" style="font-size:12px;color:${j.status === "failed" ? "var(--red)" : ""}">${esc(j.error_message)}</span>` : `<span class="progress"><i style="--p:${j.progress}%"></i></span>`}</td>
      <td class="num" data-label="Обработано">${num(j.items_processed)}${j.items_failed ? ` <span style="color:var(--red)">· ${j.items_failed} ош.</span>` : ""}</td>
      <td class="num opt" data-label="Длительность">${C.fmtDuration(j.duration_seconds)}</td>
      <td class="num" data-label="Создана">${at(j.created_at)}</td>
      <td class="actions"><a class="button s" href="#/parser/jobs/${esc(j.id)}">${icon("scroll-text")}Подробно</a></td>
    </tr>`).join("") : `<tr><td colspan="7">${empty("inbox", "Пусто", "Задач с таким статусом нет.")}</td></tr>`}
    </tbody></table></div></section>
    ${note("warning", "triangle-alert", "Мониторинг считает отказы и запаздывание расписания по истории задач. Очистка истории стирает эти следы: проверки на время станут «нет выборки».")}`;
  }

  function daymap() {
    const rows = D.schedules.map(s => {
      const minutes = C.fireMinutes(s.cron_expression);
      return `<div class="daymap-row"><b title="${esc(scheduleTitle(s))}">${esc(scheduleTitle(s))}</b><div class="daymap-track" aria-label="${esc(C.describeCron(s.cron_expression).text)}">${minutes.map(m => `<i style="left:${(m / 1440) * 100}%"></i>`).join("")}</div></div>`;
    });
    rows.push(`<div class="daymap-row"><b>Суточный бэкап</b><div class="daymap-track" aria-label="Каждый день в 05:00"><i class="backup" style="left:${(300 / 1440) * 100}%"></i></div></div>`);
    const scale = Array.from({ length: 9 }, (_, i) => `<span style="left:${(i / 8) * 100}%">${String(i * 3).padStart(2, "0")}:00</span>`).join("");
    return `<div class="daymap">${rows.join("")}<div class="daymap-scale"><div></div><div aria-hidden="true">${scale}</div></div></div>`;
  }
  function scheduleEditor(s) {
    const isNew = !s;
    const schedulable = D.operations.filter(op => op.works && op.schedulable);
    return `<div class="inline-editor">${editForm("schedule", isNew ? "schedule.create" : "schedule.update", s?.id, `
      ${isNew ? field("Что запускать", "operation", schedulable[0]?.key, { options: schedulable.map(op => [op.key, op.title]), wide: true, hint: "В списке только то, что имеет смысл запускать по расписанию." }) : ""}
      <div class="field"><span>Как часто</span>${freqPicker("cron_expression", s?.cron_expression || "0 4 * * *", { allowFast: false })}</div>
      <div class="toggles-row"><label class="switch"><input type="checkbox" name="is_active" ${!s || s.is_active ? "checked" : ""} /><span class="track"></span>Включено</label></div>
      <div class="inline-actions"><span class="grow"></span><button type="button" class="button s ghost" data-action="toggle-schedule" data-id="${isNew ? "new" : s.id}">Отмена</button><button type="button" class="button s primary" data-action="save-inline">${icon("save")}${isNew ? "Создать" : "Сохранить"}</button></div>`)}</div>`;
  }
  function renderSchedule() {
    const editing = state.editing.schedule;
    return `${pageHead("Расписание", "Когда задачи запускаются сами. Всё время — по Алматы.", `<button type="button" class="button primary" data-action="toggle-schedule" data-id="new" aria-expanded="${editing === "new"}">${icon("plus")}Новое расписание</button>`)}
    <section class="card reveal"><div class="card-head"><h2>${icon("calendar-range")}Карта суток</h2><span class="card-meta">Когда что срабатывает</span></div><div class="card-body">${daymap()}</div></section>
    <section class="card"><div class="sched-list">
    ${editing === "new" ? `<div class="sched is-open"><div class="sched-title"><strong>Новое расписание</strong></div>${scheduleEditor(null)}</div>` : ""}
    ${D.schedules.map(s => {
      const d = C.describeCron(s.cron_expression);
      const open = editing === s.id;
      return `<div class="sched ${open ? "is-open" : ""}">
        <div class="sched-title"><strong>${esc(scheduleTitle(s))}</strong><small>${s.is_active ? `Следующий запуск ${at(s.next_run_at)}` : "Выключено"} · прошлый ${at(s.last_run_at)}</small></div>
        <div class="sched-when"><strong>${esc(d.text)}</strong>${d.note ? `<small>${esc(d.note)}</small>` : ""}</div>
        <div class="sched-actions">
          <label class="switch" title="Включено"><input type="checkbox" ${s.is_active ? "checked" : ""} ${request("schedule.update", { id: s.id, field: "is_active" })} aria-label="Включено: ${esc(scheduleTitle(s))}" /><span class="track"></span></label>
          <button type="button" class="icon-btn s" ${request("schedule.runNow", { id: s.id, name: scheduleTitle(s) })} aria-label="Запустить сейчас">${icon("play")}</button>
          <button type="button" class="icon-btn s" data-action="toggle-schedule" data-id="${s.id}" aria-expanded="${open}" aria-label="${open ? "Свернуть" : "Изменить время"}">${icon(open ? "chevron-up" : "pencil")}</button>
          <button type="button" class="icon-btn s danger" ${request("schedule.delete", { id: s.id, name: scheduleTitle(s) })} aria-label="Удалить">${icon("trash-2")}</button>
        </div>
        ${s.trap ? note("warning", "triangle-alert", esc(s.trap)) : ""}
        ${open ? scheduleEditor(s) : ""}
      </div>`;
    }).join("")}</div></section>
    <div class="grid cols-3">
      ${note("info", "hourglass", "<strong>Возможна задержка до 15 минут.</strong> Расписание проверяется раз в 15 минут, поэтому задача стартует в ближайшую такую проверку.")}
      ${note("info", "lock", "<strong>Одна очередь.</strong> Пока идёт долгая задача, плановые ждут. Это видно на пульте как запаздывание.")}
      ${note("warning", "calendar-x", "<strong>Новое время вступит в силу не сразу.</strong> Ближайший запуск пройдёт по старому времени, следующие — по новому.")}
    </div>`;
  }

  function renderLogs() {
    const lv = state.logs.level;
    const list = D.jobLogs.filter(l => lv === "all" || l.level === lv).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return `${pageHead("Журнал парсера", "Сообщения всех задач. Чтобы видеть одну задачу, откройте её в «Задачах».")}
    <div class="toolbar">${seg("logs", lv, [["all", "Все"], ["INFO", "Инфо"], ["WARNING", "Предупреждения"], ["ERROR", "Ошибки"]])}</div>
    <section class="card"><div class="log">${list.length ? list.map(l => `<div class="log-row" data-tone="${toneForStatus(l.level)}"><span class="mono muted">${C.fmtTime(l.created_at)}</span><span class="lvl">${esc(labelForStatus(l.level))}</span><span class="msg">${esc(l.message)}</span><span class="job">${esc(l.job)}</span></div>`).join("") : empty("inbox", "Пусто", "Сообщений этого уровня нет.")}</div></section>`;
  }

  function renderBlacklist() {
    const label = b => (b.shikimori_id ? `Номер Shikimori ${b.shikimori_id}` : b.kodik_id ? `Номер Kodik ${esc(b.kodik_id)}` : `Адрес /anime/${esc(b.slug)}`);
    return `${pageHead("Исключения", "Тайтлы, которые синхронизация и импорт никогда не добавят. Жанры и слова исключаются в настройках, на странице «Стоп-слова».")}
    <section class="card"><div class="card-head"><h2>${icon("plus")}Исключить тайтл</h2></div><div class="card-body"><form class="bl-form" data-form="blacklist">
      <label class="field"><span>По чему узнать тайтл</span><select class="select" name="target"><option value="shikimori_id">Номер на Shikimori</option><option value="kodik_id">Номер в Kodik</option><option value="slug">Адрес на сайте</option></select></label>
      <label class="field grow"><span>Значение</span><input class="input mono" name="target_value" placeholder="Например, 33352" autocomplete="off" /></label>
      <button type="submit" class="button primary">${icon("ban")}Исключить</button>
    </form><p class="hint" style="margin-top:8px">Номер Shikimori — число в адресе страницы тайтла на shikimori.one: /animes/<b>33352</b>-…</p></div></section>
    <section class="card"><div class="table-wrap"><table class="data cards"><thead><tr><th>Тайтл</th><th>Зачем</th><th class="num">Добавлен</th><th class="actions"><span class="sr-only">Действия</span></th></tr></thead><tbody>
    ${D.blacklist.map(b => `<tr><td class="lead">${label(b)}</td><td data-label="Зачем" class="secondary">${esc(b.note)}</td><td class="num" data-label="Добавлен">${at(b.created_at)}</td><td class="actions"><button type="button" class="button s ghost" ${request("blacklist.delete", { id: b.id, name: b.shikimori_id || b.kodik_id || b.slug })}>${icon("undo-2")}Вернуть</button></td></tr>`).join("")}
    </tbody></table></div></section>`;
  }

  /* ==========================================================================
     Стенд
     ========================================================================== */
  const UNITS = { hours: ["ч", "ч", "ч"], days: ["день", "дня", "дней"], minutes: ["мин", "мин", "мин"], rows: ["строка", "строки", "строк"], jobs: ["задача", "задачи", "задач"], problems: ["проблема", "проблемы", "проблем"], probes_broken: ["сломана", "сломаны", "сломано"] };
  function checkValue(c) {
    if (c.value == null) return "—";
    if (c.unit === "ratio") return `${Math.round(c.value * 100)}<span class="u">%</span>`;
    const forms = UNITS[c.unit];
    const shown = String(c.value).replace(".", ",");
    return forms ? `${shown} <span class="u">${Number.isInteger(c.value) ? C.plural(c.value, ...forms) : forms[1]}</span>` : `${shown} <span class="u">${esc(c.unit)}</span>`;
  }
  /* В имени проверки сервер пишет cron расписания — показываем его словами. */
  const checkName = name => esc(name).replace(/\(([0-9*\/ ,-]+)\)/, (m, cron) => { const d = C.describeCron(cron.trim()); return d.ok && d.kind !== "custom" ? `(${d.text.toLowerCase()})` : m; });
  function renderChecks() {
    const st = state.checks.state;
    const states = ["fail", "warn", "stale", "no_sample", "waiting", "unknown", "ok"];
    const n = s => D.checks.filter(c => c.state === s).length;
    const list = D.checks.filter(c => st === "all" || c.state === st);
    return `${pageHead("Проверки", "Монитор в воркере раз в 15 минут считает проверки и сохраняет результат. Страница только показывает ответ сервера: свои пороги и список проверок ей знать нельзя.")}
    <section class="card reveal"><div class="card-body" style="display:grid;gap:14px">
      <div style="display:flex;gap:10px 22px;flex-wrap:wrap;align-items:center"><span>${dot(D.monitor.state === "ok" ? "success" : "danger")} Монитор: последний такт <strong>${at(D.monitor.last_tick_at)}</strong></span><span>${dot("success")} Стенд в работе с <strong>${C.fmtTime(D.stack.up_since)}</strong>, за сутки ${String(D.stack.uptime_24h_hours).replace(".", ",")} ч</span></div>
      <div class="states">${states.filter(n).map(s => tag(`${labelForStatus(s)} · ${n(s)}`, toneForStatus(s))).join("")}</div>
    </div></section>
    <div class="toolbar">${seg("checks", st, [["all", "Все", D.checks.length], ...states.filter(n).map(s => [s, labelForStatus(s), n(s)])])}</div>
    <section class="card"><div class="check-list">${list.map(c => `<div class="check-row">${statusTag(c.state)}<div><strong>${checkName(c.name)}</strong><small>${esc(c.evidence || "")}</small></div><div class="val">${checkValue(c)}${c.threshold ? `<small>порог ${esc(c.threshold)}</small>` : ""}</div><span class="muted mono" style="font-size:12px">${C.fmtTime(c.last_run_at)}</span></div>`).join("")}</div></section>
    <section class="card"><div class="card-head"><h2>${icon("book-open")}Как читать состояния</h2></div><div class="card-body"><dl class="kv">
      <dt>${statusTag("ok")}</dt><dd>Условие выполнено.</dd>
      <dt>${statusTag("warn")}</dt><dd>Стоит посмотреть, но сайт работает.</dd>
      <dt>${statusTag("fail")}</dt><dd>Условие не выполнено, хотя стенд проработал достаточно, чтобы успеть.</dd>
      <dt>${statusTag("waiting")}</dt><dd>Срок прошёл, пока стенд был выключен. Это не поломка.</dd>
      <dt>${statusTag("no_sample")}</dt><dd>Путь не записал ни одной строки за окно. Если это длится долго — сигнал, что путь не работает.</dd>
      <dt>${statusTag("unknown")}</dt><dd>Судить не по чему: истории ещё мало или проверка не подключена.</dd>
      <dt>${statusTag("stale")}</dt><dd>Результат старше трёх тактов при работающем стенде: монитор, похоже, встал.</dd>
    </dl></div></section>`;
  }

  function renderResources() {
    const h = D.health;
    const gauge = (label, ic, value, unit = "%", hint = "") => `<section class="card gauge"><div class="gauge-top"><strong>${icon(ic)}${label}</strong><b>${String(value).replace(".", ",")}${unit}</b></div><div class="progress"><i style="--p:${Math.min(100, value)}%"></i></div>${hint ? `<small>${hint}</small>` : ""}</section>`;
    return `${pageHead("Ресурсы", "Снимок процесса api-go и его контейнера. Это не весь стенд: база, воркер и nginx меряются отдельно, в «Проверках».", `<button type="button" class="button" data-action="refresh">${icon("refresh-cw")}Обновить</button>`)}
    <div class="grid cols-4 kpis reveal">
      ${gauge("Процессор", "cpu", h.resources.cpu_percent)}
      ${gauge("Память", "memory-stick", h.resources.memory_percent, "%", `Сам api-go: ${String(h.resources.memory_app_mb).replace(".", ",")} МБ`)}
      ${gauge("Диск", "hard-drive", h.resources.disk_percent, "%", "Корень контейнера api-go")}
      <section class="card gauge"><div class="gauge-top"><strong>${icon("gauge")}Нагрузка</strong><b class="mono" style="font-family:var(--font-mono);font-size:20px">${h.resources.load_avg.map(v => v.toFixed(2).replace(".", ",")).join(" · ")}</b></div><small>За 1, 5 и 15 минут</small></section>
    </div>
    <section class="card"><div class="card-head"><h2>${icon("network")}Службы</h2><span class="card-meta">api-go работает ${esc(D.overview.uptime.replace("d", " дн").replace("h", " ч").replace("m", " мин"))}</span></div><div class="card-body flush">
      <div class="svc">${icon("database")}<div><strong>База данных</strong><small>Ответ на SELECT 1 за ${String(h.services.database.latency_ms).replace(".", ",")} мс</small></div>${statusTag(h.services.database.status)}</div>
      <div class="svc">${icon("cog")}<div><strong>Воркер</strong><small>Серверов asynq: ${h.services.worker.count}</small></div>${statusTag(h.services.worker.status)}</div>
      <div class="svc">${icon("layers")}<div><strong>Кэш Redis</strong><small>Сервер всегда отвечает «online»: на самом деле состояние не проверяется</small></div>${tag("Не измеряется", "neutral")}</div>
    </div></section>`;
  }

  function renderBackups() {
    return `${pageHead("Резервные копии", "Каждый запуск даёт два файла: дамп базы и архив медиа. Автоматический запуск — каждый день в 05:00 по Алматы (00:00 UTC).", `<button type="button" class="button primary" ${request("backups.create")}>${icon("archive")}Сделать копию сейчас</button>`)}
    ${note("info", "shield", "Восстановления из админки нет и не будет: это делается по инструкции <code>09_backup_restore_runbook.md</code> на сервере. Здесь — только создать, скачать и удалить.")}
    <section class="card">${D.backups.map(run => `<div class="run">
      <div class="run-when"><strong>${at(run.run)}</strong><small>${run.type === "auto" ? "Автоматически" : "Вручную"}</small></div>
      <div class="run-files">${run.items.map(f => `<div class="file">${icon(f.kind === "database" ? "database" : "images")}<div><strong>${esc(f.filename)}</strong><small>${f.kind === "database" ? "База данных" : "Медиа"} · ${C.fmtBytes(f.size)}</small>${f.failure_reason ? `<small class="fail">${esc(f.failure_reason)}</small>` : ""}</div>${statusTag(f.status)}<div class="file-actions">${f.status === "completed" ? `<button type="button" class="icon-btn s" ${request("backups.download", { id: f.id, name: f.filename })} aria-label="Скачать ${esc(f.filename)}">${icon("download")}</button>` : ""}<button type="button" class="icon-btn s danger" ${request("backups.delete", { id: f.id, name: f.filename })} aria-label="Удалить ${esc(f.filename)}">${icon("trash-2")}</button></div></div>`).join("")}</div>
    </div>`).join("")}</section>`;
  }

  function renderAudit() {
    const ACT = { update: "Изменил", trigger: "Запустил", import: "Импортировал", resolve_conflict: "Закрыл конфликт", create: "Создал", ban: "Забанил", delete: "Удалил" };
    return `${pageHead("Журнал действий", "Кто, что и когда менял через админку. Одобрение модерации и смена настроек парсера сюда не попадают: сервер их не записывает.")}
    <section class="card"><div class="table-wrap"><table class="data cards"><thead><tr><th class="num">Когда</th><th>Кто</th><th>Действие</th><th>Объект</th><th>Результат</th></tr></thead><tbody>
    ${D.audit.map(a => `<tr><td class="num lead">${at(a.created_at)}</td><td data-label="Кто"><strong>${esc(a.actor)}</strong> <span class="muted mono opt" style="font-size:12px">${esc(a.actor_ip)}</span></td><td data-label="Действие">${esc(ACT[a.action] || a.action)} <span class="muted">${esc(a.resource_type)}</span></td><td data-label="Объект">${esc(a.resource)}</td><td data-label="Результат">${a.success ? tag("Успешно", "success") : tag(a.error_message || "Отказ", "danger")}</td></tr>`).join("")}
    </tbody></table></div><div class="pager"><span>Страницы по 100, свежие сверху</span></div></section>`;
  }

  /* ==========================================================================
     Люди
     ========================================================================== */
  const roleByName = name => D.roles.find(r => r.name === name);
  function accessTag(user) {
    const access = C.effectiveAccess(user, roleByName(user.role));
    if (access.level === "full") return tag("Полный доступ", "live", "crown");
    if (access.level === "none") return tag("Как у зрителя", "neutral");
    const perms = roleByName(user.role)?.permissions || [];
    const series = C.satisfies(perms, "content.edit"), comments = C.satisfies(perms, "comments.moderate");
    return tag(series && comments ? "Серии и комментарии" : series ? "Только серии" : "Только комментарии", "info");
  }
  function renderUsers() {
    return `${pageHead("Пользователи", "Поиск по имени и почте. Создавать пользователей из админки нельзя: только регистрация на сайте.")}
    <div class="toolbar"><label class="search grow">${icon("search")}<span class="sr-only">Поиск</span><input class="input" type="search" data-input="users-q" value="${esc(state.users.q)}" placeholder="Имя или email" /></label></div>
    <section class="card"><div class="table-wrap"><table class="data cards"><thead><tr><th>Пользователь</th><th class="opt">Роль</th><th>Доступ в админке</th><th>Состояние</th><th class="num opt">Был</th><th class="actions"><span class="sr-only">Действия</span></th></tr></thead><tbody id="user-rows">${userRows()}</tbody></table></div></section>`;
  }
  function userRows() {
    const q = state.users.q.toLowerCase();
    const list = D.users.filter(u => !q || `${u.username} ${u.email}`.toLowerCase().includes(q));
    if (!list.length) return `<tr><td colspan="6">${empty("search-x", "Никого не нашлось", "Поиск идёт по имени и почте.")}</td></tr>`;
    return list.map(u => `<tr><td class="lead"><a class="cell-title cell-link" href="#/people/users/${esc(u.id)}"><span class="letter" aria-hidden="true">${esc(u.username[0].toUpperCase())}</span><div><strong>${esc(u.username)}</strong><small>${esc(u.email)}</small></div></a></td>
      <td class="opt" data-label="Роль">${esc(u.role || "без роли")}</td>
      <td data-label="Доступ">${accessTag(u)}</td>
      <td data-label="Состояние">${u.is_active ? (u.is_verified ? tag("Активен", "success") : tag("Почта не подтверждена", "warning")) : tag("Забанен", "danger")}</td>
      <td class="num opt" data-label="Был">${at(u.last_seen_at)}</td>
      <td class="actions"><a class="button s" href="#/people/users/${esc(u.id)}">${icon("user-cog")}Открыть</a></td></tr>`).join("");
  }

  function renderAccess() {
    const effects = Object.entries(C.permissionEffects);
    return `${pageHead("Доступ", "Что на самом деле даёт каждая роль. В ролях записано много прав, но сервер проверяет только два. Всё остальное открыто одному суперпользователю.")}
    ${note("warning", "key-round", "<strong>Права <code>users.view</code>, <code>users.edit</code>, <code>parsers.*</code>, <code>analytics.view</code> ни на что не влияют.</strong> Роль «admin» без флага суперпользователя не откроет ни парсер, ни пользователей — только серии и источники. Менять сами роли через API нельзя, только назначать.")}
    <div class="role-grid reveal">
      <section class="card role-card"><h3>Суперпользователь</h3><p class="muted" style="font-size:13px">Отдельный флажок у пользователя, а не роль</p><ul><li>${icon("check")}Всё в админке: парсер, бэкапы, пользователи, настройки</li><li>${icon("check")}Удаление чужих комментариев</li></ul></section>
      ${D.roles.map(role => {
        const items = effects.map(([perm, list]) => ({ on: C.satisfies(role.permissions, perm), perm, list }));
        return `<section class="card role-card"><h3>${esc(role.name)}</h3><p class="muted" style="font-size:13px">${esc(role.description)}</p>
          <ul>${items.flatMap(i => i.list.map(text => `<li class="${i.on ? "" : "off"}">${icon(i.on ? "check" : "minus")}${esc(text)}</li>`)).join("")}</ul>
          <p class="muted" style="font-size:12.5px">Остальные разделы открываются только флагом суперпользователя.</p>
          <details class="tech"><summary>${icon("chevron-right", "icon-s")}Права, записанные в роли</summary><div class="perm-list">${role.permissions.map(p => `<code>${esc(p)}</code>`).join("")}</div></details></section>`;
      }).join("")}
    </div>`;
  }

  function renderCosmetics() {
    return `${pageHead("Оформление", "Аватары и рамки, из которых пользователи собирают профиль. Выключенные не видны в выборе, но у тех, кто уже выбрал, остаются.", `<button type="button" class="button" data-action="new-cosmetic" data-kind="decoration">${icon("plus")}Рамка</button><button type="button" class="button primary" data-action="new-cosmetic" data-kind="avatar">${icon("plus")}Аватар</button>`)}
    <section class="card"><div class="card-head"><h2>${icon("image")}Аватары</h2><span class="card-meta">${D.avatars.length} в коллекции</span></div><div class="card-body"><div class="gallery">
      ${D.avatars.map(a => `<div class="tile ${a.is_active ? "" : "is-off"}"><div class="tile-art">${artTile(a.title)}</div><strong>${esc(a.title)}</strong><div class="tile-foot"><span class="tag">${esc(a.category)}</span><button type="button" class="icon-btn s" data-action="edit-cosmetic" data-kind="avatar" data-id="${a.id}" aria-label="Изменить ${esc(a.title)}">${icon("pencil")}</button></div></div>`).join("")}
    </div></div></section>
    <section class="card"><div class="card-head"><h2>${icon("frame")}Рамки профиля</h2></div><div class="card-body"><div class="gallery">
      ${D.decorations.map(d => `<div class="tile ${d.is_active ? "" : "is-off"}"><div class="tile-art">${artTile(`d${d.title}`)}</div><strong>${esc(d.title)}</strong><div class="tile-foot">${d.is_active ? tag("Включена", "success") : tag("Выключена", "neutral")}<button type="button" class="icon-btn s" data-action="edit-cosmetic" data-kind="decoration" data-id="${d.id}" aria-label="Изменить ${esc(d.title)}">${icon("pencil")}</button></div></div>`).join("")}
    </div></div></section>`;
  }

  /* ==========================================================================
     Элементы форм: всё вводится выбором, переключателями и подсказками, а не кодами
     ========================================================================== */
  const field = (label, name, value, opts = {}) => `<label class="field ${opts.wide ? "wide" : ""}"><span>${esc(label)}${opts.req ? ' <b class="req" aria-hidden="true">*</b>' : ""}</span>${opts.textarea ? `<textarea class="textarea" name="${name}" ${opts.req ? "required" : ""} ${opts.placeholder ? `placeholder="${esc(opts.placeholder)}"` : ""}>${esc(value ?? "")}</textarea>` : opts.options ? `<select class="select" name="${name}">${opts.options.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(value ?? "") ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>` : `<input class="input ${opts.mono ? "mono" : ""}" name="${name}" type="${opts.type || "text"}" value="${esc(value ?? "")}" ${opts.req ? "required" : ""} ${opts.readonly ? 'readonly data-readonly="true"' : ""} ${opts.step ? `step="${opts.step}"` : ""} ${opts.min != null ? `min="${opts.min}"` : ""} ${opts.max != null ? `max="${opts.max}"` : ""} ${opts.placeholder ? `placeholder="${esc(opts.placeholder)}"` : ""} ${opts.list ? `list="${opts.list}"` : ""} ${opts.inputmode ? `inputmode="${opts.inputmode}"` : ""} />`}${opts.hint ? `<span class="hint">${opts.hint}</span>` : ""}<span class="error" data-error-for="${name}" hidden></span></label>`;
  const hidden = (name, value, list = false) => `<input type="hidden" name="${name}" value="${esc(Array.isArray(value) ? value.join(", ") : value ?? "")}" ${list ? 'data-list="true"' : ""} />`;
  /* Один вариант из нескольких: кнопки-сегменты пишут значение в скрытое поле. */
  const single = (name, value, options, label = "") => `<div class="seg seg-input" role="radiogroup" ${label ? `aria-label="${esc(label)}"` : ""} data-single="${name}">${options.map(([v, l, ic]) => `<button type="button" role="radio" data-value="${esc(v)}" aria-checked="${String(v) === String(value)}" aria-pressed="${String(v) === String(value)}">${ic ? icon(ic) : ""}${esc(l)}</button>`).join("")}${hidden(name, value)}</div>`;
  /* Несколько вариантов: кнопки-чипы, результат — список через запятую или массив. */
  const multi = (name, values, options, { array = false, label = "" } = {}) => {
    const set = new Set((Array.isArray(values) ? values : String(values || "").split(",")).map(x => x.trim()).filter(Boolean));
    return `<div class="choice-chips" role="group" ${label ? `aria-label="${esc(label)}"` : ""} data-multi="${name}" ${array ? 'data-array="true"' : ""}>${options.map(([v, l]) => `<button type="button" data-value="${esc(v)}" aria-pressed="${set.has(v)}">${esc(l)}</button>`).join("")}${hidden(name, [...set].join(", "), array)}</div>`;
  };
  /* Свободный список: набрать и нажать Enter, лишнее убрать крестиком. */
  const chips = (name, values, { suggest = [], placeholder = "Добавить и нажать Enter", array = false } = {}) => {
    const list = (Array.isArray(values) ? values : String(values || "").split(",")).map(x => x.trim()).filter(Boolean);
    const dl = suggest.length ? `dl-${name}` : "";
    return `<div class="chips-input" data-chips="${name}" ${array ? 'data-array="true"' : ""}>${list.map(chipItem).join("")}<input class="chips-entry" type="text" ${dl ? `list="${dl}"` : ""} placeholder="${esc(placeholder)}" aria-label="${esc(placeholder)}" />${hidden(name, list.join(", "), array)}${dl ? `<datalist id="${dl}">${suggest.map(s => `<option value="${esc(s)}"></option>`).join("")}</datalist>` : ""}</div>`;
  };
  const chipItem = text => `<span class="chip" data-chip="${esc(text)}">${esc(text)}<button type="button" class="chip-x" data-chip-remove aria-label="Убрать «${esc(text)}»">${icon("x")}</button></span>`;
  const toggle = (name, checked, label) => `<label class="switch"><input type="checkbox" name="${name}" ${checked ? "checked" : ""} aria-label="${esc(label)}" /><span class="track"></span></label>`;
  /* Ползунок с подписью текущего значения. */
  const RANGE_FORMAT = {
    score: v => `от ${Number(v).toFixed(1).replace(".", ",")}`,
    percent: v => `${v}%${+v >= 100 ? " · без потерь" : +v >= 85 ? " · почти без потерь" : +v >= 70 ? " · сбалансировано" : " · экономно"}`,
    ms: v => (+v ? `${v} мс` : "без паузы"),
    parallel: v => `${v} ${C.plural(+v, "запрос", "запроса", "запросов")} одновременно`,
  };
  const range = (name, value, { min, max, step = 1, format }) => `<div class="range-wrap"><input class="range" type="range" name="${name}" min="${min}" max="${max}" step="${step}" value="${esc(value)}" data-format="${format}" aria-valuetext="${esc(RANGE_FORMAT[format](value))}" /><output class="range-value" data-range-out="${name}">${esc(RANGE_FORMAT[format](value))}</output></div>`;
  /* Строка настройки: слева что это и зачем, справа элемент управления. */
  const srow = (title, desc, control, { stack = false, id = "" } = {}) => `<div class="srow ${stack ? "stack" : ""}" ${id ? `id="${id}"` : ""}><div class="srow-text"><strong>${esc(title)}</strong>${desc ? `<small>${desc}</small>` : ""}</div><div class="srow-control">${control}</div></div>`;

  /* «Как часто» вместо cron: выбор из понятных вариантов, cron собирается сам. */
  const FREQ = [
    ["*/10 * * * *", "Каждые 10 минут"], ["*/15 * * * *", "Каждые 15 минут"], ["*/20 * * * *", "Каждые 20 минут"], ["*/30 * * * *", "Каждые 30 минут"],
    ["0 * * * *", "Каждый час"], ["0 */2 * * *", "Каждые 2 часа"], ["0 */3 * * *", "Каждые 3 часа"], ["0 */6 * * *", "Каждые 6 часов"], ["0 */12 * * *", "Каждые 12 часов"],
    ["daily", "Раз в день"], ["weekly", "Раз в неделю"],
  ];
  const WEEKDAYS = [[1, "Пн"], [2, "Вт"], [3, "Ср"], [4, "Чт"], [5, "Пт"], [6, "Сб"], [0, "Вс"]];
  function freqState(cron) {
    const d = C.describeCron(cron);
    if (FREQ.some(([v]) => v === cron)) return { kind: cron, time: "09:00", weekday: 1 };
    if (d.kind === "daily") return { kind: "daily", time: d.local, weekday: 1 };
    if (d.kind === "weekly") {
      const [mi, h, , , dow] = cron.split(/\s+/);
      const total = +h * 60 + +mi + C.OFFSET_H * 60;
      return { kind: "weekly", time: d.local, weekday: (+dow + (total >= 1440 ? 1 : 0)) % 7 };
    }
    return { kind: "custom", time: "09:00", weekday: 1, cron };
  }
  function freqPicker(name, cron, { allowFast = true } = {}) {
    const st = freqState(cron);
    const options = FREQ.filter(([v]) => allowFast || v !== "*/10 * * * *");
    const [hh, mm] = st.time.split(":");
    return `<div class="freq" data-freq="${name}">
      <select class="select" data-freq-kind aria-label="Как часто">${options.map(([v, l]) => `<option value="${v}" ${st.kind === v ? "selected" : ""}>${l}</option>`).join("")}${st.kind === "custom" ? `<option value="custom" selected>Особое расписание (оставить как есть)</option>` : ""}</select>
      <div class="freq-time" ${["daily", "weekly"].includes(st.kind) ? "" : "hidden"}>
        <div class="choice-chips weekday" data-freq-weekday ${st.kind === "weekly" ? "" : "hidden"}>${WEEKDAYS.map(([v, l]) => `<button type="button" data-value="${v}" aria-pressed="${st.weekday === v}">${l}</button>`).join("")}</div>
        <span class="freq-at">в</span>
        <select class="select" data-freq-hour aria-label="Час">${Array.from({ length: 24 }, (_, h) => `<option value="${String(h).padStart(2, "0")}" ${+hh === h ? "selected" : ""}>${String(h).padStart(2, "0")}</option>`).join("")}</select>
        <span class="freq-at">:</span>
        <select class="select" data-freq-minute aria-label="Минуты">${["00", "05", "10", "15", "20", "30", "40", "45", "50"].map(m => `<option ${m === mm ? "selected" : ""}>${m}</option>`).join("")}</select>
        <span class="muted freq-tz">по Алматы</span>
      </div>
      ${hidden(name, cron)}
      <p class="freq-say" data-freq-say ${freqSayHidden(cron, st.kind) ? "hidden" : ""}>${esc(freqSentence(cron))}</p>
    </div>`;
  }
  /* Подпись-пересказ нужна, когда выбор неочевиден: день и время, особое расписание или оговорка пульса. */
  const freqSayHidden = (cron, kind) => !["daily", "weekly", "custom"].includes(kind) && !C.describeCron(cron).note;
  function freqSentence(cron) {
    const d = C.describeCron(cron);
    if (!d.ok) return "Сейчас записано что-то, чего сервер не поймёт: он будет запускать задачу раз в час.";
    return `${d.text}${d.kind === "daily" || d.kind === "weekly" ? " по Алматы" : ""}.${d.note ? ` ${d.note}.` : ""}`;
  }
  function readFreq(box) {
    const kind = $("[data-freq-kind]", box).value;
    if (kind === "custom") return $("input[type=hidden]", box).value;
    if (kind !== "daily" && kind !== "weekly") return kind;
    const local = `${$("[data-freq-hour]", box).value}:${$("[data-freq-minute]", box).value}`;
    const weekday = +($("[data-freq-weekday] [aria-pressed='true']", box)?.dataset.value ?? 1);
    return C.buildCron({ kind, local, weekday });
  }
  function syncFreq(box) {
    const kind = $("[data-freq-kind]", box).value;
    $(".freq-time", box).hidden = !["daily", "weekly"].includes(kind);
    $("[data-freq-weekday]", box).hidden = kind !== "weekly";
    const cron = readFreq(box);
    $("input[type=hidden]", box).value = cron;
    const say = $("[data-freq-say]", box);
    say.textContent = freqSentence(cron);
    say.hidden = freqSayHidden(cron, kind);
  }

  /* Панель «Есть несохранённые изменения» внизу страницы с формой. */
  const savebar = (label = "Сохранить") => `<div class="savebar" data-savebar hidden role="region" aria-label="Несохранённые изменения"><span class="savebar-text">${icon("pencil-line")}Есть несохранённые изменения</span><span class="savebar-actions"><button type="button" class="button ghost" data-action="reset-form">Отменить</button><button type="button" class="button primary" data-action="save-page">${icon("save")}${esc(label)}</button></span></div>`;
  const editForm = (kind, requestKey, id, inner, extra = "") => `<form class="edit-form" data-edit="${kind}" data-request-key="${requestKey}" data-id="${esc(id || "")}" ${extra} novalidate>${inner}</form>`;

  /* ==========================================================================
     Страница тайтла (вместо выезжающей панели)
     ========================================================================== */
  const RATING = [["", "Не указан"], ["g", "G — для всех"], ["pg", "PG — детям с родителями"], ["pg_13", "PG-13 — от 13 лет"], ["r", "R-17 — от 17 лет"], ["r_plus", "R+ — от 17, откровенные сцены"], ["rx", "Rx — только для взрослых"]];
  const GENRE_SUGGEST = ["Экшен", "Приключения", "Комедия", "Драма", "Фэнтези", "Фантастика", "Романтика", "Детектив", "Триллер", "Психологическое", "Сверхъестественное", "Повседневность", "Спорт", "Музыка", "Исторический", "Меха", "Сёнен", "Сёдзё", "Сейнен", "Дзёсей", "Исекай", "Ужасы"];
  const STUDIO_SUGGEST = ["Madhouse", "Bones", "MAPPA", "Kyoto Animation", "Wit Studio", "Ufotable", "Production I.G", "Sunrise", "Toei Animation", "White Fox", "Science SARU", "OLM", "A-1 Pictures", "CloverWorks", "Trigger"];
  const TEAMS = ["AniLibria.TV", "AniDUB", "Dream Cast", "Studio Band", "AniMedia", "SHIZA Project", "Crunchyroll", "JAM CLUB"];
  const demoDescription = "Талантливый хирург спасает жизнь мальчику, а спустя годы узнаёт, что вернул в мир чудовище. Он бросает всё, чтобы исправить ошибку. (Демонстрационный текст.)";

  function animeBySlug(slug) {
    const known = D.anime.find(x => x.slug === slug);
    if (known) return known;
    const mod = D.moderation.find(m => m.slug === slug) || D.conflicts.map(c => c.existing_data).find(e => e.slug === slug);
    if (!mod) return null;
    return { id: mod.id || `demo-${slug}`, slug, title: mod.title, status: mod.status || "ongoing", kind: "tv", poster: !!mod.poster_url, description: !!mod.description, genres: [], studios: [], synonyms: [], episodes_aired: 0, needs_moderation: !!mod.moderation_reason, moderation_reason: mod.moderation_reason, shikimori_id: mod.shikimori_id ?? null, kodik_id: mod.kodik_url ? "serial-62004" : null, updated_at: mod.updated_at };
  }
  function episodesFor(item) {
    const real = D.episodes.filter(e => e.anime_slug === item.slug);
    if (real.length) return real.sort((a, b) => b.episode - a.episode);
    const n = Math.min(item.episodes_aired || 0, 6);
    return Array.from({ length: n }, (_, i) => {
      const number = item.episodes_aired - i;
      return { id: `syn-${item.slug}-${number}`, anime: item.title, anime_slug: item.slug, season: 1, episode: number, title: null, aired_at: null, is_filler: false, is_recap: false, releases: 1 + (hash(item.slug + number) % 4) };
    });
  }
  function releasesFor(ep) {
    const real = D.releases.filter(r => r.anime === ep.anime && r.episode === ep.episode);
    if (real.length) return real;
    return Array.from({ length: ep.releases || 0 }, (_, i) => {
      const seed = hash(ep.id + i);
      return { id: `${ep.id}-r${i}`, anime: ep.anime, episode: ep.episode, source: "kodik", translation_type: i === 2 ? "subtitles" : "voice", translation_team: TEAMS[seed % TEAMS.length], translation_language: "ru", quality: i % 2 ? "720p" : "1080p", is_active: true, is_verified: i === 0, url: `https://kodik.info/seria/${100000 + (seed % 899999)}/${(seed % 65535).toString(16)}/720p` };
    });
  }

  function renderTitlePage(slug) {
    const isNew = slug === "new";
    const item = isNew ? { title: "", slug: "", status: "announced", kind: "tv", genres: [], studios: [], synonyms: [], episodes_aired: 0, rating: "" } : animeBySlug(slug);
    if (!item) return `${pageHead("Тайтл не найден", "", "", "#/catalog/titles")}${empty("search-x", "Такого тайтла нет", "Возможно, его удалили или адрес набран с ошибкой.", `<a class="button" href="#/catalog/titles">${icon("arrow-left")}К списку тайтлов</a>`)}`;
    state.paramTitle = isNew ? "Новый тайтл" : item.title;
    const reasons = String(item.moderation_reason || "").split(",").filter(Boolean);
    const facts = isNew ? "" : `<div class="hero-facts">
        <div><b>${item.episodes_aired}${item.episodes_total ? ` / ${item.episodes_total}` : ""}</b><span>серий</span></div>
        <div><b>${item.score ? String(item.score).replace(".", ",") : "—"}</b><span>оценка</span></div>
        <div><b>${item.aired_on ? item.aired_on.slice(0, 4) : "—"}</b><span>год</span></div>
        <div><b>${num(item.views_count)}</b><span>просмотров</span></div>
        <div><b>${num(item.favorites_count)}</b><span>в избранном</span></div>
      </div>`;
    const head = isNew
      ? pageHead("Новый тайтл", "Обычно тайтлы добавляет импорт из Kodik. Вручную — для того, чего в Kodik нет.", `<a class="button" href="#/catalog/import">${icon("download")}Найти в Kodik</a>`, "#/catalog/titles")
      : `<a class="back-link" href="#/catalog/titles">${icon("arrow-left")}Назад к списку</a>
      <section class="entity-hero">
        <div class="entity-poster">${item.poster === false ? `<span class="entity-poster-empty">${icon("image-off")}<small>Нет постера</small></span>` : `<img src="${posterUri(item.title, 150, 216)}" alt="" />`}</div>
        <div class="entity-main">
          <div class="entity-tags">${statusTag(item.status)}${tag(KIND[item.kind] || item.kind || "—", "neutral")}${item.needs_moderation ? tag("Скрыт: модерация", "warning", "eye-off") : tag("Виден на сайте", "success", "eye")}</div>
          <div class="page-title"><span class="beam" aria-hidden="true"></span><h1>${esc(item.title)}</h1></div>
          <p class="entity-sub">${esc([item.title_en, item.title_jp].filter(Boolean).join(" · "))}</p>
          ${facts}
        </div>
        <div class="entity-actions">
          <a class="button" href="../public/anime.html" target="_blank" rel="noopener">${icon("external-link")}Открыть на сайте</a>
          <button type="button" class="button" ${request("anime.refresh", { slug: item.slug, name: item.title })}>${icon("refresh-cw")}Перечитать из Kodik</button>
        </div>
      </section>`;
    const moderation = item.needs_moderation ? note("warning", "triangle-alert", `<strong>Зрители этот тайтл не видят.</strong> Не хватает: ${reasons.map(r => (REASON[r] || r).toLowerCase().replace("нет ", "")).join(", ")}. ${reasons.includes("no_video") ? "Видео добавляет Kodik: тайтл уйдёт из модерации, когда появится ссылка Kodik, или если это анонс." : "Заполните поля ниже и сохраните: тайтл выйдет из модерации сам."}`) : "";
    const form = editForm("anime", isNew ? "anime.create" : "anime.update", item.id, `
      <div class="grid split">
        <div class="stack-col">
          <section class="card"><div class="card-head"><h2>${icon("type")}Названия и описание</h2></div><div class="card-body form-grid">
            ${field("Название на русском", "title", item.title, { req: true, wide: true })}
            ${field("Английское", "title_en", item.title_en)}
            ${field("Японское", "title_jp", item.title_jp)}
            <label class="field wide"><span>Описание</span><textarea class="textarea" name="description" rows="6" placeholder="Пара абзацев о сюжете, без спойлеров">${esc(item.description === false ? "" : item.description ? demoDescription : "")}</textarea><span class="hint">${item.description === false ? "Пока описания нет, тайтл не выйдет из модерации." : "Видно на странице тайтла под постером."}</span></label>
          </div></section>
          <section class="card"><div class="card-head"><h2>${icon("tags")}Жанры и студии</h2></div><div class="card-body" style="display:grid;gap:16px">
            <div class="field"><span>Жанры</span>${chips("genres", item.genres, { suggest: GENRE_SUGGEST, placeholder: "Начните вводить жанр", array: true })}</div>
            <div class="field"><span>Студии</span>${chips("studios", item.studios, { suggest: STUDIO_SUGGEST, placeholder: "Начните вводить студию", array: true })}</div>
          </div></section>
          <section class="card"><div class="card-head"><h2>${icon("image")}Постер</h2></div><div class="card-body media-row">
            <div class="media-preview">${item.poster === false || isNew ? `<span class="entity-poster-empty">${icon("image-off")}<small>Нет постера</small></span>` : `<img src="${posterUri(item.title, 150, 216)}" alt="Текущий постер" />`}</div>
            <div class="form-grid" style="flex:1">
              ${field("Ссылка на постер", "poster_url", item.poster === false || isNew ? "" : `/media/posters/${item.slug}.webp`, { wide: true, placeholder: "https://… или /media/posters/…", hint: "Проще всего — кнопка ниже: постер подтянется из Shikimori." })}
              ${field("Ссылка на обложку", "cover_url", "", { wide: true, placeholder: "Широкая картинка для слайдера, необязательно" })}
              ${!isNew ? `<div class="wide"><button type="button" class="button s" ${request("anime.refreshPoster", { slug: item.slug, name: item.title })}>${icon("image-down")}Постер из Shikimori</button></div>` : ""}
            </div>
          </div></section>
          ${isNew ? "" : `<section class="card"><div class="card-head"><h2>${icon("lock")}Только из синхронизации</h2></div><div class="card-body"><dl class="kv"><dt>Ромадзи</dt><dd>${esc(item.title_romaji || "—")}</dd><dt>Другие названия</dt><dd>${esc((item.synonyms || []).join(", ") || "—")}</dd><dt>Связанных тайтлов</dt><dd class="mono">${item.related ?? 0}</dd><dt>Адрес на сайте</dt><dd class="mono">/anime/${esc(item.slug)}</dd><dt>Обновлён</dt><dd>${at(item.updated_at)}</dd></dl><p class="muted" style="font-size:12px;margin-top:10px">Эти поля руками не меняются: их пишет проход «Связанные тайтлы».</p></div></section>`}
        </div>
        <div class="stack-col">
          <section class="card"><div class="card-head"><h2>${icon("calendar-days")}Выход</h2></div><div class="card-body" style="display:grid;gap:16px">
            <div class="field"><span>Статус</span>${single("status", item.status === "anons" ? "announced" : item.status, [["announced", "Анонс"], ["ongoing", "Выходит"], ["released", "Вышел"]], "Статус")}</div>
            <div class="field"><span>Тип</span>${single("kind", item.kind, [["tv", "Сериал"], ["movie", "Фильм"], ["ova", "OVA"], ["ona", "ONA"], ["special", "Спешл"]], "Тип")}</div>
            <div class="form-grid">
              ${field("Серий вышло", "episodes_aired", item.episodes_aired, { type: "number", min: 0, inputmode: "numeric" })}
              ${field("Серий всего", "episodes_total", item.episodes_total, { type: "number", min: 0, inputmode: "numeric", placeholder: "Неизвестно" })}
              ${field("Дата начала", "aired_on", item.aired_on, { type: "date" })}
              ${field("Следующая серия", "next_episode_at", C.utcToLocalInput(item.next_episode_at), { type: "datetime-local", hint: "По Алматы" })}
            </div>
            ${field("Возрастной рейтинг", "rating", item.rating || "", { options: RATING })}
            ${field("Оценка", "score", item.score, { type: "number", step: "0.01", min: 0, max: 10, inputmode: "decimal", hint: "От 0 до 10. Обычно приходит из Shikimori." })}
          </div></section>
          <section class="card"><div class="card-head"><h2>${icon("link")}Связь с Shikimori и Kodik</h2></div><div class="card-body form-grid">
            <div class="wide">${note("info", "lightbulb", "По этим номерам синхронизация находит тайтл. Неверный номер Shikimori — главная причина конфликтов.")}</div>
            <label class="field"><span>Номер на Shikimori</span><span class="input-link"><input class="input mono" name="shikimori_id" type="number" min="0" inputmode="numeric" value="${esc(item.shikimori_id ?? "")}" />${item.shikimori_id ? `<a class="icon-btn s" href="https://shikimori.one/animes/${item.shikimori_id}" target="_blank" rel="noopener" aria-label="Открыть на Shikimori">${icon("external-link")}</a>` : ""}</span><span class="error" data-error-for="shikimori_id" hidden></span></label>
            ${field("Номер на MyAnimeList", "mal_id", item.mal_id, { type: "number", min: 0, mono: true, inputmode: "numeric" })}
            ${field("Номер в Kodik", "kodik_id", item.kodik_id, { mono: true, placeholder: "serial-1471" })}
            ${field("Номер Shikimori по мнению Kodik", "kodik_shikimori_id", item.kodik_shikimori_id, { type: "number", min: 0, mono: true, inputmode: "numeric", hint: item.kodik_shikimori_id && item.shikimori_id && item.kodik_shikimori_id !== item.shikimori_id ? "Не совпадает с номером Shikimori — проверьте." : "Должен совпадать с номером выше." })}
            ${field("Ссылка на плеер Kodik", "kodik_url", item.kodik_id ? `https://kodik.info/serial/${item.kodik_id.replace(/\D/g, "")}` : "", { wide: true, mono: true, placeholder: "https://kodik.info/serial/…" })}
          </div></section>
          ${isNew ? `<section class="card"><div class="card-head"><h2>${icon("link-2")}Адрес на сайте</h2></div><div class="card-body">${field("Адрес", "slug", "", { req: true, mono: true, placeholder: "naprimer-monstr", hint: "Латиница, цифры и дефисы. Подставится из названия, если оставить пустым." })}</div></section>` : hidden("slug", item.slug)}
        </div>
      </div>`);
    const episodes = isNew ? "" : episodesSection(item);
    const danger = isNew ? "" : `<section class="card danger-zone"><div class="card-body danger-row"><div><strong>Удалить тайтл</strong><p class="muted">Вместе с ним пропадут серии, источники, комментарии, избранное и места в коллекциях. Если тайтл просто не нужен в синхронизации, лучше добавить его в исключения.</p></div><button type="button" class="button danger" ${request("anime.delete", { id: item.id, name: item.title })}>${icon("trash-2")}Удалить навсегда</button></div></section>`;
    return `${head}${moderation}${form}${episodes}${danger}${savebar(isNew ? "Создать тайтл" : "Сохранить")}`;
  }

  function episodesSection(item) {
    const eps = episodesFor(item);
    const editing = state.editing.episode;
    const rows = eps.map(ep => {
      const open = editing === ep.id;
      return `<div class="ep-row ${open ? "is-open" : ""}">
        <div class="ep-line">
          <span class="ep-num mono">${ep.episode}</span>
          <div class="ep-title"><strong>${esc(ep.title || `${ep.episode} серия`)}</strong><small>Сезон ${ep.season}${ep.aired_at ? ` · вышла ${at(ep.aired_at)}` : ""}</small></div>
          <div class="ep-tags">${ep.is_filler ? tag("Филлер", "warning") : ""}${ep.is_recap ? tag("Рекап", "info") : ""}<span class="muted ep-src">${ep.releases} ${C.plural(ep.releases, "источник", "источника", "источников")}</span></div>
          <button type="button" class="button s ${open ? "" : "ghost"}" data-action="toggle-episode" data-id="${ep.id}" aria-expanded="${open}">${icon(open ? "chevron-up" : "pencil")}${open ? "Свернуть" : "Изменить"}</button>
        </div>
        ${open ? episodeEditor(item, ep) : ""}
      </div>`;
    }).join("");
    const adding = editing === "new";
    return `<section class="card" id="episodes"><div class="card-head"><h2>${icon("list-video")}Серии и источники видео</h2><button type="button" class="button s" data-action="toggle-episode" data-id="new">${icon("plus")}Добавить серию</button></div>
      <div class="card-body flush">
        ${note("info", "lightbulb", "Серии и озвучки обычно приходят из Kodik сами. Здесь правят номер, сезон, отметки «филлер» и «рекап» и выключают нерабочие источники.")}
        ${adding ? `<div class="ep-row is-open">${episodeEditor(item, null)}</div>` : ""}
        <div class="ep-list">${rows || `<p class="muted" style="padding:16px var(--card-pad)">Серий пока нет.</p>`}</div>
      </div></section>`;
  }
  function episodeEditor(item, ep) {
    const isNew = !ep;
    ep = ep || { season: 1, episode: (item.episodes_aired || 0) + 1, title: "", is_filler: false, is_recap: false };
    const rels = isNew ? [] : releasesFor(ep);
    return `<div class="inline-editor">
      ${editForm("episode", isNew ? "episodes.create" : "episodes.update", ep.id, `
        ${isNew ? hidden("anime_id", item.id) : ""}
        <div class="form-grid four">
          ${field("Сезон", "season", ep.season, { type: "number", min: 0, inputmode: "numeric" })}
          ${field("Номер серии", "episode", ep.episode, { type: "number", min: 0, req: true, inputmode: "numeric" })}
          ${field("Название серии", "title", ep.title, { placeholder: "Необязательно" })}
          ${field("Дата выхода", "aired_at", C.utcToLocalInput(ep.aired_at), { type: "datetime-local", hint: "По Алматы" })}
        </div>
        <div class="toggles-row">
          <label class="switch">${'<input type="checkbox" name="is_filler" ' + (ep.is_filler ? "checked" : "") + ' />'}<span class="track"></span>Филлер — серия вне основного сюжета</label>
          <label class="switch">${'<input type="checkbox" name="is_recap" ' + (ep.is_recap ? "checked" : "") + ' />'}<span class="track"></span>Рекап — пересказ прошлых серий</label>
        </div>
        <div class="inline-actions">${!isNew ? `<button type="button" class="button s ghost danger-text" ${request("episodes.delete", { id: ep.id, name: `${item.title}, серия ${ep.episode}` })}>${icon("trash-2")}Удалить серию</button>` : ""}<span class="grow"></span><button type="button" class="button s ghost" data-action="toggle-episode" data-id="${isNew ? "new" : ep.id}">Отмена</button><button type="button" class="button s primary" data-action="save-inline">${icon("save")}${isNew ? "Добавить" : "Сохранить серию"}</button></div>`)}
      ${isNew ? "" : `<div class="rel-block"><div class="rel-head"><strong>${icon("film", "icon-s")}Источники видео</strong><button type="button" class="button s ghost" data-action="toggle-release" data-id="new-${ep.id}">${icon("plus")}Добавить источник</button></div>
        ${state.editing.release === `new-${ep.id}` ? releaseEditor(ep, null) : ""}
        ${rels.map(r => `<div class="rel-row"><div class="rel-line">${icon("play")}<div><strong>${esc(r.translation_team)}</strong><small>${r.translation_type === "voice" ? "Озвучка" : "Субтитры"} · ${esc(LANG[r.translation_language] || r.translation_language)} · ${esc(r.quality || "качество не указано")} · ${esc(SOURCE[r.source] || r.source)}</small></div>${r.is_active ? (r.is_verified ? tag("Проверен", "success") : tag("Работает", "info")) : tag("Выключен", "neutral")}<button type="button" class="icon-btn s" data-action="toggle-release" data-id="${r.id}" aria-label="Изменить источник ${esc(r.translation_team)}">${icon("pencil")}</button></div>${state.editing.release === r.id ? releaseEditor(ep, r) : ""}</div>`).join("")}
      </div>`}
    </div>`;
  }
  const LANG = { ru: "Русский", en: "Английский", ja: "Японский", uk: "Украинский", kk: "Казахский" };
  const SOURCE = { kodik: "Kodik", aniboom: "Aniboom", sibnet: "Sibnet", other: "Другой" };
  function releaseEditor(ep, rel) {
    const isNew = !rel;
    rel = rel || { source: "kodik", translation_type: "voice", translation_language: "ru", quality: "1080p", is_active: true, is_verified: false, url: "", translation_team: "" };
    return `<div class="inline-editor nested">${editForm("release", isNew ? "releases.create" : "releases.update", rel.id, `
      ${isNew ? hidden("episode_id", ep.id) : ""}
      <div class="form-grid">
        <div class="field"><span>Тип</span>${single("translation_type", rel.translation_type, [["voice", "Озвучка", "mic"], ["subtitles", "Субтитры", "captions"]], "Тип перевода")}</div>
        <div class="field"><span>Качество</span>${single("quality", rel.quality || "", [["1080p", "1080p"], ["720p", "720p"], ["480p", "480p"], ["", "Неизвестно"]], "Качество")}</div>
        ${field("Команда перевода", "translation_team", rel.translation_team, { list: "dl-teams", placeholder: "Например, AniLibria.TV" })}
        ${field("Язык", "translation_language", rel.translation_language, { options: Object.entries(LANG) })}
        ${field("Откуда видео", "source", rel.source, { options: Object.entries(SOURCE) })}
        ${field("Ссылка на видео", "url", rel.url, { req: true, wide: true, mono: true, placeholder: "https://kodik.info/seria/…" })}
      </div>
      <datalist id="dl-teams">${TEAMS.map(t => `<option value="${esc(t)}"></option>`).join("")}</datalist>
      <details class="tech"><summary>${icon("chevron-right", "icon-s")}Дополнительно</summary><div class="form-grid">${field("Ссылка для встраивания", "embed_url", rel.embed_url, { wide: true, mono: true, placeholder: "Если отличается от ссылки на видео" })}${field("Номер у источника", "external_id", rel.external_id, { mono: true })}</div></details>
      <div class="toggles-row"><label class="switch"><input type="checkbox" name="is_active" ${rel.is_active ? "checked" : ""} /><span class="track"></span>Показывать в плеере</label><label class="switch"><input type="checkbox" name="is_verified" ${rel.is_verified ? "checked" : ""} /><span class="track"></span>Проверен вручную</label></div>
      <div class="inline-actions">${!isNew ? `<button type="button" class="button s ghost danger-text" ${request("releases.delete", { id: rel.id, name: `${rel.translation_team}, серия ${ep.episode}` })}>${icon("trash-2")}Удалить</button>` : ""}<span class="grow"></span><button type="button" class="button s ghost" data-action="toggle-release" data-id="${isNew ? `new-${ep.id}` : rel.id}">Отмена</button><button type="button" class="button s primary" data-action="save-inline">${icon("save")}${isNew ? "Добавить" : "Сохранить"}</button></div>`)}</div>`;
  }

  /* ==========================================================================
     Страница задачи
     ========================================================================== */
  function renderJobPage(id) {
    const job = D.jobs.find(j => j.id === id);
    if (!job) return `${pageHead("Задача не найдена", "", "", "#/parser/jobs")}${empty("search-x", "Такой задачи нет", "Возможно, её удалили из истории.")}`;
    state.paramTitle = jobTitle(job);
    const logs = D.jobLogs.filter(l => job.id.startsWith(l.job)).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    const isLive = job.status === "running" || job.status === "pending";
    const op = D.operations.find(o => o.parser === job.parser_name && [o.job_type, o.dry].includes(job.job_type));
    const actions = isLive ? `<button type="button" class="button danger" ${request("jobs.stop", { id: job.id, name: jobTitle(job) })}>${icon("square")}Остановить</button>` : `<button type="button" class="button" ${request("jobs.delete", { id: job.id, name: jobTitle(job) })}>${icon("trash-2")}Убрать из истории</button>`;
    return `${pageHead(jobTitle(job), `${esc(job.source)} · создана ${at(job.created_at)}${op ? ` · ${esc(op.summary)}` : ""}`, actions, "#/parser/jobs")}
      <div class="grid split">
        <section class="card ${job.status === "running" ? "glow" : ""}"><div class="card-head"><h2>${icon("activity")}Ход выполнения</h2>${statusTag(job.status)}</div><div class="card-body" style="display:grid;gap:14px">
          ${job.status === "running" ? `<div style="display:flex;align-items:center;gap:12px">${liveBar(job)}<span class="mono" data-live-pct>${state.live.progress}%</span></div>` : ""}
          ${job.waited ? note("info", "hourglass", esc(job.waited)) : ""}
          ${job.error_message ? note(job.status === "failed" ? "danger" : "neutral", job.status === "failed" ? "octagon-alert" : "square", esc(job.error_message)) : ""}
          ${job.job_type === "incremental" && job.parser_name === "shikimori" ? note("danger", "ban", "Этот тип не перенесён в Go-воркер и всегда падает. Запускать его не нужно.") : ""}
          <div class="live-stats"><div><b>${num(job.items_processed)}</b><span>${job.total ? `из ${num(job.total)}` : "просмотрено"}</span></div><div><b>${num(job.items_updated)}</b><span>обновлено</span></div><div><b>${num(job.items_created)}</b><span>создано</span></div><div><b>${num(job.items_failed)}</b><span>ошибок</span></div></div>
        </div></section>
        <section class="card"><div class="card-head"><h2>${icon("clock")}Время</h2></div><div class="card-body"><dl class="kv"><dt>Создана</dt><dd>${at(job.created_at)}</dd><dt>Начало</dt><dd>${at(job.started_at)}</dd><dt>Конец</dt><dd>${at(job.completed_at)}</dd><dt>Длительность</dt><dd>${C.fmtDuration(job.duration_seconds)}</dd>${op ? `<dt>Предел</dt><dd>${esc(op.timeout)}</dd>` : ""}<dt>Кто запустил</dt><dd>${esc(job.source)}</dd></dl>
          <details class="tech"><summary>${icon("chevron-right", "icon-s")}Технические подробности</summary><dl class="kv"><dt>Парсер и тип</dt><dd class="mono">${esc(job.parser_name)} / ${esc(job.job_type)}</dd><dt>Номер задачи</dt><dd class="mono">${esc(job.id)}</dd><dt>Источник запуска</dt><dd>В базе пока не хранится (план 3.5)</dd></dl></details>
        </div></section>
      </div>
      <section class="card"><div class="card-head"><h2>${icon("scroll-text")}Журнал задачи</h2>${isLive ? tag("обновляется вживую", "live") : ""}</div><div class="card-body flush"><div class="log">${logs.length ? logs.map(l => `<div class="log-row" data-tone="${toneForStatus(l.level)}"><span class="mono muted">${C.fmtTime(l.created_at)}</span><span class="lvl">${esc(labelForStatus(l.level))}</span><span class="msg">${esc(l.message)}</span><span></span></div>`).join("") : `<p class="muted" style="padding:14px var(--card-pad)">Сообщений нет.</p>`}</div></div></section>`;
  }

  /* ==========================================================================
     Страница пользователя
     ========================================================================== */
  const ROLE_TEXT = { super_admin: "Права «всё», но без флага суперпользователя открывает только серии и комментарии", admin: "Серии и источники видео", moderator: "Серии, источники и лента комментариев", user: "Обычный зритель, в админку не пускает" };
  function renderUserPage(id) {
    const u = D.users.find(x => x.id === id);
    if (!u) return `${pageHead("Пользователь не найден", "", "", "#/people/users")}${empty("search-x", "Такого пользователя нет", "")}`;
    state.paramTitle = u.username;
    const role = roleByName(u.role);
    const access = C.effectiveAccess(u, role);
    return `<a class="back-link" href="#/people/users">${icon("arrow-left")}Назад к списку</a>
      <section class="entity-hero person">
        <span class="entity-avatar" aria-hidden="true">${esc(u.username[0].toUpperCase())}</span>
        <div class="entity-main">
          <div class="entity-tags">${u.is_active ? tag("Активен", "success") : tag("Забанен", "danger")}${u.is_verified ? tag("Почта подтверждена", "success", "mail-check") : tag("Почта не подтверждена", "warning", "mail-warning")}${accessTag(u)}</div>
          <div class="page-title"><span class="beam" aria-hidden="true"></span><h1>${esc(u.username)}</h1></div>
          <p class="entity-sub">${esc(u.email)} · с нами с ${C.fmtDate(u.created_at)} · был ${at(u.last_seen_at)}</p>
        </div>
      </section>
      ${editForm("user", "users.update", u.id, `
      <div class="grid split">
        <div class="stack-col">
          <section class="card"><div class="card-head"><h2>${icon("user")}Профиль</h2></div><div class="card-body form-grid">
            ${field("Имя", "username", u.username, { req: true })}
            ${field("Email", "email", u.email, { type: "email", req: true })}
            <div class="field wide"><span>Пол</span>${single("gender", "", [["", "Не указан"], ["male", "Мужской"], ["female", "Женский"]], "Пол")}</div>
            ${field("О себе", "bio", "", { textarea: true, wide: true, placeholder: "Пользователь пока ничего не написал" })}
            <div class="wide">${srow("Почта подтверждена", "Можно отметить вручную, если письмо не дошло", toggle("is_verified", u.is_verified, "Почта подтверждена"))}</div>
          </div></section>
          <section class="card"><div class="card-head"><h2>${icon("key-round")}Новый пароль</h2></div><div class="card-body form-grid">
            ${field("Новый пароль", "password", "", { type: "password", placeholder: "Оставьте пустым, чтобы не менять" })}
            <p class="hint wide">Уже открытые сессии пользователя смена пароля не закрывает.</p>
          </div></section>
        </div>
        <div class="stack-col">
          <section class="card"><div class="card-head"><h2>${icon("shield")}Что можно в админке</h2></div><div class="card-body" style="display:grid;gap:14px">
            <div class="role-choice" role="radiogroup" aria-label="Роль" data-single="role_id">
              ${[["", "Без роли", "Обычный зритель"], ...D.roles.map(r => [r.id, r.name, ROLE_TEXT[r.name] || r.description])].map(([v, name, text]) => `<button type="button" role="radio" class="role-option" data-value="${v}" aria-checked="${(role?.id || "") === v}" aria-pressed="${(role?.id || "") === v}"><strong>${esc(name)}</strong><small>${esc(text)}</small></button>`).join("")}
              ${hidden("role_id", role?.id || "")}
            </div>
            ${srow("Суперпользователь", "Открывает всё: парсер, бэкапы, пользователей и настройки", `<label class="switch"><input type="checkbox" name="is_superuser" ${u.is_superuser ? "checked" : ""} aria-label="Суперпользователь" data-role-select /><span class="track"></span></label>`)}
            <div class="access-preview" data-access-preview>${accessPreview(access)}</div>
          </div></section>
          <section class="card danger-zone"><div class="card-body danger-row"><div><strong>${u.is_active ? "Забанить" : "Разбанить"}</strong><p class="muted">${u.is_active ? (u.is_superuser ? "Суперпользователя забанить нельзя: сначала снимите флаг." : "Пользователь не сможет войти. Его комментарии останутся.") : "Пользователь снова сможет войти."}</p></div>${u.is_active ? `<button type="button" class="button danger" ${request("users.ban", { id: u.id, name: u.username })} ${u.is_superuser ? "disabled" : ""}>${icon("ban")}Забанить</button>` : `<button type="button" class="button" ${request("users.unban", { id: u.id, name: u.username })}>${icon("undo-2")}Разбанить</button>`}</div></section>
        </div>
      </div>`)}
      ${savebar()}`;
  }
  const accessPreview = access => `<strong class="ap-title">${icon("eye")}Итог: что увидит в админке</strong>${access.items.length ? `<ul>${access.items.map(i => `<li>${icon("check", "icon-s")}${esc(i)}</li>`).join("")}</ul>` : `<p class="muted">Ничего: вход в админку закрыт.</p>`}`;

  /* Аватар или рамка — небольшая форма по центру экрана. */
  function cosmeticDialog(kind, item) {
    const isNew = !item;
    item = item || { title: "", is_active: true, category: "default" };
    const isAvatar = kind === "avatar";
    const base = isAvatar ? "avatars" : "decorations";
    const dlg = $("#confirm");
    dlg.innerHTML = `<div class="dialog-body"><h2 id="confirm-title">${icon(isAvatar ? "image" : "frame")}${esc(isNew ? (isAvatar ? "Новый аватар" : "Новая рамка") : item.title)}</h2>
      ${editForm(kind, `${base}.${isNew ? "create" : "update"}`, item.id, `<div class="form-grid">
        <div class="wide cos-row"><div class="tile-art" style="width:88px">${artTile(isAvatar ? item.title || "new" : `d${item.title || "new"}`)}</div><div style="display:grid;gap:6px"><button type="button" class="button s" ${request(`${base}.upload`, { id: item.id || "", name: item.title || "новый" })} ${isNew ? "disabled" : ""}>${icon("upload")}Загрузить картинку</button><span class="hint">${isNew ? "Картинку можно загрузить сразу после создания." : "Или вставьте ссылку ниже."}</span></div></div>
        ${field("Название", "title", item.title, { req: true, wide: true })}
        ${field("Ссылка на картинку", "image_url", isNew ? "" : `/media/${base}/${item.id}.webp`, { req: true, wide: true, mono: true, placeholder: "https://… или /media/…" })}
        ${isAvatar ? `<div class="field wide"><span>Набор</span>${single("category", item.category, [["default", "Общий"], ["kitsune", "Лисы"], ["nature", "Природа"], ["city", "Город"]], "Набор")}</div>` : ""}
        <div class="wide">${srow("Доступно для выбора", "Выключенные не видны в выборе, но у тех, кто уже выбрал, остаются", toggle("is_active", item.is_active, "Доступно для выбора"))}</div>
      </div>`)}</div>
      <div class="dialog-foot">${!isNew ? `<button type="button" class="button ghost danger-text" ${request(`${base}.delete`, { id: item.id, name: item.title })}>${icon("trash-2")}Удалить</button><span class="grow"></span>` : ""}<button type="button" class="button" data-dialog="cancel">Отмена</button><button type="button" class="button primary" data-action="save-dialog">${icon("save")}Сохранить</button></div>`;
    refreshIcons(dlg);
    const form = $("form[data-edit]", dlg);
    form.dataset.initial = JSON.stringify(C.readForm(form));
    dlg.onclick = event => { if (event.target === dlg || event.target.closest("[data-dialog='cancel']")) dlg.close(); };
    dlg.showModal();
  }

  /* ==========================================================================
     Настройки: каждая категория — отдельная вкладка с понятными элементами
     ========================================================================== */
  const P = () => D.parserConfig;
  const notWired = `<span class="wire-note">${icon("unplug", "icon-s")}Значения сохраняются в базе. Текущий воркер их пока не читает — это задача бэкенда, подробности в примечании к шаблону.</span>`;
  function settingsPage(title, lede, category, inner, { wired = false } = {}) {
    return `${pageHead(title, lede)}${wired ? "" : notWired}${editForm(`settings-${category}`, category === "site" ? "site.update" : "parserSettings.update", category, inner, `data-category="${category}"`)}${savebar()}`;
  }
  const scard = (title, ic, rows) => `<section class="card"><div class="card-head"><h2>${icon(ic)}${esc(title)}</h2></div><div class="card-body flush srows">${rows}</div></section>`;

  function renderSettingsOverview() {
    const S = D.settings;
    const cats = sections.find(s => s.id === "settings").pages.slice(1);
    return `${pageHead("Настройки", "Всё, что меняет поведение сайта и парсера, собрано здесь и разложено по темам. Ниже — что где настраивается и что задаётся только на сервере.")}
      <div class="truth">${cats.map(p => `<a class="card truth-card" href="#/${p.id}">${icon(p.icon)}<strong>${esc(p.title)}</strong><p>${esc(p.desc)}</p></a>`).join("")}</div>
      <h2 class="group-title">Настраивается в других разделах</h2>
      <div class="truth">${S.real.map(r => `<a class="card truth-card" href="#/${r.route}">${icon(r.icon)}<strong>${esc(r.title)}</strong><small>${esc(r.where)}</small><p>${esc(r.how)}</p></a>`).join("")}</div>
      <section class="card"><div class="card-head"><h2>${icon("server")}Задано на сервере</h2><span class="card-meta">Меняется только при обновлении стенда</span></div><div class="card-body flush env-list">
        ${S.env.map(e => `<div class="env"><strong>${esc(e.name)}</strong><span class="secondary">${esc(e.value)}</span><small>${esc(e.note)}</small></div>`).join("")}
      </div></section>`;
  }

  function renderSettingsSite() {
    const v = Object.fromEntries(D.settings.site.map(s => [s.key, s.value]));
    return settingsPage("Сайт", "Название и доступ к сайту.", "site", `
      ${scard("Основное", "app-window", `
        ${srow("Название сайта", "Показывается во вкладке браузера и в письмах", `<input class="input" name="site_name" value="${esc(v.site_name)}" aria-label="Название сайта" />`)}
        ${srow("Регистрация открыта", "Если выключить, новые зрители не смогут создать аккаунт; вход для остальных останется", toggle("allow_registration", v.allow_registration, "Регистрация открыта"))}
        ${srow("Режим обслуживания", "Сайт покажет зрителям заглушку «скоро вернёмся». Админка продолжит работать", toggle("maintenance_mode", v.maintenance_mode, "Режим обслуживания"))}
      `)}
      ${scard("Цвета писем и заглушек", "palette", `
        ${srow("Основной цвет", "Кнопки и ссылки там, где не работает тема сайта: письма, страница обслуживания", `<span class="color-input"><input type="color" name="accent_primary" value="${esc(v.accent_primary)}" aria-label="Основной цвет" /><span class="mono secondary" data-color-out>${esc(v.accent_primary)}</span></span>`)}
        ${srow("Цвет ошибки", "Сообщения об ошибках в тех же местах", `<span class="color-input"><input type="color" name="accent_danger" value="${esc(v.accent_danger)}" aria-label="Цвет ошибки" /><span class="mono secondary" data-color-out>${esc(v.accent_danger)}</span></span>`)}
      `)}`);
  }

  const GRAB_PRESETS = {
    base: { label: "Обычный", desc: "Сериалы, фильмы, OVA и ONA с оценкой от 6", values: { source_mode: "shikimori", min_score: 6, if_camrip: false, if_lgbt: true, year_start: 1995, year_end: 2026, kinds_allowed: "tv, movie, ova, ona", blocked_genres: "хентай, яой, юри", audio_type: "any", cron_auto_add: "*/30 * * * *", cron_release_updates: "0 * * * *" } },
    safe: { label: "Строгий", desc: "Только сериалы и фильмы с оценкой от 7,2 и с озвучкой", values: { source_mode: "shikimori", min_score: 7.2, if_camrip: false, if_lgbt: false, year_start: 2005, year_end: 2026, kinds_allowed: "tv, movie", blocked_genres: "хентай, яой, юри, этти", audio_type: "voice", cron_auto_add: "0 */2 * * *", cron_release_updates: "0 * * * *" } },
    wide: { label: "Всё подряд", desc: "Все типы, оценка от 4,5, вместе с экранками", values: { source_mode: "kodik", min_score: 4.5, if_camrip: true, if_lgbt: true, year_start: 1980, year_end: 2026, kinds_allowed: "tv, movie, ova, ona, special, music", blocked_genres: "", audio_type: "any", cron_auto_add: "*/10 * * * *", cron_release_updates: "*/20 * * * *" } },
  };
  const COUNTRY_SUGGEST = ["Япония", "Китай", "Южная Корея", "США", "Франция", "Россия", "Тайвань"];
  function renderSettingsImport() {
    const g = P().grabbing;
    return settingsPage("Импорт и фильтры", "Какие тайтлы парсер берёт сам и как часто ищет новое. Начните с готового набора, потом поправьте детали.", "grabbing", `
      <section class="card"><div class="card-head"><h2>${icon("wand-sparkles")}Готовые наборы</h2><span class="card-meta">Заполняют форму, сохранять всё равно нужно кнопкой внизу</span></div><div class="card-body preset-grid">
        ${Object.entries(GRAB_PRESETS).map(([id, p]) => `<button type="button" class="preset" data-action="apply-preset" data-preset-id="${id}"><strong>${esc(p.label)}</strong><small>${esc(p.desc)}</small></button>`).join("")}
      </div></section>
      ${scard("Откуда и как часто", "radar", `
        ${srow("Откуда брать тайтлы", "Shikimori знает весь каталог, Kodik — только то, у чего уже есть видео", single("source_mode", g.source_mode, [["shikimori", "Весь каталог Shikimori"], ["kodik", "Только с видео в Kodik"]], "Откуда брать тайтлы"))}
        ${srow("Что брать из Kodik", "Учитывается, когда источник — Kodik", multi("kodik_types", g.kodik_types, [["anime-serial", "Сериалы"], ["anime", "Фильмы и спешлы"]], { label: "Что брать из Kodik" }), { id: "row-kodik-types" })}
        ${srow("Искать новые тайтлы", "", freqPicker("cron_auto_add", g.cron_auto_add), { stack: true })}
        ${srow("Проверять новые серии", "", freqPicker("cron_release_updates", g.cron_release_updates), { stack: true })}
      `)}
      ${scard("Что подходит", "filter", `
        ${srow("Типы", "", multi("kinds_allowed", g.kinds_allowed, [["tv", "Сериалы"], ["movie", "Фильмы"], ["ova", "OVA"], ["ona", "ONA"], ["special", "Спешлы"], ["music", "Клипы"]], { array: true, label: "Типы" }), { stack: true })}
        ${srow("Оценка не ниже", "Тайтлы с оценкой ниже пропускаются. Без оценки (анонсы) проходят всегда", range("min_score", g.min_score, { min: 0, max: 10, step: 0.1, format: "score" }), { stack: true })}
        ${srow("Годы выхода", "Тайтлы вне диапазона пропускаются", `<span class="year-range"><span>с</span><input class="input mono" type="number" name="year_start" min="1960" max="2030" value="${g.year_start}" aria-label="С года" inputmode="numeric" /><span>по</span><input class="input mono" type="number" name="year_end" min="1960" max="2030" value="${g.year_end}" aria-label="По год" inputmode="numeric" /></span>`)}
        ${srow("Только эти годы", "Если заполнить, остальные годы не подойдут", chips("allowed_years", g.allowed_years, { placeholder: "Например, 2024" }), { stack: true })}
        ${srow("Кроме этих лет", "", chips("blocked_years", g.blocked_years, { placeholder: "Например, 2007" }), { stack: true })}
        ${srow("Возрастной рейтинг", "Пусто — подходит любой", multi("mpaa_rating", g.mpaa_rating, [["G", "G"], ["PG", "PG"], ["PG-13", "PG-13"], ["R", "R"], ["NC-17", "NC-17"]], { label: "Возрастной рейтинг" }), { stack: true })}
        ${srow("Экранки (CAMRip)", "Записи с экрана кинотеатра — обычно плохое качество", toggle("if_camrip", g.if_camrip, "Брать экранки"))}
        ${srow("Тайтлы с пометкой LGBT", "Включено — такие тайтлы берутся", toggle("if_lgbt", g.if_lgbt, "Тайтлы с пометкой LGBT"))}
      `)}
      ${scard("Жанры и страны", "globe-lock", `
        ${srow("Только эти жанры", "Пусто — подходит любой жанр", chips("allowed_genres", g.allowed_genres, { suggest: GENRE_SUGGEST, placeholder: "Начните вводить жанр" }), { stack: true })}
        ${srow("Никогда не брать жанры", "", chips("blocked_genres", g.blocked_genres, { suggest: [...GENRE_SUGGEST, "Хентай", "Яой", "Юри", "Этти"], placeholder: "Начните вводить жанр" }), { stack: true })}
        ${srow("Только эти страны", "Пусто — любая страна", chips("allowed_countries", g.allowed_countries, { suggest: COUNTRY_SUGGEST, placeholder: "Начните вводить страну" }), { stack: true })}
        ${srow("Никогда не брать страны", "", chips("blocked_countries", g.blocked_countries, { suggest: COUNTRY_SUGGEST, placeholder: "Начните вводить страну" }), { stack: true })}
        ${srow("Исключения из запрета стран", "Эти страны проходят, даже если попали под запрет выше", chips("unblocked_countries", g.unblocked_countries, { suggest: COUNTRY_SUGGEST, placeholder: "Начните вводить страну" }), { stack: true })}
      `)}
      ${scard("Перевод и порядок", "languages", `
        ${srow("Перевод", "Брать тайтлы, у которых есть…", single("audio_type", g.audio_type, [["any", "Что угодно"], ["voice", "Только озвучка"], ["subs", "Только субтитры"]], "Перевод"), { stack: true })}
        ${srow("Порядок обхода", "В каком порядке парсер просматривает каталог", `<select class="select" name="sort_order" aria-label="Порядок обхода">${[["year_desc", "Сначала новые по году"], ["year_asc", "Сначала старые по году"], ["created_desc", "Сначала недавно добавленные"], ["created_asc", "Сначала давно добавленные"], ["rating_shiki_desc", "Сначала высокая оценка Shikimori"], ["rating_shiki_asc", "Сначала низкая оценка Shikimori"], ["rating_kp_desc", "Сначала высокая оценка Кинопоиска"], ["rating_kp_asc", "Сначала низкая оценка Кинопоиска"]].map(([v, l]) => `<option value="${v}" ${g.sort_order === v ? "selected" : ""}>${l}</option>`).join("")}</select>`)}
        ${srow("Студия перевода", "Если нужна конкретная команда. Пусто — любая", `<input class="input" name="voice_kind" value="${esc(g.voice_kind)}" list="dl-teams-s" placeholder="Например, AniLibria.TV" aria-label="Студия перевода" /><datalist id="dl-teams-s">${TEAMS.map(t => `<option value="${esc(t)}"></option>`).join("")}</datalist>`)}
      `)}`);
  }
  function renderSettingsUpdates() {
    const u = P().updates;
    return settingsPage("Обновления", "Что парсер проверяет у тайтлов, которые уже есть в каталоге.", "updates", `
      ${scard("Автообновление", "refresh-cw", `
        ${srow("Обновлять тайтлы сами", "Выключите, если хотите обновлять только вручную", toggle("auto_update", u.auto_update, "Обновлять тайтлы сами"))}
        ${srow("Как часто", "", single("update_frequency", u.update_frequency, [["hourly", "Каждый час"], ["daily", "Раз в день"], ["weekly", "Раз в неделю"]], "Как часто"), { stack: true })}
      `)}
      ${scard("Что отслеживать", "scan-eye", `
        ${srow("Новые серии", "Сразу добавлять вышедшие серии и озвучки", toggle("detect_episode_change", u.detect_episode_change, "Новые серии"))}
        ${srow("Изменения описания и постера", "Перезаписывать описание, постер и жанры, если они поменялись в источнике. Ручные правки при этом пропадут", toggle("detect_metadata_change", u.detect_metadata_change, "Изменения описания и постера"))}
        ${srow("Оценка из Shikimori", "Всегда брать оценку из Shikimori, даже если она уже есть", toggle("force_shikimori_score", u.force_shikimori_score, "Оценка из Shikimori"))}
        ${srow("Сообщать об ошибках", "Присылать уведомление, если обновление не удалось. Куда — во вкладке «Уведомления»", toggle("notify_on_fail", u.notify_on_fail, "Сообщать об ошибках"))}
      `)}`);
  }
  function renderSettingsImages() {
    const i = P().images;
    return settingsPage("Изображения", "Как хранить постеры и обложки.", "images", `
      ${scard("Хранение", "hard-drive", `
        ${srow("Хранить картинки у себя", "Постеры скачиваются на сервер. Сайт не зависит от чужих серверов, но занимает место на диске", toggle("localize_images", i.localize_images, "Хранить картинки у себя"))}
        ${srow("Перекодировать в WebP", "Картинки становятся легче и грузятся быстрее", toggle("optimize_webp", i.optimize_webp, "Перекодировать в WebP"))}
      `)}
      ${scard("Качество и размер", "image", `
        ${srow("Качество", "Чем ниже, тем легче файл и заметнее размытие", range("quality_percent", i.quality_percent, { min: 50, max: 100, step: 1, format: "percent" }), { stack: true })}
        ${srow("Наибольшая ширина", "Картинки шире будут уменьшены. Постер на сайте не шире 600 точек", single("max_width", String(i.max_width), [["800", "800"], ["1000", "1000"], ["1200", "1200"], ["1600", "1600"], ["2400", "2400"]], "Наибольшая ширина"), { stack: true })}
      `)}
      ${scard("Водяной знак", "stamp", `
        ${note("warning", "triangle-alert", "Водяной знак в Go-версии не сделан: даже включённый, он не появится. Решение — за владельцем (пункт 4.3 плана).")}
        ${srow("Ставить водяной знак", "Надпись в углу постера", toggle("enable_watermark", i.enable_watermark, "Ставить водяной знак"))}
        ${srow("Текст", "", `<input class="input" name="watermark_text" value="${esc(i.watermark_text)}" maxlength="24" aria-label="Текст водяного знака" />`)}
      `)}`);
  }
  const TPL_VARS = [["{title}", "Название"], ["{title_en}", "Английское"], ["{year}", "Год"], ["{score}", "Оценка"], ["{genres}", "Жанры"], ["{studios}", "Студии"], ["{episodes_total}", "Всего серий"], ["{status}", "Статус"], ["{shikimori_id}", "Номер Shikimori"]];
  const TPL_SAMPLE = { "{title}": "Монстр", "{title_en}": "Monster", "{year}": "2004", "{score}": "8,87", "{genres}": "Детектив, Драма", "{studios}": "Madhouse", "{episodes_total}": "74", "{status}": "вышел", "{shikimori_id}": "19", "{description}": "Талантливый хирург спасает жизнь мальчику…" };
  const tplPreview = value => esc(String(value || "")).replace(/\{[a-z_]+\}/g, m => `<mark>${esc(TPL_SAMPLE[m] ?? m)}</mark>`);
  const tplField = (name, label, value, desc) => `<div class="tpl" data-tpl="${name}">
      <label class="field"><span>${esc(label)}</span><input class="input" name="${name}" value="${esc(value)}" data-tpl-input /></label>
      ${desc ? `<p class="hint">${desc}</p>` : ""}
      <div class="tpl-vars" role="group" aria-label="Вставить">${TPL_VARS.map(([v, l]) => `<button type="button" class="tpl-var" data-insert="${v}" aria-label="Вставить: ${esc(l)}">${esc(l)}</button>`).join("")}</div>
      <p class="tpl-preview"><span class="muted">Как будет выглядеть:</span> <span data-tpl-preview>${tplPreview(value)}</span></p>
    </div>`;
  function renderSettingsFields() {
    const f = P().fields;
    return settingsPage("Тексты и теги", "Как собирать заголовок, описание и ключевые слова страницы тайтла. Нажимайте на подсказки, чтобы вставить нужное поле.", "fields", `
      <section class="card"><div class="card-head"><h2>${icon("text-cursor-input")}Шаблоны</h2></div><div class="card-body" style="display:grid;gap:24px">
        ${tplField("tpl_title", "Заголовок страницы", f.tpl_title, "Его видят во вкладке браузера и в поиске Google и Яндекса")}
        ${tplField("tpl_description", "Описание", f.tpl_description, "Обычно оставляют только описание тайтла")}
        ${tplField("tpl_meta_keywords", "Ключевые слова", f.tpl_meta_keywords, "Слова для поисковиков через запятую")}
      </div></section>
      ${scard("Теги", "hash", srow("Начало тегов", "Добавляется перед каждым тегом. Пример: «kitsu_» превращает «драма» в «kitsu_драма»", `<span class="prefix-input"><input class="input mono" name="custom_tag_prefix" value="${esc(f.custom_tag_prefix)}" aria-label="Начало тегов" data-prefix-input /><span class="muted" data-prefix-out>${esc(f.custom_tag_prefix)}драма</span></span>`))}`);
  }
  function renderSettingsTaxonomy() {
    const c = P().categories;
    return settingsPage("Жанры и студии", "Как парсер обращается со справочниками.", "categories", `
      ${scard("Справочники", "tags", `
        ${srow("Подбирать жанры", "Сопоставлять жанры из источника с жанрами сайта, даже если они названы иначе", toggle("auto_assign_genres", c.auto_assign_genres, "Подбирать жанры"))}
        ${srow("Добавлять новые студии", "Если студии ещё нет в справочнике, создать её", toggle("create_missing_studios", c.create_missing_studios, "Добавлять новые студии"))}
        ${srow("Обновлять франшизы", "Связывать сезоны и фильмы одной франшизы", toggle("sync_franchise_taxonomy", c.sync_franchise_taxonomy, "Обновлять франшизы"))}
      `)}`);
  }
  function renderSettingsStopwords() {
    const b = P().blacklist;
    return settingsPage("Стоп-слова", "Слова и жанры, при которых тайтл не берётся. Конкретные тайтлы исключаются в разделе «Парсер», страница «Исключения».", "blacklist", `
      ${scard("Запреты", "shield-ban", `
        ${srow("Запрещённые жанры", "", chips("banned_genres", b.banned_genres, { suggest: [...GENRE_SUGGEST, "Хентай", "Яой", "Юри", "Этти"], placeholder: "Начните вводить жанр" }), { stack: true })}
        ${srow("Запрещённые слова", "Если слово есть в названии или описании, тайтл пропускается. Например: camrip, ts", chips("banned_keywords", b.banned_keywords, { placeholder: "Слово и Enter" }), { stack: true })}
      `)}
      <a class="card truth-card inline-link" href="#/parser/blacklist">${icon("ban")}<strong>Исключить конкретный тайтл</strong><p>Раздел «Парсер», страница «Исключения»: этот список работает уже сейчас.</p></a>`);
  }
  function renderSettingsPlayer() {
    const p = P().player;
    return settingsPage("Плеер", "Что зритель видит по умолчанию, пока сам ничего не выбрал. Свой выбор зрителя сохраняется у него и важнее этих значений.", "player", `
      ${scard("Источник видео", "monitor-play", `
        ${srow("Основной", "Откуда плеер берёт видео в первую очередь", single("primary_source", p.primary_source, [["kodik", "Kodik"], ["aniboom", "Aniboom"], ["sibnet", "Sibnet"]], "Основной источник"), { stack: true })}
        ${srow("Запасной", "Если основной не открылся", single("fallback_source", p.fallback_source, [["aniboom", "Aniboom"], ["sibnet", "Sibnet"], ["none", "Без запасного"]], "Запасной источник"), { stack: true })}
        ${srow("Качество", "", single("default_quality", p.default_quality, [["1080p", "1080p"], ["720p", "720p"], ["480p", "480p"]], "Качество"), { stack: true })}
      `)}
      ${scard("Поведение", "play", `
        ${srow("Следующая серия сама", "После титров включать следующую серию", toggle("auto_next", p.auto_next, "Следующая серия сама"))}
        ${srow("Пропускать опенинг", "Если известно, где он начинается и заканчивается", toggle("skip_opening", p.skip_opening, "Пропускать опенинг"))}
      `)}`);
  }
  function renderSettingsNotify() {
    const n = P().notifications;
    return settingsPage("Уведомления", "Куда сообщать о сбоях парсера.", "notifications", `
      ${scard("Почта", "mail", `
        ${srow("Письма о сбоях", "", toggle("email_notifications", n.email_notifications, "Письма о сбоях"))}
        ${srow("Адрес", "Можно несколько через запятую", `<input class="input" type="email" name="admin_email" value="${esc(n.admin_email)}" placeholder="ops@example.com" aria-label="Адрес почты" />`, { id: "row-email" })}
      `)}
      ${scard("Чат или сервис", "webhook", `
        ${srow("Отправлять в чат", "Например, в Slack, Discord или Telegram-бота по веб-хуку", toggle("webhook_enabled", n.webhook_enabled, "Отправлять в чат"))}
        ${srow("Адрес веб-хука", "Его выдаёт чат при создании интеграции", `<input class="input mono" name="webhook_url" value="${esc(n.webhook_url)}" placeholder="https://hooks.slack.com/services/…" aria-label="Адрес веб-хука" />`, { id: "row-webhook" })}
      `)}`);
  }
  function renderSettingsNetwork() {
    const g = P().general, a = P().advanced;
    return settingsPage("Сеть и скорость", "Как парсер ходит в Shikimori и Kodik. Менять стоит, только если запросы упираются в ограничения.", "general", `
      ${scard("Доступ к источникам", "plug", `
        ${srow("Ключ Kodik", "Хранится на сервере, в интерфейсе его не видно и поменять нельзя. Так ключ не утечёт", `<span class="tag" data-tone="success">${icon("lock")}Задан на сервере</span>`)}
        ${srow("Адрес Shikimori", "Зеркало, если основной адрес недоступен", single("shikimori_api_domain", g.shikimori_api_domain, [["https://shikimori.io/", "shikimori.io"], ["https://shikimori.one/", "shikimori.one"]], "Адрес Shikimori"), { stack: true })}
        ${srow("Как представляться", "Имя программы в запросах. Менять не нужно", `<span class="input-link"><input class="input mono" name="user_agent" value="${esc(g.user_agent)}" aria-label="Имя программы в запросах" /><button type="button" class="button s ghost" data-action="reset-ua">Как было</button></span>`)}
      `)}
      ${scard("Прокси", "route", `
        ${srow("Ходить через прокси", "Если источники блокируют сервер", toggle("proxy_enabled", g.proxy_enabled, "Ходить через прокси"))}
        ${srow("Адрес и порт", "", `<span class="year-range"><input class="input mono" name="proxy_address" value="${esc(g.proxy_address)}" placeholder="proxy.example.com" aria-label="Адрес прокси" /><span>:</span><input class="input mono" name="proxy_port" value="${esc(g.proxy_port)}" placeholder="8080" inputmode="numeric" aria-label="Порт" style="max-width:110px" /></span>`, { id: "row-proxy" })}
      `)}
      ${scard("Скорость", "gauge", `
        ${srow("Одновременных запросов", "Больше — быстрее, но выше риск получить отказ «слишком много запросов»", range("async_semaphores", a.async_semaphores, { min: 1, max: 20, step: 1, format: "parallel" }), { stack: true })}
        ${srow("Пауза между запросами", "Помогает не упираться в ограничения Shikimori", range("request_delay_ms", a.request_delay_ms, { min: 0, max: 2000, step: 50, format: "ms" }), { stack: true })}
      `)}`);
  }

  /* ==========================================================================
     Подтверждение и уведомления
     ========================================================================== */
  function confirmDialog({ title, text, tone = "info", icon: ic = "lightbulb", requestKey, body, extra = "", ok = "Подтвердить", onOk, danger = false }) {
    const dlg = $("#confirm");
    if (dlg.open) dlg.close();
    const ep = requestKey ? C.endpoints[requestKey] : null;
    const path = ep ? ep[1].replace(/\{(\w+)\}/g, (_, k) => (body && body[`__${k}`]) || `{${k}}`) : "";
    const visibleBody = body ? Object.fromEntries(Object.entries(body).filter(([k]) => !k.startsWith("__"))) : null;
    dlg.innerHTML = `<div class="dialog-body" data-tone="${tone}"><h2 id="confirm-title">${icon(ic)}${esc(title)}</h2>${text ? `<p>${text}</p>` : ""}
      ${ep ? `<details class="request"><summary>${icon("chevron-right", "icon-s")}Что уйдёт на сервер</summary><div><b>${ep[0]}</b> /api/v1${esc(path)}</div>${visibleBody && Object.keys(visibleBody).length ? `<div>${esc(JSON.stringify(visibleBody))}</div>` : ""}<span>Доступ: ${esc(ep[2])}${ep[3] ? ` · ${esc(ep[3])}` : ""}</span>${extra}</details>` : ""}</div>
      <div class="dialog-foot"><button type="button" class="button" data-dialog="cancel">Отмена</button><button type="button" class="button ${danger ? "danger" : "primary"}" data-dialog="ok">${esc(ok)}</button></div>`;
    refreshIcons(dlg);
    dlg.onclick = event => {
      const btn = event.target.closest("[data-dialog]");
      if (event.target === dlg) { dlg.close(); return; }
      if (!btn) return;
      dlg.close();
      if (btn.dataset.dialog === "ok") onOk?.();
    };
    dlg.showModal();
    $("[data-dialog='ok']", dlg).focus();
  }
  function toast(title, text = "", tone = "info", ic = "lightbulb") {
    const region = $("#toasts");
    const node = document.createElement("div");
    node.className = "toast";
    node.dataset.tone = tone;
    node.innerHTML = `${icon(ic)}<div><strong>${esc(title)}</strong>${text ? `<small>${text}</small>` : ""}</div>`;
    region.append(node);
    refreshIcons(node);
    while (region.children.length > 3) region.firstElementChild.remove();
    setTimeout(() => { node.classList.add("is-leaving"); setTimeout(() => node.remove(), 260); }, 4200);
  }
  const mockDone = key => toast("Макет: запрос не отправлен", `При переносе здесь будет ${esc(C.endpoints[key][0])} /api/v1${esc(C.endpoints[key][1])}, а результат покажется только после ответа сервера.`, "info", "flask-conical");

  /* Подписи и последствия для каждого запроса. */
  function describeRequest(el) {
    const key = el.dataset.request, d = el.dataset;
    const name = d.name ? `«${d.name}»` : "";
    const ids = d.ids ? d.ids.split(",").filter(Boolean) : [];
    const op = d.op ? D.operations.find(o => o.key === d.op) : null;
    const dryChoice = op?.dry ? ($(`[data-dry="${op.key}"][aria-pressed="true"]`)?.dataset.value || "dry") : null;
    const map = {
      "bulk.anime": d.action === "delete"
        ? { title: `Удалить ${ids.length} ${C.plural(ids.length, "тайтл", "тайтла", "тайтлов")}?`, text: "Тайтлы, их серии, источники, комментарии, избранное и места в коллекциях пропадут навсегда. Отменить нельзя. Если тайтл просто не нужен в синхронизации, лучше добавить его в исключения.", danger: true, tone: "danger", icon: "trash-2", ok: "Удалить навсегда", body: { ids, action: "delete" } }
        : { title: `Сменить статус у ${ids.length} ${C.plural(ids.length, "тайтла", "тайтлов", "тайтлов")}`, text: "Новый статус запишется всем выбранным тайтлам сразу.", icon: "refresh-ccw", ok: "Сменить", body: { ids, action: "update_status", new_status: $("#bulk-status")?.value } },
      "import.single": { title: "Импортировать из Kodik", text: "Данные возьмутся из Kodik и Shikimori. Если не хватит постера или описания, тайтл уйдёт на модерацию.", icon: "download", ok: "Импортировать", body: { shikimori_id: d.shikimori ? Number(d.shikimori) : null, kodik_id: d.kodik } },
      "moderation.approve": { title: `Одобрить ${ids.length} ${C.plural(ids.length, "тайтл", "тайтла", "тайтлов")}`, text: "Одобренные появятся на сайте. Сервер ещё раз проверит каждый и пропустит неготовые.", icon: "check-check", ok: "Одобрить", body: { anime_ids: ids } },
      "conflicts.resolve": { title: "Закрыть конфликт как «верно»", text: "Тайтл не изменится: конфликт просто уйдёт из очереди. Если номер Shikimori неверный, исправьте его на странице тайтла.", icon: "check", ok: "Закрыть", body: { strategy: "keep", __id: d.id } },
      "comments.delete": { title: `Удалить ${name}?`, text: "Текст заменится на «[удалено]», ответы останутся.", danger: true, tone: "danger", icon: "trash-2", ok: "Удалить", body: { __id: d.id } },
      "jobs.trigger": op ? (() => {
        const type = op.dry && dryChoice === "real" ? op.job_type : (op.dry || op.job_type);
        return { title: `Запустить: ${op.title}${op.dry ? (dryChoice === "real" ? " (настоящий)" : " (пробный)") : ""}`, text: `${esc(op.summary)}${op.blocks ? ` <strong>Займёт очередь на ${esc(op.duration)}:</strong> плановые задачи и бэкап будут ждать.` : ""}`, icon: op.danger ? "triangle-alert" : "play", tone: op.danger ? "warning" : "info", ok: "Запустить", body: { parser_name: op.parser, job_type: type } };
      })() : {},
      "jobs.stop": { title: `Остановить ${name}?`, text: "Сделанное до остановки сохранится. Остальное подхватит следующий запуск.", danger: true, tone: "danger", icon: "square", ok: "Остановить", body: { __id: d.id } },
      "jobs.delete": { title: `Убрать ${name} из истории?`, text: "Мониторинг считает отказы по истории задач.", danger: true, tone: "danger", icon: "trash-2", ok: "Убрать", body: { __id: d.id } },
      "jobs.clear": { title: "Очистить готовые задачи?", text: "Удалятся все строки со статусом «Готово». Проверки «запаздывание расписания» и «отказы за сутки» на время потеряют данные.", danger: true, tone: "warning", icon: "eraser", ok: "Очистить", body: { status: "completed" } },
      "schedule.runNow": { title: `Запустить сейчас: ${name}`, text: "Задача встанет в общую очередь.", icon: "play", ok: "Запустить", body: { __id: d.id } },
      "schedule.delete": { title: `Удалить расписание ${name}?`, text: "Задача перестанет запускаться сама. Монитор перестанет её проверять.", danger: true, tone: "danger", icon: "trash-2", ok: "Удалить", body: { __id: d.id } },
      "schedule.update": { title: el.checked ? "Включить расписание" : "Выключить расписание", text: el.checked ? "Задача снова будет запускаться сама." : "Задача перестанет запускаться сама, пока её не включат.", icon: "calendar-clock", ok: el.checked ? "Включить" : "Выключить", body: { is_active: el.checked, __id: d.id } },
      "blacklist.delete": { title: `Убрать ${name} из исключений?`, text: "Следующая синхронизация сможет снова добавить этот тайтл.", danger: true, tone: "warning", icon: "trash-2", ok: "Убрать", body: { __id: d.id } },
      "backups.create": { title: "Сделать резервную копию сейчас", text: "Запрос держится 1–2 минуты: сначала дамп базы, потом архив медиа. Не запускайте около 05:00 по Алматы — в это время идёт автоматическая копия.", icon: "archive", ok: "Сделать копию" },
      "backups.download": { title: `Скачать ${name}`, text: "Файл отдаётся по пути из базы, а не по имени из ссылки.", icon: "download", ok: "Скачать", body: { __id: d.id } },
      "backups.delete": { title: `Удалить ${name}?`, text: "Файл и строка в базе удалятся навсегда. Если это последняя годная копия, проверка бэкапов покраснеет.", danger: true, tone: "danger", icon: "trash-2", ok: "Удалить", body: { __id: d.id } },
      "users.ban": { title: `Забанить ${name}?`, text: "Пользователь не сможет войти. Комментарии останутся.", danger: true, tone: "danger", icon: "ban", ok: "Забанить", body: { __id: d.id } },
      "users.unban": { title: `Разбанить ${name}?`, text: "Пользователь снова сможет войти.", icon: "undo-2", ok: "Разбанить", body: { __id: d.id } },
      "anime.delete": { title: `Удалить ${name}?`, text: "Тайтл, его серии, источники, комментарии, избранное и места в коллекциях пропадут навсегда.", danger: true, tone: "danger", icon: "trash-2", ok: "Удалить навсегда", body: { __id: d.id } },
      "anime.refresh": { title: `Перечитать ${name} из Kodik`, text: "Серии и озвучки обновятся по Kodik. Ручные правки в полях, которые пишет Kodik, перезапишутся.", icon: "refresh-cw", ok: "Перечитать", body: { __slug: d.slug } },
      "anime.refreshPoster": { title: `Постер для ${name}`, text: "Постер скачается из Shikimori и заменит текущий.", icon: "image-down", ok: "Взять постер", body: { __slug: d.slug } },
      "episodes.delete": { title: `Удалить ${name}?`, text: "Серия, её источники, комментарии к ней и прогресс просмотра пропадут.", danger: true, tone: "danger", icon: "trash-2", ok: "Удалить", body: { __id: d.id } },
      "releases.delete": { title: `Удалить источник ${name}?`, text: "Если источник временно не работает, лучше выключить его: тогда его можно вернуть одним переключателем.", danger: true, tone: "danger", icon: "trash-2", ok: "Удалить", body: { __id: d.id } },
      "avatars.delete": { title: `Удалить аватар ${name}?`, text: "У пользователей, которые его выбрали, аватар сбросится.", danger: true, tone: "danger", icon: "trash-2", ok: "Удалить", body: { __id: d.id } },
      "decorations.delete": { title: `Удалить рамку ${name}?`, text: "У пользователей, которые её выбрали, рамка сбросится.", danger: true, tone: "danger", icon: "trash-2", ok: "Удалить", body: { __id: d.id } },
      "avatars.upload": { title: "Загрузить картинку", text: "Выберите файл PNG, JPG или WebP. Он заменит текущую картинку.", icon: "upload", ok: "Выбрать файл", body: { __id: d.id } },
      "decorations.upload": { title: "Загрузить картинку", text: "Выберите файл PNG, JPG или WebP. Он заменит текущую картинку.", icon: "upload", ok: "Выбрать файл", body: { __id: d.id } },
    };
    return { requestKey: key, ...(map[key] || { title: "Отправить запрос" }) };
  }

  /* ==========================================================================
     Палитра команд
     ========================================================================== */
  function cmdItems() {
    const out = [];
    sections.forEach(s => s.pages.forEach(p => out.push({ group: "Страницы", icon: p.icon || s.icon, label: p.title, hint: s.label, run: () => go(p.id) })));
    D.anime.forEach(a => out.push({ group: "Тайтлы", icon: "clapperboard", label: a.title, hint: a.title_en || "", run: () => go(`catalog/titles/${a.slug}`) }));
    D.operations.filter(o => o.works).forEach(o => out.push({ group: "Запустить", icon: "play", label: o.title, hint: o.duration, run: () => { go("parser/run"); setTimeout(() => $(`[data-op="${o.key}"]`)?.click(), 120); } }));
    D.users.forEach(u => out.push({ group: "Люди", icon: "user", label: u.username, hint: u.email, run: () => go(`people/users/${u.id}`) }));
    out.push({ group: "Вид", icon: "palette", label: "Сменить палитру", hint: "Сакура / Обсидиан", run: togglePalette });
    out.push({ group: "Вид", icon: "sun-moon", label: "Сменить тему", hint: "Тёмная / светлая", run: toggleTheme });
    return out;
  }
  function openCmdk() {
    const dlg = $("#cmdk");
    const items = cmdItems();
    let active = 0, shown = items;
    dlg.innerHTML = `<div class="cmdk-input">${icon("search")}<input type="text" placeholder="Страница, тайтл, задача, человек" aria-label="Что найти" role="combobox" aria-expanded="true" aria-controls="cmdk-list" autocomplete="off" /><span class="kbd">Esc</span></div><div class="cmdk-list" id="cmdk-list" role="listbox"></div>`;
    const input = $("input", dlg), list = $(".cmdk-list", dlg);
    const draw = () => {
      let group = "";
      list.innerHTML = shown.length ? shown.slice(0, 40).map((item, i) => `${item.group !== group ? `<div class="cmdk-group">${esc(group = item.group)}</div>` : ""}<button type="button" class="cmdk-item" role="option" data-index="${i}" aria-selected="${i === active}">${icon(item.icon)}<span>${esc(item.label)}</span><small>${esc(item.hint || "")}</small></button>`).join("") : `<p class="muted" style="padding:14px">Ничего не нашлось</p>`;
      refreshIcons(list);
      $(".cmdk-item[aria-selected='true']", list)?.scrollIntoView({ block: "nearest" });
    };
    input.addEventListener("input", () => {
      const q = input.value.trim().toLowerCase();
      shown = q ? items.filter(i => `${i.label} ${i.hint} ${i.group}`.toLowerCase().includes(q)) : items;
      active = 0; draw();
    });
    input.addEventListener("keydown", e => {
      if (e.key === "ArrowDown") { active = Math.min(active + 1, Math.min(shown.length, 40) - 1); draw(); e.preventDefault(); }
      if (e.key === "ArrowUp") { active = Math.max(active - 1, 0); draw(); e.preventDefault(); }
      if (e.key === "Enter" && shown[active]) { dlg.close(); shown[active].run(); }
    });
    list.addEventListener("click", e => { const b = e.target.closest(".cmdk-item"); if (b) { dlg.close(); shown[+b.dataset.index].run(); } });
    dlg.onclick = e => { if (e.target === dlg) dlg.close(); };
    draw();
    refreshIcons(dlg);
    dlg.showModal();
    input.focus();
  }

  /* ==========================================================================
     Маршрутизация и отрисовка
     ========================================================================== */
  const renderers = {
    pult: renderPult,
    "catalog/titles": renderTitles, "catalog/import": renderImport, "catalog/episodes": renderEpisodes, "catalog/collections": renderCollections,
    "queues/moderation": renderModeration, "queues/conflicts": renderConflicts, "queues/comments": renderComments,
    "parser/run": renderRun, "parser/jobs": renderJobs, "parser/schedule": renderSchedule, "parser/logs": renderLogs, "parser/blacklist": renderBlacklist,
    "stand/checks": renderChecks, "stand/resources": renderResources, "stand/backups": renderBackups, "stand/audit": renderAudit,
    "people/users": renderUsers, "people/access": renderAccess, "people/cosmetics": renderCosmetics,
    settings: renderSettingsOverview, "settings/site": renderSettingsSite, "settings/import": renderSettingsImport, "settings/updates": renderSettingsUpdates,
    "settings/images": renderSettingsImages, "settings/texts": renderSettingsFields, "settings/taxonomy": renderSettingsTaxonomy, "settings/stopwords": renderSettingsStopwords,
    "settings/player": renderSettingsPlayer, "settings/notify": renderSettingsNotify, "settings/network": renderSettingsNetwork,
  };
  /* Страницы одной записи: адрес списка плюс номер или slug. */
  const details = { "catalog/titles": renderTitlePage, "parser/jobs": renderJobPage, "people/users": renderUserPage };
  function parseHash() {
    const [path, query = ""] = location.hash.replace(/^#\/?/, "").split("?");
    const params = Object.fromEntries(new URLSearchParams(query));
    if (renderers[path]) return { route: path, param: null, params };
    const cut = path.lastIndexOf("/");
    const base = path.slice(0, cut), param = decodeURIComponent(path.slice(cut + 1));
    if (cut > 0 && details[base] && param) return { route: base, param, params };
    return { route: "pult", param: null, params };
  }
  function go(route) { if (location.hash !== `#/${route}`) location.hash = `#/${route}`; else render(); }
  const pageHtml = () => (state.param ? details[state.route](state.param) : renderers[state.route]());

  function refreshIcons(scope = document) {
    if (!window.lucide) return;
    window.lucide.createIcons({ attrs: { "aria-hidden": "true", "stroke-width": 1.8 }, nameAttr: "data-lucide", root: scope });
  }
  function countUp(scope) {
    if (reduceMotion.matches) return;
    $$("[data-count]", scope).forEach(el => {
      const target = parseFloat(el.dataset.count), decimals = +(el.dataset.decimals || 0);
      const start = performance.now(), dur = 900;
      const step = now => {
        const t = Math.min(1, (now - start) / dur), eased = 1 - Math.pow(1 - t, 3);
        el.textContent = (target * eased).toLocaleString("ru-RU", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }
  /* Снимок формы сразу после отрисовки: с ним сравниваются правки. */
  function snapshotForms(scope) { $$("form[data-edit]", scope).forEach(form => { form.dataset.initial = JSON.stringify(C.readForm(form)); }); }
  function paint(main) {
    const tabs = state.param ? "" : sectionTabs();
    main.innerHTML = `<div class="page ${state.param ? "is-detail" : ""}">${tabs}${pageHtml()}</div>`;
    refreshIcons(main);
    $$(".range", main).forEach(syncRange);
    snapshotForms(main);
    updateDirty();
  }
  let lastHash = location.hash;
  function render() {
    const next = parseHash();
    const changed = next.route !== state.route || next.param !== state.param;
    state.route = next.route;
    state.param = next.param;
    if (changed) { state.editing = { schedule: null, episode: null, release: null }; state.paramTitle = ""; }
    if (next.params.ep) state.editing.episode = next.params.ep;
    lastHash = location.hash;
    const swap = () => {
      const main = $("#main");
      paint(main);
      renderChrome();
      refreshIcons($("#shell"));
      countUp(main);
      document.title = `${state.param ? state.paramTitle : pages[state.route].title} — Kitsu`;
      if (next.params.ep) $(".ep-row.is-open")?.scrollIntoView({ block: "center" });
    };
    if (changed && document.startViewTransition && !reduceMotion.matches) {
      root.classList.add("is-routing");
      document.startViewTransition(swap).finished.finally(() => root.classList.remove("is-routing"));
    } else swap();
    if (changed && !next.params.ep) { window.scrollTo({ top: 0, behavior: "instant" }); $("#main").focus({ preventScroll: true }); }
  }
  function rerenderMain() {
    const y = window.scrollY;
    const main = $("#main");
    paint(main);
    $$(".reveal", main).forEach(el => el.classList.remove("reveal"));
    renderChrome();
    refreshIcons($("#shell"));
    window.scrollTo(0, y);
  }

  /* ---------- Вид ---------- */
  function applyThemeColor() {
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = getComputedStyle(root).getPropertyValue("--canvas").trim() || "#0e0b12";
  }
  function withTransition(fn) {
    if (document.startViewTransition && !reduceMotion.matches) document.startViewTransition(fn);
    else fn();
  }
  function togglePalette() {
    withTransition(() => {
      if (root.dataset.palette === "obsidian") delete root.dataset.palette; else root.dataset.palette = "obsidian";
      try { localStorage.setItem("kitsu-palette", root.dataset.palette === "obsidian" ? "obsidian" : "sakura"); } catch (_) {}
      /* Обложки рисуются под палитру; формы с правками не трогаем, чтобы не потерять введённое. */
      if (!state.dirty) rerenderMain(); else renderChrome();
      applyThemeColor();
    });
  }
  function toggleTheme() {
    withTransition(() => {
      root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
      try { localStorage.setItem("kitsu-admin-theme", root.dataset.theme); } catch (_) {}
      renderChrome();
      refreshIcons($("#shell"));
      applyThemeColor();
    });
  }

  /* ==========================================================================
     Формы: правки, панель сохранения, защита от ухода
     ========================================================================== */
  const formDirty = form => JSON.stringify(C.readForm(form)) !== form.dataset.initial;
  function updateDirty() {
    const main = $("#main");
    const pageForms = $$("form[data-edit]", main).filter(f => !f.closest(".inline-editor"));
    const pageDirty = pageForms.some(formDirty);
    const inlineDirty = $$(".inline-editor form[data-edit]", main).some(formDirty);
    const bar = $("[data-savebar]", main);
    if (bar) { bar.hidden = !pageDirty; main.classList.toggle("has-savebar", pageDirty); }
    state.dirty = pageDirty || inlineDirty;
  }
  function formChanged(form) {
    if (!form) return;
    const preview = $("[data-access-preview]", form);
    if (preview) {
      const role = D.roles.find(r => r.id === $("[name='role_id']", form).value);
      preview.innerHTML = accessPreview(C.effectiveAccess({ is_superuser: $("[name='is_superuser']", form).checked }, role));
      refreshIcons(preview);
    }
    if (form.closest("#main")) updateDirty();
  }
  const TRANSLIT = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya" };
  const slugify = text => String(text || "").toLowerCase().split("").map(ch => TRANSLIT[ch] ?? ch).join("").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  function showErrors(form, errs) {
    $$("[data-error-for]", form).forEach(node => { node.hidden = true; node.textContent = ""; });
    $$("[aria-invalid]", form).forEach(node => node.removeAttribute("aria-invalid"));
    errs.forEach(err => {
      const node = $(`[data-error-for="${err.field}"]`, form), input = $(`[name="${err.field}"]`, form);
      if (node) { node.hidden = false; node.textContent = err.text; }
      input?.setAttribute("aria-invalid", "true");
    });
    if (!errs.length) return false;
    const first = $(`[name="${errs[0].field}"]`, form);
    first?.scrollIntoView({ block: "center" });
    first?.focus({ preventScroll: true });
    toast("Проверьте форму", `${errs.length} ${C.plural(errs.length, "поле требует", "поля требуют", "полей требуют")} внимания`, "danger", "triangle-alert");
    return true;
  }
  const SETTINGS_TITLE = Object.fromEntries(D.settings.parserArchive.map(c => [c.category, c.title]));
  function coerce(original, value) {
    if (Array.isArray(original)) return Array.isArray(value) ? value : value ? String(value).split(",").map(x => x.trim()).filter(Boolean) : [];
    if (typeof original === "number") return value == null || value === "" ? null : Number(value);
    if (typeof original === "boolean") return !!value;
    return value ?? "";
  }
  function saveSettings(form, payload) {
    const initial = JSON.parse(form.dataset.initial || "{}");
    const changed = Object.keys(payload).filter(key => JSON.stringify(payload[key]) !== JSON.stringify(initial[key]));
    if (!changed.length) { toast("Нет изменений", "Всё уже сохранено.", "info", "check"); return; }
    const done = key => () => { form.dataset.initial = JSON.stringify(C.readForm(form)); updateDirty(); mockDone(key); };
    if (form.dataset.category === "site") {
      const body = Object.fromEntries(changed.map(key => [key, payload[key]]));
      confirmDialog({ title: "Сохранить настройки сайта", text: "Значения сохранятся в базе. <strong>Сайт их пока не читает</strong>: на страницах ничего не поменяется, пока бэкенд не начнёт их учитывать.", tone: "warning", icon: "unplug", requestKey: "site.update", body, ok: "Сохранить", onOk: done("site.update") });
      return;
    }
    /* Сервер заменяет config категории целиком, поэтому уходит вся категория, а не только правка. */
    const categoryOf = key => Object.keys(D.parserConfig).find(cat => key in D.parserConfig[cat]);
    const cats = [...new Set(changed.map(categoryOf).filter(Boolean))];
    const bodies = cats.map(cat => {
      const config = { ...D.parserConfig[cat] };
      Object.keys(config).forEach(key => { if (key in payload) config[key] = coerce(D.parserConfig[cat][key], payload[key]); });
      return { config, description: SETTINGS_TITLE[cat] || cat, __category: cat };
    });
    const more = bodies.slice(1).map(b => `<div><b>PATCH</b> /api/v1/dashboard/parsers/settings/${esc(b.__category)}</div><div>${esc(JSON.stringify({ config: b.config, description: b.description }))}</div>`).join("");
    confirmDialog({ title: "Сохранить настройки", text: `${changed.length} ${C.plural(changed.length, "значение изменено", "значения изменены", "значений изменено")}. Они сохранятся в базе; текущий воркер их пока не читает.`, icon: "save", requestKey: "parserSettings.update", body: bodies[0], extra: more, ok: "Сохранить", onOk: done("parserSettings.update") });
  }
  function saveForm(form) {
    const kind = form.dataset.edit, key = form.dataset.requestKey;
    const payload = C.readForm(form);
    if (kind.startsWith("settings-")) { saveSettings(form, payload); return; }
    if (kind === "anime" && key === "anime.create" && !payload.slug && payload.title) {
      payload.slug = slugify(payload.title);
      const input = $("[name='slug']", form);
      if (input) input.value = payload.slug;
    }
    if (showErrors(form, C.errors(kind, payload))) return;
    if (kind === "user" && payload.password === null) delete payload.password;
    let body = payload, text = "";
    if (kind === "schedule") {
      text = esc(freqSentence(payload.cron_expression));
      if (key === "schedule.create") {
        const op = D.operations.find(o => o.key === payload.operation);
        body = { parser_name: op?.parser, job_type: op?.job_type, cron_expression: payload.cron_expression, is_active: payload.is_active };
        text += " Сервер поставит первый запуск через час после создания, дальше — по расписанию.";
      } else text += " Ближайший запуск останется прежним: сервер его не пересчитывает.";
    }
    if (key.endsWith(".update")) {
      /* PATCH меняет только присланные поля: отправляем лишь изменённое, иначе пустые поля затрут данные. */
      const initial = JSON.parse(form.dataset.initial || "{}");
      body = Object.fromEntries(Object.entries(body).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(initial[k])));
      if (!Object.keys(body).length) { toast("Нет изменений", "Всё уже сохранено.", "info", "check"); return; }
      body = { ...body, __id: form.dataset.id };
    }
    const inDialog = !!form.closest("#confirm");
    const inline = form.closest(".inline-editor");
    confirmDialog({ title: key.endsWith(".create") ? "Создать" : "Сохранить изменения", text, requestKey: key, body, icon: "save", ok: key.endsWith(".create") ? "Создать" : "Сохранить", onOk: () => {
      mockDone(key);
      if (inDialog) return;
      if (inline) { closeInline(form); return; }
      form.dataset.initial = JSON.stringify(C.readForm(form));
      updateDirty();
    } });
  }
  /* Раскрытие строки для правки на месте. Перерисовывается только список, чтобы не потерять правки в остальной странице. */
  function redrawEpisodes() {
    const item = animeBySlug(state.param);
    const box = $("#episodes");
    if (!item || !box) return;
    box.outerHTML = episodesSection(item);
    const fresh = $("#episodes");
    refreshIcons(fresh);
    snapshotForms(fresh);
    updateDirty();
    const open = $(".inline-editor.nested", fresh) || $(".ep-row.is-open", fresh);
    if (open) { open.scrollIntoView({ block: "nearest", behavior: reduceMotion.matches ? "auto" : "smooth" }); }
  }
  function closeInline(form) {
    if (form.dataset.edit === "schedule") { state.editing.schedule = null; rerenderMain(); return; }
    if (form.dataset.edit === "release") state.editing.release = null;
    else { state.editing.episode = null; state.editing.release = null; }
    redrawEpisodes();
  }
  function guardInline(scopeSelector, run) {
    const open = $$(`${scopeSelector} form[data-edit]`).filter(formDirty);
    if (!open.length) { run(); return; }
    confirmDialog({ title: "Закрыть без сохранения?", tone: "warning", icon: "triangle-alert", text: "Правки в открытой строке пропадут.", ok: "Закрыть", onOk: run });
  }
  function setField(form, name, value) {
    const box = $(`[data-freq="${name}"]`, form);
    if (box) { box.outerHTML = freqPicker(name, value, { allowFast: true }); return; }
    const single1 = $(`[data-single="${name}"]`, form);
    if (single1) { pickSingle(single1, String(value)); return; }
    const multi1 = $(`[data-multi="${name}"]`, form);
    if (multi1) {
      const set = new Set((Array.isArray(value) ? value : String(value).split(",")).map(x => x.trim()).filter(Boolean));
      $$("button[data-value]", multi1).forEach(b => setMultiButton(b, set.has(b.dataset.value)));
      syncMulti(multi1);
      return;
    }
    const chips1 = $(`[data-chips="${name}"]`, form);
    if (chips1) {
      $$(".chip", chips1).forEach(c => c.remove());
      const list = (Array.isArray(value) ? value : String(value).split(",")).map(x => x.trim()).filter(Boolean);
      $(".chips-entry", chips1).insertAdjacentHTML("beforebegin", list.map(chipItem).join(""));
      syncChips(chips1);
      return;
    }
    const input = $(`[name="${name}"]`, form);
    if (!input) return;
    if (input.type === "checkbox") input.checked = !!value;
    else input.value = value;
    if (input.type === "range") syncRange(input);
  }
  function pickSingle(group, value) {
    $$("button[data-value]", group).forEach(b => { const on = b.dataset.value === value; b.setAttribute("aria-checked", String(on)); b.setAttribute("aria-pressed", String(on)); });
    $("input[type=hidden]", group).value = value;
  }
  function setMultiButton(btn, on) {
    btn.setAttribute("aria-pressed", String(on));
  }
  function syncMulti(group) { $("input[type=hidden]", group).value = $$("button[aria-pressed='true']", group).map(b => b.dataset.value).join(", "); }
  function syncChips(box) { $("input[type=hidden]", box).value = $$(".chip", box).map(c => c.dataset.chip).join(", "); refreshIcons(box); }
  function syncRange(input) {
    const text = RANGE_FORMAT[input.dataset.format](input.value);
    const out = $(`[data-range-out="${input.name}"]`, input.closest(".range-wrap"));
    if (out) out.textContent = text;
    input.setAttribute("aria-valuetext", text);
    input.style.setProperty("--fill", `${((input.value - input.min) / (input.max - input.min)) * 100}%`);
  }
  function addChip(entry) {
    const box = entry.closest("[data-chips]");
    const values = entry.value.split(",").map(x => x.trim()).filter(Boolean);
    const have = new Set($$(".chip", box).map(c => c.dataset.chip.toLowerCase()));
    values.filter(v => !have.has(v.toLowerCase())).forEach(v => entry.insertAdjacentHTML("beforebegin", chipItem(v)));
    entry.value = "";
    syncChips(box);
    formChanged(box.closest("form"));
  }

  /* ---------- События ---------- */
  function handleAction(el, event) {
    const a = el.dataset.action;
    const find = (list, key = "id") => list.find(item => String(item[key]) === String(el.dataset[key]));
    switch (a) {
      case "palette": togglePalette(); break;
      case "theme": toggleTheme(); break;
      case "cmdk": openCmdk(); break;
      case "refresh": toast("Макет: данные не обновляются", "При переносе кнопка повторит GET /monitoring/health.", "info", "refresh-cw"); break;
      case "clear-selection": state.titles.selected.clear(); rerenderMain(); break;
      case "toggle-episode": guardInline("#episodes", () => { state.editing.episode = state.editing.episode === el.dataset.id ? null : el.dataset.id; state.editing.release = null; redrawEpisodes(); }); break;
      case "toggle-release": guardInline("#episodes .inline-editor.nested", () => { state.editing.release = state.editing.release === el.dataset.id ? null : el.dataset.id; redrawEpisodes(); }); break;
      case "toggle-schedule": guardInline(".sched-list", () => { state.editing.schedule = state.editing.schedule === el.dataset.id ? null : el.dataset.id; rerenderMain(); $(".sched.is-open select, .sched.is-open button")?.focus(); }); break;
      case "save-inline": saveForm(el.closest("form")); break;
      case "save-page": $$("#main form[data-edit]").filter(f => !f.closest(".inline-editor") && formDirty(f)).forEach(saveForm); break;
      case "save-dialog": saveForm($("#confirm form[data-edit]")); break;
      case "reset-form": rerenderMain(); toast("Правки отменены", "", "info", "undo-2"); break;
      case "new-cosmetic": cosmeticDialog(el.dataset.kind, null); break;
      case "edit-cosmetic": cosmeticDialog(el.dataset.kind, el.dataset.kind === "avatar" ? find(D.avatars) : find(D.decorations)); break;
      case "apply-preset": {
        const preset = GRAB_PRESETS[el.dataset.presetId];
        const form = el.closest(".page").querySelector("form[data-edit]");
        Object.entries(preset.values).forEach(([name, value]) => setField(form, name, value));
        refreshIcons(form);
        $$("[data-action='apply-preset']").forEach(b => b.setAttribute("aria-pressed", String(b === el)));
        formChanged(form);
        toast(`Набор «${preset.label}» подставлен`, "Проверьте значения и нажмите «Сохранить» внизу.", "info", "wand-sparkles");
        break;
      }
      case "reset-ua": { const form = el.closest("form"); setField(form, "user_agent", "KitsuEngine/2.0"); formChanged(form); break; }
      default: break;
    }
  }
  function runRequest(el) {
    const info = describeRequest(el);
    const revert = () => { if (el.type === "checkbox") el.checked = !el.checked; };
    confirmDialog({ ...info, onOk: () => mockDone(info.requestKey) });
    if (el.type === "checkbox") { const dlg = $("#confirm"); dlg.addEventListener("close", function once() { revert(); dlg.removeEventListener("close", once); }); }
  }

  document.addEventListener("click", event => {
    const reqEl = event.target.closest("[data-request]");
    if (reqEl && reqEl.type !== "checkbox" && !reqEl.disabled) { event.preventDefault(); runRequest(reqEl); return; }
    const actionEl = event.target.closest("[data-action]");
    if (actionEl) { handleAction(actionEl, event); return; }
    const segEl = event.target.closest("[data-seg]");
    if (segEl) {
      const name = segEl.dataset.seg, value = segEl.dataset.value;
      if (name === "titles") state.titles.filter = value;
      if (name === "conflicts") state.conflicts.status = value;
      if (name === "jobs") state.jobs.status = value;
      if (name === "logs") state.logs.level = value;
      if (name === "checks") state.checks.state = value;
      rerenderMain();
      $(`[data-seg="${name}"][data-value="${value}"]`)?.focus();
      return;
    }
    const dryEl = event.target.closest("[data-dry]");
    if (dryEl) { $$(`[data-dry="${dryEl.dataset.dry}"]`).forEach(b => b.setAttribute("aria-pressed", String(b === dryEl))); return; }
    const singleBtn = event.target.closest("[data-single] button[data-value]");
    if (singleBtn) { pickSingle(singleBtn.closest("[data-single]"), singleBtn.dataset.value); formChanged(singleBtn.closest("form")); return; }
    const weekday = event.target.closest("[data-freq-weekday] button");
    if (weekday) { $$("button", weekday.parentElement).forEach(b => b.setAttribute("aria-pressed", String(b === weekday))); syncFreq(weekday.closest("[data-freq]")); formChanged(weekday.closest("form")); return; }
    const multiBtn = event.target.closest("[data-multi] button[data-value]");
    if (multiBtn) { setMultiButton(multiBtn, multiBtn.getAttribute("aria-pressed") !== "true"); syncMulti(multiBtn.closest("[data-multi]")); formChanged(multiBtn.closest("form")); return; }
    const chipX = event.target.closest("[data-chip-remove]");
    if (chipX) { const box = chipX.closest("[data-chips]"); chipX.closest(".chip").remove(); syncChips(box); formChanged(box.closest("form")); $(".chips-entry", box).focus(); return; }
    const chipsBox = event.target.closest(".chips-input");
    if (chipsBox && event.target === chipsBox) { $(".chips-entry", chipsBox).focus(); return; }
    const insert = event.target.closest("[data-insert]");
    if (insert) {
      const input = $("[data-tpl-input]", insert.closest(".tpl"));
      const start = input.selectionStart ?? input.value.length, end = input.selectionEnd ?? start;
      input.value = `${input.value.slice(0, start)}${insert.dataset.insert}${input.value.slice(end)}`;
      input.focus();
      input.setSelectionRange(start + insert.dataset.insert.length, start + insert.dataset.insert.length);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });

  document.addEventListener("change", event => {
    const t = event.target;
    if (t.matches("[data-request][type='checkbox']")) { runRequest(t); return; }
    if (t.matches("[data-select='titles']")) {
      t.checked ? state.titles.selected.add(t.value) : state.titles.selected.delete(t.value);
      t.closest("tr")?.classList.toggle("is-selected", t.checked);
      $("#bulk-slot").innerHTML = bulkBar(); refreshIcons($("#bulk-slot"));
    }
    if (t.matches("[data-select-all='titles']")) {
      filteredTitles().forEach(item => (t.checked ? state.titles.selected.add(item.id) : state.titles.selected.delete(item.id)));
      rerenderMain();
    }
    if (t.matches("[data-freq-kind], [data-freq-hour], [data-freq-minute]")) syncFreq(t.closest("[data-freq]"));
    if (t.matches(".chips-entry") && t.value.trim()) { addChip(t); return; }
    if (t.closest("form[data-edit]")) formChanged(t.closest("form[data-edit]"));
  });

  let searchTimer;
  document.addEventListener("input", event => {
    const t = event.target;
    if (t.matches(".range")) syncRange(t);
    if (t.matches("[data-tpl-input]")) { const out = $("[data-tpl-preview]", t.closest(".tpl")); out.innerHTML = tplPreview(t.value); }
    if (t.matches("input[type=color]")) { const out = $("[data-color-out]", t.closest(".color-input")); if (out) out.textContent = t.value; }
    if (t.matches("[data-prefix-input]")) { const out = $("[data-prefix-out]", t.closest(".prefix-input")); if (out) out.textContent = `${t.value}драма`; }
    if (t.closest("form[data-edit]") && !t.matches(".chips-entry")) formChanged(t.closest("form[data-edit]"));
    if (t.matches("[data-input='titles-q']")) {
      state.titles.q = t.value;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => { $("#title-rows").innerHTML = titleRows(); refreshIcons($("#title-rows")); }, 120);
    }
    if (t.matches("[data-input='users-q']")) {
      state.users.q = t.value;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => { $("#user-rows").innerHTML = userRows(); refreshIcons($("#user-rows")); }, 120);
    }
  });

  document.addEventListener("submit", event => {
    const edit = event.target.closest("form[data-edit]");
    if (edit) { event.preventDefault(); saveForm(edit); return; }
    const form = event.target.closest("[data-form]");
    if (!form) return;
    event.preventDefault();
    if (form.dataset.form === "import-search") { state.importQ = form.q.value; rerenderMain(); $("[data-form='import-search'] input")?.focus(); }
    if (form.dataset.form === "blacklist") {
      const value = form.target_value.value.trim();
      const kind = $("[name='target']", form).value;
      if (!value) { toast("Укажите, что исключить", "Номер Shikimori, номер Kodik или адрес тайтла", "warning", "triangle-alert"); $("[name='target_value']", form).focus(); return; }
      const body = kind === "shikimori_id" ? { shikimori_id: Number(value) } : { [kind]: value };
      if (kind === "shikimori_id" && !Number.isInteger(body.shikimori_id)) { toast("Номер Shikimori — только цифры", "", "warning", "triangle-alert"); return; }
      confirmDialog({ title: "Добавить в исключения", text: "Синхронизация и импорт перестанут добавлять этот тайтл. Уже существующий тайтл не удалится.", requestKey: "blacklist.create", body, icon: "ban", ok: "Добавить", onOk: () => mockDone("blacklist.create") });
    }
  });

  document.addEventListener("keydown", event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); openCmdk(); return; }
    const t = event.target;
    if (t.matches?.(".chips-entry")) {
      if ((event.key === "Enter" || event.key === ",") && t.value.trim()) { event.preventDefault(); addChip(t); return; }
      if (event.key === "Enter") { event.preventDefault(); return; }
      if (event.key === "Backspace" && !t.value) { const last = $$(".chip", t.parentElement).pop(); if (last) { last.remove(); syncChips(t.parentElement); formChanged(t.closest("form")); } return; }
    }
    if (event.key === "Enter" && t.matches?.("form[data-edit] input:not([type=checkbox])") && !t.closest(".inline-editor") && !t.closest("#confirm")) { event.preventDefault(); return; }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s" && state.dirty) { event.preventDefault(); const form = t.closest?.("form[data-edit]") || $$("#main form[data-edit]").find(formDirty); if (form) saveForm(form); return; }
    if (event.key === "/" && !/input|textarea|select/i.test(document.activeElement?.tagName || "") && !$("#cmdk").open && !$("#confirm").open) { event.preventDefault(); openCmdk(); }
  });

  /* Уход со страницы с несохранёнными правками: спросить, а не терять молча. */
  window.addEventListener("hashchange", () => {
    if (state.dirty && location.hash !== lastHash) {
      const target = location.hash;
      history.replaceState(null, "", lastHash || "#/pult");
      confirmDialog({ title: "Уйти без сохранения?", tone: "warning", icon: "triangle-alert", text: "На этой странице есть несохранённые правки. Если уйти, они пропадут.", ok: "Уйти", danger: true, onOk: () => { state.dirty = false; location.hash = target; } });
      return;
    }
    render();
  });
  window.addEventListener("beforeunload", event => { if (state.dirty) { event.preventDefault(); event.returnValue = ""; } });
  window.addEventListener("scroll", () => $("#shell").classList.toggle("is-scrolled", window.scrollY > 4), { passive: true });

  function initInputModality() {
    document.addEventListener("pointerdown", () => { document.documentElement.dataset.inputModality = "pointer"; }, { capture: true, passive: true });
    document.addEventListener("keydown", event => { if (["Tab", "Enter", " ", "Escape", "ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) document.documentElement.dataset.inputModality = "keyboard"; }, true);
  }
  initInputModality();

  /* Живой прогресс текущей задачи (демонстрация WebSocket /dashboard/parsers/ws/jobs/{id}). */
  function tickLive() {
    if (!D.jobs.some(j => j.status === "running") || reduceMotion.matches) return;
    setInterval(() => {
      if (state.live.progress >= 96) return;
      state.live.progress += 1;
      $$("[data-live-pct]").forEach(n => { n.textContent = `${state.live.progress}%`; });
      $$("[data-live-bar], #live-chip .progress > i").forEach(n => n.style.setProperty("--p", `${state.live.progress}%`));
      $$("[role='progressbar']").forEach(n => n.setAttribute("aria-valuenow", state.live.progress));
    }, 2400);
  }

  window.KitsuAdmin = { renderers, details, state, toneForStatus, labelForStatus, describeRequest, sections };
  render();
  applyThemeColor();
  tickLive();
})();
