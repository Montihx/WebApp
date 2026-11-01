/* Профиль: страница рисуется из ответов бэкенда. Сейчас вместо сервера — `api` на демо-значениях той же формы;
   когда появится вход, каждый метод заменяется на fetch с тем запросом, что записан в комментарии над ним.
   Проверка состояний: ?state=empty — пустой аккаунт, ?state=error — сервер не ответил. */
(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const STATE = new URLSearchParams(location.search).get("state");
  const ICON_ATTRS = { "aria-hidden": "true", "stroke-width": 1.8 };
  const icons = (root) => window.lucide?.createIcons({ attrs: ICON_ATTRS, root });
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const nf = new Intl.NumberFormat("ru-RU");
  const DAY = 86400000;

  /* ---------- Справочники ---------- */
  // Категории закладок: validFavoriteCategories в backend-go/internal/handlers/favorites.go.
  const CATEGORIES = [
    { id: "watching", label: "Смотрю", icon: "play" },
    { id: "completed", label: "Просмотрено", icon: "check" },
    { id: "planned", label: "В планах", icon: "clock-3" },
    { id: "on_hold", label: "Отложено", icon: "pause" },
    { id: "dropped", label: "Брошено", icon: "x" },
  ];
  const KIND = { tv: "ТВ", movie: "Фильм", ona: "ONA", ova: "OVA", special: "Спецвыпуск" };
  const STATUS = { released: "Вышло", ongoing: "Онгоинг", anons: "Анонс", announced: "Анонс" };

  /* ---------- Демо-ответы ---------- */
  const ago = (ms) => new Date(Date.now() - ms).toISOString();
  const poster = (id) => `https://shikimori.one/system/animes/original/${id}.jpg`;
  const TITLES = {
    frieren: ["Провожающая в последний путь Фрирен", 52991, "tv", "released", 28, 9.3],
    monster: ["Монстр", 19, "tv", "released", 74, 8.9],
    steins: ["Врата Штейна", 9253, "tv", "released", 24, 9.1],
    bebop: ["Ковбой Бибоп", 1, "tv", "released", 26, 8.8],
    mushishi: ["Мастер муси", 457, "tv", "released", 26, 8.6],
    vinland: ["Сага о Винланде", 37521, "tv", "released", 24, 8.7],
    jjk: ["Магическая битва", 40748, "tv", "released", 24, 8.5],
    violet: ["Вайолет Эвергарден", 33352, "tv", "released", 13, 8.4],
    onepiece: ["Ван-Пис", 21, "tv", "ongoing", null, 8.7],
    hxh: ["Охотник х Охотник", 11061, "tv", "released", 148, 9.0],
    fma: ["Стальной алхимик: Братство", 5114, "tv", "released", 64, 9.1],
    aot: ["Атака титанов", 16498, "tv", "released", 25, 8.5],
    death: ["Тетрадь смерти", 1535, "tv", "released", 37, 8.6],
    demon: ["Клинок, рассекающий демонов", 38000, "tv", "released", 26, 8.4],
    mha: ["Моя геройская академия", 31964, "tv", "released", 13, 7.9],
  };
  const animeOf = (slug) => {
    const [title, pid, kind, status, total, score] = TITLES[slug];
    return { id: `a-${slug}`, slug, title, poster_url: poster(pid), episodes_total: total, episodes_aired: total ?? 1122, score, status, kind };
  };

  function seeded(n) { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); }

  const DEMO = {
    me: {
      id: "u-demo", username: "kitsune_noa", bio: "Смотрю по вечерам, пишу заметки к каждому сезону. Люблю спокойные истории про дорогу и тихих героев.",
      avatar_url: null, cover_url: null, is_verified: true, created_at: "2026-03-12T09:20:00",
      role: { name: "Зритель" }, decoration: null,
    },
    publicStats: { favorites_count: 15, comments_count: 42, followers_count: 27, following_count: 19 },
    watchStats: { total_seconds_watched: 1284000, total_episodes_watched: 912 },
    favorites: [
      ["frieren", "watching", null, 12], ["jjk", "watching", 8, 40], ["onepiece", "watching", null, 90], ["vinland", "watching", 9, 15],
      ["monster", "completed", 10, 200], ["steins", "completed", 10, 210], ["bebop", "completed", 9, 220], ["fma", "completed", 10, 230],
      ["hxh", "completed", 9, 240], ["aot", "completed", 8, 250], ["death", "completed", 8, 260],
      ["mushishi", "planned", null, 5], ["violet", "planned", null, 6], ["demon", "planned", null, 7], ["mha", "on_hold", 6, 30],
    ].map(([slug, category, user_score, hoursAgo], i) => ({
      id: `f-${i}`, user_id: "u-demo", anime_id: `a-${slug}`, category, user_score,
      created_at: ago(hoursAgo * 3600000), updated_at: ago(hoursAgo * 3600000), anime: animeOf(slug),
    })),
    history: [
      ["frieren", 1, 12, 640, 1440, false, 2], ["jjk", 2, 7, 1400, 1440, false, 26], ["monster", 1, 74, 1500, 1500, true, 50],
      ["onepiece", 1, 1089, 300, 1450, false, 74], ["vinland", 2, 3, 1380, 1440, false, 120], ["steins", 1, 24, 1440, 1440, true, 200],
      ["bebop", 1, 26, 1440, 1440, true, 240], ["fma", 1, 64, 1440, 1440, true, 300], ["hxh", 1, 148, 1440, 1440, true, 360],
      ["aot", 1, 25, 1440, 1440, true, 420], ["death", 1, 37, 1440, 1440, true, 480], ["mha", 2, 4, 600, 1440, false, 900],
    ].map(([slug, season, episode, position_seconds, total_seconds, completed, hoursAgo], i) => {
      const a = animeOf(slug);
      return { id: `h-${i}`, anime_slug: slug, season, episode, position_seconds, total_seconds, completed,
        updated_at: ago(hoursAgo * 3600000), anime_title: a.title, anime_poster_url: a.poster_url, anime_episodes_total: a.episodes_total, anime_score: a.score };
    }),
    collections: [
      { id: "c1", user_id: "u-demo", title: "Тихие истории для вечера", slug: "tikhie-istorii", description: "Спокойные сериалы без спешки: музыка, дорога, чай.", cover_url: null, is_public: true, items_count: 12, views_count: 340, likes_count: 21, created_at: ago(40 * DAY), updated_at: ago(3 * DAY) },
      { id: "c2", user_id: "u-demo", title: "Пересмотреть зимой", slug: "peresmotret-zimoy", description: "Список на каникулы.", cover_url: null, is_public: false, items_count: 7, views_count: 0, likes_count: 0, created_at: ago(18 * DAY), updated_at: ago(18 * DAY) },
      { id: "c3", user_id: "u-demo", title: "Лучшие финалы", slug: "luchshie-finaly", description: null, cover_url: null, is_public: true, items_count: 5, views_count: 96, likes_count: 8, created_at: ago(9 * DAY), updated_at: ago(2 * DAY) },
    ],
  };

  // Дни, где что-то смотрели: детерминированно, чтобы скриншоты не плясали.
  function demoDaily(days) {
    const out = [];
    for (let i = days; i >= 0; i -= 1) {
      const date = new Date(Date.now() - i * DAY).toISOString().slice(0, 10);
      const r = seeded(Math.floor((Date.now() - i * DAY) / DAY));
      if (r < 0.34) continue;
      const episodes = 1 + Math.floor(seeded(i + 7) * 6 * (i % 7 === 5 || i % 7 === 6 ? 1.6 : 1));
      out.push({ date, total_seconds_watched: episodes * 1440 + Math.floor(seeded(i + 3) * 900), total_episodes_watched: episodes });
    }
    return out;
  }

  /* ---------- Слой запросов ---------- */
  const fail = () => { throw new Error("network"); };
  const api = {
    // GET /users/me → FullUser: username, bio, avatar_url, cover_url, is_verified, created_at, role{name}, decoration{image_url}
    async me() { await sleep(260); if (STATE === "error") fail(); return DEMO.me; },
    // GET /users/public/{user_id}/stats → {favorites_count, comments_count, followers_count, following_count}
    async publicStats() { await sleep(300); if (STATE === "error") fail(); return STATE === "empty" ? { favorites_count: 0, comments_count: 0, followers_count: 0, following_count: 0 } : DEMO.publicStats; },
    // GET /interactions/watch-stats/me → {total_seconds_watched, total_episodes_watched, updated_at}; без строки отдаёт нули
    async watchStats() { await sleep(300); if (STATE === "error") fail(); return STATE === "empty" ? { total_seconds_watched: 0, total_episodes_watched: 0 } : DEMO.watchStats; },
    // GET /interactions/watch-stats/daily/me?days=N → [{date, total_seconds_watched, total_episodes_watched}] по возрастанию даты
    async daily(days) { await sleep(280); if (STATE === "error") fail(); return STATE === "empty" ? [] : demoDaily(days); },
    // GET /interactions/favorites[?category] → [{id, anime_id, category, user_score, created_at, updated_at, anime{slug,title,poster_url,episodes_total,episodes_aired,score,status,kind}}]
    // Сервер отдаёт строки без ORDER BY — порядок плавает, поэтому страница сортирует по updated_at сама.
    async favorites() { await sleep(340); if (STATE === "error") fail(); return STATE === "empty" ? [] : DEMO.favorites.map((f) => ({ ...f })); },
    // POST /interactions/favorites?anime_id=…&category=… (смена статуса)
    async setCategory(animeId, category) { await sleep(180); return { anime_id: animeId, category }; },
    // DELETE /interactions/favorites?anime_id=… → 204
    async removeFavorite() { await sleep(180); },
    // GET /interactions/watch-history/me?skip=0&limit=50 → {items:[{anime_slug,season,episode,position_seconds,total_seconds,completed,updated_at,anime_title,anime_poster_url,...}], total}
    // Сервер дедуплицирует по тайтлу и режет страницы после этого; в выборку попадают не больше 1000 последних строк.
    async history(skip, limit) {
      await sleep(320); if (STATE === "error") fail();
      const all = STATE === "empty" ? [] : DEMO.history;
      return { items: all.slice(skip, skip + limit), total: all.length };
    },
    // GET /interactions/collections?skip=0&limit=20 → [{id,title,slug,description,cover_url,is_public,items_count,views_count,likes_count}]
    async collections() { await sleep(300); if (STATE === "error") fail(); return STATE === "empty" ? [] : DEMO.collections.map((c) => ({ ...c })); },
    // POST /interactions/collections {title 1–255, description?, cover_url?, is_public} → 201 коллекция; slug строит сервер
    async createCollection(body) {
      await sleep(520);
      return { id: `c-${Date.now()}`, user_id: "u-demo", title: body.title, slug: body.title.toLowerCase().replace(/\s+/g, "-"), description: body.description || null,
        cover_url: null, is_public: body.is_public, items_count: 0, views_count: 0, likes_count: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    },
  };

  /* ---------- Утилиты ---------- */
  function fmtDur(seconds) {
    const total = Math.round(seconds / 60);
    if (total < 60) return `${total} мин`;
    const h = Math.floor(total / 60); const m = total % 60;
    return m ? `${h} ч ${m} мин` : `${h} ч`;
  }
  const rtf = new Intl.RelativeTimeFormat("ru", { numeric: "auto" });
  function fmtAgo(iso) {
    const diff = (new Date(iso).getTime() - Date.now()) / 1000;
    const abs = Math.abs(diff);
    if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
    if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
    if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
    return rtf.format(Math.round(diff / (86400 * 30)), "month");
  }
  const fmtDay = (iso) => new Intl.DateTimeFormat("ru-RU", { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${iso}T12:00:00Z`));
  const fmtShort = (iso) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(new Date(`${iso}T12:00:00Z`));
  const plural = (n, one, few, many) => { const a = Math.abs(n) % 100; const b = a % 10; return a > 10 && a < 20 ? many : b > 1 && b < 5 ? few : b === 1 ? one : many; };

  function countUp(node, to, format = (v) => nf.format(Math.round(v))) {
    if (reduced || to === 0) { node.textContent = format(to); return; }
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / 900);
      node.textContent = format(to * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function toast(title, message, tone = "success") {
    const region = $("#toast-region");
    $$(".toast.is-leaving", region).forEach((item) => item.remove());
    const el = document.createElement("div");
    el.className = `toast toast--${tone}`;
    el.setAttribute("role", tone === "danger" ? "alert" : "status");
    el.innerHTML = `<span class="toast-icon"><i data-lucide="${tone === "danger" ? "circle-alert" : "check"}"></i></span><span><strong>${esc(title)}</strong><small>${esc(message)}</small></span><button type="button" aria-label="Закрыть уведомление"><i data-lucide="x"></i></button>`;
    const close = () => { el.classList.add("is-leaving"); setTimeout(() => el.remove(), 190); };
    $("button", el).addEventListener("click", close);
    region.append(el); icons(el); setTimeout(close, 4200);
  }

  // Постер не загрузился — остаётся рамка с названием, как на остальных страницах.
  function guardImages(root) {
    $$("img[data-poster]", root).forEach((img) => {
      const fallback = () => {
        const art = document.createElement("span");
        art.className = `${img.className} pf-art`; art.textContent = (img.dataset.poster || "?").trim().charAt(0).toUpperCase();
        art.setAttribute("role", "img"); art.setAttribute("aria-label", img.dataset.poster || "");
        art.style.setProperty("--h", String([...img.dataset.poster].reduce((s, c) => s + c.charCodeAt(0), 0) % 4));
        img.replaceWith(art);
      };
      img.addEventListener("error", fallback, { once: true });
      if (img.complete && img.naturalWidth === 0) fallback();
    });
  }

  const skeleton = (el, rows, cls = "") => { el.innerHTML = Array.from({ length: rows }, () => `<li class="pf-skel ${cls}"></li>`).join(""); };
  function errorBox(el, retry) {
    el.innerHTML = `<div class="pf-state pf-state--error"><i data-lucide="wifi-off"></i><strong>Не получилось загрузить</strong><span>Сервер не ответил. Проверьте соединение и повторите.</span><button class="button button--secondary" type="button"><i data-lucide="refresh-cw"></i><span>Повторить</span></button></div>`;
    $("button", el).addEventListener("click", retry); icons(el);
  }
  const emptyBox = (icon, title, text, action = "") => `<div class="pf-state"><i data-lucide="${icon}"></i><strong>${esc(title)}</strong><span>${esc(text)}</span>${action}</div>`;

  /* ---------- Шапка ---------- */
  async function loadHero() {
    const hero = $("[data-hero]");
    try {
      const [me, stats] = await Promise.all([api.me(), api.publicStats(DEMO.me.id)]);
      $("[data-name]").textContent = me.username;
      document.title = `${me.username} — профиль Kitsu · Кицунэ`;
      const since = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(new Date(me.created_at));
      $("[data-chips]").innerHTML = `${me.role?.name ? `<span class="pf-chip"><i data-lucide="user-round"></i>${esc(me.role.name)}</span>` : ""}${me.is_verified ? '<span class="pf-chip pf-chip--ok"><i data-lucide="badge-check"></i>Почта подтверждена</span>' : '<span class="pf-chip pf-chip--warn"><i data-lucide="mail-warning"></i>Почта не подтверждена</span>'}<span class="pf-chip"><i data-lucide="calendar-days"></i>С нами с ${esc(since)}</span>`;
      $("[data-bio]").textContent = me.bio || "Пока без описания.";
      const av = $("[data-avatar]");
      av.innerHTML = me.avatar_url ? `<img src="${esc(me.avatar_url)}" alt="" />` : `<span>${esc(me.username.charAt(0).toUpperCase())}</span>`;
      if (me.decoration?.image_url) av.insertAdjacentHTML("beforeend", `<img class="pf-avatar__deco" src="${esc(me.decoration.image_url)}" alt="" />`);
      if (me.cover_url) $("[data-cover]").style.backgroundImage = `url("${me.cover_url.replace(/"/g, "%22")}")`;
      const counts = [["В закладках", stats.favorites_count], ["Комментарии", stats.comments_count], ["Подписчики", stats.followers_count], ["Подписки", stats.following_count]];
      $("[data-counts]").innerHTML = counts.map(([label, value]) => `<div><dt>${label}</dt><dd data-n="${value}">0</dd></div>`).join("");
      $$("[data-counts] dd").forEach((dd) => countUp(dd, Number(dd.dataset.n)));
      icons(hero);
    } catch (_) {
      $("[data-name]").textContent = "Профиль";
      $("[data-bio]").textContent = "Не удалось загрузить данные профиля.";
    }
    hero.classList.add("is-ready");
  }

  /* ---------- Время просмотра ---------- */
  const view = { days: 30, rows: [], active: -1, best: -1 };
  function buildDays(n, rows) {
    const map = new Map(rows.map((r) => [r.date, r]));
    return Array.from({ length: n }, (_, i) => {
      const date = new Date(Date.now() - (n - 1 - i) * DAY).toISOString().slice(0, 10);
      const r = map.get(date);
      return { date, seconds: r?.total_seconds_watched ?? 0, episodes: r?.total_episodes_watched ?? 0 };
    });
  }
  function paintRead() {
    const read = $("[data-read]"); const d = view.rows[view.active];
    if (!d) { read.textContent = ""; return; }
    const lead = view.active === view.best && !view.touched ? "Лучший день · " : "";
    read.innerHTML = d.seconds ? `${lead}<b>${esc(fmtDay(d.date))}</b> — ${fmtDur(d.seconds)}, ${d.episodes} ${plural(d.episodes, "серия", "серии", "серий")}` : `<b>${esc(fmtDay(d.date))}</b> — без просмотров`;
  }
  function setActive(i, touched = true) {
    view.active = Math.max(0, Math.min(view.rows.length - 1, i)); view.touched = touched;
    $$("[data-plot] .pf-bar").forEach((bar, idx) => bar.classList.toggle("is-active", idx === view.active));
    paintRead();
  }
  async function loadStats(days) {
    const plot = $("[data-plot]"); const total = $("[data-total]");
    plot.classList.add("is-loading"); $(".pf-stats").removeAttribute("data-failed");
    try {
      const [ws, daily] = await Promise.all([view.totals ? Promise.resolve(view.totals) : api.watchStats(), api.daily(days)]);
      view.totals = ws; view.days = days; view.rows = buildDays(days, daily);
      const max = Math.max(...view.rows.map((r) => r.seconds), 1);
      view.best = view.rows.reduce((b, r, i, a) => (r.seconds > a[b].seconds ? i : b), 0);
      const sum = view.rows.reduce((s, r) => s + r.seconds, 0);
      const eps = view.rows.reduce((s, r) => s + r.episodes, 0);
      const active = view.rows.filter((r) => r.seconds > 0).length;
      const hours = ws.total_seconds_watched / 3600;
      const d = Math.floor(hours / 24); const h = Math.floor(hours % 24);
      total.innerHTML = `
        <div class="pf-total__hero"><span class="pf-total__label">Всего просмотрено</span>
          <strong class="pf-total__num"><span data-hours>0</span><small>ч</small></strong>
          <span class="pf-total__sub">${d ? `≈ ${d} ${plural(d, "сутки", "суток", "суток")} ${h} ч подряд` : "меньше суток подряд"}</span></div>
        <dl class="pf-total__grid">
          <div><dt>Серий всего</dt><dd>${nf.format(ws.total_episodes_watched)}</dd></div>
          <div><dt>За ${days} ${plural(days, "день", "дня", "дней")}</dt><dd>${fmtDur(sum)}</dd></div>
          <div><dt>Активных дней</dt><dd>${active} <small>из ${days}</small></dd></div>
          <div><dt>Серий за период</dt><dd>${eps}</dd></div>
        </dl>`;
      countUp($("[data-hours]", total), Math.round(hours));
      plot.classList.toggle("is-empty", sum === 0);
      plot.innerHTML = view.rows.map((r, i) => `<span class="pf-bar${r.seconds ? "" : " is-zero"}" style="--v:${(r.seconds / max).toFixed(3)};--i:${i}" data-i="${i}"></span>`).join("")
        + `<div class="pf-axis" aria-hidden="true">${days <= 7 ? view.rows.map((r) => `<span>${esc(new Intl.DateTimeFormat("ru-RU", { weekday: "short" }).format(new Date(`${r.date}T12:00:00Z`)))}</span>`).join("") : `<span>${esc(fmtShort(view.rows[0].date))}</span><span>${esc(fmtShort(view.rows[Math.floor(days / 2)].date))}</span><span>${esc(fmtShort(view.rows[days - 1].date))}</span>`}</div>`;
      plot.style.setProperty("--n", days); plot.dataset.dense = String(days > 30);
      plot.classList.remove("is-loading", "is-in"); void plot.offsetWidth; plot.classList.add("is-in");
      view.touched = false; setActive(sum ? view.best : days - 1, false);
      if (!sum) $("[data-read]").textContent = "За этот период просмотров не было.";
    } catch (_) {
      plot.classList.remove("is-loading");
      $(".pf-stats").setAttribute("data-failed", ""); errorBox(total, () => loadStats(days)); plot.innerHTML = ""; $("[data-read]").textContent = "";
    }
  }
  function initChart() {
    const plot = $("[data-plot]");
    const seg = $("[data-range]"); const thumb = $(".pf-seg__thumb", seg);
    const place = () => { const on = $("[aria-pressed=true]", seg); if (on) { thumb.style.width = `${on.offsetWidth}px`; thumb.style.transform = `translateX(${on.offsetLeft}px)`; } };
    $$("button", seg).forEach((b) => b.addEventListener("click", () => {
      $$("button", seg).forEach((x) => x.setAttribute("aria-pressed", String(x === b))); place(); loadStats(Number(b.dataset.days));
    }));
    place(); addEventListener("resize", place); document.fonts?.ready.then(place);
    const indexAt = (event) => { const bar = event.target.closest?.(".pf-bar"); return bar ? Number(bar.dataset.i) : -1; };
    plot.addEventListener("pointermove", (e) => { const i = indexAt(e); if (i >= 0 && i !== view.active) setActive(i); });
    plot.addEventListener("pointerleave", () => { if (view.rows.length) { view.touched = false; setActive(view.rows.some((r) => r.seconds) ? view.best : view.rows.length - 1, false); } });
    plot.addEventListener("click", (e) => { const i = indexAt(e); if (i >= 0) setActive(i); });
    plot.addEventListener("keydown", (e) => {
      const step = { ArrowLeft: -1, ArrowRight: 1, Home: -Infinity, End: Infinity }[e.key];
      if (step === undefined) return;
      e.preventDefault(); setActive(step === -Infinity ? 0 : step === Infinity ? view.rows.length - 1 : view.active + step);
    });
    loadStats(30);
  }

  /* ---------- Закладки ---------- */
  const marks = { list: [], tab: "watching" };
  function markCard(f, i) {
    const a = f.anime; const total = a.episodes_total;
    const meta = [KIND[a.kind], STATUS[a.status]].filter(Boolean).join(" · ");
    return `<li class="pf-card" style="--i:${Math.min(i, 11)}" data-card="${esc(f.anime_id)}">
      <a class="pf-card__poster" href="./anime.html?title=${encodeURIComponent(a.slug)}" aria-label="${esc(a.title)}">
        <img src="${esc(a.poster_url)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-poster="${esc(a.title)}" />
        ${a.score ? `<span class="pf-card__score"><i data-lucide="star"></i>${a.score.toFixed(1)}</span>` : ""}
        <span class="pf-card__eps">${total ? `${total} эп.` : `${a.episodes_aired} эп. · идёт`}</span>
      </a>
      <button class="pf-card__more" type="button" aria-haspopup="menu" aria-label="Изменить статус «${esc(a.title)}»" data-menu="${esc(f.anime_id)}"><i data-lucide="ellipsis"></i></button>
      <h3><a href="./anime.html?title=${encodeURIComponent(a.slug)}">${esc(a.title)}</a></h3>
      <p>${esc(meta)}${f.user_score ? `<span class="pf-card__mine"><i data-lucide="star"></i>${f.user_score}</span>` : ""}</p>
    </li>`;
  }
  function paintTabs() {
    const tabs = $("[data-tabs]");
    tabs.innerHTML = CATEGORIES.map((c) => {
      const n = marks.list.filter((f) => f.category === c.id).length;
      return `<button type="button" role="tab" id="tab-${c.id}" aria-selected="${c.id === marks.tab}" tabindex="${c.id === marks.tab ? 0 : -1}" data-tab="${c.id}"><i data-lucide="${c.icon}"></i><span>${c.label}</span><b>${n}</b></button>`;
    }).join("") + '<span class="pf-tabs__bar" aria-hidden="true"></span>';
    icons(tabs); placeTabBar();
  }
  function placeTabBar() {
    const tabs = $("[data-tabs]"); const on = $("[aria-selected=true]", tabs); const bar = $(".pf-tabs__bar", tabs);
    if (on && bar) { bar.style.width = `${on.offsetWidth}px`; bar.style.transform = `translateX(${on.offsetLeft}px)`; tabs.scrollTo?.({ left: Math.max(0, on.offsetLeft - 24), behavior: reduced ? "auto" : "smooth" }); }
  }
  function paintMarks() {
    const panel = $("[data-marks]");
    panel.setAttribute("aria-labelledby", `tab-${marks.tab}`);
    const rows = marks.list.filter((f) => f.category === marks.tab).sort((x, y) => new Date(y.updated_at) - new Date(x.updated_at));
    const cat = CATEGORIES.find((c) => c.id === marks.tab);
    if (!rows.length) {
      panel.innerHTML = `<div class="pf-state-wrap">${emptyBox(cat.icon, `В «${cat.label}» пока пусто`, marks.list.length ? "Перенесите сюда тайтл из другого списка через меню на карточке." : "Добавляйте тайтлы в закладки со страницы аниме — они появятся здесь.", '<a class="button button--secondary" href="./index.html#catalog"><i data-lucide="compass"></i><span>Открыть каталог</span></a>')}</div>`;
    } else panel.innerHTML = `<ul class="pf-cards">${rows.map(markCard).join("")}</ul>`;
    icons(panel); guardImages(panel);
  }
  async function loadMarks() {
    const panel = $("[data-marks]");
    panel.innerHTML = `<ul class="pf-cards">${Array.from({ length: 6 }, () => '<li class="pf-skel pf-skel--card"></li>').join("")}</ul>`;
    try {
      marks.list = await api.favorites();
      if (!marks.list.some((f) => f.category === marks.tab)) marks.tab = (CATEGORIES.find((c) => marks.list.some((f) => f.category === c.id)) || CATEGORIES[0]).id;
      paintTabs(); paintMarks();
    } catch (_) { errorBox(panel, loadMarks); }
  }
  let menu = null;
  function closeMenu() { if (menu) { menu.remove(); menu = null; } }
  function openMenu(button) {
    closeMenu();
    const id = button.dataset.menu; const f = marks.list.find((x) => x.anime_id === id); if (!f) return;
    menu = document.createElement("div"); menu.className = "pf-menu"; menu.setAttribute("role", "menu");
    menu.innerHTML = `<p>Перенести в…</p>${CATEGORIES.map((c) => `<button type="button" role="menuitem" data-to="${c.id}"${c.id === f.category ? ' aria-current="true"' : ""}><i data-lucide="${c.icon}"></i><span>${c.label}</span>${c.id === f.category ? '<i data-lucide="check" class="pf-menu__ok"></i>' : ""}</button>`).join("")}<hr /><button type="button" role="menuitem" class="is-danger" data-remove><i data-lucide="trash-2"></i><span>Убрать из закладок</span></button>`;
    document.body.append(menu); icons(menu);
    const r = button.getBoundingClientRect(); const w = menu.offsetWidth; const h = menu.offsetHeight;
    menu.style.left = `${Math.max(8, Math.min(innerWidth - w - 8, r.right - w))}px`;
    menu.style.top = `${r.bottom + 6 + h > innerHeight ? Math.max(8, r.top - h - 6) : r.bottom + 6}px`;
    $("button", menu).focus({ preventScroll: true });
    menu.addEventListener("click", async (e) => {
      const to = e.target.closest("[data-to]")?.dataset.to; const rm = e.target.closest("[data-remove]");
      if (!to && !rm) return;
      closeMenu();
      try {
        if (rm) { await api.removeFavorite(id); marks.list = marks.list.filter((x) => x.anime_id !== id); toast("Убрано из закладок", f.anime.title); }
        else if (to !== f.category) { await api.setCategory(id, to); f.category = to; f.updated_at = new Date().toISOString(); toast("Статус изменён", `${f.anime.title} — «${CATEGORIES.find((c) => c.id === to).label}»`); }
        paintTabs(); paintMarks();
      } catch (_) { toast("Не получилось", "Сервер не ответил, повторите попытку", "danger"); }
    });
    button.setAttribute("aria-expanded", "true");
  }
  function initMarks() {
    const tabs = $("[data-tabs]"); const panel = $("[data-marks]");
    tabs.addEventListener("click", (e) => { const t = e.target.closest("[data-tab]"); if (t && t.dataset.tab !== marks.tab) { marks.tab = t.dataset.tab; paintTabs(); paintMarks(); } });
    tabs.addEventListener("keydown", (e) => {
      const keys = { ArrowRight: 1, ArrowLeft: -1 }; if (!keys[e.key]) return;
      const i = CATEGORIES.findIndex((c) => c.id === marks.tab); const next = CATEGORIES[(i + keys[e.key] + CATEGORIES.length) % CATEGORIES.length];
      marks.tab = next.id; paintTabs(); paintMarks(); $(`[data-tab="${next.id}"]`, tabs).focus(); e.preventDefault();
    });
    panel.addEventListener("click", (e) => { const b = e.target.closest("[data-menu]"); if (b) { e.preventDefault(); openMenu(b); } });
    document.addEventListener("pointerdown", (e) => { if (menu && !menu.contains(e.target) && !e.target.closest("[data-menu]")) closeMenu(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && menu) { const t = $(`[data-menu="${CSS.escape($("[aria-expanded=true]")?.dataset.menu || "")}"]`); closeMenu(); t?.focus(); } });
    addEventListener("scroll", closeMenu, { passive: true }); addEventListener("resize", () => { closeMenu(); placeTabBar(); });
    loadMarks();
  }

  /* ---------- История ---------- */
  const hist = { items: [], total: 0, limit: 8 };
  function histRow(h, i) {
    const pct = h.total_seconds > 0 ? Math.min(100, Math.round((h.position_seconds / h.total_seconds) * 100)) : 0;
    return `<li style="--i:${Math.min(i, 8)}"><a class="pf-hrow" href="./anime.html?title=${encodeURIComponent(h.anime_slug)}">
      <img class="pf-hrow__img" src="${esc(h.anime_poster_url)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-poster="${esc(h.anime_title)}" />
      <span class="pf-hrow__main"><strong>${esc(h.anime_title)}</strong>
        <span class="pf-hrow__meta">Сезон ${h.season} · серия ${h.episode}${h.anime_episodes_total ? ` из ${h.anime_episodes_total}` : ""}</span>
        <span class="pf-hrow__bar${h.completed ? " is-done" : ""}" role="img" aria-label="${h.completed ? "Серия досмотрена" : `Просмотрено ${pct}%`}"><i style="--p:${h.completed ? 100 : pct}%"></i></span></span>
      <span class="pf-hrow__side"><time datetime="${esc(h.updated_at)}">${esc(fmtAgo(h.updated_at))}</time>
        <span class="pf-hrow__act">${h.completed ? '<i data-lucide="check"></i>Досмотрено' : '<i data-lucide="play"></i>Продолжить'}</span></span></a></li>`;
  }
  async function loadHistory(more = false) {
    const list = $("[data-history]"); const btn = $("[data-history-more]");
    if (!more) { skeleton(list, 4, "pf-skel--row"); btn.hidden = true; }
    else { btn.disabled = true; btn.classList.add("is-busy"); }
    try {
      const res = await api.history(more ? hist.items.length : 0, hist.limit);
      hist.items = more ? hist.items.concat(res.items) : res.items; hist.total = res.total;
      $("[data-history-total]").textContent = res.total ? `${res.total} ${plural(res.total, "тайтл", "тайтла", "тайтлов")}` : "";
      if (!hist.items.length) list.innerHTML = `<li>${emptyBox("history", "История пуста", "Здесь появятся тайтлы, которые вы начали смотреть.", '<a class="button button--secondary" href="./index.html#catalog"><i data-lucide="compass"></i><span>Что посмотреть</span></a>')}</li>`;
      else if (more) { list.insertAdjacentHTML("beforeend", res.items.map((h, i) => histRow(h, i)).join("")); }
      else list.innerHTML = hist.items.map(histRow).join("");
      btn.hidden = hist.items.length >= hist.total; btn.disabled = false; btn.classList.remove("is-busy");
      icons(list); guardImages(list);
    } catch (_) {
      btn.disabled = false; btn.classList.remove("is-busy");
      if (more) toast("Не получилось", "Сервер не ответил, повторите попытку", "danger"); else errorBox(list, () => loadHistory());
    }
  }

  /* ---------- Коллекции ---------- */
  const cols = { list: [] };
  function colRow(c, i, fresh = false) {
    const tone = [...c.id].reduce((s, ch) => s + ch.charCodeAt(0), 0) % 4;
    return `<li class="pf-col${fresh ? " is-fresh" : ""}" style="--i:${i}">
      <span class="pf-col__cover pf-art" style="--h:${tone}" aria-hidden="true">${esc(c.title.charAt(0).toUpperCase())}</span>
      <span class="pf-col__main"><strong>${esc(c.title)}</strong><span class="pf-col__desc">${esc(c.description || "Без описания")}</span>
        <span class="pf-col__meta"><span><i data-lucide="layers"></i>${c.items_count}</span><span><i data-lucide="eye"></i>${nf.format(c.views_count)}</span><span><i data-lucide="heart"></i>${nf.format(c.likes_count)}</span>
        <span class="pf-col__vis">${c.is_public ? '<i data-lucide="globe"></i>Публичная' : '<i data-lucide="lock"></i>Личная'}</span></span></span></li>`;
  }
  function paintCols(fresh) {
    const list = $("[data-collections]");
    list.innerHTML = cols.list.length ? cols.list.map((c, i) => colRow(c, i, c.id === fresh)).join("")
      : `<li>${emptyBox("library", "Коллекций пока нет", "Соберите свою подборку — например, «на выходные» или «лучшие финалы».")}</li>`;
    icons(list);
  }
  async function loadCols() {
    const list = $("[data-collections]"); skeleton(list, 3, "pf-skel--row");
    try { cols.list = await api.collections(); paintCols(); } catch (_) { errorBox(list, loadCols); }
  }
  function initDialog() {
    const dialog = $("#collection-dialog"); const form = $("[data-collection-form]");
    const title = $("[name=title]", form); const count = $("[data-count]", form); const err = $("[data-error=title]", form);
    const check = () => {
      const v = title.value.trim(); const bad = v.length < 1 ? "Введите название" : v.length > 255 ? "Не больше 255 символов" : "";
      err.textContent = bad; title.closest(".pf-field").classList.toggle("is-bad", Boolean(bad)); title.setAttribute("aria-invalid", String(Boolean(bad))); return !bad;
    };
    let touched = false;
    title.addEventListener("input", () => { count.textContent = `${title.value.length} / 255`; if (touched) check(); });
    title.addEventListener("blur", () => { if (title.value) { touched = true; check(); } });
    const pub = $("[name=is_public]", form);
    pub.addEventListener("change", () => { $("[data-public-hint]", form).textContent = pub.checked ? "Видна всем по ссылке" : "Видна только вам"; });
    $("[data-collection-open]").addEventListener("click", () => { form.reset(); touched = false; err.textContent = ""; count.textContent = "0 / 255"; $("[data-public-hint]", form).textContent = "Видна только вам"; title.closest(".pf-field").classList.remove("is-bad"); dialog.showModal(); title.focus(); });
    $$("[data-collection-close]", dialog).forEach((b) => b.addEventListener("click", () => dialog.close()));
    dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
    form.addEventListener("submit", async (e) => {
      e.preventDefault(); touched = true;
      if (!check()) { title.focus(); return; }
      const submit = $("[data-collection-submit]", form); submit.disabled = true; submit.classList.add("is-busy"); $("span", submit).textContent = "Создаю…";
      try {
        const created = await api.createCollection({ title: title.value.trim(), description: $("[name=description]", form).value.trim(), is_public: pub.checked });
        cols.list.unshift(created); paintCols(created.id); dialog.close(); toast("Коллекция создана", created.title);
        $("#pf-collections").scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" });
      } catch (_) { toast("Не получилось", "Коллекция не создана, повторите попытку", "danger"); }
      submit.disabled = false; submit.classList.remove("is-busy"); $("span", submit).textContent = "Создать коллекцию";
    });
  }

  /* ---------- Навигация по разделам и появление ---------- */
  function initNav() {
    const nav = $("[data-nav]"); const links = $$("a", nav); const bar = $(".pf-nav__bar", nav);
    const place = (a) => { bar.style.width = `${a.offsetWidth}px`; bar.style.transform = `translateX(${a.offsetLeft}px)`; };
    const set = (id) => links.forEach((a) => { const on = a.getAttribute("href") === `#${id}`; a.classList.toggle("is-active", on); if (on) place(a); });
    place(links[0]); document.fonts?.ready.then(() => place($(".is-active", nav) || links[0])); addEventListener("resize", () => place($(".is-active", nav) || links[0]));
    const targets = ["pf-stats", "pf-marks", "pf-history", "pf-collections"].map((id) => document.getElementById(id));
    if ("IntersectionObserver" in window) {
      const spy = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) set(en.target.id); }), { rootMargin: "-35% 0px -55% 0px" });
      targets.forEach((t) => spy.observe(t));
      const rev = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-in"); rev.unobserve(en.target); } }), { rootMargin: "0px 0px -8% 0px" });
      $$("[data-reveal]").forEach((n) => rev.observe(n));
    } else $$("[data-reveal]").forEach((n) => n.classList.add("is-in"));
    // Узкий экран: нижняя панель ведёт к «Закладкам» на этой же странице.
  }

  function initHeroPointer() {
    if (!finePointer || reduced) return;
    const hero = $("[data-hero]");
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      hero.style.setProperty("--mx", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
      hero.style.setProperty("--my", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
    });
  }

  document.addEventListener("visibilitychange", () => document.body.classList.toggle("is-hidden-tab", document.hidden));
  icons(document);
  initNav(); initHeroPointer(); initChart(); initMarks(); initDialog();
  loadHero(); loadHistory(); loadCols();
  $("[data-history-more]").addEventListener("click", () => loadHistory(true));
})();
