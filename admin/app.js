/* Kitsu Admin v4 — интерактивный шаблон. Запросы не отправляются: каждая
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
    { id: "settings", label: "Настройки", icon: "sliders-horizontal", kana: "設定", lede: "Где на самом деле живёт каждая настройка.", pages: [{ id: "settings", title: "Настройки" }] },
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
  };

  /* ---------- Каркас ---------- */
  function currentSection() { return pages[state.route]?.section || sections[0]; }
  function railItem(section, mobile = false) {
    const active = currentSection().id === section.id;
    const first = section.pages[0].id;
    const attention = section.pages.reduce((sum, page) => sum + (page.tone === "warn" && page.count ? page.count() : 0), 0);
    return `<a class="rail-item" href="#/${first}" data-section="${section.id}" aria-current="${active}" ${mobile ? "" : `title="${esc(section.label)}"`}>
      ${icon(section.icon)}<span>${esc(section.label)}</span>${attention ? `<b class="rail-badge" aria-label="${attention} требуют внимания">${attention}</b>` : ""}</a>`;
  }
  function renderChrome() {
    $("#rail-list").innerHTML = sections.map(s => railItem(s)).join("");
    const mobileIds = ["pult", "catalog", "queues", "parser"];
    $("#mobile-nav").innerHTML = sections.filter(s => mobileIds.includes(s.id)).map(s => railItem(s, true)).join("") +
      `<button type="button" class="rail-item" data-action="subnav" aria-current="${!mobileIds.includes(currentSection().id)}" aria-controls="subnav">${icon("layout-grid")}<span>Ещё</span></button>`;
    const section = currentSection();
    const stackUp = D.stack.alive;
    const running = D.jobs.find(j => j.status === "running");
    $("#subnav").innerHTML = `
      <div class="subnav-head"><span class="subnav-kana" aria-hidden="true">${section.kana}</span><h2>${esc(section.label)}</h2><p>${esc(section.lede)}</p></div>
      <div class="subnav-list">${section.pages.map(page => {
        const n = page.count ? page.count() : null;
        const cls = page.tone === "warn" ? "warn" : "";
        return `<a class="subnav-link" href="#/${page.id}" aria-current="${state.route === page.id ? "page" : "false"}"><span>${esc(page.title)}</span>${n ? `<span class="count ${cls}">${num(n)}</span>` : ""}</a>`;
      }).join("")}</div>
      <div class="subnav-list subnav-all" data-mobile-only>${sections.filter(s => s.id !== section.id).map(s => `<a class="subnav-link" href="#/${s.pages[0].id}"><span>${esc(s.label)}</span></a>`).join("")}</div>
      <div class="subnav-foot">
        <div class="stack-line">${dot(stackUp ? "success" : "danger")}<span>Стенд <strong>${stackUp ? "в работе" : "не отвечает"}</strong> с ${C.fmtTime(D.stack.up_since)}</span></div>
        ${running ? `<div class="stack-line">${dot("live")}<span>${esc(jobTitle(running))}${progressKind(running) === "live" ? ` · <strong class="mono" data-live-pct>${state.live.progress}%</strong>` : ""}</span></div>` : ""}
        <div class="stack-line">${icon("map-pin", "icon-s")}<span>Время — Алматы, UTC+5</span></div>
      </div>`;
    const page = pages[state.route];
    $("#crumbs").innerHTML = page.section.pages.length > 1
      ? `<a href="#/${page.section.pages[0].id}">${esc(page.section.label)}</a>${icon("chevron-right")}<b>${esc(page.title)}</b>`
      : `<b>${esc(page.title)}</b>`;
    const chip = $("#live-chip");
    if (running) {
      chip.hidden = false;
      const live = progressKind(running) === "live";
      chip.innerHTML = `${dot("live")}<span class="label">${esc(jobTitle(running))}</span>${live ? `<span class="progress live thin"><i style="--p:${state.live.progress}%"></i></span><span class="mono" data-live-pct>${state.live.progress}%</span>` : ""}`;
      chip.setAttribute("aria-label", `Выполняется: ${jobTitle(running)}, ${state.live.progress}%`);
    } else chip.hidden = true;
    $("[data-palette-label]").textContent = root.dataset.palette === "obsidian" ? "Обсидиан" : "Сакура";
    $("[data-theme-label]").textContent = root.dataset.theme === "light" ? "Светлая" : "Тёмная";
  }

  function pageHead(title, lede, actions = "") {
    return `<header class="page-head"><div><div class="page-title"><span class="beam" aria-hidden="true"></span><h1>${esc(title)}</h1></div>${lede ? `<p class="lede">${lede}</p>` : ""}</div>${actions ? `<div class="page-actions">${actions}</div>` : ""}</header>`;
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
    if (!list.length) return `<tr><td colspan="7">${empty("search-x", "Ничего не нашлось", "Поиск идёт по русскому, английскому названию, ромадзи и slug.")}</td></tr>`;
    return list.map(item => {
      const selected = state.titles.selected.has(item.id);
      return `<tr class="${selected ? "is-selected" : ""}">
        <td class="check"><input class="box-check" type="checkbox" data-select="titles" value="${item.id}" ${selected ? "checked" : ""} aria-label="Выбрать «${esc(item.title)}»" /></td>
        <td class="lead"><div class="cell-title">${thumb(item)}<div><strong>${esc(item.title)}</strong><small>${esc(item.title_en || "")}${item.aired_on ? ` · ${item.aired_on.slice(0, 4)}` : ""}</small></div></div></td>
        <td class="opt" data-label="Тип">${esc(KIND[item.kind] || item.kind)}</td>
        <td data-label="Статус">${statusTag(item.status)}${item.needs_moderation ? ` ${tag("Модерация", "warning")}` : ""}</td>
        <td class="num" data-label="Серии">${item.episodes_aired}${item.episodes_total ? ` / ${item.episodes_total}` : ""}</td>
        <td class="num opt" data-label="Оценка">${item.score ? String(item.score).replace(".", ",") : "—"}</td>
        <td class="num opt" data-label="Обновлён">${at(item.updated_at)}</td>
        <td class="actions"><button type="button" class="icon-btn s" data-action="edit-title" data-id="${item.id}" aria-label="Редактировать «${esc(item.title)}»">${icon("pencil")}</button><button type="button" class="icon-btn s" data-action="title-menu" data-id="${item.id}" aria-label="Ещё действия">${icon("more-horizontal")}</button></td>
      </tr>`;
    }).join("");
  }
  function renderTitles() {
    const all = D.anime;
    const n = key => ({ all: all.length, moderation: all.filter(i => i.needs_moderation).length, novideo: all.filter(i => !i.kodik_id).length, ongoing: all.filter(i => i.status === "ongoing").length, announced: all.filter(i => i.status === "announced").length }[key]);
    return `${pageHead("Тайтлы", `В каталоге ${num(D.kodikStats.local_total)} тайтлов. Большую часть полей пишет синхронизация; руками правят то, что она не знает или знает неверно.`, `<a class="button" href="#/catalog/import">${icon("download")}Из Kodik</a><button type="button" class="button primary" data-action="new-title">${icon("plus")}Новый тайтл</button>`)}
    <div class="toolbar">
      <label class="search grow">${icon("search")}<span class="sr-only">Поиск</span><input class="input" type="search" data-input="titles-q" value="${esc(state.titles.q)}" placeholder="Название, ромадзи или slug" /></label>
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
        <p class="muted" style="font-size:12px">Запрос: <code>GET /dashboard/parsers/kodik/search?q=…</code>. Сервер сам убирает дубликаты и отмечает <code>already_exists</code>. В макете ищется по четырём заготовленным результатам.</p>
      </div>
      <div class="results">${results.length ? results.map(r => `<div class="result">
          ${thumb({ title: r.title })}
          <div><h4>${esc(r.title)}</h4><div class="meta"><span>${esc(r.title_orig)}</span><span class="mono">${r.year}</span><span>${r.type === "anime" ? "Фильм" : "Сериал"} · ${r.episodes} ${C.plural(r.episodes, "серия", "серии", "серий")}</span><span>${r.translations} ${C.plural(r.translations, "озвучка", "озвучки", "озвучек")}</span><span class="mono">${esc(r.kodik_id)}</span>${r.shikimori_id ? `<span class="mono">shikimori ${r.shikimori_id}</span>` : tag("Нет Shikimori ID", "warning")}</div></div>
          <div class="op-actions">${r.in_catalog ? `${tag("Уже в каталоге", "success", "check")}<button type="button" class="button s" ${request("import.single", { shikimori: r.shikimori_id ?? "", kodik: r.kodik_id })}>${icon("refresh-cw")}Обновить</button>` : `<button type="button" class="button s primary" ${request("import.single", { shikimori: r.shikimori_id ?? "", kodik: r.kodik_id })}>${icon("download")}Импортировать</button>`}</div>
        </div>`).join("") : empty("telescope", "Введите название", "Поиск идёт по русскому и оригинальному названию.")}</div>
    </section>`;
  }

  function renderEpisodes() {
    return `${pageHead("Серии и источники", "Серии и источники видео создаёт синхронизация Kodik. Руками правят номер, сезон, отметки «филлер» и «рекап», а также неработающие источники.", `<button type="button" class="button primary" data-action="new-episode">${icon("plus")}Новая серия</button>`)}
    ${note("info", "lightbulb", "Поиска по тайтлу у списка серий на сервере нет: <code>GET /episodes/with-anime</code> принимает только <code>skip</code> и <code>limit</code>. Чтобы найти серии конкретного тайтла, откройте тайтл: там список из <code>GET /anime/{id}/episodes</code>.")}
    <section class="card">
      <div class="table-wrap"><table class="data cards"><thead><tr><th>Тайтл и серия</th><th class="num opt">Сезон</th><th>Отметки</th><th class="num opt">Источников</th><th class="num">Вышла</th><th class="actions"><span class="sr-only">Действия</span></th></tr></thead><tbody>
      ${D.episodes.map(e => `<tr>
        <td class="lead"><div class="cell-title"><div><strong>${esc(e.anime)} · ${e.episode} серия</strong><small>${esc(e.title || "Без названия")}</small></div></div></td>
        <td class="num opt" data-label="Сезон">${e.season}</td>
        <td data-label="Отметки">${e.is_filler ? tag("Филлер", "warning") : ""}${e.is_recap ? tag("Рекап", "info") : ""}${!e.is_filler && !e.is_recap ? '<span class="muted">—</span>' : ""}</td>
        <td class="num opt" data-label="Источников">${e.releases}</td>
        <td class="num" data-label="Вышла">${at(e.aired_at)}</td>
        <td class="actions"><button type="button" class="button s" data-action="open-episode" data-id="${e.id}">${icon("list-video")}Открыть</button></td>
      </tr>`).join("")}</tbody></table></div>
      <div class="pager"><span>Свежие серии сверху · страницы по 100</span></div>
    </section>`;
  }

  function renderCollections() {
    return `${pageHead("Коллекции", "Подборки пользователей. Создавать, править и отмечать их как «избранные» из админки сейчас нельзя: в API есть только чтение.")}
    ${note("warning", "lock", "Поле <code>is_featured</code> в базе есть, а эндпоинта, который его меняет, нет. Если подборки на главной нужны, это задача для бэкенда.")}
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
    ${note("info", "lightbulb", "Сервер сам проверяет каждый тайтл: без постера или описания одобрить нельзя, тайтл без видео — только если это анонс или есть ссылка Kodik. Неподходящие вернутся в <code>skipped_ids</code>. Если поправить постер и описание в редакторе, тайтл уйдёт из очереди сам.")}
    ${list.some(i => i.moderation_reason === "no_video") ? note("neutral", "archive", "Причину «Нет видео» ставила старая Python-синхронизация. Go-код её больше не ставит: тайтл без видео он просто не импортирует. Такие строки могли остаться в базе.") : ""}
    <section class="card"><div class="mod-list">
    ${list.map(item => {
      const okay = eligible(item);
      const reasons = String(item.moderation_reason || "").split(",").filter(Boolean);
      return `<div class="mod-item">
        <input class="box-check" type="checkbox" data-select="moderation" value="${item.id}" ${okay ? "" : "disabled"} aria-label="Выбрать «${esc(item.title)}»" />
        ${thumb({ title: item.title, poster_url: item.poster_url })}
        <div><h4>${esc(item.title)}</h4><div class="why">${reasons.map(r => tag(REASON[r] || r, "warning", r === "no_video" ? "video-off" : r === "poster_url" ? "image-off" : "file-x")).join("")}${statusTag(item.status)}<span class="muted" style="font-size:12px">${ago(item.updated_at)}</span></div></div>
        <div class="mod-actions">${okay ? `<button type="button" class="button s" ${request("moderation.approve", { ids: item.id })}>${icon("check")}Одобрить</button>` : `<span class="muted" style="font-size:12px;align-self:center">Сначала заполните</span>`}<button type="button" class="button s ${okay ? "ghost" : "primary"}" data-action="edit-title" data-slug="${item.slug}">${icon("pencil")}Заполнить</button></div>
      </div>`;
    }).join("")}</div></section>`;
  }

  function renderConflicts() {
    const status = state.conflicts.status;
    const counts = s => D.conflicts.filter(c => c.status === s).length;
    const list = D.conflicts.filter(c => c.status === status);
    const why = { season_mismatch: "Сезоны не совпали", no_match: "Названия не совпали", metadata: "Принят по году и числу серий" };
    return `${pageHead("Конфликты", "Проход «Связанные тайтлы» сверяет каждый тайтл с Shikimori. Если строгая проверка не уверена, что это тот же тайтл, данные не пишутся, а строка попадает сюда.")}
    ${note("warning", "triangle-alert", "<strong>Кнопка «Применить данные Shikimori» в текущем дашборде ничего не меняет в тайтле.</strong> У этого типа конфликта входящие поля (<code>russian</code>, <code>name</code>, <code>id</code>…) не входят в список разрешённых колонок, поэтому любая стратегия только закрывает конфликт. Здесь действия названы честно: «Верно, закрыть» или «Исправить Shikimori ID» в редакторе тайтла.")}
    <div class="toolbar">${seg("conflicts", status, [["pending", "Ждут решения", counts("pending")], ["auto_accepted", "Приняты автоматически", counts("auto_accepted")], ["resolved", "Закрыты", counts("resolved")]])}</div>
    <section class="card">${list.length ? list.map(c => {
      const ex = c.existing_data, inc = c.incoming_data;
      const seasonMismatch = ex.season_number != null && inc.season_number != null && ex.season_number !== inc.season_number;
      return `<article class="conflict">
        <div class="conflict-head"><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">${tag(why[c.reason] || c.reason, c.reason === "metadata" ? "info" : "warning")}<span class="muted mono" style="font-size:12px">shikimori ${esc(c.external_id)} · ${at(c.created_at)}</span></div>
        <div class="conflict-actions">${c.status === "pending" ? `<button type="button" class="button s ghost" data-action="edit-title" data-slug="${esc(ex.slug)}">${icon("pencil")}Исправить Shikimori ID</button><button type="button" class="button s" ${request("conflicts.resolve", { id: c.id, strategy: "keep" })}>${icon("check")}Верно, закрыть</button>` : c.status === "auto_accepted" ? `<button type="button" class="button s ghost" data-action="edit-title" data-slug="${esc(ex.slug)}">${icon("pencil")}Открыть тайтл</button>` : ""}</div></div>
        <div class="diff">
          <div class="diff-side"><h5>${icon("home", "icon-s")}У нас</h5><div class="t">${esc(ex.title)}</div><div class="s">${esc(ex.title_en || "")}</div>
            <dl class="kv"><dt>Shikimori ID</dt><dd class="mono">${esc(ex.shikimori_id)}</dd>${ex.season_number !== undefined ? `<dt>Сезон</dt><dd class="mono ${seasonMismatch ? "mismatch" : ""}">${ex.season_number ?? "не найден"}</dd>` : ""}${ex.aired_on_year ? `<dt>Год / серий</dt><dd class="mono">${ex.aired_on_year} / ${ex.episodes_total}</dd>` : ""}<dt>slug</dt><dd class="mono">${esc(ex.slug)}</dd></dl></div>
          <div class="diff-mid${seasonMismatch ? " is-mismatch" : ""}" aria-hidden="true">${icon(seasonMismatch ? "equal-not" : "arrow-left-right")}</div>
          <div class="diff-side"><h5>${icon("cloud", "icon-s")}Shikimori</h5><div class="t">${esc(inc.russian)}</div><div class="s">${esc(inc.english || inc.name || "")}</div>
            <dl class="kv"><dt>ID</dt><dd class="mono">${esc(inc.id)}</dd>${inc.season_number !== undefined ? `<dt>Сезон</dt><dd class="mono ${seasonMismatch ? "mismatch" : ""}">${inc.season_number ?? "не найден"}</dd>` : ""}${inc.aired_on_year ? `<dt>Год / серий</dt><dd class="mono">${inc.aired_on_year} / ${inc.episodes}</dd>` : ""}</dl></div>
        </div>
      </article>`;
    }).join("") : empty("check-check", "Пусто", "В этом состоянии конфликтов нет.")}</section>`;
  }

  function renderComments() {
    return `${pageHead("Комментарии", "Лента всех комментариев, свежие сверху. Удалить комментарий может только суперпользователь; текст станет «[удалено]».")}
    ${note("warning", "eye-off", "<strong>Очередь «на проверку» всегда пуста.</strong> В API нет действия «скрыть», и новые комментарии создаются видимыми, поэтому кнопке «Одобрить» нечего одобрять. Модератор (<code>comments.moderate</code>) может только читать эту ленту: удалить чужой комментарий он не может.")}
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
    return `${pageHead("Задачи", "Очередь и история запусков. Источник запуска («Расписание», «Вручную», «kitsu-admin») в базе пока не хранится — в шаблоне он показан, чтобы было видно, где ему место.", `<button type="button" class="button" ${request("jobs.clear", { status: "completed" })}>${icon("eraser")}Очистить готовые</button>`)}
    <div class="toolbar">${seg("jobs", st, [["all", "Все", D.jobs.length], ["running", "Идут", n("running")], ["pending", "Ждут", n("pending")], ["completed", "Готово", n("completed")], ["failed", "Ошибки", n("failed")], ["cancelled", "Остановлены", n("cancelled")]])}</div>
    <section class="card"><div class="table-wrap"><table class="data cards"><thead><tr><th>Задача</th><th>Статус</th><th class="opt">Прогресс</th><th class="num">Обработано</th><th class="num opt">Длительность</th><th class="num">Создана</th><th class="actions"><span class="sr-only">Действия</span></th></tr></thead><tbody>
    ${list.length ? list.map(j => `<tr>
      <td class="lead"><div class="cell-title"><div><strong>${esc(jobTitle(j))}</strong><small>${esc(j.source)} · <span class="mono">${esc(j.parser_name)}/${esc(j.job_type)}</span></small></div></div></td>
      <td data-label="Статус">${statusTag(j.status)}</td>
      <td class="opt" data-label="Прогресс" style="min-width:120px">${j.status === "running" ? liveBar(j) : j.status === "pending" ? `<span class="muted" style="font-size:12px">Ждёт свободного слота</span>` : j.error_message ? `<span class="${j.status === "failed" ? "" : "muted"}" style="font-size:12px;color:${j.status === "failed" ? "var(--red)" : ""}">${esc(j.error_message)}</span>` : `<span class="progress"><i style="--p:${j.progress}%"></i></span>`}</td>
      <td class="num" data-label="Обработано">${num(j.items_processed)}${j.items_failed ? ` <span style="color:var(--red)">· ${j.items_failed} ош.</span>` : ""}</td>
      <td class="num opt" data-label="Длительность">${C.fmtDuration(j.duration_seconds)}</td>
      <td class="num" data-label="Создана">${at(j.created_at)}</td>
      <td class="actions"><button type="button" class="icon-btn s" data-action="open-job" data-id="${j.id}" aria-label="Подробно: ${esc(jobTitle(j))}" title="Подробно">${icon("scroll-text")}</button></td>
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
  function renderSchedule() {
    return `${pageHead("Расписание", "Когда задачи запускаются сами. Время — по Алматы; сервер хранит cron в UTC, его видно мелко под каждой строкой.", `<button type="button" class="button primary" data-action="new-schedule">${icon("plus")}Новое расписание</button>`)}
    <section class="card reveal"><div class="card-head"><h2>${icon("calendar-range")}Карта суток</h2><span class="card-meta">Когда что срабатывает, по Алматы</span></div><div class="card-body">${daymap()}</div></section>
    <section class="card"><div class="sched-list">
    ${D.schedules.map(s => {
      const d = C.describeCron(s.cron_expression);
      return `<div class="sched">
        <div class="sched-title"><strong>${esc(scheduleTitle(s))}</strong><small>${esc(s.parser_name)}/${esc(s.job_type)} · cron <span>${esc(s.cron_expression)}</span>${d.utc ? ` (${esc(d.utc)})` : ""}</small></div>
        <div class="sched-when"><strong>${esc(d.text)}</strong><small>Следующий: ${at(s.next_run_at)} · прошлый: ${at(s.last_run_at)}</small></div>
        <div class="sched-actions">
          <label class="switch" title="Включено"><input type="checkbox" ${s.is_active ? "checked" : ""} ${request("schedule.update", { id: s.id, field: "is_active" })} aria-label="Включено" /><span class="track"></span></label>
          <button type="button" class="icon-btn s" ${request("schedule.runNow", { id: s.id, name: scheduleTitle(s) })} aria-label="Запустить сейчас">${icon("play")}</button>
          <button type="button" class="icon-btn s" data-action="edit-schedule" data-id="${s.id}" aria-label="Изменить">${icon("pencil")}</button>
          <button type="button" class="icon-btn s danger" ${request("schedule.delete", { id: s.id, name: scheduleTitle(s) })} aria-label="Удалить">${icon("trash-2")}</button>
        </div>
        ${s.trap ? note("warning", "triangle-alert", esc(s.trap)) : ""}
      </div>`;
    }).join("")}</div></section>
    <div class="grid cols-3">
      ${note("info", "hourglass", "<strong>Шаг — 15 минут.</strong> Пульс воркера проверяет расписание раз в 15 минут, поэтому задача может стартовать с опозданием до 15 минут.")}
      ${note("info", "lock", "<strong>Одна очередь.</strong> Пока идёт долгая задача, плановые ждут. Это видно на пульте как запаздывание.")}
      ${note("warning", "calendar-x", "<strong>Правка cron не сдвигает ближайший запуск.</strong> Сервер не пересчитывает <code>next_run_at</code>: новое время начнёт действовать после ближайшего старого запуска.")}
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
    return `${pageHead("Исключения", "Тайтлы, которые синхронизация и импорт никогда не добавят. Достаточно одного признака: Shikimori ID, Kodik ID или slug.")}
    <section class="card"><div class="card-body"><form class="form-grid bl-form" data-form="blacklist">
      <label class="field"><span>Shikimori ID</span><input class="input mono" name="shikimori_id" type="number" min="1" inputmode="numeric" placeholder="33352" /></label>
      <label class="field"><span>Kodik ID</span><input class="input mono" name="kodik_id" placeholder="serial-77120" /></label>
      <label class="field"><span>slug</span><input class="input mono" name="slug" placeholder="test-title" /></label>
      <button type="submit" class="button primary">${icon("plus")}Добавить</button>
    </form></div></section>
    <section class="card"><div class="table-wrap"><table class="data cards"><thead><tr><th>Признак</th><th>Зачем</th><th class="num">Добавлен</th><th class="actions"><span class="sr-only">Действия</span></th></tr></thead><tbody>
    ${D.blacklist.map(b => `<tr><td class="lead mono">${b.shikimori_id ? `shikimori ${b.shikimori_id}` : b.kodik_id ? esc(b.kodik_id) : `slug ${esc(b.slug)}`}</td><td data-label="Зачем" class="secondary">${esc(b.note)}</td><td class="num" data-label="Добавлен">${at(b.created_at)}</td><td class="actions"><button type="button" class="icon-btn s danger" ${request("blacklist.delete", { id: b.id, name: b.shikimori_id || b.kodik_id || b.slug })} aria-label="Убрать из исключений">${icon("trash-2")}</button></td></tr>`).join("")}
    </tbody></table></div></section>
    ${note("info", "lightbulb", "Колонки «зачем» в таблице <code>parser_anime_blacklist</code> нет. В шаблоне она показана как пожелание: через полгода никто не вспомнит, почему тайтл исключён.")}`;
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
  const checkName = name => esc(name).replace(/\(([0-9*\/ ,-]+)\)/, '(<span class="mono">$1</span>)');
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
    const q = state.users.q.toLowerCase();
    const list = D.users.filter(u => !q || `${u.username} ${u.email}`.toLowerCase().includes(q));
    return `${pageHead("Пользователи", "Поиск по имени и почте. Создавать пользователей из админки нельзя: только регистрация на сайте.")}
    <div class="toolbar"><label class="search grow">${icon("search")}<span class="sr-only">Поиск</span><input class="input" type="search" data-input="users-q" value="${esc(state.users.q)}" placeholder="Имя или email" /></label></div>
    <section class="card"><div class="table-wrap"><table class="data cards"><thead><tr><th>Пользователь</th><th class="opt">Роль</th><th>Доступ в админке</th><th>Состояние</th><th class="num opt">Был</th><th class="actions"><span class="sr-only">Действия</span></th></tr></thead><tbody id="user-rows">
    ${list.map(u => `<tr><td class="lead"><div class="cell-title"><span class="letter" aria-hidden="true">${esc(u.username[0].toUpperCase())}</span><div><strong>${esc(u.username)}</strong><small>${esc(u.email)}</small></div></div></td>
      <td class="opt" data-label="Роль"><span class="mono">${esc(u.role || "без роли")}</span></td>
      <td data-label="Доступ">${accessTag(u)}</td>
      <td data-label="Состояние">${u.is_active ? (u.is_verified ? tag("Активен", "success") : tag("Почта не подтверждена", "warning")) : tag("Забанен", "danger")}</td>
      <td class="num opt" data-label="Был">${at(u.last_seen_at)}</td>
      <td class="actions"><button type="button" class="button s" data-action="open-user" data-id="${u.id}">${icon("user-cog")}Открыть</button></td></tr>`).join("")}
    </tbody></table></div></section>`;
  }

  function renderAccess() {
    const effects = Object.entries(C.permissionEffects);
    return `${pageHead("Доступ", "Что на самом деле даёт каждая роль. В ролях записано много прав, но сервер проверяет только два. Всё остальное открыто одному суперпользователю.")}
    ${note("warning", "key-round", "<strong>Права <code>users.view</code>, <code>users.edit</code>, <code>parsers.*</code>, <code>analytics.view</code> ни на что не влияют.</strong> Роль «admin» без флага суперпользователя не откроет ни парсер, ни пользователей — только серии и источники. Менять сами роли через API нельзя, только назначать.")}
    <div class="role-grid reveal">
      <section class="card role-card"><h3>Суперпользователь</h3><p class="muted" style="font-size:13px">Флаг <code>is_superuser</code>, не роль</p><ul><li>${icon("check")}Всё в админке: парсер, бэкапы, пользователи, настройки</li><li>${icon("check")}Удаление чужих комментариев</li></ul></section>
      ${D.roles.map(role => {
        const items = effects.map(([perm, list]) => ({ on: C.satisfies(role.permissions, perm), perm, list }));
        return `<section class="card role-card"><h3>${esc(role.name)}</h3><p class="muted" style="font-size:13px">${esc(role.description)}</p>
          <ul>${items.flatMap(i => i.list.map(text => `<li class="${i.on ? "" : "off"}">${icon(i.on ? "check" : "minus")}${esc(text)}</li>`)).join("")}</ul>
          <p class="muted" style="font-size:12.5px">Остальные разделы открываются только флагом суперпользователя.</p>
          <div class="perm-list">${role.permissions.map(p => `<code>${esc(p)}</code>`).join("")}</div></section>`;
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
     Настройки
     ========================================================================== */
  function renderSettings() {
    const S = D.settings;
    const fields = S.parserArchive.reduce((sum, c) => sum + c.fields.length, 0);
    return `${pageHead("Настройки", "Раньше здесь было 10 вкладок и около 60 полей. Проверка кода показала: ни одно из них не влияет на работу сайта. Ниже — где на самом деле живёт каждая настройка.")}
    <section class="card glow reveal"><div class="card-body" style="display:grid;gap:12px">
      <div style="display:flex;gap:14px;align-items:flex-start">${icon("search-check", "icon-l")}<div><strong style="font-size:16px">Что показала сверка с кодом</strong><p class="secondary" style="margin-top:4px">Настройки парсера (${S.parserArchive.length} ${C.plural(S.parserArchive.length, "категория", "категории", "категорий")}, ${fields} ${C.plural(fields, "поле", "поля", "полей")}) и настройки сайта (${S.site.length} ${C.plural(S.site.length, "ключ", "ключа", "ключей")}) сохраняются в базу, но текущий Go-бэкенд их не читает. Python-воркер, который читал часть из них, больше не запускается. Пункт меню «Настройки» в дашборде ведёт на несуществующую страницу.</p></div></div>
    </div></section>

    <h2 class="sr-only">Что работает</h2>
    <div class="truth">${S.real.map(r => `<a class="card truth-card" href="#/${r.route}">${icon(r.icon)}<strong>${esc(r.title)}</strong><small>${esc(r.where)}</small><p>${esc(r.how)}</p></a>`).join("")}</div>

    <div class="grid split-even">
      <section class="card"><div class="card-head"><h2>${icon("app-window")}Сайт</h2>${tag("Не подключено", "warning", "unplug")}</div><div class="card-body">
        ${S.site.map(s => `<div class="setting"><div><strong>${esc(s.label)}</strong><small><code>${esc(s.key)}</code></small></div>
          ${s.type === "boolean" ? `<label class="switch"><input type="checkbox" ${s.value ? "checked" : ""} ${request("site.update", { key: s.key })} aria-label="${esc(s.label)}" /><span class="track"></span></label>` : s.type === "color" ? `<span class="swatch-row"><span class="swatch" style="background:${esc(s.value)}" aria-hidden="true"></span><span class="mono secondary">${esc(s.value)}</span></span>` : `<span class="mono secondary">${esc(s.value)}</span>`}
          <div class="tags">${s.retire ? tag("Предлагаю убрать: цвета задаёт тема", "neutral") : tag("Сайт не читает это значение", "warning")}</div></div>`).join("")}
        ${note("info", "lightbulb", "Если подключать, то начать с «Регистрация открыта»: это одна проверка в <code>POST /auth/register</code>. «Режим обслуживания» требует решения, что видят зрители и кто проходит мимо.")}
      </div></section>
      <section class="card"><div class="card-head"><h2>${icon("terminal")}Задано на сервере</h2><span class="card-meta">Меняется только деплоем</span></div><div class="card-body flush env-list">
        ${S.env.map(e => `<div class="env"><strong>${esc(e.name)}</strong><code>${esc(e.value)}</code><small>${esc(e.note)}</small></div>`).join("")}
      </div></section>
    </div>

    <section class="card"><div class="card-head"><h2>${icon("archive")}Архив старых настроек парсера</h2><button type="button" class="button s" ${request("parserSettings.list")}>${icon("file-json")}Выгрузить JSON</button></div>
      <div class="card-body flush archive">${S.parserArchive.map(c => `<details><summary>${icon("chevron-right")}<strong>${esc(c.title)}</strong><span class="count">${c.fields.length}</span><code>${esc(c.category)}</code></summary><div class="inner">${c.note ? note("info", "lightbulb", esc(c.note)) : ""}<div class="field-chips">${c.fields.map(f => `<code>${esc(f)}</code>`).join("")}</div></div></details>`).join("")}</div>
    </section>`;
  }

  /* ==========================================================================
     Панель справа (drawer)
     ========================================================================== */
  let drawerReturn = null;
  function openDrawer(html) {
    const drawer = $("#drawer");
    drawerReturn = document.activeElement;
    drawer.innerHTML = html;
    drawer.hidden = false;
    state.dirty = false;
    refreshIcons(drawer);
    const form = $("form[data-form]", drawer);
    if (form) form.dataset.initial = JSON.stringify(C.readForm(form));
    requestAnimationFrame(() => { drawer.classList.add("is-open"); $("#scrim").classList.add("is-open"); });
    document.body.style.overflow = "hidden";
    setTimeout(() => ($("[autofocus]", drawer) || $(".drawer-head h2", drawer))?.focus?.(), 60);
  }
  function closeDrawer(force = false) {
    const drawer = $("#drawer");
    if (drawer.hidden) return;
    if (state.dirty && !force) {
      confirmDialog({ title: "Закрыть без сохранения?", tone: "warning", icon: "triangle-alert", text: "Изменения в форме пропадут.", ok: "Закрыть", onOk: () => closeDrawer(true) });
      return;
    }
    drawer.classList.remove("is-open");
    $("#scrim").classList.remove("is-open");
    document.body.style.overflow = "";
    setTimeout(() => { drawer.hidden = true; drawer.innerHTML = ""; }, reduceMotion.matches ? 0 : 240);
    drawerReturn?.focus?.();
  }
  const drawerShell = (title, sub, body, foot) => `<div class="drawer-head"><div><h2 id="drawer-title" tabindex="-1">${esc(title)}</h2>${sub ? `<p>${sub}</p>` : ""}<div class="dirty" data-dirty hidden>${icon("pencil-line", "icon-s")}Есть несохранённые изменения</div></div><button type="button" class="icon-btn" data-action="close-drawer" aria-label="Закрыть">${icon("x")}</button></div><div class="drawer-body">${body}</div><div class="drawer-foot">${foot}</div>`;
  const field = (label, name, value, opts = {}) => `<label class="field ${opts.wide ? "wide" : ""}"><span>${esc(label)}${opts.req ? ' <b class="req" aria-hidden="true">*</b>' : ""} <code>${esc(name)}</code></span>${opts.textarea ? `<textarea class="textarea" name="${name}" ${opts.req ? "required" : ""}>${esc(value ?? "")}</textarea>` : opts.options ? `<select class="select" name="${name}">${opts.options.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(value ?? "") ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>` : `<input class="input ${opts.mono ? "mono" : ""}" name="${name}" type="${opts.type || "text"}" value="${esc(value ?? "")}" ${opts.req ? "required" : ""} ${opts.readonly ? 'readonly data-readonly="true"' : ""} ${opts.list ? 'data-list="true"' : ""} ${opts.step ? `step="${opts.step}"` : ""} ${opts.min != null ? `min="${opts.min}"` : ""} ${opts.placeholder ? `placeholder="${esc(opts.placeholder)}"` : ""} />`}${opts.hint ? `<span class="hint">${opts.hint}</span>` : ""}<span class="error" data-error-for="${name}" hidden></span></label>`;

  function titleEditor(item) {
    const isNew = !item;
    item = item || { title: "", slug: "", status: "announced", kind: "tv", genres: [], studios: [], synonyms: [], episodes_aired: 0 };
    const body = `<div class="tabs" role="tablist">${[["main", "Основное"], ["release", "Выход"], ["ids", "Связи и ID"], ["media", "Медиа"], ["sync", "Из синхронизации"]].map(([id, label], i) => `<button type="button" role="tab" data-tab="${id}" aria-selected="${i === 0}">${label}</button>`).join("")}</div>
      <form data-form="anime" data-id="${item.id || ""}" novalidate>
        <div data-panel="main" class="form-grid">
          ${field("Название", "title", item.title, { req: true, wide: true })}
          ${field("slug", "slug", item.slug, { req: true, mono: true, hint: "Адрес страницы: /anime/slug. Смена ломает старые ссылки." })}
          ${field("Тип", "kind", item.kind, { options: [["tv", "Сериал"], ["movie", "Фильм"], ["ova", "OVA"], ["ona", "ONA"], ["special", "Спешл"]] })}
          ${field("Английское название", "title_en", item.title_en)}
          ${field("Японское название", "title_jp", item.title_jp)}
          ${field("Описание", "description", item.description ? "Наследник богатой семьи соглашается помочь странной девушке… (демонстрационный текст)" : "", { textarea: true, wide: true, hint: item.description ? "" : "Пустое описание держит тайтл на модерации." })}
          ${field("Жанры", "genres", (item.genres || []).join(", "), { list: true, wide: true, hint: "Через запятую." })}
          ${field("Студии", "studios", (item.studios || []).join(", "), { list: true, wide: true })}
        </div>
        <div data-panel="release" class="form-grid" hidden>
          ${field("Статус", "status", item.status, { options: [["announced", "Анонс"], ["ongoing", "Выходит"], ["released", "Вышел"]], hint: "Синхронизация пишет announced. Массовая смена статуса пишет anons — это другое значение." })}
          ${field("Возрастной рейтинг", "rating", item.rating, { options: [["", "—"], ["g", "G"], ["pg", "PG"], ["pg_13", "PG-13"], ["r", "R-17"], ["r_plus", "R+"], ["rx", "Rx"]] })}
          ${field("Дата начала", "aired_on", item.aired_on, { type: "date" })}
          ${field("Следующая серия", "next_episode_at", C.utcToLocalInput(item.next_episode_at), { type: "datetime-local", hint: "По Алматы. В API уйдёт в UTC." })}
          ${field("Серий вышло", "episodes_aired", item.episodes_aired, { type: "number", min: 0 })}
          ${field("Серий всего", "episodes_total", item.episodes_total, { type: "number", min: 0 })}
          ${field("Оценка", "score", item.score, { type: "number", step: "0.01", min: 0 })}
        </div>
        <div data-panel="ids" class="form-grid" hidden>
          ${note("warning", "triangle-alert", "Неверный Shikimori ID — главная причина конфликтов: проход «Связанные тайтлы» сверяет по нему название и сезон.")}
          ${field("Shikimori ID", "shikimori_id", item.shikimori_id, { type: "number", min: 0, mono: true })}
          ${field("MyAnimeList ID", "mal_id", item.mal_id, { type: "number", min: 0, mono: true })}
          ${field("Kodik ID", "kodik_id", item.kodik_id, { mono: true })}
          ${field("Shikimori ID по данным Kodik", "kodik_shikimori_id", item.kodik_shikimori_id, { type: "number", min: 0, mono: true, hint: "Что Kodik считает правильным ID. Расхождение с полем выше — повод проверить." })}
          ${field("Ссылка Kodik", "kodik_url", item.kodik_id ? `https://kodik.info/serial/${item.kodik_id}` : "", { wide: true, mono: true })}
        </div>
        <div data-panel="media" class="form-grid" hidden>
          ${field("Постер", "poster_url", item.poster !== false && item.slug ? `/media/posters/${item.slug}.webp` : "", { wide: true, mono: true, hint: "Ссылка http(s) или локальный путь /media/…" })}
          ${field("Обложка", "cover_url", "", { wide: true, mono: true })}
          ${!isNew ? `<div class="wide" style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="button s" ${request("anime.refreshPoster", { slug: item.slug, name: item.title })}>${icon("image-down")}Взять постер из Shikimori</button><button type="button" class="button s" ${request("anime.refresh", { slug: item.slug, name: item.title })}>${icon("refresh-cw")}Перечитать из Kodik</button></div>` : ""}
        </div>
        <div data-panel="sync" hidden>
          ${note("info", "lock", "Эти поля пишет только синхронизация, через API их не изменить.")}
          <dl class="kv" style="margin-top:14px"><dt>Ромадзи</dt><dd>${esc(item.title_romaji || "—")}</dd><dt>Синонимы</dt><dd>${esc((item.synonyms || []).join(", ") || "—")}</dd><dt>Связанных тайтлов</dt><dd class="mono">${item.related ?? 0}</dd><dt>Просмотры</dt><dd class="mono">${num(item.views_count)}</dd><dt>В избранном</dt><dd class="mono">${num(item.favorites_count)}</dd></dl>
        </div>
      </form>`;
    const foot = `${!isNew ? `<button type="button" class="button danger left" ${request("anime.delete", { id: item.id, name: item.title })}>${icon("trash-2")}Удалить</button><a class="button ghost" href="../public/anime.html" target="_blank" rel="noopener">${icon("external-link")}На сайте</a>` : ""}<button type="button" class="button" data-action="close-drawer">Отмена</button><button type="button" class="button primary" data-action="save-form" data-kind="anime" data-request-key="${isNew ? "anime.create" : "anime.update"}">${icon("save")}${isNew ? "Создать" : "Сохранить"}</button>`;
    openDrawer(drawerShell(isNew ? "Новый тайтл" : item.title, isNew ? "Обычно тайтлы добавляет импорт из Kodik. Вручную — для того, чего в Kodik нет." : `${statusTag(item.status)} ${item.needs_moderation ? tag("На модерации", "warning") : ""} <span class="mono">${esc(item.slug)}</span>`, body, foot));
  }

  function episodeDrawer(ep) {
    const isNew = !ep;
    ep = ep || { season: 1, episode: "", is_filler: false, is_recap: false };
    const rels = isNew ? [] : D.releases.filter(r => r.anime === ep.anime && r.episode === ep.episode);
    const body = `<form data-form="episode" novalidate><div class="form-grid">
        ${isNew ? field("Тайтл (anime_id)", "anime_id", "", { wide: true, mono: true, req: true, placeholder: "UUID тайтла", hint: "Проще открыть тайтл и добавить серию оттуда." }) : ""}
        ${field("Сезон", "season", ep.season, { type: "number", min: 0 })}
        ${field("Номер серии", "episode", ep.episode, { type: "number", min: 0, req: true })}
        ${field("Название", "title", ep.title, { wide: true })}
        ${field("Дата выхода", "aired_at", C.utcToLocalInput(ep.aired_at), { type: "datetime-local", hint: "По Алматы" })}
        ${field("Превью", "thumbnail_url", "", { mono: true })}
        <div class="wide" style="display:flex;gap:18px;flex-wrap:wrap"><label class="switch"><input type="checkbox" name="is_filler" ${ep.is_filler ? "checked" : ""} /><span class="track"></span>Филлер</label><label class="switch"><input type="checkbox" name="is_recap" ${ep.is_recap ? "checked" : ""} /><span class="track"></span>Рекап</label></div>
      </div></form>
      ${isNew ? "" : `<h3 style="margin:22px 0 10px;font-size:14px;display:flex;align-items:center;gap:8px">${icon("film")}Источники видео · ${rels.length}</h3>
      <div style="display:grid;gap:8px">${rels.length ? rels.map(r => `<div class="file">${icon("play")}<div><strong>${esc(r.translation_team)} · ${r.translation_type === "voice" ? "озвучка" : "субтитры"}</strong><small>${esc(r.source)} · ${esc(r.quality || "")} · ${esc(r.translation_language)}</small></div>${r.is_active ? (r.is_verified ? tag("Проверен", "success") : tag("Активен", "info")) : tag("Выключен", "neutral")}<div class="file-actions"><button type="button" class="icon-btn s" data-action="edit-release" data-id="${r.id}" aria-label="Изменить источник">${icon("pencil")}</button><button type="button" class="icon-btn s danger" ${request("releases.delete", { id: r.id, name: `${r.translation_team}, серия ${r.episode}` })} aria-label="Удалить источник">${icon("trash-2")}</button></div></div>`).join("") : `<p class="muted">Источников в таблице нет. Плеер на сайте берёт видео из живого плейлиста Kodik, поэтому серия может работать и без них.</p>`}</div>
      <button type="button" class="button s" style="margin-top:10px" data-action="edit-release">${icon("plus")}Добавить источник</button>`}`;
    const foot = `${!isNew ? `<button type="button" class="button danger left" ${request("episodes.delete", { id: ep.id, name: `${ep.anime}, серия ${ep.episode}` })}>${icon("trash-2")}Удалить</button>` : ""}<button type="button" class="button" data-action="close-drawer">Отмена</button><button type="button" class="button primary" data-action="save-form" data-kind="episode" data-request-key="${isNew ? "episodes.create" : "episodes.update"}">${icon("save")}${isNew ? "Создать" : "Сохранить"}</button>`;
    openDrawer(drawerShell(isNew ? "Новая серия" : `${ep.anime} · ${ep.episode} серия`, "Нужно право <code>content.edit</code> или флаг суперпользователя.", body, foot));
  }
  function releaseDrawer(rel) {
    const isNew = !rel;
    rel = rel || { source: "kodik", translation_language: "ru", is_active: true, is_verified: false };
    const body = `<form data-form="release" novalidate><div class="form-grid">
      ${isNew ? field("Серия (episode_id)", "episode_id", "", { wide: true, mono: true, req: true, placeholder: "UUID серии" }) : ""}
      ${field("Источник", "source", rel.source, { req: true })}
      ${field("Качество", "quality", rel.quality, { placeholder: "1080p" })}
      ${field("Тип перевода", "translation_type", rel.translation_type, { options: [["voice", "Озвучка"], ["subtitles", "Субтитры"]] })}
      ${field("Команда", "translation_team", rel.translation_team)}
      ${field("Язык", "translation_language", rel.translation_language, { mono: true })}
      ${field("Внешний ID", "external_id", rel.external_id, { mono: true })}
      ${field("Ссылка", "url", rel.url, { req: true, wide: true, mono: true })}
      ${field("Ссылка для встраивания", "embed_url", rel.embed_url, { wide: true, mono: true })}
      <div class="wide" style="display:flex;gap:18px;flex-wrap:wrap"><label class="switch"><input type="checkbox" name="is_active" ${rel.is_active ? "checked" : ""} /><span class="track"></span>Активен</label><label class="switch"><input type="checkbox" name="is_verified" ${rel.is_verified ? "checked" : ""} /><span class="track"></span>Проверен</label></div>
    </div></form>`;
    openDrawer(drawerShell(isNew ? "Новый источник" : `${rel.translation_team} · ${rel.episode} серия`, esc(rel.anime || ""), body, `<button type="button" class="button" data-action="close-drawer">Отмена</button><button type="button" class="button primary" data-action="save-form" data-kind="release" data-request-key="${isNew ? "releases.create" : "releases.update"}">${icon("save")}Сохранить</button>`));
  }

  function jobDrawer(job) {
    const logs = D.jobLogs.filter(l => job.id.startsWith(l.job));
    const isLive = job.status === "running" || job.status === "pending";
    const body = `<dl class="kv"><dt>Статус</dt><dd>${statusTag(job.status)}</dd><dt>Тип</dt><dd class="mono">${esc(job.parser_name)}/${esc(job.job_type)}</dd><dt>Источник</dt><dd>${esc(job.source)} ${tag("в базе не хранится", "neutral")}</dd><dt>Создана</dt><dd>${at(job.created_at)}</dd><dt>Старт</dt><dd>${at(job.started_at)}</dd><dt>Конец</dt><dd>${at(job.completed_at)}</dd><dt>Длительность</dt><dd>${C.fmtDuration(job.duration_seconds)}</dd>${job.waited ? `<dt>Ожидание</dt><dd>${esc(job.waited)}</dd>` : ""}${job.error_message ? `<dt>Ошибка</dt><dd style="color:var(--red)">${esc(job.error_message)}</dd>` : ""}<dt>ID</dt><dd class="mono" style="font-size:12px">${esc(job.id)}</dd></dl>
      <div class="live-stats" style="margin-top:16px"><div><b>${num(job.items_processed)}</b><span>просмотрено</span></div><div><b>${num(job.items_updated)}</b><span>обновлено</span></div><div><b>${num(job.items_created)}</b><span>создано</span></div><div><b>${num(job.items_failed)}</b><span>ошибок</span></div></div>
      ${job.job_type === "incremental" && job.parser_name === "shikimori" ? note("danger", "ban", "Этот тип не перенесён в Go-воркер и всегда падает. Запускать его не нужно.") : ""}
      <h3 style="margin:22px 0 10px;font-size:14px;display:flex;align-items:center;gap:8px">${icon("scroll-text")}Журнал задачи ${isLive ? tag("обновляется вживую", "live") : ""}</h3>
      <div class="card"><div class="log">${logs.length ? logs.map(l => `<div class="log-row" data-tone="${toneForStatus(l.level)}"><span class="mono muted">${C.fmtTime(l.created_at)}</span><span class="lvl">${esc(labelForStatus(l.level))}</span><span class="msg">${esc(l.message)}</span><span></span></div>`).join("") : `<p class="muted" style="padding:14px">Сообщений нет.</p>`}</div></div>`;
    const foot = `${isLive ? `<button type="button" class="button danger left" ${request("jobs.stop", { id: job.id, name: jobTitle(job) })}>${icon("square")}Остановить</button>` : `<button type="button" class="button ghost left" ${request("jobs.delete", { id: job.id, name: jobTitle(job) })}>${icon("trash-2")}Удалить из истории</button>`}<button type="button" class="button" data-action="close-drawer">Закрыть</button>`;
    openDrawer(drawerShell(jobTitle(job), `${statusTag(job.status)}`, body, foot));
  }

  function scheduleDrawer(s) {
    const isNew = !s;
    const schedulable = D.operations.filter(op => op.works && op.schedulable);
    const cron = s ? s.cron_expression : "0 4 * * *";
    const d = C.describeCron(cron);
    const kind = d.kind === "every" ? "every" : d.kind === "weekly" ? "weekly" : "daily";
    const body = `<form data-form="schedule" novalidate style="display:grid;gap:18px">
      <label class="field"><span>Что запускать</span><select class="select" name="operation" ${isNew ? "" : "disabled"}>${schedulable.map(op => `<option value="${op.key}" ${s && `${s.parser_name}:${s.job_type}` === op.key ? "selected" : ""}>${esc(op.title)}</option>`).join("")}${s && !schedulable.some(op => `${s.parser_name}:${s.job_type}` === op.key) ? `<option selected>${esc(scheduleTitle(s))}</option>` : ""}</select><span class="hint">В списке только операции, которые имеет смысл планировать.</span></label>
      <div class="field"><span>Как часто</span><div class="preset-grid">
        <button type="button" class="preset" data-preset="every" aria-pressed="${kind === "every"}"><strong>Каждые N минут</strong><small>Для новинок</small></button>
        <button type="button" class="preset" data-preset="daily" aria-pressed="${kind === "daily"}"><strong>Раз в день</strong><small>В выбранное время</small></button>
        <button type="button" class="preset" data-preset="weekly" aria-pressed="${kind === "weekly"}"><strong>Раз в неделю</strong><small>День и время</small></button>
      </div></div>
      <div class="form-grid">
        <label class="field" data-show="every" ${kind === "every" ? "" : "hidden"}><span>Интервал</span><select class="select" data-cron="minutes">${[15, 30, 60].map(m => `<option value="${m}" ${d.n === m ? "selected" : ""}>Каждые ${m} минут</option>`).join("")}</select></label>
        <label class="field" data-show="weekly" ${kind === "weekly" ? "" : "hidden"}><span>День</span><select class="select" data-cron="weekday">${["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"].map((n, i) => `<option value="${i}" ${i === 1 ? "selected" : ""}>${n}</option>`).join("")}</select></label>
        <label class="field" data-show="daily weekly" ${kind === "every" ? "hidden" : ""}><span>Время по Алматы</span><input class="input mono" type="time" data-cron="local" value="${d.local || "09:00"}" /></label>
      </div>
      <div class="cron-preview" aria-live="polite" data-cron-preview></div>
      <label class="switch"><input type="checkbox" name="is_active" ${!s || s.is_active ? "checked" : ""} /><span class="track"></span>Включено сразу</label>
      ${isNew ? note("info", "lightbulb", "Сервер ставит первый запуск через час после создания, независимо от выбранного времени. Дальше — по расписанию.") : note("warning", "calendar-x", "Ближайший запуск останется прежним: сервер не пересчитывает его при смене cron.")}
    </form>`;
    openDrawer(drawerShell(isNew ? "Новое расписание" : scheduleTitle(s), "Время вводится по Алматы, сервер получит cron в UTC.", body, `<button type="button" class="button" data-action="close-drawer">Отмена</button><button type="button" class="button primary" data-action="save-schedule" data-id="${s?.id || ""}">${icon("save")}Сохранить</button>`));
    updateCronPreview();
  }
  function cronFromForm() {
    const drawer = $("#drawer");
    const kind = $(".preset[aria-pressed='true']", drawer)?.dataset.preset || "daily";
    return C.buildCron({ kind, minutes: +($("[data-cron='minutes']", drawer)?.value || 30), local: $("[data-cron='local']", drawer)?.value || "09:00", weekday: +($("[data-cron='weekday']", drawer)?.value || 1) });
  }
  function updateCronPreview() {
    const box = $("[data-cron-preview]");
    if (!box) return;
    const cron = cronFromForm();
    const d = C.describeCron(cron);
    box.innerHTML = `${icon("calendar-clock")}<strong>${esc(d.text)}</strong><span class="muted">cron для сервера:</span><code>${esc(cron)}</code>${d.utc ? `<span class="muted">(${esc(d.utc)})</span>` : ""}${d.note ? `<span style="color:var(--kin-text);font-size:12px">${esc(d.note)}</span>` : ""}`;
    refreshIcons(box);
  }

  function userDrawer(u) {
    const role = roleByName(u.role);
    const access = C.effectiveAccess(u, role);
    const body = `<div class="tabs" role="tablist"><button type="button" role="tab" data-tab="profile" aria-selected="true">Профиль</button><button type="button" role="tab" data-tab="access" aria-selected="false">Доступ</button><button type="button" role="tab" data-tab="security" aria-selected="false">Пароль</button></div>
      <form data-form="user" novalidate>
        <div data-panel="profile" class="form-grid">
          ${field("Имя", "username", u.username, { req: true })}
          ${field("Email", "email", u.email, { type: "email", req: true })}
          ${field("Пол", "gender", "", { options: [["", "Не указан"], ["male", "Мужской"], ["female", "Женский"]] })}
          ${field("О себе", "bio", "", { textarea: true, wide: true })}
          <div class="wide"><div class="switch-row"><div><strong>Почта подтверждена</strong><small>Можно отметить вручную, если письмо не дошло</small></div><label class="switch"><input type="checkbox" name="is_verified" ${u.is_verified ? "checked" : ""} aria-label="Почта подтверждена" /><span class="track"></span></label></div></div>
        </div>
        <div data-panel="access" hidden style="display:grid;gap:16px">
          <label class="field"><span>Роль <code>role_id</code></span><select class="select" name="role_id" data-role-select>${[["", "Без роли"], ...D.roles.map(r => [r.id, r.name])].map(([v, l]) => `<option value="${v}" ${role?.id === v ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>
          <div class="switch-row"><div><strong>Суперпользователь</strong><small>Полный доступ ко всему. Забанить суперпользователя нельзя</small></div><label class="switch"><input type="checkbox" name="is_superuser" ${u.is_superuser ? "checked" : ""} aria-label="Суперпользователь" data-role-select /><span class="track"></span></label></div>
          <div class="card" data-access-preview>${accessPreview(access)}</div>
        </div>
        <div data-panel="security" hidden style="display:grid;gap:14px">
          ${field("Новый пароль", "password", "", { type: "password", hint: "Пусто — пароль не меняется. Старые сессии пользователя этим не завершаются." })}
        </div>
      </form>`;
    const ban = u.is_active
      ? `<button type="button" class="button danger left" ${request("users.ban", { id: u.id, name: u.username })} ${u.is_superuser ? 'disabled title="Суперпользователя забанить нельзя"' : ""}>${icon("ban")}Забанить</button>`
      : `<button type="button" class="button left" ${request("users.unban", { id: u.id, name: u.username })}>${icon("undo-2")}Разбанить</button>`;
    openDrawer(drawerShell(u.username, `${esc(u.email)} · с ${C.fmtDate(u.created_at)}`, body, `${ban}<button type="button" class="button" data-action="close-drawer">Отмена</button><button type="button" class="button primary" data-action="save-form" data-kind="user" data-request-key="users.update">${icon("save")}Сохранить</button>`));
  }
  const accessPreview = access => `<div class="card-body" style="display:grid;gap:8px"><strong style="display:flex;gap:8px;align-items:center">${icon("eye")}Что увидит в админке</strong>${access.items.length ? `<ul style="margin:0;padding-left:18px;color:var(--text-secondary)">${access.items.map(i => `<li>${esc(i)}</li>`).join("")}</ul>` : `<p class="muted">Ничего: вход в админку закрыт.</p>`}</div>`;

  function cosmeticDrawer(kind, item) {
    const isNew = !item;
    item = item || { title: "", is_active: true, category: "default" };
    const isAvatar = kind === "avatar";
    const body = `<form data-form="${kind}" novalidate><div class="form-grid">
      <div class="wide" style="display:flex;gap:16px;align-items:center"><div class="tile-art" style="width:96px">${artTile(isAvatar ? item.title || "new" : `d${item.title || "new"}`)}</div><div style="display:grid;gap:8px"><button type="button" class="button s" ${request(isAvatar ? "avatars.upload" : "decorations.upload", { id: item.id || "", name: item.title || "новый" })} ${isNew ? 'disabled title="Сначала сохраните, потом загрузите картинку"' : ""}>${icon("upload")}Загрузить картинку</button><span class="hint muted" style="font-size:12px">${isNew ? "Картинку можно загрузить после создания" : "Или укажите ссылку ниже"}</span></div></div>
      ${field("Название", "title", item.title, { req: true, wide: true })}
      ${field("Ссылка на картинку", "image_url", isNew ? "" : `/media/${isAvatar ? "avatars" : "decorations"}/${item.id}.webp`, { req: true, wide: true, mono: true })}
      ${isAvatar ? field("Категория", "category", item.category, { mono: true }) : ""}
      <div class="wide"><label class="switch"><input type="checkbox" name="is_active" ${item.is_active ? "checked" : ""} /><span class="track"></span>Доступно для выбора</label></div>
    </div></form>`;
    const base = isAvatar ? "avatars" : "decorations";
    openDrawer(drawerShell(isNew ? (isAvatar ? "Новый аватар" : "Новая рамка") : item.title, "", body, `${!isNew ? `<button type="button" class="button danger left" ${request(`${base}.delete`, { id: item.id, name: item.title })}>${icon("trash-2")}Удалить</button>` : ""}<button type="button" class="button" data-action="close-drawer">Отмена</button><button type="button" class="button primary" data-action="save-form" data-kind="${kind}" data-request-key="${base}.${isNew ? "create" : "update"}">${icon("save")}Сохранить</button>`));
  }

  /* ==========================================================================
     Подтверждение и уведомления
     ========================================================================== */
  function confirmDialog({ title, text, tone = "info", icon: ic = "lightbulb", requestKey, body, ok = "Подтвердить", onOk, danger = false }) {
    const dlg = $("#confirm");
    const ep = requestKey ? C.endpoints[requestKey] : null;
    const path = ep ? ep[1].replace(/\{(\w+)\}/g, (_, k) => (body && body[`__${k}`]) || `{${k}}`) : "";
    const visibleBody = body ? Object.fromEntries(Object.entries(body).filter(([k]) => !k.startsWith("__"))) : null;
    dlg.innerHTML = `<div class="dialog-body" data-tone="${tone}"><h2 id="confirm-title">${icon(ic)}${esc(title)}</h2>${text ? `<p>${text}</p>` : ""}
      ${ep ? `<div class="request"><div><b>${ep[0]}</b> /api/v1${esc(path)}</div>${visibleBody && Object.keys(visibleBody).length ? `<div>${esc(JSON.stringify(visibleBody))}</div>` : ""}<span>Доступ: ${esc(ep[2])}${ep[3] ? ` · ${esc(ep[3])}` : ""}</span></div>` : ""}</div>
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
        : { title: `Сменить статус у ${ids.length} ${C.plural(ids.length, "тайтла", "тайтлов", "тайтлов")}`, text: "Внимание: значение «Анонс» запишется как <code>anons</code>, а синхронизация и модерация понимают только <code>announced</code>.", body: { ids, action: "update_status", new_status: $("#bulk-status")?.value } },
      "import.single": { title: "Импортировать из Kodik", text: "Данные возьмутся из Kodik и Shikimori. Если не хватит постера или описания, тайтл уйдёт на модерацию.", icon: "download", ok: "Импортировать", body: { shikimori_id: d.shikimori ? Number(d.shikimori) : null, kodik_id: d.kodik } },
      "moderation.approve": { title: `Одобрить ${ids.length} ${C.plural(ids.length, "тайтл", "тайтла", "тайтлов")}`, text: "Одобренные появятся на сайте. Сервер ещё раз проверит каждый и пропустит неготовые.", icon: "check-check", ok: "Одобрить", body: { anime_ids: ids } },
      "conflicts.resolve": { title: "Закрыть конфликт как «верно»", text: "Тайтл не изменится: конфликт просто уйдёт из очереди. Если Shikimori ID неверный, исправьте его в редакторе тайтла.", icon: "check", ok: "Закрыть", body: { strategy: "keep", __id: d.id } },
      "comments.delete": { title: `Удалить ${name}?`, text: "Текст заменится на «[удалено]», ответы останутся.", danger: true, tone: "danger", icon: "trash-2", ok: "Удалить", body: { __id: d.id } },
      "jobs.trigger": op ? (() => {
        const type = op.dry && dryChoice === "real" ? op.job_type : (op.dry || op.job_type);
        return { title: `Запустить: ${op.title}${op.dry ? (dryChoice === "real" ? " (настоящий)" : " (пробный)") : ""}`, text: `${esc(op.summary)}${op.blocks ? ` <strong>Займёт очередь на ${esc(op.duration)}:</strong> плановые задачи и бэкап будут ждать.` : ""}`, icon: op.danger ? "triangle-alert" : "play", tone: op.danger ? "warning" : "info", ok: "Запустить", body: { parser_name: op.parser, job_type: type } };
      })() : {},
      "jobs.stop": { title: `Остановить ${name}?`, text: "Сделанное до остановки сохранится. Остальное подхватит следующий запуск.", danger: true, tone: "danger", icon: "square", ok: "Остановить", body: { __id: d.id } },
      "jobs.delete": { title: `Удалить ${name} из истории?`, text: "Мониторинг считает отказы по истории задач.", danger: true, tone: "danger", icon: "trash-2", ok: "Удалить", body: { __id: d.id } },
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
      "releases.delete": { title: `Удалить источник ${name}?`, text: "", danger: true, tone: "danger", icon: "trash-2", ok: "Удалить", body: { __id: d.id } },
      "avatars.delete": { title: `Удалить аватар ${name}?`, text: "У пользователей, которые его выбрали, аватар сбросится.", danger: true, tone: "danger", icon: "trash-2", ok: "Удалить", body: { __id: d.id } },
      "decorations.delete": { title: `Удалить рамку ${name}?`, text: "У пользователей, которые её выбрали, рамка сбросится.", danger: true, tone: "danger", icon: "trash-2", ok: "Удалить", body: { __id: d.id } },
      "avatars.upload": { title: "Загрузить картинку", text: "Файл уходит полем <code>file</code> в multipart-запросе.", icon: "upload", ok: "Выбрать файл", body: { __id: d.id } },
      "decorations.upload": { title: "Загрузить картинку", text: "Файл уходит полем <code>file</code> в multipart-запросе.", icon: "upload", ok: "Выбрать файл", body: { __id: d.id } },
      "site.update": { title: "Изменить настройку сайта", text: "Значение сохранится в базе, <strong>но сайт его не читает</strong>: ничего не поменяется, пока бэкенд не начнёт его учитывать.", tone: "warning", icon: "unplug", ok: "Всё равно сохранить", body: { [d.key]: el.checked } },
      "parserSettings.list": { title: "Выгрузить старые настройки", text: "Сохраните как память о том, что было. После выгрузки вкладки можно удалять из интерфейса.", icon: "file-json", ok: "Выгрузить" },
    };
    return { requestKey: key, ...(map[key] || { title: "Отправить запрос" }) };
  }

  /* ==========================================================================
     Палитра команд
     ========================================================================== */
  function cmdItems() {
    const out = [];
    sections.forEach(s => s.pages.forEach(p => out.push({ group: "Страницы", icon: s.icon, label: p.title, hint: s.label, run: () => go(p.id) })));
    D.anime.forEach(a => out.push({ group: "Тайтлы", icon: "clapperboard", label: a.title, hint: a.slug, run: () => { go("catalog/titles"); setTimeout(() => titleEditor(a), 60); } }));
    D.operations.filter(o => o.works).forEach(o => out.push({ group: "Запустить", icon: "play", label: o.title, hint: o.duration, run: () => { go("parser/run"); setTimeout(() => $(`[data-op="${o.key}"]`)?.click(), 120); } }));
    D.users.forEach(u => out.push({ group: "Люди", icon: "user", label: u.username, hint: u.email, run: () => { go("people/users"); setTimeout(() => userDrawer(u), 60); } }));
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
    settings: renderSettings,
  };
  function routeFromHash() {
    const key = location.hash.replace(/^#\/?/, "").split("?")[0];
    return renderers[key] ? key : "pult";
  }
  function go(route) { if (location.hash !== `#/${route}`) location.hash = `#/${route}`; else render(); }

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
  function render() {
    const next = routeFromHash();
    const changed = next !== state.route;
    state.route = next;
    const swap = () => {
      renderChrome();
      const main = $("#main");
      main.innerHTML = `<div class="page">${renderers[state.route]()}</div>`;
      refreshIcons(document);
      countUp(main);
      document.title = `${pages[state.route].title} — Kitsu`;
    };
    if (changed && document.startViewTransition && !reduceMotion.matches) {
      root.classList.add("is-routing");
      document.startViewTransition(swap).finished.finally(() => root.classList.remove("is-routing"));
    } else swap();
    if (changed) { window.scrollTo({ top: 0, behavior: "instant" }); $("#main").focus({ preventScroll: true }); }
    closeSubnav();
  }
  function rerenderMain() {
    const y = window.scrollY;
    const main = $("#main");
    main.innerHTML = `<div class="page">${renderers[state.route]()}</div>`;
    $$(".reveal", main).forEach(el => el.classList.remove("reveal"));
    refreshIcons(main);
    renderChrome();
    refreshIcons($("#shell"));
    window.scrollTo(0, y);
  }

  /* ---------- Вид ---------- */
  function applyThemeColor() {
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = getComputedStyle(root).getPropertyValue("--canvas").trim() || "#0e0b12";
  }
  function withTransition(fn, origin) {
    if (document.startViewTransition && !reduceMotion.matches) document.startViewTransition(fn);
    else fn();
  }
  function togglePalette() {
    withTransition(() => {
      if (root.dataset.palette === "obsidian") delete root.dataset.palette; else root.dataset.palette = "obsidian";
      try { localStorage.setItem("kitsu-palette", root.dataset.palette === "obsidian" ? "obsidian" : "sakura"); } catch (_) {}
      rerenderMain();
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
  function openSubnav() {
    $("#subnav").classList.add("is-open");
    $("#scrim").classList.add("is-open");
    $$("[data-action='subnav']").forEach(b => b.setAttribute("aria-expanded", "true"));
    $(".subnav-link", $("#subnav"))?.focus();
  }
  function closeSubnav() {
    const sub = $("#subnav");
    if (!sub.classList.contains("is-open")) return;
    sub.classList.remove("is-open");
    if ($("#drawer").hidden) $("#scrim").classList.remove("is-open");
    $$("[data-action='subnav']").forEach(b => b.setAttribute("aria-expanded", "false"));
  }

  /* ---------- Формы ---------- */
  function validateAndSave(kind, requestKey) {
    const form = $(`#drawer form[data-form]`);
    const payload = C.readForm(form);
    const errs = C.errors(kind, payload);
    $$("[data-error-for]", form).forEach(node => { node.hidden = true; node.textContent = ""; });
    $$("[aria-invalid]", form).forEach(node => node.removeAttribute("aria-invalid"));
    if (errs.length) {
      errs.forEach(err => {
        const node = $(`[data-error-for="${err.field}"]`, form), input = $(`[name="${err.field}"]`, form);
        if (node) { node.hidden = false; node.textContent = err.text; }
        input?.setAttribute("aria-invalid", "true");
      });
      const first = $(`[name="${errs[0].field}"]`, form);
      const panel = first?.closest("[data-panel]");
      if (panel?.hidden) $(`[data-tab="${panel.dataset.panel}"]`)?.click();
      first?.focus();
      toast("Проверьте форму", `${errs.length} ${C.plural(errs.length, "поле требует", "поля требуют", "полей требуют")} внимания`, "danger", "triangle-alert");
      return;
    }
    if (kind === "user" && payload.password === null) delete payload.password;
    let body = payload;
    if (requestKey.endsWith(".update")) {
      /* PATCH меняет только присланные поля: отправляем лишь изменённое, иначе пустые поля затрут данные. */
      const initial = JSON.parse(form.dataset.initial || "{}");
      body = Object.fromEntries(Object.entries(payload).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(initial[key])));
      if (!Object.keys(body).length) { toast("Нет изменений", "Форма совпадает с тем, что уже сохранено.", "info", "check"); return; }
    }
    confirmDialog({ title: "Сохранить изменения", requestKey, body, icon: "save", ok: "Сохранить", onOk: () => { state.dirty = false; closeDrawer(true); mockDone(requestKey); } });
  }

  /* ---------- События ---------- */
  function handleAction(el, event) {
    const a = el.dataset.action;
    const find = (list, key = "id") => list.find(item => String(item[key]) === String(el.dataset[key]));
    switch (a) {
      case "palette": togglePalette(); break;
      case "theme": toggleTheme(); break;
      case "cmdk": openCmdk(); break;
      case "subnav": $("#subnav").classList.contains("is-open") ? closeSubnav() : openSubnav(); break;
      case "close-drawer": closeDrawer(); break;
      case "refresh": toast("Макет: данные не обновляются", "При переносе кнопка повторит GET /monitoring/health.", "info", "refresh-cw"); break;
      case "new-title": titleEditor(null); break;
      case "edit-title": titleEditor(el.dataset.id ? find(D.anime) : D.anime.find(x => x.slug === el.dataset.slug) || { title: D.moderation.find(m => m.slug === el.dataset.slug)?.title || el.dataset.slug, slug: el.dataset.slug, status: "ongoing", kind: "tv", poster: false, description: false, genres: [], studios: [], needs_moderation: true, id: "demo" }); break;
      case "title-menu": {
        const item = find(D.anime);
        confirmDialog({ title: item.title, icon: "more-horizontal", text: `<div style="display:grid;gap:8px"><button type="button" class="button" data-sub="refresh">${icon("refresh-cw")}Перечитать из Kodik</button><button type="button" class="button" data-sub="poster">${icon("image-down")}Взять постер из Shikimori</button><a class="button" href="../public/anime.html" target="_blank" rel="noopener">${icon("external-link")}Открыть на сайте</a></div>`, ok: "Закрыть" });
        $("#confirm").addEventListener("click", e => {
          const sub = e.target.closest("[data-sub]");
          if (!sub) return;
          $("#confirm").close();
          const fake = document.createElement("button");
          fake.dataset.request = sub.dataset.sub === "refresh" ? "anime.refresh" : "anime.refreshPoster";
          fake.dataset.slug = item.slug; fake.dataset.name = item.title;
          runRequest(fake);
        }, { once: true });
        break;
      }
      case "clear-selection": state.titles.selected.clear(); rerenderMain(); break;
      case "new-episode": episodeDrawer(null); break;
      case "open-episode": episodeDrawer(find(D.episodes)); break;
      case "edit-release": releaseDrawer(el.dataset.id ? find(D.releases) : null); break;
      case "open-job": jobDrawer(find(D.jobs)); break;
      case "new-schedule": scheduleDrawer(null); break;
      case "edit-schedule": scheduleDrawer(find(D.schedules)); break;
      case "save-schedule": {
        const cron = cronFromForm();
        const form = $("#drawer form");
        const op = D.operations.find(o => o.key === $("[name='operation']", form)?.value);
        const body = el.dataset.id ? { cron_expression: cron, is_active: $("[name='is_active']", form).checked, __id: el.dataset.id } : { parser_name: op?.parser, job_type: op?.job_type, cron_expression: cron, is_active: $("[name='is_active']", form).checked };
        confirmDialog({ title: "Сохранить расписание", text: esc(C.describeCron(cron).text), requestKey: el.dataset.id ? "schedule.update" : "schedule.create", body, icon: "calendar-clock", ok: "Сохранить", onOk: () => { closeDrawer(true); mockDone(el.dataset.id ? "schedule.update" : "schedule.create"); } });
        break;
      }
      case "open-user": userDrawer(find(D.users)); break;
      case "new-cosmetic": cosmeticDrawer(el.dataset.kind, null); break;
      case "edit-cosmetic": cosmeticDrawer(el.dataset.kind, el.dataset.kind === "avatar" ? find(D.avatars) : D.decorations.find(x => String(x.id) === el.dataset.id)); break;
      case "save-form": validateAndSave(el.dataset.kind, el.dataset.requestKey); break;
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
      if (name === "titles") { state.titles.filter = value; }
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
    const tab = event.target.closest("[role='tab'][data-tab]");
    if (tab) {
      const scope = tab.closest(".drawer");
      $$("[role='tab']", scope).forEach(t => t.setAttribute("aria-selected", String(t === tab)));
      $$("[data-panel]", scope).forEach(p => { p.hidden = p.dataset.panel !== tab.dataset.tab; });
      return;
    }
    const preset = event.target.closest("[data-preset]");
    if (preset) {
      $$("[data-preset]").forEach(p => p.setAttribute("aria-pressed", String(p === preset)));
      $$("[data-show]").forEach(f => { f.hidden = !f.dataset.show.split(" ").includes(preset.dataset.preset); });
      state.dirty = true; $("[data-dirty]")?.removeAttribute("hidden");
      updateCronPreview();
      return;
    }
    if (event.target.id === "scrim") { if (!$("#drawer").hidden) closeDrawer(); else closeSubnav(); }
    if (event.target.closest(".subnav-link")) closeSubnav();
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
    if (t.closest("#drawer form")) { state.dirty = true; $("[data-dirty]")?.removeAttribute("hidden"); }
    if (t.matches("[data-role-select]")) {
      const form = t.closest("form");
      const role = D.roles.find(r => r.id === $("[name='role_id']", form).value);
      const access = C.effectiveAccess({ is_superuser: $("[name='is_superuser']", form).checked }, role);
      $("[data-access-preview]", form).innerHTML = accessPreview(access);
      refreshIcons($("[data-access-preview]", form));
    }
    if (t.matches("[data-cron]")) updateCronPreview();
  });

  let searchTimer;
  document.addEventListener("input", event => {
    const t = event.target;
    if (t.closest("#drawer form")) { state.dirty = true; $("[data-dirty]")?.removeAttribute("hidden"); }
    if (t.matches("[data-input='titles-q']")) {
      state.titles.q = t.value;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => { $("#title-rows").innerHTML = titleRows(); refreshIcons($("#title-rows")); }, 120);
    }
    if (t.matches("[data-input='users-q']")) {
      state.users.q = t.value;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => { const pos = t.selectionStart; rerenderMain(); const input = $("[data-input='users-q']"); input.focus(); input.setSelectionRange(pos, pos); }, 120);
    }
    if (t.matches("[data-cron]")) updateCronPreview();
  });

  document.addEventListener("submit", event => {
    const form = event.target.closest("[data-form]");
    if (!form) return;
    event.preventDefault();
    if (form.dataset.form === "import-search") { state.importQ = form.q.value; rerenderMain(); $("[data-form='import-search'] input")?.focus(); }
    if (form.dataset.form === "blacklist") {
      const body = C.readForm(form);
      if (!body.shikimori_id && !body.kodik_id && !body.slug) { toast("Укажите хотя бы один признак", "Shikimori ID, Kodik ID или slug", "warning", "triangle-alert"); return; }
      confirmDialog({ title: "Добавить в исключения", text: "Синхронизация и импорт перестанут добавлять этот тайтл. Уже существующий тайтл не удалится.", requestKey: "blacklist.create", body, icon: "ban", ok: "Добавить", onOk: () => mockDone("blacklist.create") });
    }
  });

  document.addEventListener("keydown", event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); openCmdk(); return; }
    if (event.key === "Escape") {
      if ($("#cmdk").open || $("#confirm").open) return;
      if (!$("#drawer").hidden) { closeDrawer(); return; }
      closeSubnav();
    }
    if (event.key === "/" && !/input|textarea|select/i.test(document.activeElement?.tagName || "") && !$("#cmdk").open) { event.preventDefault(); openCmdk(); }
  });

  window.addEventListener("hashchange", render);
  window.addEventListener("scroll", () => $("#shell").classList.toggle("is-scrolled", window.scrollY > 4), { passive: true });

  function initInputModality() {
    document.addEventListener("pointerdown", event => { document.documentElement.dataset.inputModality = "pointer"; }, { capture: true, passive: true });
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

  window.KitsuAdmin = { renderers, state, toneForStatus, labelForStatus, describeRequest, sections };
  render();
  applyThemeColor();
  tickLive();
})();
