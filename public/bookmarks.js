/* Закладки (bookmarks.html). Вместо сервера — `api` на демо-ответах той же формы; у каждого метода записан запрос.
   Изменения демо хранятся в localStorage ("kitsu-demo-favorites") — их видит и раздел закладок в профиле. */
(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const STATE = new URLSearchParams(location.search).get("state");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const icons = (root) => window.lucide?.createIcons({ attrs: { "aria-hidden": "true", "stroke-width": 1.8 }, root });
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const httpError = (status, detail) => Object.assign(new Error(detail), { status, detail });
  const utc = (v) => window.KitsuContent?.parseDateAsUtc(v) || new Date(v);
  const plural = (n, one, few, many) => window.KitsuContent?.plural?.(n, one, few, many) ?? many;
  const nf = new Intl.NumberFormat("ru-RU");
  const DAY = 86400000;
  const ago = (ms) => new Date(Date.now() - ms).toISOString().slice(0, 19); // как у API: наивный UTC без «Z»

  const CATEGORIES = [
    { id: "watching", label: "Смотрю", icon: "play" },
    { id: "completed", label: "Просмотрено", icon: "check" },
    { id: "planned", label: "В планах", icon: "clock-3" },
    { id: "on_hold", label: "Отложено", icon: "pause" },
    { id: "dropped", label: "Брошено", icon: "x" },
  ];
  const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
  const KIND = { tv: "ТВ", movie: "Фильм", ona: "ONA", ova: "OVA", special: "Спецвыпуск" };
  const STATUS = { released: "Вышло", ongoing: "Онгоинг", anons: "Анонс", announced: "Анонс" };

  /* ---------- Демо-данные (те же тайтлы, что в профиле) ---------- */
  const poster = (id) => `https://shikimori.one/system/animes/original/${id}.jpg`;
  const TITLES = {
    frieren: ["Провожающая в последний путь Фрирен", 52991, "tv", "released", 28, 9.3], monster: ["Монстр", 19, "tv", "released", 74, 8.9],
    steins: ["Врата Штейна", 9253, "tv", "released", 24, 9.1], bebop: ["Ковбой Бибоп", 1, "tv", "released", 26, 8.8],
    mushishi: ["Мастер муси", 457, "tv", "released", 26, 8.6], vinland: ["Сага о Винланде", 37521, "tv", "released", 24, 8.7],
    jjk: ["Магическая битва", 40748, "tv", "released", 24, 8.5], violet: ["Вайолет Эвергарден", 33352, "tv", "released", 13, 8.4],
    onepiece: ["Ван-Пис", 21, "tv", "ongoing", null, 8.7], hxh: ["Охотник х Охотник", 11061, "tv", "released", 148, 9.0],
    fma: ["Стальной алхимик: Братство", 5114, "tv", "released", 64, 9.1], aot: ["Атака титанов", 16498, "tv", "released", 25, 8.5],
    death: ["Тетрадь смерти", 1535, "tv", "released", 37, 8.6], demon: ["Клинок, рассекающий демонов", 38000, "tv", "released", 26, 8.4],
    mha: ["Моя геройская академия", 31964, "tv", "released", 13, 7.9],
  };
  const animeOf = (slug) => { const [title, pid, kind, status, total, score] = TITLES[slug]; return { id: `a-${slug}`, slug, title, poster_url: poster(pid), episodes_total: total, episodes_aired: total ?? 1122, score, status, kind }; };
  const SEED = [
    ["frieren", "watching", null, 12, 900], ["jjk", "watching", 8, 40, 600], ["onepiece", "watching", null, 90, 2000], ["vinland", "watching", 9, 15, 300],
    ["monster", "completed", 10, 200, 3000], ["steins", "completed", 10, 210, 2800], ["bebop", "completed", 9, 220, 2600], ["fma", "completed", 10, 230, 2500],
    ["hxh", "completed", 9, 240, 2400], ["aot", "completed", 8, 250, 2300], ["death", "completed", 8, 260, 2200],
    ["mushishi", "planned", null, 5, 50], ["violet", "planned", null, 6, 60], ["demon", "planned", null, 7, 70], ["mha", "on_hold", 6, 30, 1500],
  ].map(([slug, category, user_score, hoursAgo, addedAgo], i) => ({
    id: `f-${i}`, user_id: "9c1f6a52-7d1e-4f0b-9a3e-5b2d8c4e1f00", anime_id: `a-${slug}`, category, user_score,
    created_at: ago(addedAgo * 3600000), updated_at: ago(hoursAgo * 3600000), anime: animeOf(slug),
  }));
  // На какой серии остановились — из истории просмотра (как в профиле).
  const HISTORY = { frieren: [1, 12, false], jjk: [2, 7, false], onepiece: [1, 1089, false], vinland: [2, 3, false], mha: [2, 4, false] };
  const KEY = "kitsu-demo-favorites"; // {anime_id: category | null}: правки поверх SEED
  const overrides = {
    read() { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (_) { return {}; } },
    set(id, value) { try { const o = this.read(); o[id] = value; localStorage.setItem(KEY, JSON.stringify(o)); } catch (_) { /* приватный режим */ } },
  };

  const api = {
    // GET /interactions/favorites → все закладки разом (страниц у ручки нет), без ORDER BY
    async favorites() {
      await sleep(320);
      if (STATE === "guest") throw httpError(401, "Not authenticated");
      if (STATE === "error") throw httpError(0, "network");
      if (STATE === "empty") return [];
      const o = overrides.read();
      return SEED.filter((f) => o[f.anime_id] !== null).map((f) => (o[f.anime_id] && o[f.anime_id].category ? { ...f, category: o[f.anime_id].category, updated_at: o[f.anime_id].updated_at } : { ...f }));
    },
    // GET /interactions/watch-history/me?skip=0&limit=200 → {items:[{anime_slug, season, episode, completed, …}], total}
    async history() {
      await sleep(200);
      if (STATE === "empty") return { items: [], total: 0 };
      const items = Object.entries(HISTORY).map(([slug, [season, episode, completed]]) => ({ anime_slug: slug, season, episode, completed }));
      return { items, total: items.length };
    },
    // POST /interactions/favorites?anime_id=…&category=… → строка закладки с новым updated_at
    async setCategory(animeId, category) { await sleep(220); const updated_at = new Date().toISOString().slice(0, 19); overrides.set(animeId, { category, updated_at }); return { anime_id: animeId, category, updated_at }; },
    // DELETE /interactions/favorites?anime_id=… → 204
    async remove(animeId) { await sleep(220); overrides.set(animeId, null); },
  };

  /* ---------- Мелочи ---------- */
  function toast(title, message, tone = "success", action = null) {
    const region = $("#toast-region"); $$(".toast.is-leaving", region).forEach((n) => n.remove());
    const el = document.createElement("div"); el.className = `toast toast--${tone}`; el.setAttribute("role", tone === "danger" ? "alert" : "status");
    el.innerHTML = `<span class="toast-icon"><i data-lucide="${tone === "danger" ? "circle-alert" : "check"}"></i></span><span><strong>${esc(title)}</strong><small>${esc(message)}</small></span>${action ? `<button type="button" class="toast-action" data-toast-action>${esc(action.label)}</button>` : ""}<button type="button" aria-label="Закрыть уведомление" data-toast-close><i data-lucide="x"></i></button>`;
    const close = () => { el.classList.add("is-leaving"); setTimeout(() => el.remove(), 190); };
    $("[data-toast-close]", el).addEventListener("click", close);
    $("[data-toast-action]", el)?.addEventListener("click", () => { close(); action.run(); });
    region.append(el); icons(el); setTimeout(close, action ? 6500 : 4200);
  }
  const rtf = new Intl.RelativeTimeFormat("ru", { numeric: "auto" });
  function fmtAgo(iso) {
    const diff = (utc(iso).getTime() - Date.now()) / 1000; const abs = Math.abs(diff);
    if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
    if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
    if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
    return rtf.format(Math.round(diff / (86400 * 30)), "month");
  }
  const store = { get(k, d) { try { return localStorage.getItem(k) ?? d; } catch (_) { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (_) { /* приватный режим */ } } };

  /* ---------- Состояние ---------- */
  const view = { list: [], progress: new Map(), tab: "all", query: "", sort: store.get("kitsu-bookmarks-sort", "updated"), mode: store.get("kitsu-bookmarks-view", "grid") };
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
    const counts = Object.fromEntries(CATEGORIES.map((c) => [c.id, view.list.filter((f) => f.category === c.id).length]));
    $$("[data-count]").forEach((b) => { b.textContent = nf.format(b.dataset.count === "all" ? view.list.length : counts[b.dataset.count]); });
    $("[data-total]").textContent = view.list.length ? nf.format(view.list.length) : "";
    const shelf = $("[data-shelf]"); const total = view.list.length || 1;
    shelf.innerHTML = CATEGORIES.filter((c) => counts[c.id]).map((c) => `<span data-bookmark-tone="${c.id}" style="--share:${(counts[c.id] / total) * 100}%" title="${c.label}: ${counts[c.id]}"></span>`).join("");
    shelf.setAttribute("aria-label", view.list.length ? `Распределение закладок: ${CATEGORIES.filter((c) => counts[c.id]).map((c) => `${c.label} — ${counts[c.id]}`).join(", ")}` : "Закладок пока нет");
    shelf.hidden = !view.list.length;
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
  function progressText(f) {
    const p = view.progress.get(f.anime.slug); const total = f.anime.episodes_total;
    if (f.category === "watching" && p) return { text: `Серия ${p.episode}${total ? ` из ${total}` : ""}`, pct: total ? Math.min(100, Math.round((p.episode / total) * 100)) : null };
    return null;
  }
  function facts(f) {
    const a = f.anime;
    return [KIND[a.kind], a.status === "ongoing" ? `${a.episodes_aired} эп., онгоинг` : a.episodes_total ? `${a.episodes_total} эп.` : STATUS[a.status]].filter(Boolean).join(" · ");
  }
  function card(f, i) {
    const a = f.anime; const href = `./anime.html?title=${encodeURIComponent(a.slug)}`; const pr = progressText(f); const c = CAT[f.category];
    if (view.mode === "list") {
      return `<li class="bm-row" style="--i:${Math.min(i, 12)}" data-tone-row data-bookmark-tone="${f.category}">
        <a class="bm-row__poster" href="${href}" tabindex="-1" aria-hidden="true"><img src="${esc(a.poster_url)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" /></a>
        <div class="bm-row__main"><h3><a href="${href}">${esc(a.title)}</a></h3>
          <p>${esc(facts(f))}${a.score ? ` · <span class="bm-score">${a.score.toFixed(1)}</span>` : ""}</p>
          ${pr ? `<p class="bm-progress"><span>${esc(pr.text)}</span>${pr.pct != null ? `<span class="bm-bar"><i style="--p:${pr.pct}%"></i></span>` : ""}</p>` : `<p class="bm-when">Изменено ${esc(fmtAgo(f.updated_at))}</p>`}</div>
        <button class="bm-status" type="button" aria-haspopup="menu" data-menu="${esc(f.anime_id)}" aria-label="Статус «${esc(a.title)}»: ${c.label}. Изменить"><i data-lucide="${c.icon}"></i><span>${c.label}</span><i data-lucide="chevron-down"></i></button>
      </li>`;
    }
    return `<li class="bm-card" style="--i:${Math.min(i, 12)}">
      <a class="bm-card__poster" href="${href}" aria-label="${esc(a.title)}">
        <img src="${esc(a.poster_url)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" />
        ${a.score ? `<span class="poster-score">${a.score.toFixed(1)}</span>` : ""}
        ${view.tab === "all" ? `<span class="bm-card__tag" data-bookmark-tone="${f.category}">${c.label}</span>` : ""}
        ${pr && pr.pct != null ? `<span class="bm-card__bar" role="img" aria-label="${esc(pr.text)}"><i style="--p:${pr.pct}%"></i></span>` : ""}
      </a>
      <button class="bm-card__more" type="button" aria-haspopup="menu" data-menu="${esc(f.anime_id)}" aria-label="Изменить статус «${esc(a.title)}»"><i data-lucide="ellipsis"></i></button>
      <h3><a href="${href}">${esc(a.title)}</a></h3>
      <p>${pr ? esc(pr.text) : esc(facts(f))}${f.user_score ? `<span class="pf-card__mine" title="Ваша оценка"><i data-lucide="star"></i>${f.user_score}</span>` : ""}</p>
    </li>`;
  }
  function paintList() {
    const panel = $("[data-panel]"); const rows = visible();
    if (!rows.length) {
      const c = CAT[view.tab]; const q = view.query.trim();
      const [icon, title, text, action] = q
        ? ["search-x", "Ничего не нашлось", `В «${c ? c.label : "Все"}» нет тайтлов со словами «${q}».`, '<button class="button button--secondary" type="button" data-clear-search><i data-lucide="x"></i><span>Сбросить поиск</span></button>']
        : !view.list.length
          ? ["bookmark", "Закладок пока нет", "Добавляйте тайтлы со страницы аниме кнопкой «В закладки» — они соберутся здесь по статусам.", '<a class="button button--primary" href="./index.html#catalog"><i data-lucide="compass"></i><span>Открыть каталог</span></a>']
          : [c.icon, `В «${c.label}» пока пусто`, "Перенесите сюда тайтл из другого статуса через меню на карточке.", '<button class="button button--secondary" type="button" data-go-all><i data-lucide="layers"></i><span>Показать все закладки</span></button>'];
      panel.innerHTML = `<div class="pf-state bm-empty"><i data-lucide="${icon}"></i><strong>${esc(title)}</strong><span>${esc(text)}</span>${action}</div>`;
    } else {
      panel.innerHTML = `<p class="sr-only">${rows.length} ${plural(rows.length, "тайтл", "тайтла", "тайтлов")}</p><ul class="${view.mode === "list" ? "bm-rows" : "bm-grid"}">${rows.map(card).join("")}</ul>`;
    }
    icons(panel);
  }

  /* ---------- Меню статуса ---------- */
  let menu = null; let menuButton = null; let menuY = 0;
  // После перерисовки старой кнопки уже нет — фокус возвращается на кнопку той же закладки, а если её больше
  // не видно (перенесена в другой статус), то на активную вкладку.
  function closeMenu(focus = false) {
    if (!menu) return;
    const id = menuButton?.dataset.menu;
    menu.remove(); menu = null; menuButton?.setAttribute("aria-expanded", "false"); menuButton = null;
    if (focus) focusCard(id);
  }
  function focusCard(id) {
    const target = (id && $(`[data-panel] [data-menu="${CSS.escape(id)}"]`)) || $("[data-own-tabs] [aria-selected=true]");
    target?.focus({ preventScroll: true });
  }
  function openMenu(button) {
    closeMenu();
    const id = button.dataset.menu; const f = view.list.find((x) => x.anime_id === id); if (!f) return;
    menuButton = button; menuY = scrollY; button.setAttribute("aria-expanded", "true");
    menu = document.createElement("div"); menu.className = "pf-menu"; menu.setAttribute("role", "menu"); menu.setAttribute("aria-label", `Статус «${f.anime.title}»`);
    menu.innerHTML = `<p>Перенести в…</p>${CATEGORIES.map((c) => `<button type="button" role="menuitemradio" aria-checked="${c.id === f.category}" data-to="${c.id}" data-bookmark-tone="${c.id}"><i data-lucide="${c.icon}"></i><span>${c.label}</span>${c.id === f.category ? '<i data-lucide="check" class="pf-menu__ok"></i>' : ""}</button>`).join("")}<hr /><button type="button" role="menuitem" class="is-danger" data-remove><i data-lucide="trash-2"></i><span>Убрать из закладок</span></button>`;
    document.body.append(menu); icons(menu);
    const r = button.getBoundingClientRect(); const w = menu.offsetWidth; const h = menu.offsetHeight;
    menu.style.left = `${Math.max(8, Math.min(innerWidth - w - 8, r.right - w))}px`;
    menu.style.top = `${r.bottom + 6 + h > innerHeight ? Math.max(8, r.top - h - 6) : r.bottom + 6}px`;
    const items = $$("button", menu); (items.find((b) => b.getAttribute("aria-checked") === "true") || items[0]).focus({ preventScroll: true });
    menu.addEventListener("keydown", (e) => {
      const k = { ArrowDown: 1, ArrowUp: -1 }[e.key]; const i = items.indexOf(document.activeElement);
      if (k) { e.preventDefault(); items[(i + k + items.length) % items.length].focus(); }
      else if (e.key === "Home" || e.key === "End") { e.preventDefault(); items[e.key === "Home" ? 0 : items.length - 1].focus(); }
      else if (e.key === "Tab") closeMenu();
    });
    menu.addEventListener("click", async (e) => {
      const to = e.target.closest("[data-to]")?.dataset.to; const rm = e.target.closest("[data-remove]");
      if (!to && !rm) return;
      closeMenu();
      if (to && to === f.category) { focusCard(id); return; }
      const before = { category: f.category, updated_at: f.updated_at };
      try {
        if (rm) {
          await api.remove(id); view.list = view.list.filter((x) => x.anime_id !== id); refresh(); focusCard(null);
          // Вернуть = тот же POST со старым статусом; дата изменения станет новой — так работает и сервер.
          toast("Убрано из закладок", f.anime.title, "success", { label: "Вернуть", run: async () => {
            try { const res = await api.setCategory(id, before.category); view.list.push({ ...f, category: before.category, updated_at: res.updated_at }); refresh(); }
            catch (_) { toast("Не получилось вернуть", "Сервер не ответил", "danger"); }
          } });
        } else {
          const res = await api.setCategory(id, to); f.category = to; f.updated_at = res.updated_at; refresh(); focusCard(id);
          toast("Статус изменён", `${f.anime.title} — «${CAT[to].label}»`);
        }
      } catch (err) { toast("Не получилось", err.status === 401 ? "Сеанс закончился — войдите заново" : "Сервер не ответил, повторите попытку", "danger"); }
    });
  }
  const refresh = () => { paintCounts(); placeBar(false); paintList(); };

  /* ---------- Вид, поиск, сортировка ---------- */
  function paintView() {
    const seg = $("[data-view]"); const thumb = $(".pf-seg__thumb", seg);
    $$("[role=radio]", seg).forEach((b) => { const on = b.dataset.value === view.mode; b.setAttribute("aria-checked", String(on)); b.tabIndex = on ? 0 : -1; if (on && b.offsetWidth) { thumb.style.width = `${b.offsetWidth}px`; thumb.style.transform = `translateX(${b.offsetLeft}px)`; } });
  }
  function initTools() {
    const search = $("[data-search]"); let t = 0;
    search.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => { view.query = search.value; paintList(); }, 120); });
    const sort = $("[data-sort]"); sort.value = SORTS[view.sort] ? view.sort : "updated";
    sort.addEventListener("change", () => { view.sort = sort.value; store.set("kitsu-bookmarks-sort", view.sort); paintList(); });
    const seg = $("[data-view]");
    const choose = (b) => { if (!b || b.dataset.value === view.mode) return; view.mode = b.dataset.value; store.set("kitsu-bookmarks-view", view.mode); paintView(); paintList(); };
    seg.addEventListener("click", (e) => choose(e.target.closest("[role=radio]")));
    seg.addEventListener("keydown", (e) => {
      const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!k) return;
      e.preventDefault(); const items = $$("[role=radio]", seg); const next = items[(items.indexOf(document.activeElement) + k + items.length) % items.length]; choose(next); next.focus();
    });
    $("[data-panel]").addEventListener("click", (e) => {
      const m = e.target.closest("[data-menu]"); if (m) { e.preventDefault(); if (menuButton === m) closeMenu(); else openMenu(m); return; }
      if (e.target.closest("[data-clear-search]")) { search.value = ""; view.query = ""; paintList(); search.focus(); }
      if (e.target.closest("[data-go-all]")) { selectTab("all"); $("#tab-all").focus(); }
    });
    // «/» — к поиску по закладкам (глобальный поиск по каталогу живёт в шапке на Ctrl+K).
    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "")) { e.preventDefault(); search.focus(); }
    });
    document.addEventListener("pointerdown", (e) => { if (menu && !menu.contains(e.target) && !e.target.closest("[data-menu]")) closeMenu(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && menu) closeMenu(true); });
    // Меню закрывается, когда страницу заметно прокрутили (мелкий сдвиг от касания его не закрывает).
    addEventListener("scroll", () => { if (menu && Math.abs(scrollY - menuY) > 40) closeMenu(); }, { passive: true });
    addEventListener("resize", () => { closeMenu(); placeBar(false); paintView(); });
    document.fonts?.ready.then(() => { placeBar(false); paintView(); });
  }

  /* ---------- Вход и сбой ---------- */
  function gate(kind) {
    $$(".bm-tabs, .bm-tools, [data-panel], [data-shelf]").forEach((n) => { n.hidden = true; });
    const box = $("[data-gate]"); box.hidden = false;
    box.innerHTML = kind === "guest"
      ? `<i data-lucide="bookmark"></i><strong>Закладки доступны после входа</strong><span>Войдите, чтобы собирать тайтлы по статусам: смотрю, просмотрено, в планах, отложено и брошено.</span>
         <div class="pf-actions"><a class="button button--primary" href="./auth.html#login"><i data-lucide="log-in"></i><span>Войти</span></a><a class="button button--secondary" href="./auth.html#register"><i data-lucide="user-plus"></i><span>Регистрация</span></a></div>`
      : `<i data-lucide="wifi-off"></i><strong>Не получилось загрузить закладки</strong><span>Сервер не ответил. Проверьте соединение и повторите.</span>
         <div class="pf-actions"><button class="button button--primary" type="button" data-retry><i data-lucide="refresh-cw"></i><span>Повторить</span></button></div>`;
    if (kind === "guest") $$(".header-account").forEach((a) => { a.outerHTML = '<a class="header-login" href="./auth.html#login">Войти</a>'; });
    icons(box); $("[data-retry]", box)?.addEventListener("click", () => location.reload());
  }

  async function init() {
    document.addEventListener("visibilitychange", () => document.body.classList.toggle("is-hidden-tab", document.hidden));
    icons(document);
    $("[data-panel]").innerHTML = `<ul class="bm-grid">${Array.from({ length: 8 }, () => '<li class="pf-skel pf-skel--card"></li>').join("")}</ul>`;
    $("[data-own-tabs]").addEventListener("click", (e) => { const t = e.target.closest("[role=tab]"); if (t && t.dataset.tab !== view.tab) selectTab(t.dataset.tab); });
    addEventListener("hashchange", () => selectTab(location.hash.slice(1) || "all", false));
    initTools(); paintView();
    try {
      const [list, hist] = await Promise.all([api.favorites(), api.history().catch(() => ({ items: [] }))]);
      view.list = list; hist.items.forEach((h) => { if (!view.progress.has(h.anime_slug)) view.progress.set(h.anime_slug, h); });
    } catch (err) { gate(err.status === 401 ? "guest" : "error"); $("#bookmarks-main").removeAttribute("aria-busy"); return; }
    $("#bookmarks-main").removeAttribute("aria-busy");
    paintCounts(); selectTab(location.hash.slice(1) || "all", false);
  }
  init();
})();
