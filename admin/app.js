(() => {
  "use strict";

  const viewRoot = document.querySelector("#view-root");
  const appShell = document.querySelector("#app-shell");
  const overlay = document.querySelector("#overlay");
  const commandDialog = document.querySelector("#command-dialog");
  const commandInput = document.querySelector("#command-input");
  const commandResults = document.querySelector("#command-results");
  const dialog = document.querySelector("#dialog");
  const drawer = document.querySelector("#detail-drawer");
  const notificationPopover = document.querySelector("#notification-popover");
  const uiTooltip = document.querySelector("#ui-tooltip");

  let tooltipTimer = null;
  let tooltipOwner = null;
  let returnFocusTo = null;

  const viewMeta = {
    overview: ["Обзор", "Операционный центр"],
    catalog: ["Аниме", "Каталог"],
    episodes: ["Эпизоды", "Каталог"],
    releases: ["Релизы", "Каталог"],
    collections: ["Коллекции", "Каталог"],
    assets: ["Декорации и аватары", "Каталог"],
    "anime-editor": ["Редактор аниме", "Каталог"],
    "episode-editor": ["Редактор эпизода", "Каталог"],
    "release-editor": ["Редактор релиза", "Каталог"],
    parsers: ["Парсер-центр", "Потоки данных"],
    imports: ["Поиск и импорт", "Потоки данных"],
    conflicts: ["Конфликты", "Потоки данных"],
    scheduler: ["Планировщик", "Потоки данных"],
    "parser-settings": ["Настройки парсера", "Потоки данных"],
    moderation: ["Модерация", "Потоки данных"],
    users: ["Пользователи", "Управление"],
    monitoring: ["Мониторинг", "Управление"],
    settings: ["Настройки сайта", "Система"],
    backups: ["Резервные копии", "Система"],
    audit: ["Журнал аудита", "Система"],
  };

  const anime = [
    {
      id: 9253,
      code: "SL",
      title: "Поднятие уровня в одиночку 2",
      original: "Solo Leveling Season 2",
      type: "TV",
      year: 2025,
      episodes: "13 / 13",
      status: "released",
      score: "8.72",
      views: "1,24 млн",
      updated: "12 мин назад",
      a: "#381932",
      b: "#9a587f",
    },
    {
      id: 52991,
      code: "FR",
      title: "Провожающая в последний путь Фрирен",
      original: "Sousou no Frieren",
      type: "TV",
      year: 2023,
      episodes: "28 / 28",
      status: "released",
      score: "9.31",
      views: "986 тыс.",
      updated: "28 мин назад",
      a: "#4b3146",
      b: "#ad8aa0",
    },
    {
      id: 57334,
      code: "DD",
      title: "Дандадан",
      original: "Dandadan",
      type: "TV",
      year: 2024,
      episodes: "12 / 12",
      status: "released",
      score: "8.63",
      views: "844 тыс.",
      updated: "44 мин назад",
      a: "#5a203b",
      b: "#d07598",
    },
    {
      id: 54857,
      code: "RZ",
      title: "Re:Zero 3",
      original: "Re:Zero kara Hajimeru Isekai Seikatsu 3",
      type: "TV",
      year: 2024,
      episodes: "16 / 16",
      status: "announced",
      score: "8.49",
      views: "718 тыс.",
      updated: "1 ч назад",
      a: "#3d2d45",
      b: "#9e7da9",
    },
    {
      id: 58514,
      code: "AP",
      title: "Монолог фармацевта 2",
      original: "Kusuriya no Hitorigoto 2",
      type: "TV",
      year: 2025,
      episodes: "21 / 24",
      status: "ongoing",
      score: "8.77",
      views: "632 тыс.",
      updated: "2 ч назад",
      a: "#5b3d2a",
      b: "#b9875a",
    },
    {
      id: 40748,
      code: "JK",
      title: "Магическая битва",
      original: "Jujutsu Kaisen",
      type: "TV",
      year: 2020,
      episodes: "47 / 47",
      status: "released",
      score: "8.65",
      views: "2,18 млн",
      updated: "вчера",
      a: "#33243b",
      b: "#866f95",
    },
    {
      id: 21,
      code: "OP",
      title: "Ван-Пис",
      original: "One Piece",
      type: "TV",
      year: 1999,
      episodes: "1122 / —",
      status: "ongoing",
      score: "8.73",
      views: "4,82 млн",
      updated: "вчера",
      a: "#553026",
      b: "#c08463",
    },
    {
      id: 16498,
      code: "AT",
      title: "Атака титанов",
      original: "Shingeki no Kyojin",
      type: "TV",
      year: 2013,
      episodes: "94 / 94",
      status: "released",
      score: "8.55",
      views: "3,67 млн",
      updated: "2 дня назад",
      a: "#4b2d2a",
      b: "#a96f64",
    },
  ];

  const jobs = [
    {
      id: "#J-8412",
      source: "Kodik full sync",
      scope: "Полная сверка каталога",
      status: "running",
      progress: null,
      records: "Итоги после завершения",
      started: "10:42",
      duration: "18:42",
    },
    {
      id: "#J-8411",
      source: "Shikimori related refresh",
      scope: "Связи и external ID",
      status: "success",
      progress: 100,
      records: "2 410 обработано",
      started: "09:00",
      duration: "27:08",
    },
    {
      id: "#J-8410",
      source: "Kodik incremental",
      scope: "Релизы и эпизоды",
      status: "success",
      progress: 100,
      records: "1 248 обработано",
      started: "08:30",
      duration: "06:18",
    },
    {
      id: "#J-8409",
      source: "Kodik incremental",
      scope: "Релизы и эпизоды",
      status: "success",
      progress: 100,
      records: "986 обработано",
      started: "08:00",
      duration: "05:54",
    },
    {
      id: "#J-8408",
      source: "Kodik incremental",
      scope: "Релизы и эпизоды",
      status: "failed",
      progress: 62,
      records: "612 обработано",
      started: "вчера, 22:10",
      duration: "01:12",
    },
  ];

  const users = [
    {
      id: 44192,
      initials: "AK",
      name: "Алексей Ким",
      email: "alex.kim@example.com",
      role: "Пользователь",
      status: "active",
      activity: "сейчас",
      joined: "12 янв 2024",
      comments: 128,
    },
    {
      id: 43108,
      initials: "MS",
      name: "Мария Садыкова",
      email: "maria.s@example.com",
      role: "Модератор",
      status: "active",
      activity: "4 мин назад",
      joined: "28 ноя 2023",
      comments: 842,
    },
    {
      id: 41887,
      initials: "DV",
      name: "Данияр Власов",
      email: "d.vlasov@example.com",
      role: "Пользователь",
      status: "active",
      activity: "1 ч назад",
      joined: "6 окт 2023",
      comments: 54,
    },
    {
      id: 40621,
      initials: "YU",
      name: "Юлия Уткина",
      email: "yulia.u@example.com",
      role: "Администратор",
      status: "active",
      activity: "3 ч назад",
      joined: "14 авг 2023",
      comments: 337,
    },
    {
      id: 39884,
      initials: "RR",
      name: "roman.r",
      email: "roman.rr@example.com",
      role: "Пользователь",
      status: "banned",
      activity: "5 дней назад",
      joined: "2 июл 2023",
      comments: 17,
    },
    {
      id: 38152,
      initials: "NT",
      name: "Никита Тен",
      email: "nikita.t@example.com",
      role: "Пользователь",
      status: "active",
      activity: "вчера",
      joined: "19 апр 2023",
      comments: 206,
    },
  ];

  const [initialHashView, initialHashTab] = location.hash.slice(1).split("/");

  const state = {
    currentView: initialHashView in viewMeta ? initialHashView : "overview",
    catalogQuery: "",
    catalogFilter: "all",
    usersRoleFilter: "all",
    selectedAnime: new Set(),
    catalogTimer: null,
    parserTab:
      initialHashView === "parsers" &&
      ["jobs", "logs", "sources"].includes(initialHashTab)
        ? initialHashTab
        : "jobs",
    conflictTab:
      initialHashView === "conflicts" &&
      ["pending", "auto", "resolved"].includes(initialHashTab)
        ? initialHashTab
        : "pending",
    importMode: "search",
    assetTab: "avatars",
    moderationTab:
      initialHashView === "moderation" &&
      ["import", "comments"].includes(initialHashTab)
        ? initialHashTab
        : "import",
    usersTab: "accounts",
    settingsTab: "general",
    parserSettingsTab: "general",
    editorTab: "main",
    commandIndex: 0,
    commandItems: [],
  };

  function filteredAnime() {
    const query = state.catalogQuery.trim().toLocaleLowerCase("ru-RU");
    return anime.filter((item) => {
      const matchesStatus =
        state.catalogFilter === "all" || item.status === state.catalogFilter;
      const haystack = [
        item.id,
        item.title,
        item.original,
        item.type,
        item.year,
      ]
        .join(" ")
        .toLocaleLowerCase("ru-RU");
      return matchesStatus && (!query || haystack.includes(query));
    });
  }

  const icon = (name, className = "") =>
    `<i data-lucide="${name}"${className ? ` class="${className}"` : ""}></i>`;
  const poster = (item, className = "") =>
    `<span class="poster ${className}" style="--poster-a:${item.a};--poster-b:${item.b}"><span>${item.code}</span></span>`;
  const status = (text, tone = "success") =>
    `<span class="status-badge status-badge--${tone}">${text}</span>`;
  const actionButton = (label, action, iconName, primary = false) =>
    `<button class="button${primary ? " button--primary" : ""}" data-action="${action}">${icon(iconName)}<span>${label}</span></button>`;
  const iconAction = (label, action, iconName, extra = "") =>
    `<button class="icon-button ${extra}" data-action="${action}" aria-label="${label}" data-tooltip="${label}">${icon(iconName)}</button>`;
  const sectionTabs = (items, current, attribute) =>
    `<div class="tabs tabs--contained">${items.map(([id, label, count]) => `<button class="${current === id ? "is-active" : ""}" data-${attribute}="${id}">${label}${count ? `<span class="tab-count">${count}</span>` : ""}</button>`).join("")}</div>`;
  const rowActions = (id, kind = "anime") => {
    const editable = ["anime", "episode", "release", "user"].includes(kind);
    return `<div class="row-actions"><button class="row-action" data-action="view-${kind}" data-id="${id}" aria-label="Открыть детали">${icon("panel-right-open")}</button>${editable ? `<button class="row-action" data-action="edit-${kind}" data-id="${id}" aria-label="Редактировать">${icon("pencil")}</button>` : ""}</div>`;
  };
  const toneForStatus = (value) =>
    ({
      published: "success",
      released: "success",
      ongoing: "accent",
      announced: "warning",
      draft: "warning",
      success: "success",
      completed: "success",
      healthy: "success",
      running: "accent",
      pending: "neutral",
      cancelled: "neutral",
      failed: "danger",
      warning: "warning",
      danger: "danger",
      active: "success",
      banned: "danger",
      paused: "warning",
      unreachable: "danger",
      degraded: "warning",
    })[value] || "info";
  const labelForStatus = (value) =>
    ({
      published: "Опубликовано",
      released: "Завершён",
      ongoing: "Онгоинг",
      announced: "Анонс",
      draft: "Черновик",
      success: "Завершено",
      completed: "Завершено",
      healthy: "Работает",
      running: "Выполняется",
      pending: "Ожидает",
      cancelled: "Отменено",
      failed: "Ошибка",
      warning: "С предупреждением",
      danger: "Ошибка",
      active: "Активен",
      banned: "Заблокирован",
      paused: "Приостановлено",
      unreachable: "Недоступен",
      degraded: "Деградация",
    })[value] || value;

  function heading({ eyebrow, title, description, actions = "" }) {
    return `<header class="page-heading"><div class="page-heading__copy"><span class="eyebrow">${eyebrow}</span><h1>${title}</h1><p>${description}</p></div>${actions ? `<div class="heading-actions">${actions}</div>` : ""}</header>`;
  }

  function panel(title, subtitle, body, options = {}) {
    return `<section class="panel${options.flush ? " panel--flush" : ""}${options.attention ? " panel--attention" : ""}"><header class="panel-header"><div class="panel-title-group"><h2 class="panel-title">${title}</h2>${subtitle ? `<p class="panel-subtitle">${subtitle}</p>` : ""}</div>${options.actions ? `<div class="panel-actions">${options.actions}</div>` : ""}</header><div class="panel-body">${body}</div></section>`;
  }

  function kpi(label, value, note, trend, iconName, down = false) {
    return `<article class="kpi"><div class="kpi-label"><span>${label}</span>${icon(iconName)}</div><div class="kpi-main"><strong class="kpi-value">${value}</strong><span class="trend${down ? " trend--down" : ""}">${icon(down ? "trending-down" : "trending-up")}${trend}</span></div><div class="kpi-note">${note}</div></article>`;
  }

  function statTile(label, value, note, iconName) {
    return `<article class="stat-tile"><div class="stat-tile__top"><span>${label}</span>${icon(iconName)}</div><div class="stat-tile__value">${value}</div><div class="stat-tile__note">${note}</div></article>`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function renderImports() {
    const searchResults = [
      [
        anime[0],
        "Kodik",
        "kodik-498912",
        "13 эпизодов",
        "existing external ID",
        "existing",
      ],
      [
        anime[4],
        "Shikimori",
        "shiki-58514",
        "24 эпизода",
        "has_video=true",
        "candidate",
      ],
      [
        anime[2],
        "Kodik",
        "kodik-498721",
        "12 эпизодов",
        "manual comparison",
        "conflict",
      ],
    ];
    const results = `<div class="import-results">${searchResults.map((row) => `<article class="import-result">${poster(row[0], "import-poster")}<div class="import-result__copy"><div class="import-result__title"><div><h3>${row[0].title}</h3><p>${row[0].original} · ${row[0].type}, ${row[0].year}</p></div>${status(row[5] === "existing" ? "Уже в каталоге" : row[5] === "conflict" ? "Нужна сверка" : "Можно импортировать", row[5] === "existing" ? "success" : row[5] === "conflict" ? "warning" : "info")}</div><dl class="inline-definition"><div><dt>Источник</dt><dd>${row[1]}</dd></div><div><dt>External ID</dt><dd>${row[2]}</dd></div><div><dt>Данные</dt><dd>${row[3]}</dd></div><div><dt>Backend field</dt><dd>${row[4]}</dd></div></dl><div class="review-actions"><button class="button button--small" data-action="preview-import" data-id="${row[0].id}">${icon("scan-search")}Сравнить поля</button>${row[5] === "existing" ? `<button class="button button--small" data-action="refresh-anime">${icon("refresh-cw")}Refresh по slug</button><button class="button button--small" data-action="refresh-poster">${icon("image")}Refresh poster</button>` : `<button class="button button--small button--primary" data-action="confirm-single-import">${icon("download")}add-from-kodik</button>`}</div></div></article>`).join("")}</div>`;
    const search = `<section class="search-workbench"><div class="search-workbench__form"><label class="field field--source"><span>Источник</span><select><option>Kodik + Shikimori</option><option>Kodik</option><option>Shikimori</option></select></label><label class="field field--query"><span>Название, URL или внешний ID</span><div class="input-action"><input value="Solo Leveling" placeholder="Например: https://kodik.info/... или 9253"><button class="button button--primary" data-action="run-import-search">${icon("search")}Найти</button></div><small>Поиск ничего не меняет в каталоге. Перед импортом будет показано сравнение.</small></label></div></section>${results}`;
    const batch = `<div class="batch-layout"><section class="panel"><div class="form-section"><h3>Пакетная проверка</h3><p>Отдельного batch-import endpoint нет. Клиент может только валидировать список и затем подтверждать каждый add-from-kodik отдельно.</p><label class="field"><span>Список Kodik URL / Shikimori ID</span><textarea rows="10">https://kodik.info/serial/498912\n58514\nhttps://kodik.info/serial/498721</textarea><small>Распознано 3 записи · дубликаты будут пропущены.</small></label><div class="form-actions"><button class="button" data-action="download-import-template">${icon("download")}Шаблон CSV</button><button class="button button--primary" data-action="validate-batch">${icon("scan-line")}Проверить локально</button></div></div></section><aside class="operation-note"><span class="operation-note__icon">${icon("shield-check")}</span><h3>Что произойдёт</h3><ol><li>Проверка источников и external ID</li><li>Поиск существующих карточек</li><li>Сравнение метаданных и эпизодов</li><li>Явное подтверждение каждой записи через существующий endpoint</li></ol></aside></div>`;
    return `${heading({ eyebrow: "Потоки данных · ручные операции", title: "Поиск и импорт", description: "Search-live, fetch-full и add-from-kodik подтверждены; отдельного batch-import endpoint нет." })}<div class="section-bar">${sectionTabs(
      [
        ["search", "Поиск по источникам"],
        ["batch", "Пакетная проверка"],
      ],
      state.importMode,
      "import-mode",
    )}<div class="section-bar__meta">Provider health этим экраном не измеряется</div></div>${state.importMode === "search" ? search : batch}`;
  }

  function renderControlCenter() {
    const decisionQueue = [
      [
        "conflicts",
        "identity",
        5,
        "Несовпадение идентичности Shikimori",
        "Сезон или найденный title не подтверждены",
        "git-compare-arrows",
        "warning",
      ],
      [
        "moderation",
        "moderation",
        12,
        "Карточки после импорта",
        "7 no_video · 3 poster_url · 2 description",
        "shield-alert",
        "info",
      ],
      [
        "backups",
        "backup",
        1,
        "Не создан media-артефакт",
        "Database-копия готова, media завершилась ошибкой",
        "database-zap",
        "danger",
      ],
      [
        "parsers",
        "jobs",
        2,
        "Ошибки задач за 24 часа",
        "Повторный запуск доступен из журнала задач",
        "triangle-alert",
        "danger",
      ],
    ];
    const decisionTotal = decisionQueue.reduce((sum, row) => sum + row[2], 0);
    const decisionRows = decisionQueue
      .map(
        (row) =>
          `<button class="decision-row" data-view="${row[0]}"><span class="decision-code">${row[1]}</span><span class="decision-count">${row[2]}</span><span class="decision-copy"><strong>${row[3]}</strong><small>${row[4]}</small></span><span class="decision-icon decision-icon--${row[6]}">${icon(row[5])}</span>${icon("chevron-right")}</button>`,
      )
      .join("");
    const queueBreakdown = `<div class="queue-breakdown" role="img" aria-label="Состав очереди: ${decisionQueue.map((row) => `${row[3]} — ${row[2]}`).join(", ")}">${decisionQueue
      .map(
        (row) =>
          `<span class="queue-breakdown__segment queue-breakdown__segment--${row[6]}" style="width:${(row[2] / decisionTotal) * 100}%" data-tooltip="${row[3]} · ${row[2]} из ${decisionTotal}"></span>`,
      )
      .join(
        "",
      )}</div><div class="queue-legend">${decisionQueue
      .map(
        (row) =>
          `<span class="queue-legend__item"><i class="queue-legend__dot queue-breakdown__segment--${row[6]}"></i>${row[1]}<b>${row[2]}</b></span>`,
      )
      .join("")}</div>`;
    const jobsSample = jobs.slice(0, 5);
    const jobRows = jobsSample
      .map((job) => {
        const progress =
          job.progress === null
            ? `<span class="honest-progress"><i></i>Без live progress</span>`
            : `<div class="progress-line"><div class="progress-track"><div class="progress-value" style="width:${job.progress}%"></div></div><span>${job.progress}%</span></div>`;
        return `<tr><td data-label="Задача"><button class="row-leading" data-action="view-job" data-id="${job.id}"><span class="job-glyph job-glyph--${job.status}">${icon(job.status === "running" ? "loader-circle" : job.status === "failed" ? "triangle-alert" : "check")}</span><span class="row-leading__copy"><strong>${job.source}</strong><span>${job.id} · ${job.scope}</span></span></button></td><td data-label="Статус">${status(labelForStatus(job.status), toneForStatus(job.status))}</td><td data-label="Прогресс">${progress}</td><td class="cell-muted" data-label="Старт">${job.started}</td><td class="cell-muted" data-label="Длительность">${job.duration}</td><td data-label=""><button class="icon-button" data-action="view-job" data-id="${job.id}" aria-label="Детали задачи">${icon("panel-right-open")}</button></td></tr>`;
      })
      .join("");
    const jobStatusCounts = jobsSample.reduce((acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    }, {});
    const jobStatusTone = { running: "accent", success: "success", failed: "danger" };
    const jobStatusLabel = { running: "в работе", success: "успешно", failed: "с ошибкой" };
    const jobStatusOrder = Object.keys(jobStatusTone).filter((key) => jobStatusCounts[key]);
    const jobStatusLegend = jobStatusOrder.map((key) => `${jobStatusCounts[key]} ${jobStatusLabel[key]}`).join(" · ");
    const jobStatusStrip = `<div class="status-strip" role="img" aria-label="Статусы среди ${jobsSample.length} загруженных задач: ${jobStatusLegend}"><div class="status-strip__track">${jobStatusOrder
      .map(
        (key) =>
          `<span class="status-strip__segment status-strip__segment--${jobStatusTone[key]}" style="width:${(jobStatusCounts[key] / jobsSample.length) * 100}%"></span>`,
      )
      .join("")}</div><span class="status-strip__legend">${jobStatusLegend}</span></div>`;
    const processedDays = [
      ["9 авг", 742, 210],
      ["10 авг", 891, 340],
      ["11 авг", 654, 180],
      ["12 авг", 1023, 265],
      ["13 авг", 986, 298],
      ["14 авг", 1248, 410],
      ["15 авг", 610, 155],
    ];
    const rowCount = 16;
    const dayTotals = processedDays.map(([, kodik, shikimori]) => kodik + shikimori);
    const chartMaxTotal = Math.max(...dayTotals);
    const totalKodik = processedDays.reduce((sum, row) => sum + row[1], 0);
    const totalShikimori = processedDays.reduce((sum, row) => sum + row[2], 0);
    const trendColumns = processedDays
      .map(([label, kodik, shikimori]) => {
        const total = kodik + shikimori;
        const filled = Math.round((total / chartMaxTotal) * rowCount);
        const kodikCells = filled ? Math.round((kodik / total) * filled) : 0;
        const cells = [];
        for (let i = 0; i < rowCount; i += 1) {
          const posFromBottom = rowCount - 1 - i;
          const tone =
            posFromBottom < kodikCells ? "accent" : posFromBottom < filled ? "info" : "empty";
          cells.push(`<span class="trend-cell trend-cell--${tone}"></span>`);
        }
        return `<div class="trend-column" data-tooltip="${label} · Kodik ${kodik.toLocaleString("ru-RU")} · Shikimori ${shikimori.toLocaleString("ru-RU")}"><div class="trend-column__cells">${cells.join("")}</div><span class="trend-column__label">${label.split(" ")[0]}</span></div>`;
      })
      .join("");
    const processedChart = `<section class="panel panel--flush trend-panel"><header class="panel-header"><div class="panel-title-group"><span class="section-kicker">Обработка источников</span><h2 class="panel-title">Обработано за 7 дней</h2><p class="panel-subtitle">items_processed по Kodik incremental и Shikimori related refresh</p></div><div class="chart-legend"><span class="legend-item"><i class="legend-mark"></i>Kodik · ${totalKodik.toLocaleString("ru-RU")}</span><span class="legend-item"><i class="legend-mark legend-mark--info"></i>Shikimori · ${totalShikimori.toLocaleString("ru-RU")}</span><span class="chart-summary">За неделю <strong>${(totalKodik + totalShikimori).toLocaleString("ru-RU")}</strong></span></div></header><div class="trend-grid" role="img" aria-label="Обработано за 7 дней: Kodik и Shikimori по дням">${trendColumns}</div></section>`;
    return `${heading({ eyebrow: `<span class="status-dot status-dot--ok"></span> Контрактный снимок · поля активного Go API`, title: "Контур управления Kitsu", description: "Решения оператора, реальные фоновые процессы и инфраструктура — без синтетических процентов.", actions: `${actionButton("Найти в источниках", "go-imports", "search-code")}${actionButton("Ручной запуск", "start-sync", "play", true)}` })}<div class="metric-grid"><article class="metric-card metric-card--focus"><span>Пользователи</span><strong>24 812</strong><small>1 284 активны за сутки</small><div class="metric-ratio" role="img" aria-label="1 284 из 24 812 активны за сутки"><span style="width:${((1284 / 24812) * 100).toFixed(1)}%"></span></div></article><article class="metric-card"><span>Аниме</span><strong>3 402</strong><small>184 онгоинга</small><div class="metric-ratio" role="img" aria-label="184 из 3 402 в статусе онгоинг"><span style="width:${((184 / 3402) * 100).toFixed(1)}%"></span></div></article><article class="metric-card"><span>Активные релизы</span><strong>18 429</strong><small>доступны в плеере</small></article><article class="metric-card"><span>Go process uptime</span><strong>3д 11ч</strong><small>данные runtime, не SLA</small></article></div><div class="control-layout">${processedChart}<div class="control-aside"><section class="panel panel--flush decision-panel"><header class="panel-header"><div class="panel-title-group"><span class="section-kicker">01 · Очередь решений</span><h2 class="panel-title">Требуется оператор</h2><p class="panel-subtitle">Только события, которые нельзя безопасно завершить автоматически</p></div><span class="queue-total">20 открыто</span></header>${queueBreakdown}<div class="decision-list">${decisionRows}</div></section><aside class="active-operation"><div class="active-operation__head"><div><span class="section-kicker">02 · Активная операция</span><h2>Kodik full sync</h2><p>#J-8412 · ручной · sample response</p></div>${status("Выполняется", "info")}</div><div class="operation-clock"><strong>18:42</strong><span>прошло с запуска</span></div><div class="indeterminate-track" role="progressbar" aria-label="Задача выполняется без публикации точного прогресса"><span></span></div><div class="truth-note">${icon("info")}<p><strong>Полный sync не публикует промежуточный процент.</strong><br>Live-счётчики для full sync не публикуются. Частичные stats при cancel/timeout могут быть только в terminal ParserJobLog.details; checkpoint/resume API нет.</p></div><div class="operation-actions"><button class="button button--primary" data-action="view-job" data-id="#J-8412">${icon("panel-right-open")}Открыть задачу</button><button class="button button--danger" data-action="stop-job">${icon("square")}Остановить</button></div></aside></div></div><section class="health-ribbon" aria-label="Состояние сервисов"><button data-view="monitoring"><span>Go API</span><strong><i class="status-dot status-dot--ok"></i>online</strong><small>health snapshot</small></button><button data-view="monitoring"><span>PostgreSQL</span><strong><i class="status-dot status-dot--ok"></i>12 ms</strong><small>основная база</small></button><button data-view="monitoring"><span>Cache</span><strong><i class="status-dot status-dot--warning"></i>не проверен*</strong><small>backend возвращает online без probe</small></button><button data-view="parsers"><span>Workers</span><strong><i class="status-dot status-dot--ok"></i>2 active</strong><small>Inspector count · без denominator</small></button><button data-view="monitoring"><span>Storage</span><strong><i class="status-dot status-dot--warning"></i>68%</strong><small>root filesystem · disk_percent</small></button></section><section class="panel panel--flush"><header class="panel-header"><div class="panel-title-group"><span class="section-kicker">03 · Исполнение</span><h2 class="panel-title">Последние задачи</h2><p class="panel-subtitle">Статусы pending · running · completed · failed · cancelled</p>${jobStatusStrip}</div><button class="panel-link" data-view="parsers">Задачи и логи ${icon("arrow-right")}</button></header><div class="table-shell"><table class="data-table responsive"><thead><tr><th>Задача</th><th>Статус</th><th>Прогресс</th><th>Старт</th><th>Длительность</th><th></th></tr></thead><tbody>${jobRows}</tbody></table></div></section>`;
  }

  function renderParserCenterReal() {
    const jobRows = jobs
      .map((job) => {
        const progress =
          job.progress === null
            ? `<span class="honest-progress"><i></i>не публикуется</span>`
            : `<div class="progress-line"><div class="progress-track"><div class="progress-value" style="width:${job.progress}%"></div></div><span>${job.progress}%</span></div>`;
        return `<tr><td><button class="row-leading" data-action="view-job" data-id="${job.id}"><span class="job-glyph job-glyph--${job.status}">${icon(job.status === "running" ? "loader-circle" : job.status === "failed" ? "circle-x" : "check")}</span><span class="row-leading__copy"><strong>${job.source}</strong><span>${job.id} · ${job.scope}</span></span></button></td><td>${status(labelForStatus(job.status), toneForStatus(job.status))}</td><td>${progress}</td><td class="cell-muted">${job.records}</td><td class="cell-muted">${job.duration}</td><td>${rowActions(job.id, "job")}</td></tr>`;
      })
      .join("");
    const jobsView = `<div class="parser-workspace"><aside class="source-matrix"><article class="source-mode source-mode--ready"><div class="source-mode__head"><span>KI</span><div><strong>Kodik incremental</strong><small>релизы и эпизоды</small></div>${status("Работает", "success")}</div><ul><li>Ручной и scheduled запуск</li><li>Live counters доступны</li><li>Каждый trigger создаёт новую job</li></ul><button class="button button--primary button--block" data-action="run-job">${icon("play")}Запустить incremental</button></article><article class="source-mode source-mode--manual"><div class="source-mode__head"><span>KF</span><div><strong>Kodik full sync</strong><small>полная сверка</small></div>${status("Только вручную", "warning")}</div><ul><li>Checkpoint / resume API нет</li><li>Длительность заранее неизвестна</li><li>Без live процента</li></ul><button class="button button--block" data-action="start-sync">${icon("refresh-cw")}Настроить запуск</button></article><article class="source-mode source-mode--ready"><div class="source-mode__head"><span>SR</span><div><strong>Related refresh</strong><small>Shikimori links</small></div>${status("Работает", "success")}</div><ul><li>Только ручной запуск</li><li>Live progress</li><li>Создаёт conflicts</li></ul><button class="button button--block" data-action="run-related-refresh">${icon("git-branch")}Обновить связи</button></article><article class="source-mode source-mode--disabled"><div class="source-mode__head"><span>SM</span><div><strong>Shikimori metadata</strong><small>incremental / full</small></div>${status("Не портировано", "neutral")}</div><ul><li>Worker возвращает ошибку</li><li>Нельзя планировать</li><li>Нет кнопки запуска</li></ul><button class="button button--block" disabled>Недоступно</button></article></aside><section class="panel panel--flush parser-table"><header class="panel-header"><div class="panel-title-group"><h2 class="panel-title">Журнал задач</h2><p class="panel-subtitle">Фактические поля progress и items_processed…items_failed</p></div><div class="panel-header__actions"><button class="button button--small" data-action="clear-jobs">${icon("trash-2")}Очистить журнал</button><button class="button button--small" data-action="refresh-jobs">${icon("refresh-cw")}Обновить</button></div></header><div class="table-toolbar"><div class="toolbar-leading"><label class="search-field">${icon("search")}<input placeholder="ID, источник или статус"></label><button class="filter-button">${icon("list-filter")}Статус</button></div><span class="timezone-chip">${icon("clock-3")}Asia/Almaty · UTC+5</span></div><div class="table-shell"><table class="data-table responsive"><thead><tr><th>Задача</th><th>Статус</th><th>Прогресс</th><th>Результат</th><th>Время</th><th></th></tr></thead><tbody>${jobRows}</tbody></table></div></section></div>`;
    const logsView = `<section class="log-console"><header><div><span class="section-kicker">REST snapshot</span><h2>Глобальный журнал worker</h2></div><div class="log-controls"><button class="filter-chip is-active">Все уровни</button><button class="filter-chip">Warning</button><button class="filter-chip">Error</button><button class="button button--small" data-action="refresh-jobs">${icon("refresh-cw")}Обновить</button></div></header><div class="log-stream"><p><time>11:00:42.218</time><span class="log-level log-level--info">INFO</span><code>job=#J-8412</code><span>kodik full sync: page fetched</span><b>page=41</b></p><p><time>11:00:41.934</time><span class="log-level log-level--info">INFO</span><code>job=#J-8412</code><span>batch committed</span><b>created=18 updated=76 skipped=4</b></p><p><time>10:59:58.102</time><span class="log-level log-level--warning">WARN</span><code>source=kodik</code><span>rate limit backoff</span><b>retry_in=2s</b></p><p><time>10:59:12.044</time><span class="log-level log-level--info">INFO</span><code>worker=parser-2</code><span>heartbeat</span><b>active_jobs=1</b></p><p><time>10:54:03.611</time><span class="log-level log-level--danger">ERROR</span><code>job=#J-8408</code><span>request failed after retry</span><b>source=kodik</b></p></div><footer><span>REST GET /logs · обновление по запросу</span><span>Показан контрактный снимок 5 строк</span></footer></section>`;
    const sourcesView = `<div class="integration-grid"><article class="integration-card"><div class="integration-card__icon">${icon("radio-tower")}</div><div><span class="section-kicker">Primary source</span><h3>Kodik API</h3><p>Каталог видео, эпизоды, релизы и translation metadata.</p></div><dl><dt>Конфигурация</dt><dd>${status("Подключена", "neutral")}</dd><dt>Health probe</dt><dd>Не предусмотрен</dd><dt>Данные</dt><dd>Из parser jobs/logs</dd></dl></article><article class="integration-card"><div class="integration-card__icon">${icon("network")}</div><div><span class="section-kicker">Identity source</span><h3>Shikimori API</h3><p>External IDs и related graph через ручной related refresh.</p></div><dl><dt>Конфигурация</dt><dd>${status("Подключена", "neutral")}</dd><dt>Health probe</dt><dd>Не предусмотрен</dd><dt>Metadata sync</dt><dd>${status("Не портирован", "neutral")}</dd></dl></article><article class="integration-card"><div class="integration-card__icon">${icon("database")}</div><div><span class="section-kicker">Persistence</span><h3>PostgreSQL</h3><p>Jobs, logs, conflicts и транзакционные изменения каталога.</p></div><dl><dt>Состояние</dt><dd>${status("Online", "success")}</dd><dt>Latency</dt><dd>12 ms</dd><dt>Проверка</dt><dd>SELECT 1</dd></dl></article><article class="integration-card"><div class="integration-card__icon">${icon("memory-stick")}</div><div><span class="section-kicker">Coordination</span><h3>Redis</h3><p>Cache, locks и координация фоновых процессов.</p></div><dl><dt>Ответ backend</dt><dd>${status("Online*", "warning")}</dd><dt>Health probe</dt><dd>Не выполняется</dd><dt>Ограничение</dt><dd>Статус hardcoded</dd></dl></article></div>`;
    const body =
      state.parserTab === "logs"
        ? logsView
        : state.parserTab === "sources"
          ? sourcesView
          : jobsView;
    return `${heading({ eyebrow: "Потоки данных · parser jobs", title: "Парсер-центр", description: "Поддерживаемые режимы, честный прогресс, результаты и REST-журнал в одном месте.", actions: `${actionButton("Обновить", "refresh-jobs", "refresh-cw")}${actionButton("Ручной запуск", "start-sync", "play", true)}` })}<div class="section-bar parser-tabs">${sectionTabs(
      [
        ["jobs", "Задачи", "5"],
        ["logs", "Журнал"],
        ["sources", "Источники", "4"],
      ],
      state.parserTab,
      "parser-tab",
    )}<div class="section-bar__meta"><span class="status-dot status-dot--ok"></span>2 active · count из Asynq Inspector</div></div>${body}`;
  }

  function renderConflictsReal() {
    const conflictRows = [
      {
        id: 781,
        title: "Поднятие уровня в одиночку 2",
        kodik: "498912",
        shiki: "58567",
        reason: "season_mismatch",
        expected: "Сезон 2",
        incoming: "Сезон 1",
        reliable: false,
        created: "11 мин назад",
      },
      {
        id: 780,
        title: "Дандадан 2",
        kodik: "512449",
        shiki: "—",
        reason: "no_match",
        expected: "TV · 2025",
        incoming: "Кандидат не найден",
        reliable: false,
        created: "28 мин назад",
      },
      {
        id: 779,
        title: "Монолог фармацевта 2",
        kodik: "509114",
        shiki: "58514",
        reason: "season_mismatch",
        expected: "Сезон 2",
        incoming: "Сезон не указан",
        reliable: false,
        created: "1 ч назад",
      },
    ];
    const autoRows = [
      {
        id: 776,
        title: "Провожающая Фрирен",
        kodik: "472104",
        shiki: "52991",
        reason: "title_year_match",
        expected: "TV · 2023",
        incoming: "TV · 2023",
        reliable: true,
        created: "сегодня, 08:58",
      },
    ];
    const resolvedRows = [
      {
        id: 764,
        title: "Ван-Пис",
        kodik: "34012",
        shiki: "21",
        reason: "resolved_replace",
        expected: "TV · 1999",
        incoming: "TV · 1999",
        reliable: true,
        created: "вчера, 17:31",
      },
    ];
    const data =
      state.conflictTab === "auto"
        ? autoRows
        : state.conflictTab === "resolved"
          ? resolvedRows
          : conflictRows;
    const cards = data
      .map((item) => {
        const actions =
          state.conflictTab === "pending"
            ? `<div class="conflict-actions"><button class="button" data-action="ignore-conflict" data-id="${item.id}">${icon("ban")}Игнорировать</button><button class="button button--primary" data-action="replace-conflict" data-id="${item.id}">${icon("replace")}Заменить связь</button><button class="icon-button" data-action="resolve-conflict" data-id="${item.id}" aria-label="Открыть полные данные">${icon("panel-right-open")}</button></div>`
            : `<button class="button button--small" data-action="view-audit">${icon("scroll-text")}Открыть audit</button>`;
        return `<article class="conflict-card"><header><div><span class="conflict-id">C-${item.id} · shikimori_identity_mismatch</span><h3>${item.title}</h3></div>${status(state.conflictTab === "pending" ? "Ожидает решения" : state.conflictTab === "auto" ? "Auto accepted" : "Решён", state.conflictTab === "pending" ? "warning" : "success")}</header><div class="conflict-grid"><section><span class="compare-source">Текущая запись · Kodik</span><dl><dt>External ID</dt><dd>${item.kodik}</dd><dt>Ожидаемая связь</dt><dd>${item.expected}</dd><dt>Надёжная</dt><dd>${item.reliable ? "Да" : "Нет"}</dd></dl></section><div class="compare-axis"><span>${icon("git-compare-arrows")}</span><small>${item.reason}</small></div><section><span class="compare-source">Incoming · Shikimori</span><dl><dt>Shikimori ID</dt><dd>${item.shiki}</dd><dt>Результат</dt><dd>${item.incoming}</dd><dt>Причина</dt><dd><code>${item.reason}</code></dd></dl></section></div><footer><span>${icon("clock-3")}${item.created} · Asia/Almaty (UTC+5)</span>${actions}</footer></article>`;
      })
      .join("");
    return `${heading({ eyebrow: "Потоки данных · ParserConflict", title: "Конфликты идентичности", description: "Причины season_mismatch и no_match вынесены из JSON в явное сравнение для решения оператора.", actions: actionButton("Обновить очередь", "refresh-jobs", "refresh-cw") })}<div class="conflict-summary"><article><span>Ожидают решения</span><strong>5</strong><small>блокируют автоматическую связь</small></article><article><span>Auto accepted</span><strong>70</strong><small>доступны для аудита</small></article><article><span>Решено сегодня</span><strong>12</strong><small>ignore или replace</small></article><article><span>Network errors</span><strong>1</strong><small>не смешаны с conflicts</small></article></div><div class="section-bar"><div class="tabs tabs--contained"><button class="${state.conflictTab === "pending" ? "is-active" : ""}" data-conflict-tab="pending">Ожидают <span class="tab-count">5</span></button><button class="${state.conflictTab === "auto" ? "is-active" : ""}" data-conflict-tab="auto">Auto accepted <span class="tab-count">70</span></button><button class="${state.conflictTab === "resolved" ? "is-active" : ""}" data-conflict-tab="resolved">Решённые</button></div><div class="section-bar__meta">Стратегии API: ignore · replace</div></div><div class="conflict-list">${cards}</div>`;
  }

  function renderSchedulerReal() {
    return `${heading({ eyebrow: "Потоки данных · ParserSchedule", title: "Планировщик", description: "Расписание оставлено только для поддерживаемого Kodik incremental; длинные операции запускаются вручную.", actions: actionButton("Новое расписание", "create-schedule", "plus", true) })}<div class="scheduler-layout"><section class="schedule-board"><article class="schedule-card schedule-card--active"><header><span class="schedule-symbol">KI</span><div><h3>Kodik incremental</h3><p>parser_name=kodik · job_type=incremental</p></div>${status("Активно", "success")}<button class="switch is-on" data-action="toggle-switch" aria-label="Kodik incremental включён"></button></header><div class="schedule-timing"><div><span>Cron expression</span><strong><code>*/30 * * * *</code></strong><small>каждые 30 минут</small></div><div><span>Последний запуск</span><strong>сегодня, 10:30</strong><small>completed · 06:18</small></div><div><span>Следующий запуск</span><strong>сегодня, 11:30</strong><small>Asia/Almaty · UTC+5</small></div></div><footer><button class="button button--small" data-action="run-job">${icon("play")}Запустить сейчас</button><button class="button button--small" data-action="edit-schedule">${icon("pencil")}Изменить cron</button></footer></article><article class="manual-operation"><span class="manual-operation__index">01</span><div><h3>Kodik full sync</h3><p>Ручной запуск; checkpoint/resume endpoint отсутствует. Не добавлять расписание без повторной проверки worker.</p></div>${status("Manual only", "warning")}<button class="button" data-action="start-sync">Запустить</button></article><article class="manual-operation"><span class="manual-operation__index">02</span><div><h3>Shikimori related refresh</h3><p>Ручной проход связей с live progress и conflict output.</p></div>${status("Manual only", "warning")}<button class="button" data-action="run-related-refresh">Запустить</button></article><article class="manual-operation manual-operation--disabled"><span class="manual-operation__index">03</span><div><h3>Shikimori metadata</h3><p>Incremental/full worker ещё не портирован в Go.</p></div>${status("Недоступно", "neutral")}<button class="button" disabled>Нет действия</button></article></section><aside class="scheduler-aside"><section class="panel"><span class="section-kicker">Поведение backend</span><h2 class="aside-title">Что важно при редактировании</h2><ul class="system-facts"><li>${icon("clock-4")}При создании <code>next_run_at</code> сначала равен now + 1h.</li><li>${icon("refresh-cw")}Cron рассчитывается при следующем recovery-проходе.</li><li>${icon("pencil")}Изменение cron не пересчитывает next_run_at мгновенно.</li><li>${icon("play")}Run now для schedule исполняет incremental.</li></ul></section><section class="timezone-panel"><span>Часовой пояс интерфейса</span><strong>Asia/Almaty</strong><small>UTC+5 · backend timestamps интерпретируются как UTC</small></section></aside></div>`;
  }

  function renderMonitoringReal() {
    const services = [
      ["Go API process", "healthy", "online", "health endpoint", "server-cog"],
      ["PostgreSQL", "healthy", "12 ms", "SELECT 1", "database"],
      [
        "Cache status*",
        "degraded",
        "online*",
        "hardcoded; probe не выполняется",
        "memory-stick",
      ],
      [
        "Parser workers",
        "healthy",
        "2 active",
        "count из Asynq Inspector",
        "workflow",
      ],
      [
        "Root filesystem",
        "degraded",
        "68%",
        "resources.disk_percent",
        "hard-drive",
      ],
    ]
      .map(
        (item) =>
          `<article class="service-state service-state--${item[1]}"><div class="service-state__icon">${icon(item[4])}</div><div><span>${item[0]}</span><strong>${item[2]}</strong><small>${item[3]}</small></div>${status(labelForStatus(item[1]), toneForStatus(item[1]))}</article>`,
      )
      .join("");
    return `${heading({ eyebrow: "Управление · runtime и зависимости", title: "Мониторинг", description: "Latency, worker state и ресурсы процесса. Неизвестное состояние никогда не интерпретируется как ноль или healthy.", actions: actionButton("Обновить проверку", "refresh-monitoring", "refresh-cw", true) })}<div class="monitoring-banner"><div><span class="status-pulse"></span><span><strong>Health endpoint отвечает</strong><small>Контрактный снимок · timestamp приходит от backend</small></span></div><span>5 сигналов · cache без самостоятельного probe</span></div><section class="service-state-grid">${services}</section><div class="monitoring-layout"><section class="panel"><header class="panel-header"><div class="panel-title-group"><span class="section-kicker">Go process</span><h2 class="panel-title">Ресурсы приложения</h2><p class="panel-subtitle">Значения процесса и узла показаны раздельно</p></div></header><div class="resource-list"><div class="resource-row"><div><span>CPU узла</span><strong>24%</strong></div><div class="resource-track"><span style="width:24%"></span></div><small>resources.cpu_percent</small></div><div class="resource-row"><div><span>Память узла</span><strong>41%</strong></div><div class="resource-track"><span style="width:41%"></span></div><small>resources.memory_percent</small></div><div class="resource-row"><div><span>RSS приложения</span><strong>842 MB</strong></div><div class="resource-track"><span style="width:42%"></span></div><small>resources.memory_app_mb · без придуманного лимита</small></div><div class="resource-row resource-row--warning"><div><span>Корневая файловая система</span><strong>68%</strong></div><div class="resource-track"><span style="width:68%"></span></div><small>resources.disk_percent</small></div><div class="resource-row"><div><span>Load average</span><strong>0.62 · 0.54 · 0.48</strong></div><div class="resource-track"><span style="width:31%"></span></div><small>resources.load_avg · 1 / 5 / 15 мин</small></div></div></section><section class="panel panel--flush route-ownership"><header class="panel-header"><div class="panel-title-group"><span class="section-kicker">Response contract</span><h2 class="panel-title">Что действительно возвращается</h2><p class="panel-subtitle">Без предположений о соседних сервисах и маршрутах</p></div></header><div class="route-list"><div><span class="route-owner route-owner--go">DB</span><div><strong>services.database</strong><small>status · latency_ms · SELECT 1</small></div>${status("Проверяется", "success")}</div><div><span class="route-owner route-owner--hybrid">CA</span><div><strong>services.cache</strong><small>status=online без самостоятельной проверки</small></div>${status("Не проверен*", "warning")}</div><div><span class="route-owner route-owner--go">WK</span><div><strong>services.worker</strong><small>status · count из Asynq Inspector</small></div>${status("Проверяется", "success")}</div><div><span class="route-owner route-owner--web">RS</span><div><strong>resources</strong><small>CPU · memory · app RSS · disk · load_avg</small></div>${status("Измеряется", "info")}</div></div></section></div><section class="unknown-state-example"><span>${icon("circle-help")}</span><div><strong>Контракт неизвестного состояния</strong><p>Если dependency недоступна, карточка показывает «Нет данных» и время последнего успешного ответа — не 0 ms и не зелёный статус.</p></div><button class="button button--small" data-action="view-audit">Диагностический audit</button></section>`;
  }

  function renderSiteSettingsReal() {
    return `${heading({ eyebrow: "Система · SystemSetting", title: "Настройки сайта", description: "Только ключи, которые действительно читаются и сохраняются текущим backend.", actions: `${actionButton("История изменений", "settings-history", "history")}${actionButton("Сохранить", "save-settings", "save", true)}` })}<div class="settings-contract"><main class="settings-form"><section class="settings-card"><header><span class="settings-card__number">01</span><div><h2>Идентификация сайта</h2><p>Публичное название из ключа <code>site_name</code></p></div>${status("Редактируется", "neutral")}</header><label class="field field--prominent"><span>Название сайта <code>site_name</code></span><input value="Kitsu Enterprise" autocomplete="off"><small>При интеграции значение всегда берётся из GET /system/settings/site.</small></label></section><section class="settings-card settings-card--critical"><header><span class="settings-card__number">02</span><div><h2>Режим обслуживания</h2><p>Булевый ключ <code>maintenance_mode</code></p></div>${status("Выключен", "success")}</header><div class="maintenance-control"><div><span class="maintenance-icon">${icon("construction")}</span><div><strong>Пользовательский сайт доступен</strong><p>Backend хранит значение, но потребитель maintenance_mode в текущем коде не найден. Не обещать блокировку сайта до реализации и теста consumer.</p></div></div><button class="switch" data-action="toggle-switch" aria-label="Режим обслуживания"></button></div></section><section class="settings-card"><header><span class="settings-card__number">03</span><div><h2>Регистрация</h2><p>Булевый ключ <code>allow_registration</code></p></div>${status("Включена", "success")}</header><div class="maintenance-control"><div><span class="maintenance-icon">${icon("user-plus")}</span><div><strong>Новые аккаунты разрешены</strong><p>Backend хранит значение, но consumer allow_registration в текущем коде не найден. Регистрацию не блокировать только на клиенте.</p></div></div><button class="switch is-on" data-action="toggle-switch" aria-label="Разрешить регистрацию"></button></div></section><section class="settings-card"><header><span class="settings-card__number">04</span><div><h2>Акцентные цвета</h2><p>Ключи <code>accent_primary</code> и <code>accent_danger</code></p></div>${status("Редактируются", "neutral")}</header><div class="form-grid"><label class="field"><span>Основной акцент <code>accent_primary</code></span><div class="input-action"><input type="color" value="#381932" aria-label="Основной акцент"><input value="#381932" autocomplete="off"></div><small>Целевой токен redesign; при интеграции поле сначала показывает фактическое значение GET.</small></label><label class="field"><span>Опасное действие <code>accent_danger</code></span><div class="input-action"><input type="color" value="#b94155" aria-label="Опасный акцент"><input value="#b94155" autocomplete="off"></div><small>Целевой danger-токен; backend пока только хранит значение и не применяет его к UI автоматически.</small></label></div></section><div class="settings-savebar"><div><span class="status-dot status-dot--ok"></span><span><strong>Пять значений загружены</strong><small>GET возвращает map без actor и updated_at</small></span></div><button class="button button--primary" data-action="save-settings">${icon("save")}Сохранить 5 ключей</button></div></main><aside class="settings-context"><section class="panel"><span class="section-kicker">Контракт конфигурации</span><h2 class="aside-title">Область настроек</h2><dl class="definition-list"><dt>Seeded keys</dt><dd>5</dd><dt>Источник</dt><dd>SystemSetting API</dd><dt>Чтение Go</dt><dd>Напрямую из БД</dd><dt>PATCH</dt><dd>Только существующие ключи</dd></dl></section><section class="cache-card"><span class="cache-card__icon">${icon("database-zap")}</span><div><strong>Настройки читаются из БД</strong><p>После PATCH backend инвалидирует cache namespaces; отдельный cache-health здесь не возвращается.</p></div>${status("DB source", "neutral")}</section><section class="scope-note"><span>${icon("info")}</span><p>Public URL, язык, комментарии и timezone не добавлены: этих ключей нет в seeded contract. Регистрация и два accent-ключа включены ниже.</p></section></aside></div>`;
  }

  function renderBackupsReal() {
    const rows = [
      [
        "B-2042",
        "kitsu-db-2026-08-13-0400.sql.gz",
        "database",
        "3,8 GB",
        "success",
        "Сегодня, 04:00",
        "manual",
        "",
      ],
      [
        "B-2043",
        "kitsu-media-2026-08-13-0400.tar.zst",
        "media",
        "12,6 GB",
        "success",
        "Сегодня, 04:00",
        "manual",
        "",
      ],
      [
        "B-2040",
        "kitsu-db-2026-08-12-0400.sql.gz",
        "database",
        "3,7 GB",
        "success",
        "Вчера, 04:00",
        "automatic",
        "",
      ],
      [
        "B-2041",
        "kitsu-media-2026-08-12-0400.tar.zst",
        "media",
        "—",
        "failed",
        "Вчера, 04:00",
        "automatic",
        "media volume read timeout",
      ],
      [
        "B-2038",
        "kitsu-db-2026-08-11-0400.sql.gz",
        "database",
        "3,7 GB",
        "success",
        "11 авг, 04:00",
        "automatic",
        "",
      ],
    ]
      .map((row) => {
        const stateBadge =
          row[4] === "success"
            ? status("Готов", "success")
            : status("Ошибка", "danger");
        const actions =
          row[4] === "success"
            ? `<div class="row-actions"><button class="row-action" data-action="download-backup" data-id="${row[0]}" aria-label="Скачать">${icon("download")}</button><button class="row-action" data-action="delete-backup" data-id="${row[0]}" aria-label="Удалить">${icon("trash-2")}</button></div>`
            : `<button class="button button--small" data-action="create-backup">Повторить пару</button>`;
        const failure = row[7]
          ? `<div class="failure-reason">${icon("triangle-alert")} ${row[7]}</div>`
          : "";
        return `<tr class="${row[4] === "failed" ? "is-error" : ""}"><td data-label="Артефакт"><div class="row-leading"><span class="backup-kind backup-kind--${row[2]}">${icon(row[2] === "database" ? "database" : "images")}</span><span class="row-leading__copy"><strong>${row[1]}</strong><span>${row[0]} · ${row[6]}</span></span></div>${failure}</td><td data-label="Kind"><code>${row[2]}</code></td><td data-label="Размер">${row[3]}</td><td data-label="Статус">${stateBadge}</td><td data-label="Создан">${row[5]}<small class="cell-subline">Asia/Almaty · UTC+5</small></td><td data-label="Действия">${actions}</td></tr>`;
      })
      .join("");
    return `${heading({ eyebrow: "Система · BackupRecord", title: "Резервные копии", description: "Каждый запуск создаёт database и media отдельно; успех, ошибка и failure_reason видны на уровне артефакта.", actions: actionButton("Создать database + media", "create-backup", "database-backup", true) })}<div class="backup-overview"><article class="backup-primary"><span class="section-kicker">Последний successful database artifact</span><strong>Сегодня, 04:00</strong><p>kitsu-db-2026-08-13-0400.sql.gz · 3,8 GB</p>${status("completed", "success")}</article><article><span>Загружено</span><strong>5</strong><small>artifact rows в текущем response</small></article><article><span>Completed</span><strong>4</strong><small>в загруженной выборке</small></article><article class="backup-warning"><span>Failed</span><strong>1</strong><small>failure_reason показан в строке</small></article></div><section class="panel panel--flush"><header class="panel-header"><div class="panel-title-group"><h2 class="panel-title">Артефакты</h2><p class="panel-subtitle">Возраст считается от последней успешной database-копии, а не от последней попытки</p></div><div class="legend-inline"><span><i class="legend-swatch legend-swatch--database"></i>database</span><span><i class="legend-swatch legend-swatch--media"></i>media</span></div></header><div class="table-shell"><table class="data-table responsive"><thead><tr><th>Артефакт</th><th>Kind</th><th>Размер</th><th>Статус</th><th>Создан</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></section><section class="no-restore"><span>${icon("shield-x")}</span><div><strong>Restore не является admin-действием</strong><p>Это осознанное ограничение текущего backend. Здесь доступны create, list, download и delete.</p></div></section>`;
  }

  function renderParserSettingsReal() {
    const categories = [
      [
        "general",
        "General",
        "plug-zap",
        "Global network and provider settings",
      ],
      [
        "notifications",
        "Notifications",
        "bell",
        "Alerting and pulse relay protocols",
      ],
      [
        "advanced",
        "Advanced",
        "cpu",
        "High-concurrency tuning and engine logic",
      ],
      [
        "blacklist",
        "Blacklist",
        "shield-ban",
        "Content exclusion and metadata interceptors",
      ],
      [
        "grabbing",
        "Grabbing",
        "download-cloud",
        "Metadata filters and quality thresholds",
      ],
      ["fields", "Fields", "list-tree", "Schema mapping and template engine"],
      [
        "images",
        "Images",
        "image",
        "Visual asset localization and optimization",
      ],
      ["player", "Player", "play-square", "CDN hierarchy and streaming logic"],
    ];
    const nav = categories
      .map(
        (item) =>
          `<button class="${state.parserSettingsTab === item[0] ? "is-active" : ""}" data-parser-settings-tab="${item[0]}">${icon(item[2])}<span>${item[1]}</span></button>`,
      )
      .join("");
    const selected =
      categories.find((item) => item[0] === state.parserSettingsTab) ||
      categories[0];
    const blacklist =
      selected[0] === "blacklist"
        ? `<section class="config-section"><header><div><span class="section-kicker">Отдельный ресурс</span><h2>ParserAnimeBlacklist</h2><p>Это GET/POST/DELETE /dashboard/parsers/blacklist, а не JSON из parser_settings.</p></div><button class="button" data-action="add-blacklist">${icon("plus")}Добавить запись</button></header><div class="blacklist-table"><div><strong>shikimori_id=58567</strong><span>kodik_id=498912 · slug=null</span><button class="row-action" data-action="remove-blacklist" aria-label="Удалить blacklist entry 58567">${icon("trash-2")}</button></div><div><strong>slug=sample-anime-slug</strong><span>shikimori_id=null · kodik_id=null</span><button class="row-action" data-action="remove-blacklist" aria-label="Удалить blacklist entry sample-anime-slug">${icon("trash-2")}</button></div><div><strong>kodik_id=472104</strong><span>shikimori_id=null · slug=null</span><button class="row-action" data-action="remove-blacklist" aria-label="Удалить blacklist entry 472104">${icon("trash-2")}</button></div></div></section>`
        : "";
    return `${heading({ eyebrow: "Потоки данных · ParserSettings", title: "Настройки парсера", description: "Восемь seeded categories и произвольный JSON contract — без выдуманных typed-полей.", actions: `${actionButton("Экспорт JSON", "export-parser-settings", "download")}${actionButton("Сохранить JSON", "save-parser-settings", "save", true)}` })}<div class="config-layout"><nav class="config-nav" aria-label="Категории настроек парсера">${nav}</nav><main class="config-content"><div class="truth-note">${icon("triangle-alert")}<p><strong>Сохранено не значит применено.</strong><br>PATCH записывает category, description и config, но активный Go worker не читает parser_settings. Перед типизацией каждого ключа сначала найти runtime-consumer и тест.</p></div><section class="config-section"><header><div><span class="section-kicker">${selected[0]}</span><h2>${selected[1]}</h2><p>${selected[3]}</p></div>${status("Stored JSON", "neutral")}</header><div class="form-grid form-grid--editor"><label class="field field--full"><span>description</span><input value="${selected[3]}"></label><label class="field field--full"><span>config · JSON object</span><textarea id="parser-settings-config" rows="12" spellcheck="false" aria-label="JSON config ${selected[0]}">{}</textarea><small>GET возвращает фактический object. PATCH может upsert category; UI не должен подставлять клиентские defaults поверх ответа.</small></label></div><dl class="definition-list"><dt>Read</dt><dd>GET /dashboard/parsers/settings</dd><dt>Write</dt><dd>PATCH /dashboard/parsers/settings/${selected[0]}</dd><dt>Runtime consumer</dt><dd>Не найден в Go worker</dd><dt>Applied status</dt><dd>Неизвестно</dd></dl></section>${blacklist}<div class="config-footer"><span>updated_at и updated_by показывать только из GET response</span><button class="button button--primary" data-action="save-parser-settings">${icon("save")}Сохранить JSON</button></div></main></div>`;
  }

  function renderAnimeEditorReal() {
    const main = `<section class="editor-section"><header><div><span class="section-kicker">Anime · основные поля</span><h2>Идентификация и выпуск</h2><p>Поля соответствуют текущему anime form contract.</p></div></header><div class="form-grid form-grid--editor"><label class="field field--full"><span>Название <b>*</b></span><input value="Поднятие уровня в одиночку 2"></label><label class="field"><span>Название на английском</span><input value="Solo Leveling Season 2"></label><label class="field"><span>Название на японском</span><input value="Ore dake Level Up na Ken Season 2"></label><label class="field field--full"><span>Slug <b>*</b></span><div class="input-prefix"><span>/anime/</span><input value="solo-leveling-season-2"></div></label><label class="field"><span>Kind <b>*</b></span><select><option>tv</option><option>movie</option><option>ova</option><option>ona</option><option>special</option><option>music</option><option>tv_special</option></select></label><label class="field"><span>Статус выхода <b>*</b></span><select><option>ongoing</option><option>released</option><option>announced</option></select></label><label class="field"><span>Rating</span><select><option>G</option><option>PG</option><option selected>PG13</option><option>R</option><option>R+</option><option>Rx</option></select></label><label class="field"><span>Год</span><input type="number" value="2025"></label><label class="field"><span>Дата начала</span><input type="date" value="2025-01-05"><small>aired_on · дата без времени</small></label><label class="field"><span>Оценка</span><input type="number" value="8.72" min="0" max="10" step="0.01"></label><label class="field"><span>Эпизодов вышло</span><input type="number" value="13"></label><label class="field"><span>Эпизодов всего</span><input type="number" value="13"></label><label class="field field--full"><span>Описание</span><textarea rows="8">После завершения первого рейда Сон Джину продолжает развивать способности и сталкивается с угрозой, меняющей баланс между охотниками.</textarea><small>Incoming-описание не перезапишет ручную правку без модерации.</small></label><label class="field field--full"><span>Жанры</span><div class="token-input"><span>Экшен ${icon("x")}</span><span>Фэнтези ${icon("x")}</span><span>Приключения ${icon("x")}</span><input placeholder="Добавить существующий жанр"></div></label><label class="field field--full"><span>Студии</span><div class="token-input"><span>A-1 Pictures ${icon("x")}</span><input placeholder="Добавить студию"></div></label></div></section>`;
    const media = `<section class="editor-section"><header><div><span class="section-kicker">Anime · media fields</span><h2>Постер и обложка</h2><p>Anime хранит poster_url и cover_url. Отдельного upload/validate endpoint для этих полей нет.</p></div><span class="unsupported-label">Без server URL probe</span></header><div class="media-editor-real"><article><div class="poster poster--large" style="--poster-a:#381932;--poster-b:#9a587f"><span>SL</span></div><div><h3>Постер · 2:3</h3><label class="field"><span>poster_url</span><div class="input-action"><input value="/media/posters/solo-leveling-season-2.webp"><button class="button" data-action="validate-url-local">Проверить формат</button></div></label><div class="media-meta"><span>Значение из Anime response</span><span>Доступность не проверена</span></div><div class="review-actions"><button class="button button--small" data-action="refresh-poster">${icon("refresh-cw")}Обновить из Shikimori</button></div></div></article><article><div class="cover-placeholder cover-placeholder--plum"><span>KITSU / SOLO LEVELING</span></div><div><h3>Обложка · 16:9</h3><label class="field"><span>cover_url</span><div class="input-action"><input value="/media/covers/solo-leveling-season-2.webp"><button class="button" data-action="validate-url-local">Проверить формат</button></div></label><div class="media-meta"><span>Значение из Anime response</span><span>Доступность не проверена</span></div></div></article></div><div class="truth-note">${icon("info")}<p><strong>Не переносить сюда parser image defaults.</strong><br>parser_settings хранит JSON, но активный Go worker его не читает; ручной Anime PATCH сохраняет только URL-поля.</p></div></section>`;
    const sources = `<section class="editor-section"><header><div><span class="section-kicker">Anime · внешние связи</span><h2>Источники и идентификаторы</h2><p>Изменение external ID требует non-mutating сравнения до PATCH.</p></div><button class="button" data-action="preview-source-identity">${icon("scan-search")}Сравнить через fetch-full</button></header><div class="form-grid form-grid--editor"><label class="field"><span>Kodik ID</span><input value="498912"></label><label class="field"><span>Kodik URL</span><input value="https://kodik.info/serial/498912"></label><label class="field"><span>Shikimori ID</span><input value="58567"></label><label class="field"><span>MyAnimeList ID</span><input value="58567"></label></div><div class="truth-note">${icon("git-compare-arrows")}<p><strong>Verdict не вычисляется из ID на клиенте.</strong><br>POST /dashboard/parsers/fetch-full возвращает объединённого кандидата; конфликт решается только через ParserConflict API.</p></div></section>`;
    const review = `<section class="editor-section"><header><div><span class="section-kicker">Anime · moderation</span><h2>Контроль карточки</h2><p>needs_moderation и moderation_reason показаны как явные условия решения.</p></div>${status("Нужна проверка", "warning")}</header><div class="moderation-reasons"><article class="is-resolved"><span>${icon("check")}</span><div><strong>poster_url</strong><p>Поле заполнено; server probe доступности отсутствует.</p></div>${status("Поле есть", "success")}</article><article class="is-resolved"><span>${icon("check")}</span><div><strong>description</strong><p>Непустое описание соответствует approve-rule.</p></div>${status("Поле есть", "success")}</article><article><span>${icon("video-off")}</span><div><strong>no_video</strong><p>Для released/ongoing нужен kodik_url. Announced можно одобрить без него.</p></div>${status("Блокирует", "danger")}</article></div><div class="approval-gate"><div><span>${icon("shield-alert")}</span><div><strong>Одобрение пока недоступно</strong><p>Добавьте kodik_url либо измените status на announced, если это действительно анонс.</p></div></div><button class="button" disabled>Одобрить карточку</button></div></section>`;
    const content = { main, media, sources, review }[state.editorTab] || main;
    return `<div class="editor-shell editor-shell--real"><header class="editor-topline"><div class="editor-topline__copy"><button class="back-link" data-view="catalog">${icon("arrow-left")}Каталог аниме</button><div><h1>Поднятие уровня в одиночку 2</h1><p>anime:9253 · ongoing · needs_moderation · sample response</p></div></div><div class="editor-actions"><button class="button" data-action="preview-content">${icon("eye")}Сводка перед PATCH</button><button class="button button--primary" data-action="save-anime">${icon("save")}Сохранить Anime</button></div></header><div class="editor-tabs">${sectionTabs(
      [
        ["main", "Основное"],
        ["media", "Медиа"],
        ["sources", "Источники"],
        ["review", "Модерация", "1"],
      ],
      state.editorTab,
      "editor-tab",
    )}</div><div class="editor-layout"><main class="editor-main">${content}</main><aside class="editor-rail"><section class="rail-card rail-card--identity"><span class="section-kicker">Record</span><h3>Anime #9253</h3><dl class="definition-list"><dt>Kind</dt><dd>tv</dd><dt>Status</dt><dd>ongoing</dd><dt>Kodik ID</dt><dd>498912</dd><dt>Shikimori ID</dt><dd>58567</dd></dl></section><section class="rail-card"><h3>Временные метки</h3><dl class="definition-list"><dt>Создано</dt><dd>12 янв 2025, 04:18 UTC</dd><dt>Обновлено</dt><dd>13 авг 2026, 05:48 UTC</dd><dt>В интерфейсе</dt><dd>10:48 UTC+5</dd></dl></section><section class="rail-card"><h3>Готовность данных</h3><ul class="check-list"><li class="is-done">${icon("check")}Обязательные поля</li><li class="is-done">${icon("check")}External ID</li><li class="is-done">${icon("check")}Постер и описание</li><li>${icon("circle")}Active release</li></ul></section></aside></div></div>`;
  }

  function renderEpisodeEditorReal() {
    return `<div class="editor-shell editor-shell--real"><header class="editor-topline"><div class="editor-topline__copy"><button class="back-link" data-view="episodes">${icon("arrow-left")}Эпизоды</button><div><h1>Новый эпизод</h1><p>Episode form · временные метки сохраняются в UTC</p></div></div><div class="editor-actions"><button class="button" data-view="episodes">Отмена</button><button class="button button--primary" data-action="save-episode">${icon("save")}Сохранить Episode</button></div></header><div class="editor-layout editor-layout--compact"><main class="editor-main"><section class="editor-section"><header><div><span class="section-kicker">Episode · обязательные данные</span><h2>Эпизод и связь с аниме</h2><p>После успешного POST можно создать один или несколько Release.</p></div></header><div class="form-grid form-grid--editor"><label class="field field--full"><span>Аниме <b>*</b></span><div class="entity-select"><span class="poster poster--tiny" style="--poster-a:#381932;--poster-b:#9a587f"><span>SL</span></span><span><strong>Поднятие уровня в одиночку 2</strong><small>anime:9253 · tv · ongoing · sample response</small></span><button class="button button--small" data-action="choose-anime">Изменить</button></div></label><label class="field"><span>Сезон <b>*</b></span><input type="number" value="2" min="0"></label><label class="field"><span>Номер эпизода <b>*</b></span><input type="number" value="14" min="0" step="1"></label><label class="field field--full"><span>Название</span><input placeholder="Название эпизода, если известно"></label><label class="field"><span>Дата и время выхода</span><input type="datetime-local" value="2026-08-13T12:00"><small>aired_at · введено как Asia/Almaty UTC+5</small></label><label class="field"><span>Значение для API</span><input value="2026-08-13T07:00:00Z" readonly><small>Нормализовано в UTC</small></label><label class="field field--full"><span>Thumbnail URL</span><div class="input-action"><input placeholder="https://…"><button class="button" data-action="validate-url-local">${icon("scan-search")}Проверить формат</button></div><small>Локальная schema-проверка; server probe отсутствует.</small></label></div><div class="binary-options"><div class="switch-row"><span class="switch-copy"><strong>Филлер</strong><small>is_filler=true</small></span><button class="switch" data-action="toggle-switch"></button></div><div class="switch-row"><span class="switch-copy"><strong>Рекап</strong><small>is_recap=true</small></span><button class="switch" data-action="toggle-switch"></button></div></div></section></main><aside class="editor-rail"><section class="rail-card"><h3>Уникальность</h3><div class="source-check"><span class="status-dot status-dot--warning"></span><div><strong>Проверяется POST mutation</strong><p>season=2 · episode=14</p></div></div></section><section class="rail-card"><h3>После сохранения</h3><p>Релизы загружаются отдельным endpoint по episode_id.</p><button class="button button--small" data-view="release-editor">Создать Release</button></section><section class="rail-card rail-card--timezone"><h3>Часовой пояс</h3><strong>Asia/Almaty · UTC+5</strong><p>Backend timestamps интерпретируются и сохраняются как UTC.</p></section></aside></div></div>`;
  }

  function renderReleaseEditorReal() {
    return `<div class="editor-shell editor-shell--real"><header class="editor-topline"><div class="editor-topline__copy"><button class="back-link" data-view="releases">${icon("arrow-left")}Релизы</button><div><h1>Новый релиз</h1><p>Release form · источник, перевод и два URL-поля</p></div></div><div class="editor-actions"><button class="button" data-view="releases">Отмена</button><button class="button button--primary" data-action="save-release">${icon("save")}Сохранить Release</button></div></header><div class="editor-layout editor-layout--compact"><main class="editor-main"><section class="editor-section"><header><div><span class="section-kicker">Release · связи</span><h2>Аниме и эпизод</h2><p>Release сохраняет episode_id; Anime используется только для удобного выбора.</p></div></header><div class="form-grid form-grid--editor"><label class="field field--full"><span>Аниме</span><div class="entity-select"><span class="poster poster--tiny" style="--poster-a:#381932;--poster-b:#9a587f"><span>SL</span></span><span><strong>Поднятие уровня в одиночку 2</strong><small>sample response · вспомогательный выбор</small></span><button class="button button--small" data-action="choose-anime">Изменить</button></div></label><label class="field field--full"><span>Episode ID <b>*</b></span><select><option>EP-8413 · S2E14</option><option>EP-8412 · S2E13</option></select></label></div></section><section class="editor-section"><header><div><span class="section-kicker">Release · playback</span><h2>Источник воспроизведения</h2><p>url и embed_url сохраняются отдельно; backend не проверяет поток.</p></div><span class="unsupported-label">Без server validate/test-stream</span></header><div class="form-grid form-grid--editor"><label class="field"><span>Source <b>*</b></span><select><option>Kodik</option><option>Aniboom</option><option>Sibnet</option><option>other</option></select></label><label class="field"><span>Quality</span><select><option>1080p</option><option>720p</option><option>480p</option><option>auto</option></select></label><label class="field field--full"><span>URL <b>*</b></span><div class="input-action"><input value="https://kodik.info/video/498912/14"><button class="button" data-action="validate-url-local">Проверить формат</button></div></label><label class="field field--full"><span>Embed URL</span><div class="input-action"><input value="https://kodik.info/seria/498912/14"><button class="button" data-action="validate-url-local">Проверить формат</button></div></label><label class="field"><span>External ID</span><input value="498912:14:anilibria"></label><label class="field"><span>Verified</span><select><option>Да</option><option>Нет</option></select><small>is_verified — сохранённый boolean, не результат probe.</small></label></div></section><section class="editor-section"><header><div><span class="section-kicker">Release · translation</span><h2>Перевод</h2><p>Тип, команда и язык используются в выборе варианта плеера.</p></div></header><div class="form-grid form-grid--editor"><label class="field"><span>Translation type</span><select><option>voice</option><option>subtitles</option><option>raw</option></select></label><label class="field"><span>Translation language</span><input value="ru"></label><label class="field field--full"><span>Translation team</span><input value="AniLibria"></label></div><div class="switch-row"><span class="switch-copy"><strong>Активный релиз</strong><small>is_active=true · доступен как вариант плеера</small></span><button class="switch is-on" data-action="toggle-switch"></button></div></section></main><aside class="editor-rail"><section class="rail-card"><h3>Проверка URL</h3><div class="source-check"><span class="status-dot status-dot--warning"></span><div><strong>Только локальная URL schema</strong><p>Доступность источника неизвестна</p></div></div><dl class="definition-list"><dt>Source</dt><dd>Kodik</dd><dt>Quality</dt><dd>1080p</dd><dt>is_verified</dt><dd>true</dd></dl></section><section class="rail-card"><h3>Поля POST</h3><ul class="check-list"><li class="is-done">${icon("check")}episode_id</li><li class="is-done">${icon("check")}source + url</li><li class="is-done">${icon("check")}translation</li><li class="is-done">${icon("check")}is_active + is_verified</li></ul></section><section class="rail-card rail-card--success"><span>${icon("badge-check")}</span><div><strong>Форма заполнена</strong><p>Публичный плеер должен использовать только подтверждённую Release policy, а не собственные догадки.</p></div></section></aside></div></div>`;
  }

  function renderModerationReal() {
    const parserQueue = [
      {
        item: anime[4],
        reason: "no_video",
        eligible: false,
        detail: "ongoing · active release отсутствует",
        age: "18 мин",
      },
      {
        item: anime[3],
        reason: "no_video",
        eligible: true,
        detail: "announced · видео не требуется",
        age: "31 мин",
      },
      {
        item: anime[2],
        reason: "poster_url",
        eligible: false,
        detail: "poster_url отсутствует в response",
        age: "44 мин",
      },
      {
        item: anime[6],
        reason: "description",
        eligible: false,
        detail: "описание отсутствует",
        age: "1 ч",
      },
    ]
      .map(
        (row) =>
          `<article class="moderation-card">${poster(row.item, "review-poster")}<div class="moderation-card__body"><header><div><h3>${row.item.title}</h3><p>anime:${row.item.id} · ${row.item.type.toLowerCase()} · ${row.item.status}</p></div>${status(row.reason, row.eligible ? "info" : "warning")}</header><div class="moderation-reason"><span>${icon(row.reason === "no_video" ? "video-off" : row.reason === "poster_url" ? "image-off" : "file-x-2")}</span><div><strong>${row.eligible ? "Можно одобрить" : "Одобрение заблокировано"}</strong><p>${row.detail}</p></div></div><footer><span>${icon("clock-3")}${row.age} · Kodik import</span><div class="review-actions"><button class="button button--small" data-action="view-review" data-id="${row.item.id}">${icon("columns-2")}Проверить карточку</button><button class="button button--small button--primary" data-action="approve-review" data-id="${row.item.id}" ${row.eligible ? "" : "disabled"}>${icon("check")}Approve</button></div></footer></div></article>`,
      )
      .join("");
    const commentRows = [
      [
        "C-731",
        "user:44192",
        "anime",
        "9253",
        "Очень сильный финал, особенно работа со звуком.",
        true,
        "12 мин",
      ],
      [
        "C-728",
        "user:39884",
        "episode",
        "8412",
        "Повторяющаяся рекламная ссылка.",
        true,
        "31 мин",
      ],
      [
        "C-719",
        "user:43108",
        "anime",
        "57334",
        "Почему у второго перевода звук отстаёт?",
        false,
        "1 ч",
      ],
    ]
      .map(
        (row) =>
          `<article class="comment-review"><span class="avatar">${row[1].slice(-2)}</span><div class="comment-review__copy"><div><strong>${row[1]}</strong><span>${row[6]}</span></div><p>${row[4]}</p><small>${row[2]}:${row[3]} · ${row[0]} · plain CommentOut</small></div><div class="comment-review__actions">${status(row[5] ? "Скрыт" : "Виден", row[5] ? "warning" : "neutral")}<div class="row-actions">${row[5] ? `<button class="button button--small button--primary" data-action="approve-comment">${icon("check")}Показать</button>` : ""}<button class="button button--small button--danger" data-action="delete-comment">${icon("trash-2")}Soft delete</button></div></div></article>`,
      )
      .join("");
    const comments = `<section class="panel panel--flush"><header class="panel-header"><div class="panel-title-group"><h2 class="panel-title">Staff comment queue</h2><p class="panel-subtitle">Plain array без total, reports и review analytics</p></div></header><div class="comment-review-list">${commentRows}</div></section>`;
    const body =
      state.moderationTab === "comments"
        ? comments
        : `<div class="moderation-list">${parserQueue}</div>`;
    return `${heading({ eyebrow: "Контент · moderation queues", title: "Контроль качества", description: "Причина модерации и eligibility показаны до действия — оператор видит, почему карточку нельзя одобрить.", actions: actionButton("Обновить очередь", "refresh-moderation", "refresh-cw") })}<div class="moderation-summary"><article><span>Загружено</span><strong>4</strong><small>parser moderation page</small></article><article><span>Можно одобрить</span><strong>1</strong><small>eligible по backend rules</small></article><article><span>Заблокировано</span><strong>3</strong><small>причина видна до действия</small></article><article><span>Комментарии</span><strong>3</strong><small>загруженная staff queue</small></article></div><div class="section-bar">${sectionTabs(
      [
        ["import", "Карточки парсера", "12"],
        ["comments", "Комментарии", "3"],
      ],
      state.moderationTab,
      "moderation-tab",
    )}<div class="section-bar__meta">Причины: poster_url · description · no_video</div></div>${body}`;
  }

  function renderEpisodesReal() {
    const rows = [
      [
        "EP-8412",
        "Поднятие уровня в одиночку 2",
        2,
        13,
        "Не задано",
        "2026-08-13 07:00 UTC",
        false,
        false,
        true,
      ],
      [
        "EP-8411",
        "Монолог фармацевта 2",
        1,
        21,
        "Не задано",
        "2026-08-13 05:30 UTC",
        false,
        false,
        true,
      ],
      [
        "EP-8410",
        "Ван-Пис",
        1,
        1122,
        "Рекап арки",
        "2026-08-12 17:00 UTC",
        false,
        true,
        true,
      ],
      [
        "EP-8409",
        "Дандадан",
        1,
        12,
        "Финал сезона",
        "2026-08-12 14:00 UTC",
        false,
        false,
        true,
      ],
      ["EP-8408", "Re:Zero 3", 3, 16, "Не задано", "—", true, false, false],
    ]
      .map((row) => {
        const flags =
          row[6] || row[7]
            ? `${row[6] ? status("filler", "warning") : ""}${row[7] ? status("recap", "info") : ""}`
            : `<span class="cell-muted">—</span>`;
        return `<tr><td data-label="Эпизод"><button class="row-leading" data-action="view-episode" data-id="${row[0]}"><span class="episode-symbol">S${row[2]}<b>E${row[3]}</b></span><span class="row-leading__copy"><strong>${row[1]}</strong><span>${row[0]} · anime nested title/slug</span></span></button></td><td data-label="Название">${row[4]}</td><td data-label="Aired at"><span>${row[5]}</span><small class="cell-subline">${row[5] === "—" ? "null" : "локально +5 часов"}</small></td><td data-label="Метки"><div class="tag-row">${flags}</div></td><td data-label="Thumbnail">${status(row[8] ? "Есть URL" : "Нет URL", row[8] ? "neutral" : "warning")}</td><td>${rowActions(row[0], "episode")}</td></tr>`;
      })
      .join("");
    return `${heading({ eyebrow: "Контент · Episode", title: "Эпизоды", description: "Поля GET /episodes/with-anime без выдуманного publication status и без N+1 release-count.", actions: actionButton("Добавить эпизод", "add-episode", "plus", true) })}<div class="metric-grid"><article class="metric-card metric-card--focus"><span>Загружено</span><strong>5</strong><small>sample response page</small></article><article class="metric-card"><span>aired_at задан</span><strong>4</strong><small>в загруженной page</small></article><article class="metric-card"><span>thumbnail_url задан</span><strong>4</strong><small>в загруженной page</small></article><article class="metric-card"><span>Filler / recap</span><strong>2</strong><small>read fields в выборке</small></article></div><section class="panel panel--flush"><div class="table-toolbar"><div class="toolbar-leading"><span class="timezone-chip">GET /episodes/with-anime · только skip/limit · без total</span></div><span class="timezone-chip">${icon("clock-3")}Asia/Almaty · UTC+5</span></div><div class="table-shell"><table class="data-table responsive"><thead><tr><th>Эпизод</th><th>Название</th><th>Aired at</th><th>Метки</th><th>Thumbnail</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  }

  function renderReleasesReal() {
    const rows = [
      [
        "REL-19420",
        "EP-8412",
        "Kodik",
        "1080p",
        "voice",
        "ru",
        "AniLibria",
        true,
        true,
      ],
      [
        "REL-19419",
        "EP-8411",
        "Kodik",
        "1080p",
        "voice",
        "ru",
        "Studio Band",
        true,
        true,
      ],
      [
        "REL-19418",
        "EP-8411",
        "Aniboom",
        "720p",
        "subtitles",
        "ru",
        "AniDub",
        true,
        false,
      ],
      [
        "REL-19417",
        "EP-8409",
        "Sibnet",
        "1080p",
        "subtitles",
        "ru",
        "Crunchyroll",
        false,
        true,
      ],
      ["REL-19416", "EP-8408", "other", "auto", "raw", "ja", "—", false, false],
    ]
      .map(
        (row) =>
          `<tr><td data-label="Release"><button class="row-leading" data-action="view-release" data-id="${row[0]}"><span class="release-symbol">${icon("play")}</span><span class="row-leading__copy"><strong>${row[0]}</strong><span>episode_id=${row[1]}</span></span></button></td><td data-label="Источник"><strong>${row[2]}</strong><small class="cell-subline">${row[3]}</small></td><td data-label="Перевод"><span>${row[4]} · ${row[5]}</span><small class="cell-subline">${row[6]}</small></td><td data-label="Active">${status(row[7] ? "true" : "false", row[7] ? "success" : "neutral")}</td><td data-label="Verified">${status(row[8] ? "true" : "false", row[8] ? "success" : "warning")}</td><td data-label="URL">${status("Не проверяется", "neutral")}</td><td>${rowActions(row[0], "release")}</td></tr>`,
      )
      .join("");
    return `${heading({ eyebrow: "Контент · Release", title: "Релизы", description: "Точный Release contract; список не притворяется, что backend вернул Anime title или URL health.", actions: actionButton("Добавить релиз", "add-release", "plus", true) })}<div class="metric-grid"><article class="metric-card metric-card--focus"><span>Загружено</span><strong>5</strong><small>sample response page</small></article><article class="metric-card"><span>is_active=true</span><strong>3</strong><small>в загруженной выборке</small></article><article class="metric-card"><span>is_verified=true</span><strong>3</strong><small>boolean, не health probe</small></article><article class="metric-card"><span>Источники</span><strong>4</strong><small>в загруженной выборке</small></article></div><section class="panel panel--flush"><div class="table-toolbar"><div class="toolbar-leading"><span class="timezone-chip">GET /releases · skip/limit; server filter только episode_id · без total</span></div></div><div class="table-shell"><table class="data-table responsive"><thead><tr><th>Release / Episode</th><th>Источник</th><th>Перевод</th><th>Active</th><th>Verified</th><th>URL health</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  }

  function renderCollectionsReal() {
    const rows = [
      [
        "COL-104",
        "Смотрят сейчас",
        "watching-now",
        24,
        true,
        "184 203",
        "12 842",
      ],
      [
        "COL-103",
        "Лучшее за сезон",
        "best-of-season",
        18,
        true,
        "98 441",
        "8 116",
      ],
      [
        "COL-102",
        "Новая волна сёнэна",
        "new-shonen-wave",
        12,
        true,
        "64 820",
        "5 431",
      ],
      [
        "COL-101",
        "Короткие сериалы на вечер",
        "short-evening",
        16,
        false,
        "—",
        "—",
      ],
      [
        "COL-100",
        "Классика Kitsu",
        "kitsu-classics",
        42,
        true,
        "42 118",
        "3 902",
      ],
    ]
      .map(
        (row) =>
          `<tr><td data-label="Коллекция"><div class="row-leading"><span class="collection-cover">${icon("library")}</span><span class="row-leading__copy"><strong>${row[1]}</strong><span>/collections/${row[2]} · ${row[0]}</span></span></div></td><td data-label="Items"><strong>${row[3]}</strong><small class="cell-subline">позиции сохранены</small></td><td data-label="Public">${status(row[4] ? "Публичная" : "Скрыта", row[4] ? "success" : "neutral")}</td><td data-label="Просмотры">${row[5]}</td><td data-label="Лайки">${row[6]}</td><td><button class="icon-button" data-action="view-collection" data-id="${row[0]}" aria-label="Открыть загруженные данные">${icon("panel-right-open")}</button></td></tr>`,
      )
      .join("");
    return `${heading({ eyebrow: "Контент · Collection", title: "Коллекции", description: "Superuser list доступен для обзора; update/delete по-прежнему проверяют owner, поэтому экран read-only.", actions: `${actionButton("Экспорт CSV", "export-collections", "download")}${actionButton("Обновить", "refresh-catalog", "refresh-cw")}` })}<div class="metric-grid"><article class="metric-card metric-card--focus"><span>Загружено</span><strong>5</strong><small>superuser list snapshot</small></article><article class="metric-card"><span>Public</span><strong>4</strong><small>в загруженной выборке</small></article><article class="metric-card"><span>Anime placements</span><strong>112</strong><small>сумма загруженных rows</small></article><article class="metric-card"><span>Owner mutations</span><strong>Read only</strong><small>admin list не обходит ownership</small></article></div><section class="panel panel--flush"><div class="table-toolbar"><div class="toolbar-leading"><span class="timezone-chip">Superuser list snapshot · owner mutations не выполняются</span></div></div><div class="table-shell"><table class="data-table responsive"><thead><tr><th>Коллекция</th><th>Items</th><th>Public</th><th>Просмотры</th><th>Лайки</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  }

  function renderAssetsReal() {
    const avatars = [
      ["f37c…f820", "Kitsu Plum", "base", true, "KP", "#381932"],
      ["a910…5d44", "Milk Rose", "base", true, "MR", "#93658a"],
      ["bb12…24ab", "Season Mauve", "seasonal", true, "SM", "#7a5875"],
      ["7e94…102f", "Archive Cocoa", "archive", false, "AC", "#6f5145"],
    ]
      .map(
        (item) =>
          `<article class="asset-real-card"><div class="avatar-preview-real" style="--avatar-color:${item[5]}"><span>${item[4]}</span></div><div><header><div><h3>${item[1]}</h3><p>avatar ${item[0]}</p></div>${status(item[3] ? "Активен" : "Выключен", item[3] ? "success" : "neutral")}</header><dl><dt>category</dt><dd>${item[2]}</dd><dt>image_url</dt><dd>Локализован</dd></dl><footer><button class="button button--small" data-action="edit-asset">${icon("pencil")}Изменить</button><button class="icon-button" data-action="delete-asset" aria-label="Удалить">${icon("trash-2")}</button></footer></div></article>`,
      )
      .join("");
    const decorations = [
      [116, "Plum frame", true, "PF", "#381932"],
      [115, "Rose mark", true, "RM", "#93658a"],
      [114, "Founder cocoa", false, "FC", "#6f5145"],
      [113, "Season mauve", true, "SM", "#7a5875"],
    ]
      .map(
        (item) =>
          `<article class="asset-real-card"><div class="decoration-preview-real" style="--avatar-color:${item[4]}"><span>${item[3]}</span></div><div><header><div><h3>${item[1]}</h3><p>decoration #${item[0]}</p></div>${status(item[2] ? "Активна" : "Выключена", item[2] ? "success" : "neutral")}</header><dl><dt>image_url</dt><dd>Локализован</dd><dt>is_active</dt><dd>${item[2] ? "true" : "false"}</dd></dl><footer><button class="button button--small" data-action="edit-asset">${icon("pencil")}Изменить</button><button class="icon-button" data-action="delete-asset" aria-label="Удалить">${icon("trash-2")}</button></footer></div></article>`,
      )
      .join("");
    return `${heading({ eyebrow: "Контент · Avatar и Decoration", title: "Материалы профиля", description: "Две фактические backend-сущности без выдуманных коллекций, типов рамок и sort order.", actions: actionButton(state.assetTab === "avatars" ? "Добавить аватар" : "Добавить декорацию", state.assetTab === "avatars" ? "create-avatar-collection" : "create-decoration", "plus", true) })}<div class="section-bar">${sectionTabs(
      [
        ["avatars", "Аватары", "4"],
        ["decorations", "Декорации", "4"],
      ],
      state.assetTab,
      "asset-tab",
    )}<div class="section-bar__meta">image_url · is_active ${state.assetTab === "avatars" ? "· category" : ""}</div></div><div class="asset-real-grid">${state.assetTab === "avatars" ? avatars : decorations}</div>`;
  }

  function renderUsersReal() {
    const accountsData = [
      [
        "U-1",
        "DM",
        "Montihx",
        "montihx@kitsu.local",
        "Суперадминистратор",
        true,
        true,
        "сейчас",
        "13 авг 2026",
      ],
      [
        "U-44192",
        "AK",
        "Алексей Ким",
        "alex.kim@example.com",
        "Пользователь",
        true,
        false,
        "4 мин назад",
        "12 янв 2024",
      ],
      [
        "U-43108",
        "MS",
        "Мария Садыкова",
        "maria.s@example.com",
        "Модератор",
        true,
        false,
        "18 мин назад",
        "28 ноя 2023",
      ],
      [
        "U-41887",
        "DV",
        "Данияр Власов",
        "d.vlasov@example.com",
        "Пользователь",
        true,
        false,
        "1 ч назад",
        "6 окт 2023",
      ],
      [
        "U-40621",
        "YU",
        "Юлия Уткина",
        "yulia.u@example.com",
        "Администратор",
        true,
        false,
        "3 ч назад",
        "14 авг 2023",
      ],
      [
        "U-39884",
        "RR",
        "roman.r",
        "roman.rr@example.com",
        "Пользователь",
        false,
        false,
        "5 дней назад",
        "2 июл 2023",
      ],
    ];
    const roleFilterOptions = ["all", ...new Set(accountsData.map((row) => row[4]))];
    const roleFilterChips = roleFilterOptions
      .map(
        (role) =>
          `<button class="filter-chip ${state.usersRoleFilter === role ? "is-active" : ""}" data-role-filter="${role}">${role === "all" ? "Все роли" : role}</button>`,
      )
      .join("");
    const filteredAccounts = accountsData.filter(
      (row) => state.usersRoleFilter === "all" || row[4] === state.usersRoleFilter,
    );
    const accounts = filteredAccounts
      .map((row) => {
        const ban = row[6]
          ? `<button class="button button--small" disabled>Superuser защищён</button>`
          : row[5]
            ? `<button class="button button--small button--danger" data-action="ban-user">Заблокировать</button>`
            : `<button class="button button--small" data-action="unban-user">Разблокировать</button>`;
        return `<tr><td data-label="Пользователь"><button class="row-leading" data-action="view-user" data-id="${row[0]}"><span class="avatar ${row[6] ? "avatar--admin" : ""}">${row[1]}</span><span class="row-leading__copy"><strong>${row[2]}${row[6] ? " · superuser" : ""}</strong><span>${row[3]} · ${row[0]}</span></span></button></td><td data-label="Роль">${row[4]}</td><td data-label="Активен">${status(row[5] ? "Активен" : "Заблокирован", row[5] ? "success" : "danger")}</td><td data-label="Последняя активность">${row[7]}</td><td data-label="Создан">${row[8]}</td><td data-label="Действия"><div class="row-actions"><button class="button button--small" data-action="edit-user">${icon("key-round")}Роль</button>${ban}</div></td></tr>`;
      })
      .join("");
    const roles = [
      ["super_admin", "Полный доступ", "*", "shield-check"],
      [
        "admin",
        "Административный доступ",
        "content.* · users.view · users.edit · parsers.* · analytics.view",
        "shield",
      ],
      [
        "moderator",
        "Модерация контента",
        "content.view · content.edit · comments.moderate",
        "badge-check",
      ],
      [
        "user",
        "Публичные возможности",
        "content.view · comments.write",
        "user-round",
      ],
    ]
      .map((row) => {
        return `<article class="role-card-real"><span>${icon(row[3])}</span><div><h3>${row[0]}</h3><p>${row[1]}</p><small>${row[2]}</small></div>${status("Read only", "neutral")}</article>`;
      })
      .join("");
    const body =
      state.usersTab === "roles"
        ? `<div class="role-grid-real">${roles}</div>`
        : `<section class="panel panel--flush"><div class="table-toolbar table-toolbar--two-row"><div class="toolbar-leading"><label class="search-field search-field--wide">${icon("search")}<input placeholder="Username или email" aria-label="Поиск пользователей"></label><span class="timezone-chip">Server query: q · skip · limit; total отсутствует</span></div><div class="toolbar-actions">${roleFilterChips}</div></div><div class="table-shell"><table class="data-table responsive"><thead><tr><th>Пользователь</th><th>Роль</th><th>Активен</th><th>Последняя активность</th><th>Создан</th><th></th></tr></thead><tbody>${accounts}</tbody></table></div><footer class="table-footer"><span>Показано ${filteredAccounts.length} из ${accountsData.length} загруженных · фильтр по роли — клиентский</span></footer></section>`;
    return `${heading({ eyebrow: "Управление · User и Role", title: "Пользователи и роли", description: "Загруженная страница пользователей, superuser-защита и назначение существующего role_id; роли read-only.", actions: actionButton("Обновить", "refresh-catalog", "refresh-cw") })}<div class="metric-grid"><article class="metric-card metric-card--focus"><span>Загружено</span><strong>6</strong><small>текущая page без server total</small></article><article class="metric-card"><span>Активны</span><strong>5</strong><small>в загруженной выборке</small></article><article class="metric-card"><span>Seeded roles</span><strong>4</strong><small>roles endpoint read-only</small></article><article class="metric-card"><span>Заблокированы</span><strong>1</strong><small>в загруженной выборке</small></article></div><div class="section-bar">${sectionTabs(
      [
        ["accounts", "Аккаунты"],
        ["roles", "Роли", "4"],
      ],
      state.usersTab,
      "users-tab",
    )}<div class="section-bar__meta">Superuser нельзя заблокировать</div></div>${body}`;
  }

  function renderAuditReal() {
    const rows = [
      [
        "A-9842",
        "8b4a…e221",
        "10.24.18.7",
        "resolve_conflict",
        "parser",
        "—",
        true,
        "middleware audit; arbitrary meta may be empty",
        "2026-08-13 05:48:12 UTC",
      ],
      [
        "A-9841",
        "5d91…bb30",
        "10.24.18.21",
        "update",
        "episode",
        "d2f4…91a0",
        true,
        "inline audit after mutation",
        "2026-08-13 04:27:08 UTC",
      ],
      [
        "A-9840",
        "8b4a…e221",
        "10.24.18.7",
        "delete",
        "release",
        "c10a…922f",
        false,
        "error_message может быть null или string",
        "2026-08-12 23:04:41 UTC",
      ],
      [
        "A-9839",
        "5d91…bb30",
        "10.24.18.21",
        "bulk_anime",
        "anime",
        "—",
        true,
        "одна запись audit на request, не на каждый ID",
        "2026-08-12 18:42:09 UTC",
      ],
      [
        "A-9838",
        "8b4a…e221",
        "10.24.18.7",
        "update",
        "site_settings",
        "—",
        true,
        "RequireAudit не гарантирует before/after diff",
        "2026-08-12 17:16:44 UTC",
      ],
    ]
      .map(
        (row) =>
          `<tr class="${row[6] ? "" : "is-error"}"><td data-label="Actor"><div class="row-leading"><span class="avatar">${row[1] === "system" ? "SY" : row[1].slice(0, 2).toUpperCase()}</span><span class="row-leading__copy"><strong>${row[1]}</strong><span>${row[2]}</span></span></div></td><td data-label="Action"><code>${row[3]}</code></td><td data-label="Resource"><strong>${row[4]}</strong><small class="cell-subline">id=${row[5]}</small></td><td data-label="Meta"><span class="audit-meta">${row[7]}</span></td><td data-label="Success">${status(row[6] ? "success" : "error", row[6] ? "success" : "danger")}</td><td data-label="Created"><span>${row[8]}</span><small class="cell-subline">локально +5 часов</small></td><td><button class="icon-button" data-action="view-audit" data-id="${row[0]}" aria-label="Полные метаданные">${icon("braces")}</button></td></tr>`,
      )
      .join("");
    return `${heading({ eyebrow: "Система · AuditLog", title: "Журнал аудита", description: "Actor, IP, action, resource, meta, success и error_message в фактической структуре события.", actions: actionButton("Экспорт CSV", "export", "download") })}<section class="audit-filterbar"><span class="timezone-chip">GET /system/audit-logs · только skip/limit · plain array</span><span class="timezone-chip">${icon("clock-3")}UTC → Asia/Almaty</span></section><section class="panel panel--flush"><div class="table-shell"><table class="data-table responsive"><thead><tr><th>Actor / IP</th><th>Action</th><th>Resource</th><th>Meta / error</th><th>Result</th><th>Created at</th><th></th></tr></thead><tbody>${rows}</tbody></table></div><footer class="table-footer"><span>Показаны последние 5 событий · сортировка created_at DESC</span><div class="pagination"><button aria-label="Назад">${icon("chevron-left")}</button><button class="is-active">1</button><button>2</button><button>3</button><button aria-label="Вперёд">${icon("chevron-right")}</button></div></footer></section>`;
  }

  function renderCatalogReal() {
    const sourceMeta = {
      9253: ["Kodik 498912", "Shiki 58567", false],
      52991: ["Kodik 472104", "Shiki 52991", false],
      57334: ["Kodik 498721", "Shiki 57334", true],
      54857: ["Kodik 501884", "Shiki 54857", true],
      58514: ["Kodik 509114", "Shiki 58514", false],
      40748: ["Kodik 418202", "Shiki 40748", false],
      21: ["Kodik 34012", "Shiki 21", false],
      16498: ["Kodik 17644", "Shiki 16498", false],
    };
    const rows = filteredAnime()
      .map((item) => {
        const meta = sourceMeta[item.id] || ["Kodik —", "Shiki —", false];
        return `<tr class="${state.selectedAnime.has(item.id) ? "is-selected" : ""}"><td class="check-cell"><input class="check-control" type="checkbox" data-select-anime="${item.id}" ${state.selectedAnime.has(item.id) ? "checked" : ""} aria-label="Выбрать ${item.title}"></td><td data-label="Аниме"><button class="row-leading" data-action="view-anime" data-id="${item.id}">${poster(item)}<span class="row-leading__copy"><strong>${item.title}</strong><span>${item.original} · anime:${item.id}</span></span></button></td><td data-label="Формат"><span class="cell-primary">${item.type}</span><br><span class="cell-muted">${item.year}</span></td><td data-label="Эпизоды">${item.episodes}</td><td data-label="Источники"><span class="source-stack"><small>${meta[0]}</small><small>${meta[1]}</small></span></td><td data-label="Статус">${status(labelForStatus(item.status), toneForStatus(item.status))}</td><td data-label="Оценка"><span class="score-pill">${icon("star")}${item.score}</span></td><td data-label="Контроль">${meta[2] ? status("Нужна проверка", "warning") : status("Чисто", "success")}</td><td data-label="Действия">${rowActions(item.id)}</td></tr>`;
      })
      .join("");
    const bulk = state.selectedAnime.size
      ? `<div class="bulk-bar"><div><strong>${state.selectedAnime.size} выбрано</strong><span> · POST /dashboard/bulk/anime поддерживает update_status или delete</span></div><div class="row-actions"><button class="button button--small" data-action="bulk-status">${icon("list-restart")}Изменить status</button><button class="row-action" data-action="clear-selection" aria-label="Снять выделение">${icon("x")}</button></div></div>`
      : "";
    const empty = `<tr><td colspan="9"><div class="empty-state"><div class="empty-state__inner"><span class="empty-icon">${icon("search-x")}</span><h3>По этой выборке записей нет</h3><p>Измените запрос, формат или состояние релиза.</p><button class="button" data-action="reset-catalog">Сбросить фильтры</button></div></div></td></tr>`;
    return `${heading({ eyebrow: "Контент · фактическая модель Anime", title: "Каталог аниме", description: "Карточки, внешние идентификаторы, видео-покрытие и модерация — в одной проверяемой таблице.", actions: `${actionButton("Поиск и импорт", "go-imports", "search-code")}${actionButton("Добавить аниме", "add-content", "plus", true)}` })}<div class="metric-grid metric-grid--catalog"><article class="metric-card metric-card--focus"><span>Всего в каталоге</span><strong>3 402</strong><small>response.total</small></article><article class="metric-card"><span>Онгоинги</span><strong>184</strong><small>активные обновления</small></article><article class="metric-card"><span>Нужна модерация</span><strong>12</strong><small>poster · description · no_video</small></article><article class="metric-card"><span>Без активного видео</span><strong>21</strong><small>фильтр has_video=false</small></article></div><section class="panel panel--flush"><div class="table-toolbar table-toolbar--two-row"><div class="toolbar-leading"><label class="search-field search-field--wide">${icon("search")}<input id="catalog-search" value="${state.catalogQuery}" placeholder="Название, anime ID, Kodik или Shikimori ID" aria-label="Поиск по каталогу"></label><button class="filter-button" data-action="focus-filter">${icon("list-filter")}Тип · видео · модерация</button></div><div class="toolbar-actions"><button class="filter-chip ${state.catalogFilter === "all" ? "is-active" : ""}" data-filter="all">Все</button><button class="filter-chip ${state.catalogFilter === "ongoing" ? "is-active" : ""}" data-filter="ongoing">Онгоинг</button><button class="filter-chip ${state.catalogFilter === "released" ? "is-active" : ""}" data-filter="released">Завершён</button><button class="filter-chip ${state.catalogFilter === "announced" ? "is-active" : ""}" data-filter="announced">Анонс</button>${iconAction("Настроить столбцы", "columns", "columns-3")}${iconAction("Обновить", "refresh-catalog", "refresh-cw")}</div></div><div class="table-shell"><table class="data-table responsive"><thead><tr><th><input class="check-control" id="select-all-anime" type="checkbox" aria-label="Выбрать всё"></th><th>Аниме</th><th>Формат</th><th>Эпизоды</th><th>Источники</th><th>Статус</th><th>Оценка</th><th>Контроль</th><th></th></tr></thead><tbody>${rows || empty}</tbody></table></div><footer class="table-footer"><span>Показано ${filteredAnime().length} из 3 402 · сортировка: обновлено</span><div class="pagination"><button aria-label="Назад">${icon("chevron-left")}</button><button class="is-active">1</button><button>2</button><button>3</button><button>…</button><button>426</button><button aria-label="Вперёд">${icon("chevron-right")}</button></div></footer></section>${bulk}`;
  }

  const renderers = {
    overview: renderControlCenter,
    catalog: renderCatalogReal,
    episodes: renderEpisodesReal,
    releases: renderReleasesReal,
    collections: renderCollectionsReal,
    assets: renderAssetsReal,
    "anime-editor": renderAnimeEditorReal,
    "episode-editor": renderEpisodeEditorReal,
    "release-editor": renderReleaseEditorReal,
    parsers: renderParserCenterReal,
    imports: renderImports,
    conflicts: renderConflictsReal,
    scheduler: renderSchedulerReal,
    "parser-settings": renderParserSettingsReal,
    moderation: renderModerationReal,
    users: renderUsersReal,
    monitoring: renderMonitoringReal,
    settings: renderSiteSettingsReal,
    backups: renderBackupsReal,
    audit: renderAuditReal,
  };

  function refreshIcons() {
    if (window.lucide) {
      window.lucide.createIcons({
        attrs: { "aria-hidden": "true", "stroke-width": 1.8 },
      });
    }
    hydrateInteractive(document);
  }

  function hydrateInteractive(root) {
    root
      .querySelectorAll("button:not([type])")
      .forEach((button) => button.setAttribute("type", "button"));
    root
      .querySelectorAll(".search-field input:not([aria-label])")
      .forEach((input) => input.setAttribute("aria-label", "Поиск"));
    root.querySelectorAll(".switch").forEach((control) => {
      const label =
        control.getAttribute("aria-label") ||
        control
          .closest(".switch-row")
          ?.querySelector(".switch-copy strong")
          ?.textContent?.trim() ||
        "Переключатель";
      control.setAttribute("role", "switch");
      control.setAttribute("aria-label", label);
      control.setAttribute(
        "aria-checked",
        String(control.classList.contains("is-on")),
      );
    });
    root.querySelectorAll(".pagination button").forEach((button) => {
      if (button.getAttribute("aria-label") || button.textContent.trim())
        return;
      if (button.querySelector(".lucide-chevron-left"))
        button.setAttribute("aria-label", "Предыдущая страница");
      if (button.querySelector(".lucide-chevron-right"))
        button.setAttribute("aria-label", "Следующая страница");
    });
    root.querySelectorAll("[title]").forEach((node) => {
      if (!node.dataset.tooltip) node.dataset.tooltip = node.title;
      node.removeAttribute("title");
    });
    root
      .querySelectorAll("button[aria-label], [data-tooltip]")
      .forEach((node) => {
        if (!node.dataset.tooltip && node.getAttribute("aria-label"))
          node.dataset.tooltip = node.getAttribute("aria-label");
      });
  }

  function toggleSwitch(control) {
    const isOn = control.classList.toggle("is-on");
    control.setAttribute("aria-checked", String(isOn));
  }

  function trapModalFocus(event) {
    if (event.key !== "Tab") return;
    const modal = [commandDialog, dialog, drawer].find(
      (element) => !element.hidden,
    );
    if (!modal) return;
    const focusable = [
      ...modal.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ),
    ].filter((element) => element.getClientRects().length > 0);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function positionTooltip(owner) {
    if (!owner || uiTooltip.hidden) return;
    const ownerRect = owner.getBoundingClientRect();
    const tooltipRect = uiTooltip.getBoundingClientRect();
    const margin = 8;
    let left = ownerRect.left + ownerRect.width / 2 - tooltipRect.width / 2;
    left = Math.max(
      margin,
      Math.min(left, window.innerWidth - tooltipRect.width - margin),
    );
    let top = ownerRect.bottom + 8;
    if (top + tooltipRect.height > window.innerHeight - margin)
      top = ownerRect.top - tooltipRect.height - 8;
    uiTooltip.style.left = `${Math.round(left)}px`;
    uiTooltip.style.top = `${Math.round(Math.max(margin, top))}px`;
  }

  function showTooltip(owner, delay = 260) {
    if (
      !owner?.dataset.tooltip ||
      window.matchMedia("(pointer: coarse)").matches
    )
      return;
    clearTimeout(tooltipTimer);
    tooltipTimer = setTimeout(() => {
      tooltipOwner = owner;
      uiTooltip.textContent = owner.dataset.tooltip;
      uiTooltip.hidden = false;
      owner.setAttribute("aria-describedby", "ui-tooltip");
      requestAnimationFrame(() => positionTooltip(owner));
    }, delay);
  }

  function hideTooltip(immediate = false) {
    clearTimeout(tooltipTimer);
    if (tooltipOwner) tooltipOwner.removeAttribute("aria-describedby");
    const finish = () => {
      uiTooltip.hidden = true;
      uiTooltip.classList.remove("is-hiding");
      tooltipOwner = null;
    };
    if (immediate || uiTooltip.hidden) return finish();
    uiTooltip.classList.add("is-hiding");
    setTimeout(finish, 90);
  }

  function renderCurrent({ focus = false } = {}) {
    hideTooltip(true);
    viewRoot.innerHTML = `<div class="view-enter">${renderers[state.currentView]()}</div>`;
    document.querySelector("#breadcrumb-current").textContent =
      viewMeta[state.currentView][0];
    document.title = `${viewMeta[state.currentView][0]} — Kitsu Enterprise Admin`;
    document.querySelectorAll(".sidebar [data-view]").forEach((button) => {
      const activeViews =
        button.dataset.view === "catalog"
          ? ["catalog", "anime-editor"]
          : button.dataset.view === "episodes"
            ? ["episodes", "episode-editor"]
            : button.dataset.view === "releases"
              ? ["releases", "release-editor"]
              : [button.dataset.view];
      button.classList.toggle(
        "is-active",
        activeViews.includes(state.currentView),
      );
    });
    document
      .querySelectorAll(".mobile-nav-item[data-view]")
      .forEach((button) => {
        const target = button.dataset.view;
        const groups =
          target === "catalog"
            ? [
                "catalog",
                "episodes",
                "releases",
                "collections",
                "assets",
                "anime-editor",
                "episode-editor",
                "release-editor",
              ]
            : target === "parsers"
              ? [
                  "parsers",
                  "imports",
                  "conflicts",
                  "scheduler",
                  "parser-settings",
                  "moderation",
                ]
              : target === "monitoring"
                ? ["monitoring", "users", "settings", "backups", "audit"]
                : [target];
        button.classList.toggle(
          "is-active",
          groups.includes(state.currentView),
        );
      });
    refreshIcons();
    if (focus) viewRoot.focus({ preventScroll: true });
  }

  function navigate(view) {
    if (!renderers[view]) return;
    state.currentView = view;
    history.pushState(null, "", `#${view}`);
    appShell.classList.remove("is-mobile-open");
    syncMobileSidebar();
    closeTransient();
    renderCurrent({ focus: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openOverlayFor(element) {
    returnFocusTo =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    overlay.hidden = false;
    element.hidden = false;
    refreshIcons();
  }

  function closeTransient() {
    const hadOverlay =
      !commandDialog.hidden || !dialog.hidden || !drawer.hidden;
    overlay.hidden = true;
    commandDialog.hidden = true;
    dialog.hidden = true;
    drawer.hidden = true;
    notificationPopover.hidden = true;
    document
      .querySelector("#notifications-trigger")
      ?.setAttribute("aria-expanded", "false");
    hideTooltip(true);
    if (hadOverlay && returnFocusTo?.isConnected)
      returnFocusTo.focus({ preventScroll: true });
    returnFocusTo = null;
  }

  const commandSource = [
    ...Object.entries(viewMeta)
      .filter(([view]) => !view.endsWith("-editor"))
      .map(([view, meta]) => ({
        type: "Раздел",
        title: meta[0],
        subtitle: meta[1],
        icon: {
          overview: "layout-dashboard",
          catalog: "clapperboard",
          episodes: "play-square",
          releases: "languages",
          collections: "library",
          assets: "shapes",
          parsers: "waypoints",
          imports: "search-code",
          conflicts: "git-compare-arrows",
          scheduler: "calendar-clock",
          "parser-settings": "sliders-horizontal",
          moderation: "shield-check",
          users: "users",
          monitoring: "activity",
          settings: "settings-2",
          backups: "database-backup",
          audit: "scroll-text",
        }[view],
        view,
      })),
    {
      type: "Действие",
      title: "Добавить аниме",
      subtitle: "Создать запись каталога",
      icon: "plus",
      action: "add-content",
    },
    {
      type: "Действие",
      title: "Добавить эпизод",
      subtitle: "Открыть редактор эпизода",
      icon: "play-square",
      action: "add-episode",
    },
    {
      type: "Действие",
      title: "Найти в Kodik / Shikimori",
      subtitle: "Безопасный поиск и импорт",
      icon: "search-code",
      action: "go-imports",
    },
    {
      type: "Действие",
      title: "Запустить синхронизацию",
      subtitle: "Только поддерживаемые ParserJob modes",
      icon: "refresh-cw",
      action: "start-sync",
    },
    {
      type: "Действие",
      title: "Создать резервную копию",
      subtitle: "Database + media артефакты",
      icon: "database-backup",
      action: "create-backup",
    },
  ];

  function renderCommandResults() {
    const query = commandInput.value.trim().toLowerCase();
    state.commandItems = commandSource
      .filter(
        (item) =>
          !query ||
          `${item.title} ${item.subtitle} ${item.type}`
            .toLowerCase()
            .includes(query),
      )
      .slice(0, 9);
    if (state.commandIndex >= state.commandItems.length) state.commandIndex = 0;
    commandResults.innerHTML = state.commandItems.length
      ? `<p class="command-group-title">${query ? "Результаты" : "Быстрый доступ"}</p>${state.commandItems.map((item, index) => `<button class="command-result ${index === state.commandIndex ? "is-active" : ""}" data-command-index="${index}"><span class="mini-icon ${item.type === "Действие" ? "mini-icon--accent" : ""}">${icon(item.icon)}</span><span><strong>${item.title}</strong><small>${item.subtitle}</small></span><kbd>${item.type}</kbd></button>`).join("")}`
      : `<div class="empty-state"><div class="empty-state__inner"><span class="empty-icon">${icon("search-x")}</span><h3>Совпадений нет</h3><p>Попробуйте название раздела или действия.</p></div></div>`;
    refreshIcons();
  }

  function openCommand() {
    state.commandIndex = 0;
    commandInput.value = "";
    renderCommandResults();
    openOverlayFor(commandDialog);
    requestAnimationFrame(() => commandInput.focus());
  }

  function executeCommand(item) {
    if (!item) return;
    closeTransient();
    if (item.view) navigate(item.view);
    if (item.action) handleAction(item.action, {});
  }

  function openDialog({
    eyebrow = "Действие",
    title,
    body,
    confirm = "Сохранить",
    confirmAction = "confirm-generic",
    danger = false,
  }) {
    document.querySelector("#dialog-eyebrow").textContent = eyebrow;
    document.querySelector("#dialog-title").textContent = title;
    document.querySelector("#dialog-body").innerHTML = body;
    document.querySelector("#dialog-footer").innerHTML =
      `<button type="button" class="button" data-action="close-dialog">${icon("x")}Отмена</button><button type="button" class="button ${danger ? "button--danger" : "button--primary"}" data-action="${confirmAction}">${icon(danger ? "triangle-alert" : "check")}${confirm}</button>`;
    openOverlayFor(dialog);
    requestAnimationFrame(() =>
      dialog
        .querySelector("input, select, textarea, button")
        ?.focus({ preventScroll: true }),
    );
  }

  function openDrawer({ eyebrow = "Детали", title, body }) {
    document.querySelector("#drawer-eyebrow").textContent = eyebrow;
    document.querySelector("#drawer-title").textContent = title;
    document.querySelector("#drawer-content").innerHTML = body;
    openOverlayFor(drawer);
    requestAnimationFrame(() => {
      document.querySelector("#drawer-close")?.focus({ preventScroll: true });
      hideTooltip(true);
    });
  }

  function animeDrawer(item) {
    openDrawer({
      eyebrow: `Anime ID ${item.id}`,
      title: "Карточка аниме",
      body: `<div class="detail-hero">${poster(item)}<div class="detail-hero__copy"><h3>${item.title}</h3><p>${item.original}</p>${status(labelForStatus(item.status), toneForStatus(item.status))}</div></div><section class="detail-section"><h4>Поля загруженной строки</h4><dl class="definition-list"><dt>id</dt><dd>${item.id}</dd><dt>Kind / year</dt><dd>${item.type} · ${item.year}</dd><dt>Episodes</dt><dd>${item.episodes}</dd><dt>Score</dt><dd>${item.score}</dd><dt>Views</dt><dd>${item.views}</dd><dt>Updated</dt><dd>${item.updated}</dd></dl></section><section class="detail-section"><div class="truth-note">${icon("info")}<p>kodik_id, shikimori_id, mal_id и release-count не выводятся из Anime ID. В production показывать только значения фактического response.</p></div></section><section class="detail-section"><div class="review-actions"><button class="button button--primary" data-action="edit-anime">${icon("pencil")}Редактировать</button></div></section>`,
    });
  }

  function jobDrawerReal(job) {
    const selected =
      jobs.find((item) => String(item.id) === String(job)) || jobs[0];
    const isIndeterminate = selected.progress === null;
    const progressLabel = isIndeterminate
      ? "не публикуется"
      : selected.progress + "%";
    const progress = isIndeterminate
      ? `<div class="indeterminate-track"><span></span></div><p class="drawer-hint">Kodik full sync не публикует live percentage.</p>`
      : `<div class="meter"><span style="width:${selected.progress}%"></span></div>`;
    const stats = selected.source.includes("related")
      ? `<div class="result-grid"><div><span>Updated</span><strong>418</strong></div><div><span>No change</span><strong>1 840</strong></div><div><span>Auto accepted</span><strong>70</strong></div><div><span>Conflicts</span><strong>5</strong></div><div><span>Not found</span><strong>76</strong></div><div><span>Network errors</span><strong>1</strong></div></div>`
      : `<div class="result-grid"><div><span>Processed</span><strong>${isIndeterminate ? "—" : "1 248"}</strong></div><div><span>Created</span><strong>${isIndeterminate ? "—" : "18"}</strong></div><div><span>Updated</span><strong>${isIndeterminate ? "—" : "986"}</strong></div><div><span>Skipped</span><strong>${isIndeterminate ? "—" : "244"}</strong></div><div><span>Failed</span><strong>${isIndeterminate ? "—" : "0"}</strong></div><div><span>Duration</span><strong>${selected.duration}</strong></div></div>`;
    const pendingNote = isIndeterminate
      ? `<div class="truth-note">${icon("info")}<p>Итоговые counters появятся после completed, failed или partial timeout.</p></div>`
      : "";
    const action =
      selected.status === "running"
        ? `<button class="button button--danger" data-action="stop-job">${icon("square")}Остановить</button>`
        : `<button class="button button--danger" data-action="delete-job">${icon("trash-2")}Удалить job</button>`;
    openDrawer({
      eyebrow: `${selected.id} · ParserJob`,
      title: selected.source,
      body: `<div class="drawer-status drawer-status--real"><div><span>Статус</span>${status(labelForStatus(selected.status), toneForStatus(selected.status))}</div><div><span>Progress</span><strong>${progressLabel}</strong></div><div><span>Started</span><strong>${selected.started}</strong></div><div><span>Duration</span><strong>${selected.duration}</strong></div></div><section class="detail-section"><div class="detail-section__title"><h4>Ход выполнения</h4><span>sample ParserJob response</span></div>${progress}</section><section class="detail-section"><div class="detail-section__title"><h4>Результат</h4><span>items_* / statistics</span></div>${stats}${pendingNote}</section><section class="detail-section"><div class="detail-section__title"><h4>ParserJobLog</h4><button class="text-button" data-action="open-global-logs">Открыть REST-журнал</button></div><div class="truth-note">${icon("info")}<p>Логи загружаются отдельным GET /jobs/{id}/logs. WebSocket публикует telemetry, но не заменяет log endpoint.</p></div></section><section class="detail-section"><div class="review-actions">${action}<button class="button" data-action="start-sync">${icon("plus")}Новый ручной запуск</button></div></section>`,
    });
  }

  function userDrawerReal(id) {
    const isSuperuser = String(id) === "U-1";
    const isActive = String(id) !== "U-39884";
    const rawId = String(id || "").replace(/\D/g, "");
    const user = users.find((entry) => String(entry.id) === rawId) || users[0];
    openDrawer({
      eyebrow: `User ${id || user.id}`,
      title: isSuperuser ? "Montihx" : user.name,
      body: `<div class="detail-hero"><span class="avatar ${isSuperuser ? "avatar--admin" : ""}">${isSuperuser ? "DM" : user.initials}</span><div class="detail-hero__copy"><h3>${isSuperuser ? "Montihx" : user.name}</h3><p>${isSuperuser ? "montihx@kitsu.local" : user.email}</p>${status(isActive ? "Активен" : "Заблокирован", isActive ? "success" : "danger")}</div></div><section class="detail-section"><h4>GET /users/{id}</h4><dl class="definition-list"><dt>is_active</dt><dd>${isActive}</dd><dt>is_superuser</dt><dd>${isSuperuser}</dd><dt>role</dt><dd>${isSuperuser ? "super_admin" : user.role}</dd><dt>created_at</dt><dd>${user.joined}</dd><dt>last_seen_at</dt><dd>${user.activity}</dd></dl></section><section class="detail-section"><div class="review-actions"><button class="button button--primary" data-action="edit-user">${icon("key-round")}Назначить role_id</button><button class="button button--danger" data-action="ban-user" ${isSuperuser || !isActive ? "disabled" : ""}>${icon("ban")}${isSuperuser ? "Superuser защищён" : isActive ? "Заблокировать" : "Уже заблокирован"}</button></div></section>`,
    });
  }

  function episodeDrawerReal(id) {
    openDrawer({
      eyebrow: `Episode ${id}`,
      title: "S2 · Episode 13",
      body: `<section class="detail-section"><h4>GET /episodes/{id}</h4><dl class="definition-list"><dt>anime_id</dt><dd>9253</dd><dt>season / episode</dt><dd>2 / 13</dd><dt>title</dt><dd>null</dd><dt>aired_at</dt><dd>2026-08-13 07:00 UTC</dd><dt>is_filler / is_recap</dt><dd>false / false</dd><dt>thumbnail_url</dt><dd>/media/episodes/ep-8412.webp</dd></dl></section><section class="detail-section"><div class="truth-note">${icon("info")}<p>Release-count не входит в Episode response. Для списка вариантов использовать GET /episodes/{id}/releases или GET /releases?episode_id=….</p></div></section><section class="detail-section"><div class="review-actions"><button class="button button--primary" data-action="edit-episode">${icon("pencil")}Редактировать</button><button class="button" data-view="releases">Открыть Releases</button></div></section>`,
    });
  }

  function releaseDrawerReal(id) {
    openDrawer({
      eyebrow: `Release ${id}`,
      title: "Kodik · voice · ru",
      body: `<section class="detail-section"><h4>GET /releases/{id}</h4><dl class="definition-list"><dt>episode_id</dt><dd>EP-8412</dd><dt>source</dt><dd>Kodik</dd><dt>quality</dt><dd>1080p</dd><dt>url</dt><dd>Значение сохранено · health неизвестен</dd><dt>embed_url</dt><dd>Значение сохранено · health неизвестен</dd><dt>external_id</dt><dd>498912:13:anilibria</dd></dl></section><section class="detail-section"><h4>Translation</h4><dl class="definition-list"><dt>translation_type</dt><dd>voice</dd><dt>translation_language</dt><dd>ru</dd><dt>translation_team</dt><dd>AniLibria</dd><dt>is_active</dt><dd>true</dd><dt>is_verified</dt><dd>true · stored boolean</dd></dl></section><section class="detail-section"><div class="review-actions"><button class="button button--primary" data-action="edit-release">${icon("pencil")}Редактировать</button><span class="unsupported-label">Server validate/test-stream отсутствует</span></div></section>`,
    });
  }

  function importPreview(id) {
    const item =
      anime.find((entry) => String(entry.id) === String(id)) || anime[0];
    openDrawer({
      eyebrow: "Безопасный предпросмотр · данные не изменены",
      title: "Сравнение импорта",
      body: `<div class="detail-hero">${poster(item)}<div class="detail-hero__copy"><h3>${item.title}</h3><p>${item.original}</p>${status("fetch-full · без записи", "info")}</div></div><section class="detail-section"><h4>Sample field diff</h4><div class="diff-list"><div><span>Поле</span><strong>В каталоге</strong><strong>Источник</strong></div><div><span>Эпизодов</span><em>21 / 24</em><mark>22 / 24</mark></div><div><span>Оценка</span><em>8.74</em><mark>8.77</mark></div><div><span>poster_url</span><em>Текущее значение</em><mark>Incoming значение</mark></div></div><p class="drawer-hint">Процент совпадения не показывается: такого поля нет в backend response.</p></section><section class="detail-section"><div class="review-actions"><button class="button" data-action="skip-import">Закрыть без изменений</button><button class="button button--primary" data-action="confirm-single-import">${icon("download")}Вызвать add-from-kodik</button></div></section>`,
    });
  }

  function toast(title, detail = "Операция выполнена", tone = "success") {
    const toastRegion = document.querySelector("#toast-region");
    const node = document.createElement("article");
    node.className = "toast";
    node.innerHTML = `<span class="toast-icon ${tone === "warning" ? "event-icon--warning" : tone === "danger" ? "attention-icon--danger" : "event-icon--success"}">${icon(tone === "warning" ? "triangle-alert" : tone === "danger" ? "circle-x" : "check")}</span><span class="toast-copy"><strong>${title}</strong><small>${detail}</small></span><button type="button" class="toast-close" aria-label="Закрыть уведомление">${icon("x")}</button>`;
    toastRegion.append(node);
    refreshIcons();
    const remove = () => {
      node.classList.add("is-leaving");
      setTimeout(() => node.remove(), 180);
    };
    node.querySelector(".toast-close").addEventListener("click", remove);
    setTimeout(remove, 4200);
  }

  function downloadTextFile(
    filename,
    content,
    type = "text/plain;charset=utf-8",
  ) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function handleAction(action, dataset) {
    if (action === "close-dialog") return closeTransient();
    if (action === "open-site")
      return toast(
        "Пользовательский сайт",
        "В макете внешняя ссылка отключена",
      );
    if (action === "profile-menu")
      return openDrawer({
        eyebrow: "GET /users/me · sample response",
        title: "Montihx",
        body: `<div class="detail-hero"><span class="avatar avatar--admin">DM</span><div class="detail-hero__copy"><h3>Montihx</h3><p>montihx@kitsu.local</p>${status("is_active=true", "success")}</div></div><section class="detail-section"><h4>FullUser fields</h4><dl class="definition-list"><dt>username</dt><dd>Montihx</dd><dt>is_superuser</dt><dd>true</dd><dt>is_verified</dt><dd>true</dd><dt>role</dt><dd>super_admin</dd><dt>created_at</dt><dd>13 авг 2026</dd><dt>last_seen_at</dt><dd>сейчас</dd></dl><p class="drawer-hint">IP, device list и срок сессии не показываются: GET /users/me их не возвращает.</p></section><section class="detail-section"><div class="action-menu-list"><button data-view="settings">${icon("settings-2")}Настройки сайта<span>Перейти к пяти SystemSetting keys</span></button><button data-action="change-password">${icon("key-round")}Сменить пароль<span>POST /auth/change-password</span></button><button class="is-danger" data-action="sign-out">${icon("log-out")}Выйти<span>Очистить локальные токены и открыть /login</span></button></div></section>`,
      });
    if (action === "export") {
      const rows = [...document.querySelectorAll(".data-table tr")].map((row) =>
        [...row.querySelectorAll("th, td")]
          .map((cell) => `"${cell.innerText.replaceAll('"', '""').trim()}"`)
          .join(","),
      );
      downloadTextFile(
        "kitsu-audit-loaded-page.csv",
        rows.join("\n"),
        "text/csv;charset=utf-8",
      );
      return toast(
        "CSV скачан",
        "Экспортированы только строки загруженной страницы",
      );
    }
    if (action === "export-collections") {
      const rows = [...document.querySelectorAll(".data-table tr")].map((row) =>
        [...row.querySelectorAll("th, td")]
          .map((cell) => `"${cell.innerText.replaceAll('"', '""').trim()}"`)
          .join(","),
      );
      downloadTextFile(
        "kitsu-collections-loaded-page.csv",
        rows.join("\n"),
        "text/csv;charset=utf-8",
      );
      return toast(
        "CSV скачан",
        "Экспортированы только строки загруженной superuser list",
      );
    }
    if (action === "export-parser-settings") {
      const textarea = document.querySelector("#parser-settings-config");
      downloadTextFile(
        `kitsu-parser-settings-${state.parserSettingsTab}.json`,
        textarea ? textarea.value : "{}",
        "application/json;charset=utf-8",
      );
      return toast(
        "JSON скачан",
        `Экспортирован loaded config категории ${state.parserSettingsTab}`,
      );
    }
    if (action === "go-imports" || action === "import-kodik")
      return navigate("imports");
    if (action === "add-content" || action === "edit-anime")
      return navigate("anime-editor");
    if (action === "add-episode" || action === "edit-episode")
      return navigate("episode-editor");
    if (action === "add-release" || action === "edit-release")
      return navigate("release-editor");
    if (action === "preview-content")
      return openDrawer({
        eyebrow: "Локальная сводка · без API request",
        title: "Изменения Anime",
        body: `<section class="detail-section"><h4>PATCH payload preview</h4><dl class="definition-list"><dt>title</dt><dd>Поднятие уровня в одиночку 2</dd><dt>slug</dt><dd>solo-leveling-season-2</dd><dt>status</dt><dd>ongoing</dd><dt>needs_moderation</dt><dd>Сохраняется по backend rules</dd></dl></section><div class="truth-note">${icon("info")}<p>Публичная карточка здесь не эмулируется. В production preview открывает фактический /anime/[slug] после успешного чтения.</p></div>`,
      });
    if (action === "save-anime")
      return toast(
        "Anime form проверена",
        "Production отправляет POST или PATCH; standalone запрос не выполняет",
        "warning",
      );
    if (action === "save-episode")
      return toast(
        "Episode form проверена",
        "Production отправляет POST /episodes; standalone запрос не выполняет",
        "warning",
      );
    if (action === "save-release")
      return toast(
        "Release form проверена",
        "Production отправляет POST /releases; URL health остаётся неизвестен",
        "warning",
      );
    if (action === "open-filters" || action === "focus-filter")
      return openDialog({
        eyebrow: "Таблица · фильтры",
        title: "Настроить выборку",
        body: `<div class="form-grid"><label class="field"><span>kind</span><select><option>Любой</option><option>tv</option><option>movie</option><option>ova</option><option>ona</option><option>special</option><option>music</option><option>tv_special</option></select></label><label class="field"><span>status</span><select><option>Любой</option><option>ongoing</option><option>released</option><option>announced</option></select></label><label class="field"><span>has_video</span><select><option>Любое</option><option>true</option><option>false</option></select></label><label class="field"><span>needs_moderation</span><select><option>Любое</option><option>true</option><option>false</option></select></label></div><p class="drawer-hint">Только query-параметры GET /dashboard/parsers/anime-list. Дата, provider и «ошибки» не добавлены.</p>`,
        confirm: "Применить фильтры",
        confirmAction: "apply-filters",
      });
    if (action === "apply-filters") {
      closeTransient();
      return toast(
        "Query-параметры проверены",
        "Production синхронизирует их через nuqs и повторяет GET; sample rows не изменены",
        "warning",
      );
    }
    if (action === "columns")
      return openDialog({
        eyebrow: "Таблица · представление",
        title: "Настроить столбцы",
        body: `<div class="column-picker"><label><input type="checkbox" checked>Название и ID <span>Закреплено</span></label><label><input type="checkbox" checked>Kind / year</label><label><input type="checkbox" checked>External IDs</label><label><input type="checkbox" checked>Status</label><label><input type="checkbox" checked>Score</label><label><input type="checkbox">Updated at</label><label><input type="checkbox">Created at</label></div>`,
        confirm: "Сохранить представление",
        confirmAction: "apply-columns",
      });
    if (action === "apply-columns") {
      closeTransient();
      return toast(
        "Представление проверено",
        "Standalone не сохраняет пользовательские настройки столбцов",
        "warning",
      );
    }
    if (
      [
        "refresh-catalog",
        "refresh-sources",
        "refresh-jobs",
        "refresh-monitoring",
      ].includes(action)
    )
      return toast(
        "Refresh contract",
        "Production повторяет GET текущего ресурса; sample rows не изменены",
        "warning",
      );
    if (action === "reset-catalog") {
      state.catalogQuery = "";
      state.catalogFilter = "all";
      return renderCurrent();
    }
    if (action === "clear-selection") {
      state.selectedAnime.clear();
      return renderCurrent();
    }
    if (action === "bulk-status")
      return openDialog({
        eyebrow: "POST /dashboard/bulk/anime",
        title: `Изменить status у ${state.selectedAnime.size} записей?`,
        body: `<label class="field"><span>new_status</span><select><option>ongoing</option><option>released</option><option>anons</option><option>cancelled</option><option>hiatus</option></select><small>Точный allow-list bulk handler. Обратите внимание: bulk использует anons, хотя parser нормализует его в announced.</small></label><div class="truth-note truth-note--dialog">${icon("info")}<p>Audit создаёт одну запись на request, не отдельную запись на каждый ID.</p></div>`,
        confirm: "Отправить update_status",
        confirmAction: "confirm-bulk-status",
      });
    if (action === "confirm-bulk-status") {
      const count = state.selectedAnime.size;
      closeTransient();
      state.selectedAnime.clear();
      renderCurrent();
      return toast(
        "Bulk payload проверен",
        `${count} IDs · action=update_status · standalone запрос не выполняет`,
        "warning",
      );
    }
    if (action === "start-sync")
      return openDialog({
        eyebrow: "ParserJob · ручной запуск",
        title: "Запустить поддерживаемую операцию",
        body: `<div class="form-grid"><label class="field field--full"><span>parser_name + job_type</span><select><option>kodik · incremental</option><option>kodik · full_sync</option><option>shikimori · shikimori_related_refresh</option></select><small>POST /jobs/trigger принимает только parser_name и job_type. Batch size и priority в request отсутствуют.</small></label></div><div class="truth-note truth-note--dialog">${icon("info")}<p><strong>Прогресс зависит от режима.</strong><br>Full sync не публикует промежуточный процент; related refresh публикует telemetry и может создать conflicts.</p></div>`,
        confirm: "Создать задачу",
        confirmAction: "confirm-sync",
      });
    if (action === "confirm-sync") {
      closeTransient();
      return toast(
        "Trigger payload проверен",
        "Production получает {job_id,status}; standalone запрос не выполняет",
        "warning",
      );
    }
    if (action === "run-related-refresh")
      return openDialog({
        eyebrow: "Shikimori · ручная операция",
        title: "Обновить связи и external ID?",
        body: `<p class="dialog-copy">Job type <code>shikimori_related_refresh</code> публикует telemetry и может создать <code>shikimori_identity_mismatch</code> conflicts. Длительность заранее неизвестна.</p><div class="impact-list"><span>${icon("check")}No change и auto accepted учитываются отдельно</span><span>${icon("git-compare-arrows")}Suspicious попадают в очередь конфликтов</span><span>${icon("wifi-off")}Network errors не смешиваются с conflicts</span></div>`,
        confirm: "Запустить related refresh",
        confirmAction: "confirm-related-refresh",
      });
    if (action === "confirm-related-refresh") {
      closeTransient();
      return toast(
        "Related refresh payload проверен",
        "Production вызывает jobs/trigger; standalone запрос не выполняет",
        "warning",
      );
    }
    if (action === "run-import-search")
      return toast(
        "Search-live contract",
        "На экране показаны 3 sample rows; production отображает только response.data",
        "warning",
      );
    if (action === "preview-import") return importPreview(dataset.id);
    if (action === "confirm-single-import") {
      closeTransient();
      return toast(
        "add-from-kodik payload проверен",
        "Endpoint выполняется синхронно; результат может требовать moderation",
        "warning",
      );
    }
    if (action === "validate-batch")
      return toast(
        "Sample CSV разобран локально",
        "Production должен показать только фактический результат валидации",
        "warning",
      );
    if (action === "download-import-template") {
      downloadTextFile(
        "kitsu-add-from-kodik.csv",
        "kodik_id,kodik_shikimori_id,shikimori_id\n498912,58567,58567\n",
        "text/csv;charset=utf-8",
      );
      return toast("CSV скачан", "Колонки совпадают с POST /add-from-kodik");
    }
    if (action === "resolve-conflict")
      return openDrawer({
        eyebrow: `Конфликт C-${dataset.id || 781} · shikimori_identity_mismatch`,
        title: "Полные данные сопоставления",
        body: `<section class="detail-section"><h4>Existing data · Kodik</h4><dl class="definition-list"><dt>Title</dt><dd>Поднятие уровня в одиночку 2</dd><dt>Kodik ID</dt><dd>498912</dd><dt>Season</dt><dd>2</dd><dt>Kind / year</dt><dd>TV · 2025</dd></dl></section><section class="detail-section"><h4>Incoming data · Shikimori</h4><dl class="definition-list"><dt>Shikimori ID</dt><dd>58567</dd><dt>Reason</dt><dd><code>season_mismatch</code></dd><dt>Season</dt><dd>1</dd><dt>Reliable</dt><dd>Нет</dd></dl></section><section class="detail-section"><h4>Стратегия решения</h4><p class="dialog-copy">Ignore сохраняет текущую связь. Replace применяет incoming ID и записывает решение в audit log.</p><div class="review-actions"><button class="button" data-action="ignore-conflict">${icon("ban")}Ignore</button><button class="button button--primary" data-action="replace-conflict">${icon("replace")}Replace</button></div></section>`,
      });
    if (action === "ignore-conflict")
      return openDialog({
        eyebrow: `Конфликт C-${dataset.id || 781} · ignore`,
        title: "Сохранить текущую связь?",
        body: `<p class="dialog-copy">Incoming-данные будут отклонены. Стратегия <code>ignore</code>, actor и timestamp сохранятся в журнале аудита.</p>`,
        confirm: "Игнорировать incoming",
        confirmAction: "confirm-ignore-conflict",
      });
    if (action === "replace-conflict")
      return openDialog({
        eyebrow: `Конфликт C-${dataset.id || 781} · replace`,
        title: "Заменить внешнюю связь?",
        body: `<p class="dialog-copy">Shikimori ID из incoming_data заменит текущую связь. Проверьте сезон: это действие влияет на последующие обновления.</p>`,
        confirm: "Заменить связь",
        confirmAction: "confirm-replace-conflict",
        danger: true,
      });
    if (
      action === "confirm-ignore-conflict" ||
      action === "confirm-replace-conflict"
    ) {
      closeTransient();
      return toast(
        "Resolve payload проверен",
        action === "confirm-ignore-conflict"
          ? "Production отправляет strategy=ignore; standalone запрос не выполняет"
          : "Production отправляет strategy=replace; standalone запрос не выполняет",
        "warning",
      );
    }
    if (action === "view-anime" || action === "view-review") {
      const item =
        anime.find((entry) => String(entry.id) === String(dataset.id)) ||
        anime[0];
      return animeDrawer(item);
    }
    if (action === "view-episode") return episodeDrawerReal(dataset.id);
    if (action === "view-release") return releaseDrawerReal(dataset.id);
    if (action === "view-user") return userDrawerReal(dataset.id);
    if (action === "view-job") return jobDrawerReal(dataset.id);
    if (action === "delete-job")
      return openDialog({
        eyebrow: "Задача парсера",
        title: "Удалить задачу и её логи?",
        body: `<p class="dialog-copy">Записи каталога не изменятся. Будут удалены только история выполнения и технические логи.</p>`,
        confirm: "Удалить задачу",
        confirmAction: "confirm-delete-job",
        danger: true,
      });
    if (action === "confirm-delete-job") {
      closeTransient();
      return toast(
        "Delete contract подтверждён",
        "Production удаляет job и logs; standalone запрос не выполняет",
        "warning",
      );
    }
    if (action === "clear-jobs") {
      const clearableCount = jobs.filter((job) => job.status !== "running" && job.status !== "pending").length;
      return openDialog({
        eyebrow: "Журнал задач",
        title: "Очистить журнал задач?",
        body: `<p class="dialog-copy">Будут удалены только задачи в terminal статусах (success · failed · cancelled) — ${clearableCount} из ${jobs.length}. Выполняющиеся и ожидающие задачи не затрагиваются.</p>`,
        confirm: "Очистить журнал",
        confirmAction: "confirm-clear-jobs",
        danger: true,
      });
    }
    if (action === "confirm-clear-jobs") {
      closeTransient();
      const clearableCount = jobs.filter((job) => job.status !== "running" && job.status !== "pending").length;
      return toast(
        "Clear contract подтверждён",
        `Production удалит ${clearableCount} terminal job из журнала; DELETE /dashboard/parsers/jobs — standalone запрос не выполняет`,
        "warning",
      );
    }
    if (action === "open-global-logs") {
      closeTransient();
      state.parserTab = "logs";
      return navigate("parsers");
    }
    if (action === "run-job") return handleAction("start-sync", dataset);
    if (action === "stop-job")
      return openDialog({
        eyebrow: "Парсер · остановка",
        title: "Остановить активную задачу?",
        body: `<p style="margin:0;color:var(--text-secondary);font-size:10px;line-height:1.6">POST /jobs/{id}/stop доступен только для running/pending. Backend вызывает Asynq CancelProcessing и помечает job cancelled; атомарность незавершённого batch отдельно не обещается.</p>`,
        confirm: "Остановить задачу",
        confirmAction: "confirm-stop",
        danger: true,
      });
    if (action === "confirm-stop") {
      closeTransient();
      return toast(
        "Stop contract подтверждён",
        "Production вызывает /jobs/{id}/stop; standalone запрос не выполняет",
        "warning",
      );
    }
    if (action === "approve-review")
      return toast(
        "Approve payload проверен",
        "Endpoint снимает needs_moderation у eligible IDs; standalone запрос не выполняет",
        "warning",
      );
    if (action === "approve-comment")
      return toast(
        "Comment approve contract",
        "Endpoint устанавливает is_hidden=false; audit entry не гарантируется",
        "warning",
      );
    if (action === "delete-comment")
      return openDialog({
        eyebrow: "Модерация комментария",
        title: "Удалить комментарий?",
        body: `<div class="truth-note">${icon("triangle-alert")}<p>DELETE выполняет soft delete и не принимает reason body. Отдельное уведомление пользователю и audit entry backend не гарантирует.</p></div>`,
        confirm: "Удалить",
        confirmAction: "confirm-delete-comment",
        danger: true,
      });
    if (action === "confirm-delete-comment") {
      closeTransient();
      return toast(
        "Delete contract подтверждён",
        "Production выполняет soft delete без body; standalone запрос не выполняет",
        "warning",
      );
    }
    if (action === "refresh-moderation")
      return toast(
        "Refresh contract",
        "Production повторяет GET текущей queue; sample rows не изменены",
        "warning",
      );
    if (action === "save-settings")
      return toast(
        "Пять значений проверены",
        "Production отправляет один PATCH map; standalone запрос не выполняет",
        "warning",
      );
    if (action === "save-parser-settings") {
      const raw =
        document.querySelector(".config-content textarea")?.value || "{}";
      try {
        const parsed = JSON.parse(raw);
        if (!parsed || Array.isArray(parsed) || typeof parsed !== "object")
          throw new Error("Config must be an object");
      } catch {
        return toast(
          "Некорректный JSON",
          "config должен быть JSON object",
          "danger",
        );
      }
      return toast(
        "JSON прошёл локальную проверку",
        "Production отправляет PATCH; Go runtime-consumer всё ещё не подтверждён",
        "warning",
      );
    }
    if (action === "settings-history") return navigate("audit");
    if (action === "create-backup")
      return openDialog({
        eyebrow: "Backup · ручной запуск",
        title: "Создать пару артефактов",
        body: `<p class="dialog-copy">Один запуск создаёт две независимые записи: <strong>database</strong> и <strong>media</strong>. Их статусы и ошибки отслеживаются отдельно.</p><div class="artifact-preview"><span>${icon("database")}<strong>database</strong><small>PostgreSQL dump</small></span><span>${icon("images")}<strong>media</strong><small>Пользовательские файлы</small></span></div><div class="truth-note truth-note--dialog">${icon("shield-check")}<p>Restore намеренно отсутствует. Доступны только create, list, download и delete.</p></div>`,
        confirm: "Создать database + media",
        confirmAction: "confirm-backup",
      });
    if (action === "confirm-backup") {
      closeTransient();
      return toast(
        "Backup request проверен",
        "POST синхронно создаёт database и media; результат известен только после response",
        "warning",
      );
    }
    if (action === "download-backup")
      return toast(
        "Download contract",
        "Production открывает GET /backups/{id}/download; временной signed URL нет",
        "warning",
      );
    if (action === "delete-backup")
      return openDialog({
        eyebrow: `Backup B-${dataset.id}`,
        title: "Удалить резервную копию?",
        body: `<p style="margin:0;color:var(--text-secondary);font-size:10px;line-height:1.6">DELETE удаляет файл и registry row. Backend не обещает защиту «последней копии»; подтвердите точный artifact.</p>`,
        confirm: "Удалить навсегда",
        confirmAction: "confirm-delete-backup",
        danger: true,
      });
    if (action === "confirm-delete-backup") {
      closeTransient();
      return toast(
        "Delete contract подтверждён",
        "Production удаляет файл и registry row; standalone запрос не выполняет",
        "warning",
      );
    }
    if (action === "create-schedule")
      return openDialog({
        eyebrow: "ParserSchedule · новая запись",
        title: "Создать расписание",
        body: `<div class="form-grid"><label class="field field--full"><span>Поддерживаемая задача</span><select><option>Kodik · incremental</option></select><small>Full sync и Shikimori related refresh доступны только вручную.</small></label><label class="field field--full"><span>Cron expression</span><input value="*/30 * * * *"><small>Например: каждые 30 минут.</small></label><label class="field field--full"><span>Состояние</span><select><option>Активно</option><option>Выключено</option></select></label></div><div class="truth-note truth-note--dialog">${icon("clock-4")}<p>После создания <code>next_run_at</code> сначала будет now + 1h. Точный cron-time установит recovery-проход.</p></div>`,
        confirm: "Создать расписание",
        confirmAction: "confirm-schedule",
      });
    if (action === "confirm-schedule") {
      closeTransient();
      return toast(
        "Schedule payload проверен",
        "Production создаёт запись; next_run_at уточняется recovery-проходом",
        "warning",
      );
    }
    if (action === "edit-schedule")
      return openDialog({
        eyebrow: "ParserSchedule · редактирование",
        title: "Изменить cron expression",
        body: `<label class="field"><span>Cron expression</span><input value="*/30 * * * *"><small>Изменение cron не пересчитает текущий next_run_at мгновенно.</small></label>`,
        confirm: "Сохранить cron",
        confirmAction: "confirm-schedule-edit",
      });
    if (action === "confirm-schedule-edit") {
      closeTransient();
      return toast(
        "Cron payload проверен",
        "Production сохраняет cron; standalone запрос не выполняет, next_run_at сразу не пересчитывается",
        "warning",
      );
    }
    if (action === "create-avatar-collection")
      return openDialog({
        eyebrow: "Avatar · новая запись",
        title: "Добавить аватар",
        body: `<div class="form-grid"><label class="field field--full"><span>title</span><input placeholder="Название аватара"></label><label class="field"><span>category</span><input placeholder="base"></label><label class="field"><span>is_active</span><select><option>true</option><option>false</option></select></label><label class="field field--full"><span>image_url</span><input placeholder="https://…"></label></div><p class="drawer-hint">Сначала создаётся запись POST /avatar-collection. Multipart upload доступен отдельным POST /avatar-collection/{id}/upload после получения id.</p>`,
        confirm: "Добавить аватар",
        confirmAction: "confirm-avatar-collection",
      });
    if (action === "confirm-avatar-collection") {
      closeTransient();
      return toast(
        "Avatar payload проверен",
        "Production создаёт одну avatar record; upload выполняется после получения id",
        "warning",
      );
    }
    if (action === "create-decoration")
      return openDialog({
        eyebrow: "Decoration · новая запись",
        title: "Добавить декорацию",
        body: `<div class="form-grid"><label class="field field--full"><span>title</span><input placeholder="Название декорации"></label><label class="field field--full"><span>image_url</span><input placeholder="https://…"></label><label class="field field--full"><span>is_active</span><select><option>true</option><option>false</option></select></label></div><p class="drawer-hint">Сначала создаётся запись POST /decorations. Multipart upload доступен отдельным POST /decorations/{id}/upload.</p>`,
        confirm: "Добавить декорацию",
        confirmAction: "confirm-decoration",
      });
    if (action === "confirm-decoration") {
      closeTransient();
      return toast(
        "Decoration payload проверен",
        "Production создаёт record; upload выполняется отдельным endpoint",
        "warning",
      );
    }
    if (action === "edit-asset")
      return openDialog({
        eyebrow: "Материалы профиля",
        title: "Изменить свойства",
        body: `<div class="form-grid"><label class="field field--full"><span>title</span><input value="Kitsu Plum"></label><label class="field field--full"><span>image_url</span><input value="/media/avatar_collection/sample.webp"></label><label class="field"><span>is_active</span><select><option>true</option><option>false</option></select></label><label class="field"><span>category · только Avatar</span><input value="base"></label></div><p class="drawer-hint">Sort order, draft и hidden status в моделях Avatar/Decoration отсутствуют.</p>`,
        confirm: "Сохранить",
        confirmAction: "confirm-asset",
      });
    if (action === "confirm-asset") {
      closeTransient();
      return toast(
        "Asset payload проверен",
        "Production отправляет PATCH; standalone запрос не выполняет",
        "warning",
      );
    }
    if (action === "delete-asset")
      return openDialog({
        eyebrow: "Материалы профиля",
        title: "Удалить этот материал?",
        body: `<p class="dialog-copy">DELETE удаляет запись. Ссылки users.decoration_id и users.active_avatar_id имеют ON DELETE SET NULL; автоматическая замена другим изображением не выполняется.</p>`,
        confirm: "Удалить",
        confirmAction: "confirm-delete-asset",
        danger: true,
      });
    if (action === "confirm-delete-asset") {
      closeTransient();
      return toast(
        "Delete contract подтверждён",
        "Production удаляет record; linked user field станет null",
        "warning",
      );
    }
    if (action === "edit-user")
      return openDialog({
        eyebrow: "Пользователь · доступ",
        title: "Назначить существующую роль",
        body: `<div class="form-grid"><label class="field field--full"><span>role_id</span><select><option>user</option><option>moderator</option><option>admin</option><option>super_admin</option></select><small>Список загружается из read-only GET /roles/. PATCH пользователя принимает только существующий role_id.</small></label></div>`,
        confirm: "Изменить роль",
        confirmAction: "confirm-user-role",
      });
    if (action === "confirm-user-role") {
      closeTransient();
      return toast(
        "Role payload проверен",
        "Production отправляет существующий role_id; standalone запрос не выполняет",
        "warning",
      );
    }
    if (action === "unban-user")
      return openDialog({
        eyebrow: "Пользователь · active state",
        title: "Разблокировать аккаунт?",
        body: `<div class="truth-note">${icon("info")}<p>POST /users/{id}/unban восстанавливает active state. Дополнительного request body нет.</p></div>`,
        confirm: "Разблокировать",
        confirmAction: "confirm-unban",
      });
    if (action === "confirm-unban") {
      closeTransient();
      return toast(
        "Unban contract подтверждён",
        "Production вызывает endpoint без body; standalone запрос не выполняет",
        "warning",
      );
    }
    if (action === "ban-user")
      return openDialog({
        eyebrow: "Модерация пользователя",
        title: "Заблокировать аккаунт?",
        body: `<div class="truth-note">${icon("triangle-alert")}<p><strong>POST /users/{id}/ban не принимает body.</strong><br>Причина, срок и уведомление не добавляются в UI: backend меняет только active state и запрещает блокировать superuser.</p></div>`,
        confirm: "Заблокировать",
        confirmAction: "confirm-ban",
        danger: true,
      });
    if (action === "confirm-ban") {
      closeTransient();
      return toast(
        "Ban contract подтверждён",
        "Production меняет active state без body; standalone запрос не выполняет",
        "warning",
      );
    }
    if (action === "change-password") {
      closeTransient();
      return openDialog({
        eyebrow: "Аккаунт · безопасность",
        title: "Сменить пароль",
        body: `<div class="form-grid"><label class="field field--full"><span>current_password</span><input type="password" autocomplete="current-password"></label><label class="field field--full"><span>new_password</span><input type="password" autocomplete="new-password"><small>Backend проверяет длину 8–128 и отличие от текущего пароля; дополнительных composition rules нет.</small></label><label class="field field--full"><span>Повторите новый пароль</span><input type="password" autocomplete="new-password"><small>Повтор — клиентская проверка, в request body не отправляется.</small></label></div>`,
        confirm: "Обновить пароль",
        confirmAction: "confirm-password",
      });
    }
    if (action === "confirm-password") {
      closeTransient();
      return toast(
        "Password payload проверен",
        "Production сохраняет fresh token pair для текущего устройства и отзывает остальные",
        "warning",
      );
    }
    if (action === "sign-out") {
      closeTransient();
      return toast(
        "Standalone не хранит auth tokens",
        "Production очищает локальные токены и перенаправляет на /login",
        "warning",
      );
    }
    if (action === "validate-url-local") {
      const input = document.activeElement
        ?.closest(".input-action")
        ?.querySelector("input");
      const raw = input?.value.trim() || "";
      const valid = raw.startsWith("/") || /^https?:\/\/[^\s]+$/i.test(raw);
      return toast(
        valid ? "Формат URL допустим" : "Формат URL некорректен",
        valid
          ? "Это локальная schema-проверка; доступность источника неизвестна"
          : "Используйте абсолютный http(s) URL или путь, начинающийся с /",
        valid ? "warning" : "danger",
      );
    }
    if (action === "preview-source-identity") return importPreview(9253);
    if (action === "choose-anime")
      return openDialog({
        eyebrow: "GET /dashboard/parsers/anime-list",
        title: "Выбрать Anime",
        body: `<label class="field"><span>search</span><input value="Solo Leveling" autocomplete="off"></label><div class="truth-note truth-note--dialog">${icon("info")}<p>Production использует server search и возвращает id/slug/title. Текущее sample-значение не меняется без response.</p></div>`,
        confirm: "Оставить текущий Anime",
        confirmAction: "close-dialog",
      });
    if (action === "refresh-anime" || action === "refresh-poster")
      return openDialog({
        eyebrow: "Parser mutation · подтверждение",
        title:
          action === "refresh-anime"
            ? "Обновить Anime по slug?"
            : "Обновить poster_url из Shikimori?",
        body: `<p class="dialog-copy">${action === "refresh-anime" ? "POST /dashboard/parsers/kodik/refresh/{slug} повторно импортирует данные." : "POST /dashboard/parsers/kodik/refresh-poster/{slug} меняет poster_url."} Перед вызовом production должен показать фактический slug и текущие значения.</p>`,
        confirm: "Подтвердить mutation",
        confirmAction:
          action === "refresh-anime"
            ? "confirm-refresh-anime"
            : "confirm-refresh-poster",
      });
    if (
      action === "confirm-refresh-anime" ||
      action === "confirm-refresh-poster"
    ) {
      closeTransient();
      return toast(
        "Mutation contract подтверждён",
        "Standalone запрос не выполняет",
        "warning",
      );
    }
    if (action === "view-collection")
      return openDrawer({
        eyebrow: "Collection · sample response",
        title: "Смотрят сейчас",
        body: `<section class="detail-section"><h4>Collection fields</h4><dl class="definition-list"><dt>id</dt><dd>COL-104</dd><dt>user_id</dt><dd>Значение owner из response</dd><dt>slug</dt><dd>watching-now</dd><dt>is_public</dt><dd>true</dd><dt>items_count</dt><dd>24</dd><dt>views_count</dt><dd>184203</dd><dt>likes_count</dt><dd>12842</dd></dl></section><div class="truth-note">${icon("shield-check")}<p>Superuser list не отменяет owner-check для PATCH/DELETE, поэтому drawer read-only.</p></div>`,
      });
    if (action === "view-audit")
      return openDrawer({
        eyebrow: `AuditLog ${dataset.id || "sample"}`,
        title: "Метаданные события",
        body: `<section class="detail-section"><h4>AuditLog fields</h4><dl class="definition-list"><dt>actor_id</dt><dd>UUID или null</dd><dt>actor_ip</dt><dd>10.24.18.7</dd><dt>action</dt><dd>Значение из response</dd><dt>resource_type / id</dt><dd>Значения из response</dd><dt>meta</dt><dd>JSON object; before/after diff не гарантирован</dd><dt>success / error_message</dt><dd>Фактические поля события</dd></dl></section>`,
      });
    if (action === "add-blacklist")
      return openDialog({
        eyebrow: "POST /dashboard/parsers/blacklist",
        title: "Добавить blacklist entry",
        body: `<div class="form-grid"><label class="field"><span>shikimori_id</span><input type="number"></label><label class="field"><span>kodik_id</span><input></label><label class="field field--full"><span>slug</span><input></label></div><p class="drawer-hint">Request принимает только эти три nullable поля. Rule type, operator и text match отсутствуют.</p>`,
        confirm: "Проверить payload",
        confirmAction: "confirm-add-blacklist",
      });
    if (action === "confirm-add-blacklist") {
      closeTransient();
      return toast(
        "Blacklist payload проверен",
        "Production выполняет POST; standalone запрос не выполняет",
        "warning",
      );
    }
    if (action === "remove-blacklist")
      return openDialog({
        eyebrow: "DELETE /dashboard/parsers/blacklist/{entry_id}",
        title: "Удалить blacklist entry?",
        body: `<p class="dialog-copy">Удаляется запись по UUID entry_id. В production dialog должен показать полный ID загруженной строки.</p>`,
        confirm: "Удалить entry",
        confirmAction: "confirm-remove-blacklist",
        danger: true,
      });
    if (action === "confirm-remove-blacklist") {
      closeTransient();
      return toast(
        "Delete contract подтверждён",
        "Standalone запрос не выполняет",
        "warning",
      );
    }
    if (action === "skip-import") return closeTransient();
    return toast(
      "Действие отключено",
      action
        ? `Для «${action}» не найден проверенный handler в этом standalone template`
        : "Не передан action identifier",
      "warning",
    );
  }

  document.addEventListener("click", (event) => {
    const viewTarget = event.target.closest("[data-view]");
    if (viewTarget) {
      event.preventDefault();
      navigate(viewTarget.dataset.view);
      return;
    }
    const actionTarget = event.target.closest("[data-action]");
    if (actionTarget) {
      event.preventDefault();
      if (actionTarget.dataset.action === "toggle-switch") {
        toggleSwitch(actionTarget);
        return;
      }
      handleAction(actionTarget.dataset.action, actionTarget.dataset);
      return;
    }
    const filter = event.target.closest("[data-filter]");
    if (filter) {
      state.catalogFilter = filter.dataset.filter;
      renderCurrent();
      return;
    }
    const roleFilter = event.target.closest("[data-role-filter]");
    if (roleFilter) {
      state.usersRoleFilter = roleFilter.dataset.roleFilter;
      renderCurrent();
      return;
    }
    const parserTab = event.target.closest("[data-parser-tab]");
    if (parserTab) {
      state.parserTab = parserTab.dataset.parserTab;
      history.replaceState(null, "", `#parsers/${state.parserTab}`);
      renderCurrent();
      return;
    }
    const conflictTab = event.target.closest("[data-conflict-tab]");
    if (conflictTab) {
      state.conflictTab = conflictTab.dataset.conflictTab;
      history.replaceState(null, "", `#conflicts/${state.conflictTab}`);
      renderCurrent();
      return;
    }
    const settingsTab = event.target.closest("[data-settings-tab]");
    if (settingsTab) {
      state.settingsTab = settingsTab.dataset.settingsTab;
      renderCurrent();
      return;
    }
    const assetTab = event.target.closest("[data-asset-tab]");
    if (assetTab) {
      state.assetTab = assetTab.dataset.assetTab;
      renderCurrent();
      return;
    }
    const importMode = event.target.closest("[data-import-mode]");
    if (importMode) {
      state.importMode = importMode.dataset.importMode;
      renderCurrent();
      return;
    }
    const editorTab = event.target.closest("[data-editor-tab]");
    if (editorTab) {
      state.editorTab = editorTab.dataset.editorTab;
      renderCurrent();
      return;
    }
    const parserSettingsTab = event.target.closest(
      "[data-parser-settings-tab]",
    );
    if (parserSettingsTab) {
      state.parserSettingsTab = parserSettingsTab.dataset.parserSettingsTab;
      renderCurrent();
      return;
    }
    const moderationTab = event.target.closest("[data-moderation-tab]");
    if (moderationTab) {
      state.moderationTab = moderationTab.dataset.moderationTab;
      history.replaceState(null, "", `#moderation/${state.moderationTab}`);
      renderCurrent();
      return;
    }
    const usersTab = event.target.closest("[data-users-tab]");
    if (usersTab) {
      state.usersTab = usersTab.dataset.usersTab;
      renderCurrent();
      return;
    }
    const commandTarget = event.target.closest("[data-command-index]");
    if (commandTarget) {
      executeCommand(
        state.commandItems[Number(commandTarget.dataset.commandIndex)],
      );
      return;
    }
    const switchTarget = event.target.closest(".switch");
    if (switchTarget) {
      toggleSwitch(switchTarget);
      return;
    }
    const simpleToggle = event.target.closest(
      ".filter-chip, .segmented button, .tabs button",
    );
    if (simpleToggle) {
      simpleToggle.parentElement
        ?.querySelectorAll("button")
        .forEach((button) =>
          button.classList.toggle("is-active", button === simpleToggle),
        );
      return;
    }
    const paginationButton = event.target.closest(".pagination button");
    if (paginationButton) {
      const label = paginationButton.textContent.trim();
      toast(
        "Pagination contract",
        /^\d+$/.test(label)
          ? `Production записывает page=${label} в URL через nuqs и повторяет GET`
          : "Production вычисляет соседнюю страницу через URL state и повторяет GET",
        "warning",
      );
      return;
    }
    const looseFilter = event.target.closest(".filter-button");
    if (looseFilter) {
      handleAction("open-filters", looseFilter.dataset);
      return;
    }
    if (
      !event.target.closest("#notification-popover") &&
      !event.target.closest("#notifications-trigger")
    ) {
      notificationPopover.hidden = true;
      document
        .querySelector("#notifications-trigger")
        ?.setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("change", (event) => {
    const animeSelect = event.target.closest("[data-select-anime]");
    if (animeSelect) {
      const id = Number(animeSelect.dataset.selectAnime);
      if (animeSelect.checked) state.selectedAnime.add(id);
      else state.selectedAnime.delete(id);
      renderCurrent();
      return;
    }
    if (event.target.id === "select-all-anime") {
      if (event.target.checked)
        filteredAnime().forEach((item) => state.selectedAnime.add(item.id));
      else state.selectedAnime.clear();
      renderCurrent();
    }
  });

  document.addEventListener("input", (event) => {
    if (event.target.id === "catalog-search") {
      const position = event.target.selectionStart;
      state.catalogQuery = event.target.value;
      clearTimeout(state.catalogTimer);
      state.catalogTimer = setTimeout(() => {
        renderCurrent();
        const input = document.querySelector("#catalog-search");
        input?.focus();
        input?.setSelectionRange(position, position);
      }, 140);
    }
  });

  document
    .querySelector("#command-trigger")
    .addEventListener("click", openCommand);
  document
    .querySelector("#mobile-search")
    .addEventListener("click", openCommand);
  document
    .querySelector("#notifications-trigger")
    .addEventListener("click", (event) => {
      notificationPopover.hidden = !notificationPopover.hidden;
      event.currentTarget.setAttribute(
        "aria-expanded",
        String(!notificationPopover.hidden),
      );
      hideTooltip(true);
    });
  document.querySelector("#menu-button").addEventListener("click", () => {
    appShell.classList.add("is-mobile-open");
    syncMobileSidebar();
  });
  document.querySelector("#mobile-more").addEventListener("click", () => {
    appShell.classList.add("is-mobile-open");
    syncMobileSidebar();
  });
  document.querySelector("#sidebar-close").addEventListener("click", () => {
    appShell.classList.remove("is-mobile-open");
    syncMobileSidebar();
  });
  document.querySelector("#sidebar-scrim").addEventListener("click", () => {
    appShell.classList.remove("is-mobile-open");
    syncMobileSidebar();
  });
  document.querySelector("#collapse-button").addEventListener("click", () => {
    appShell.classList.toggle("is-collapsed");
    localStorage.setItem(
      "kitsu-sidebar-collapsed",
      appShell.classList.contains("is-collapsed") ? "1" : "0",
    );
    setTimeout(refreshIcons, 0);
  });
  document.querySelector("#theme-toggle").addEventListener("click", () => {
    const next =
      document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("kitsu-admin-theme", next);
    document.querySelector('meta[name="theme-color"]').content =
      next === "light" ? "#f5f4f2" : "#0d0d0f";
  });
  document
    .querySelector("#dialog-close")
    .addEventListener("click", closeTransient);
  document
    .querySelector("#drawer-close")
    .addEventListener("click", closeTransient);
  overlay.addEventListener("click", closeTransient);
  commandInput.addEventListener("input", () => {
    state.commandIndex = 0;
    renderCommandResults();
  });
  commandInput.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      state.commandIndex = Math.min(
        state.commandIndex + 1,
        state.commandItems.length - 1,
      );
      renderCommandResults();
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      state.commandIndex = Math.max(state.commandIndex - 1, 0);
      renderCommandResults();
    }
    if (event.key === "Enter") {
      event.preventDefault();
      executeCommand(state.commandItems[state.commandIndex]);
    }
  });
  document.addEventListener("keydown", (event) => {
    trapModalFocus(event);
    if (event.key === "Escape") hideTooltip(true);
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      openCommand();
    }
    if (event.key === "Escape") {
      closeTransient();
      if (appShell.classList.contains("is-mobile-open")) {
        appShell.classList.remove("is-mobile-open");
        syncMobileSidebar();
        document.querySelector("#menu-button").focus({ preventScroll: true });
      }
    }
    if (
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      ["1", "2", "3", "4"].includes(event.key) &&
      !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)
    ) {
      navigate(
        ["overview", "catalog", "parsers", "monitoring"][Number(event.key) - 1],
      );
    }
  });
  function syncFromHash() {
    const [view, tab] = location.hash.slice(1).split("/");
    if (!renderers[view]) return;
    state.currentView = view;
    if (view === "parsers" && ["jobs", "logs", "sources"].includes(tab)) {
      state.parserTab = tab;
    }
    if (
      view === "conflicts" &&
      ["pending", "auto", "resolved"].includes(tab)
    ) {
      state.conflictTab = tab;
    }
    if (view === "moderation" && ["import", "comments"].includes(tab)) {
      state.moderationTab = tab;
    }
    renderCurrent();
  }
  window.addEventListener("hashchange", syncFromHash);
  window.addEventListener("popstate", syncFromHash);
  document.addEventListener("pointerover", (event) => {
    if (event.pointerType === "touch") return;
    const target = event.target.closest?.("[data-tooltip]");
    if (
      !target ||
      (event.relatedTarget instanceof Node &&
        target.contains(event.relatedTarget))
    )
      return;
    showTooltip(target);
  });
  document.addEventListener("pointerout", (event) => {
    const target = event.target.closest?.("[data-tooltip]");
    if (
      !target ||
      (event.relatedTarget instanceof Node &&
        target.contains(event.relatedTarget))
    )
      return;
    hideTooltip();
  });
  document.addEventListener("focusin", (event) => {
    const target = event.target.closest?.("[data-tooltip]");
    if (target) showTooltip(target, 80);
  });
  document.addEventListener("focusout", (event) => {
    if (event.target.closest?.("[data-tooltip]")) hideTooltip();
  });
  window.addEventListener("scroll", () => hideTooltip(true), { passive: true });
  function syncMobileSidebar() {
    const mobile = window.matchMedia("(max-width: 980px)").matches;
    const open = appShell.classList.contains("is-mobile-open");
    const hidden = mobile && !open;
    const sidebar = document.querySelector("#sidebar");
    const menuButton = document.querySelector("#menu-button");
    sidebar.inert = hidden;
    if (hidden) sidebar.setAttribute("aria-hidden", "true");
    else sidebar.removeAttribute("aria-hidden");
    menuButton.setAttribute("aria-expanded", String(mobile && open));
  }

  window.addEventListener("resize", () => {
    hideTooltip(true);
    syncMobileSidebar();
  });

  const savedTheme = localStorage.getItem("kitsu-admin-theme");
  if (savedTheme === "light" || savedTheme === "dark")
    document.documentElement.dataset.theme = savedTheme;
  document.querySelector('meta[name="theme-color"]').content =
    document.documentElement.dataset.theme === "light" ? "#f5f4f2" : "#0d0d0f";
  if (localStorage.getItem("kitsu-sidebar-collapsed") === "1")
    appShell.classList.add("is-collapsed");
  syncMobileSidebar();
  renderCurrent();
})();
