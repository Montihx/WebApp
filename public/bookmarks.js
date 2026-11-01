/* Закладки (bookmarks.html). Вместо сервера — демо-ответы той же формы; у каждого метода `api` записан запрос.
   Карточки — те же .anime-card, что в каталоге: кнопку закладки, метку статуса на постере, меню и уведомление
   рисует общий компонент app.js (window.KitsuBookmarks). Статусы и их порядок — KitsuContent.bookmarkStatuses.
   Демо-закладки общие для всего шаблона: KitsuContent.library в content-model.js. */
(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const M = window.KitsuContent;
  const STATE = new URLSearchParams(location.search).get("state");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const icons = (root) => window.lucide?.createIcons({ attrs: { "aria-hidden": "true", "stroke-width": 1.8 }, root });
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const httpError = (status, detail) => Object.assign(new Error(detail), { status, detail });
  const utc = (v) => M.parseDateAsUtc(v) || new Date(v);
  const nf = new Intl.NumberFormat("ru-RU");
  const CATEGORIES = M.bookmarkStatuses;
  const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]));

  // На какой серии остановились — из истории просмотра (как в профиле).
  const HISTORY = { monster: [1, 31], "jujutsu-kaisen": [2, 7], "one-piece": [1, 1089], "vinland-saga": [2, 3], "my-hero-academia": [2, 4], frieren: [1, 12] };

  const api = {
    // GET /interactions/favorites → все закладки разом (страниц у ручки нет), без ORDER BY
    async favorites() {
      await sleep(320);
      if (STATE === "guest") throw httpError(401, "Not authenticated");
      if (STATE === "error") throw httpError(0, "network");
      if (STATE === "empty") return [];
      return M.library.list(localStorage);
    },
    // GET /interactions/watch-history/me?skip=0&limit=200 → {items:[{anime_slug, season, episode, …}], total}
    async history() {
      await sleep(200);
      if (STATE === "empty") return { items: [], total: 0 };
      const items = Object.entries(HISTORY).map(([slug, [season, episode]]) => ({ anime_slug: slug, season, episode }));
      return { items, total: items.length };
    },
    // Смена статуса и удаление идут через общий компонент закладки (app.js):
    // POST /interactions/favorites?anime_id&category и DELETE /interactions/favorites?anime_id.
  };

  /* ---------- Состояние ---------- */
  const store = { get(k, d) { try { return localStorage.getItem(k) ?? d; } catch (_) { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (_) { /* приватный режим */ } } };
  const view = { list: [], progress: new Map(), tab: "all", query: "", sort: store.get("kitsu-bookmarks-sort", "updated") };
  const byTie = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0); // уникальный хвост, как у постраничных списков бэкенда
  const SORTS = {
    updated: (a, b) => utc(b.updated_at) - utc(a.updated_at) || byTie(a, b),
    added: (a, b) => utc(b.created_at) - utc(a.created_at) || byTie(a, b),
    title: (a, b) => a.anime.title.localeCompare(b.anime.title, "ru") || byTie(a, b),
    score: (a, b) => (b.anime.score ?? -1) - (a.anime.score ?? -1) || byTie(a, b),
  };
  const norm = (s) => s.toLowerCase().replace(/ё/g, "е");
  function visible() {
    const q = norm(view.query.trim());
    return view.list.filter((f) => (view.tab === "all" || f.category === view.tab) && (!q || norm(f.anime.title).includes(q))).sort(SORTS[view.sort] || SORTS.updated);
  }

  /* ---------- Счётчики и полка ---------- */
  function paintCounts() {
    const counts = Object.fromEntries(CATEGORIES.map((c) => [c.key, view.list.filter((f) => f.category === c.key).length]));
    $$("[data-count]").forEach((b) => { b.textContent = nf.format(b.dataset.count === "all" ? view.list.length : counts[b.dataset.count]); });
    $("[data-total]").textContent = view.list.length ? nf.format(view.list.length) : "";
  }
  function placeBar(scroll = true) {
    const tabs = $("[data-own-tabs]"); const on = $("[aria-selected=true]", tabs); const bar = $(".bm-tabs__bar", tabs);
    if (!on || !bar || !on.offsetWidth) return;
    bar.style.width = `${on.offsetWidth}px`; bar.style.transform = `translateX(${on.offsetLeft}px)`;
    bar.dataset.bookmarkTone = on.dataset.tab === "all" ? "" : on.dataset.tab;
    if (scroll) tabs.scrollTo?.({ left: Math.max(0, on.offsetLeft - 24), behavior: reduced ? "auto" : "smooth" });
  }
  function selectTab(tab, push = true) {
    if (tab !== "all" && !CAT[tab]) tab = "all";
    view.tab = tab;
    $$("[data-own-tabs] [role=tab]").forEach((t) => { const on = t.dataset.tab === tab; t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; });
    $("[data-panel]").setAttribute("aria-labelledby", `tab-${tab}`);
    if (push) history.replaceState(null, "", tab === "all" ? location.pathname + location.search : `#${tab}`);
    placeBar(); paintList();
  }

  /* ---------- Карточки ---------- */
  const factsFor = (f) => M.bookmarkFacts(f, view.progress.get(f.anime.slug));
  function paintList() {
    const panel = $("[data-panel]"); const rows = visible();
    if (!rows.length) {
      const c = CAT[view.tab]; const q = view.query.trim();
      const [icon, title, text, action] = q
        ? ["search-x", "Ничего не нашлось", `В «${c ? c.label : "Все"}» нет тайтлов со словами «${q}».`, '<button class="button button--secondary" type="button" data-clear-search><i data-lucide="x"></i><span>Сбросить поиск</span></button>']
        : !view.list.length
          ? ["bookmark", "Закладок пока нет", "Добавляйте тайтлы кнопкой закладки на постере или на странице аниме — они соберутся здесь по статусам.", '<a class="button button--primary" href="./index.html#catalog"><i data-lucide="compass"></i><span>Открыть каталог</span></a>']
          : [c.icon, `В «${c.label}» пока пусто`, "Перенесите сюда тайтл кнопкой закладки на его постере.", '<button class="button button--secondary" type="button" data-go-all><i data-lucide="layers"></i><span>Показать все закладки</span></button>'];
      panel.innerHTML = `<div class="pf-state bm-empty"><i data-lucide="${icon}"></i><strong>${esc(title)}</strong><span>${esc(text)}</span>${action}</div>`;
      icons(panel); return;
    }
    panel.innerHTML = `<p class="sr-only">${rows.length} ${M.plural(rows.length, "тайтл", "тайтла", "тайтлов")}</p><div class="anime-grid bm-grid">${rows.map((f, i) => M.animeCard(f.anime, { facts: factsFor(f), style: `--i:${Math.min(i, 12)}` })).join("")}</div>`;
    window.KitsuBookmarks?.bind(panel);
    icons(panel);
  }

  /* ---------- Поиск, сортировка, обновление после смены статуса ---------- */
  function initTools() {
    const search = $("[data-search]"); let t = 0;
    search.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => { view.query = search.value; paintList(); }, 120); });
    const sort = $("[data-sort]"); sort.value = SORTS[view.sort] ? view.sort : "updated";
    sort.addEventListener("change", () => { view.sort = sort.value; store.set("kitsu-bookmarks-sort", view.sort); paintList(); });
    $("[data-panel]").addEventListener("click", (e) => {
      if (e.target.closest("[data-clear-search]")) { search.value = ""; view.query = ""; paintList(); search.focus(); }
      if (e.target.closest("[data-go-all]")) { selectTab("all"); $("#tab-all").focus(); }
    });
    // Статус сменили в меню карточки (app.js шлёт «kitsu:bookmark») — перечитываем список и пересчитываем вкладки.
    // Перерисовка — после закрытия меню, чтобы фокус успел вернуться; если карточка ушла из вкладки, фокус — на вкладку.
    document.addEventListener("kitsu:bookmark", () => setTimeout(async () => {
      const id = document.activeElement?.closest?.("[data-bookmark-id]")?.dataset.bookmarkId;
      view.list = await api.favorites().catch(() => view.list); paintCounts(); placeBar(false); paintList();
      ((id && $(`[data-panel] [data-bookmark-id="${CSS.escape(id)}"] [data-bookmark-trigger]`)) || $("[data-own-tabs] [aria-selected=true]"))?.focus({ preventScroll: true });
    }, 0));
    addEventListener("resize", () => placeBar(false));
    document.fonts?.ready.then(() => placeBar(false));
  }

  /* ---------- Вход и сбой ---------- */
  function gate(kind) {
    $$(".bm-tabs, .bm-tools, [data-panel]").forEach((n) => { n.hidden = true; });
    const box = $("[data-gate]"); box.hidden = false;
    box.innerHTML = kind === "guest"
      ? `<i data-lucide="bookmark"></i><strong>Закладки доступны после входа</strong><span>Войдите, чтобы собирать тайтлы по статусам: ${CATEGORIES.map((c) => c.label.toLowerCase()).join(", ")}.</span>
         <div class="pf-actions"><a class="button button--primary" href="./auth.html#login"><i data-lucide="log-in"></i><span>Войти</span></a><a class="button button--secondary" href="./auth.html#register"><i data-lucide="user-plus"></i><span>Регистрация</span></a></div>`
      : `<i data-lucide="wifi-off"></i><strong>Не получилось загрузить закладки</strong><span>Сервер не ответил. Проверьте соединение и повторите.</span>
         <div class="pf-actions"><button class="button button--primary" type="button" data-retry><i data-lucide="refresh-cw"></i><span>Повторить</span></button></div>`;
    if (kind === "guest") $$(".header-account").forEach((a) => { a.outerHTML = '<a class="header-login" href="./auth.html#login">Войти</a>'; });
    icons(box); $("[data-retry]", box)?.addEventListener("click", () => location.reload());
  }

  async function init() {
    document.addEventListener("visibilitychange", () => document.body.classList.toggle("is-hidden-tab", document.hidden));
    icons(document);
    $("[data-panel]").innerHTML = `<div class="anime-grid bm-grid">${Array.from({ length: 8 }, () => '<div class="pf-skel pf-skel--card"></div>').join("")}</div>`;
    $("[data-own-tabs]").addEventListener("click", (e) => { const t = e.target.closest("[role=tab]"); if (t && t.dataset.tab !== view.tab) selectTab(t.dataset.tab); });
    addEventListener("hashchange", () => selectTab(location.hash.slice(1) || "all", false));
    initTools();
    try {
      const [list, hist] = await Promise.all([api.favorites(), api.history().catch(() => ({ items: [] }))]);
      view.list = list; hist.items.forEach((h) => { if (!view.progress.has(h.anime_slug)) view.progress.set(h.anime_slug, h); });
    } catch (err) { gate(err.status === 401 ? "guest" : "error"); $("#bookmarks-main").removeAttribute("aria-busy"); return; }
    $("#bookmarks-main").removeAttribute("aria-busy");
    paintCounts(); selectTab(location.hash.slice(1) || "all", false);
  }
  init();
})();
