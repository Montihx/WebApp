/* Чужой профиль (user.html?id=…). Вместо сервера — `api` на демо-ответах той же формы; над каждым методом записан
   настоящий запрос и то, как сервер его понимает (backend-go/internal/handlers/users.go, follows.go).
   Подписки демо хранятся в localStorage ("kitsu-demo-follows"). */
(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const params = new URLSearchParams(location.search);
  const STATE = params.get("state");
  const ID = (params.get("id") || "").trim();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const icons = (root) => window.lucide?.createIcons({ attrs: { "aria-hidden": "true", "stroke-width": 1.8 }, root });
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const nf = new Intl.NumberFormat("ru-RU");
  const httpError = (status, detail) => Object.assign(new Error(detail), { status, detail });
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const PAGE = 24; // сервер по умолчанию отдаёт 50; страница просит меньше, чтобы «Показать ещё» было видно в демо

  /* ---------- Демо-данные ---------- */
  // Тот же id, что у демо-аккаунта в profile.js и у «вас» в комментариях (content.js).
  const ME = { id: "9c1f6a52-7d1e-4f0b-9a3e-5b2d8c4e1f00", username: "kitsune_noa", avatar_url: null, bio: "Смотрю по вечерам, пишу заметки к каждому сезону." };
  const uid = (n) => `5a7d0c3e-${String(n).padStart(4, "0")}-4c1b-9e2a-${String(n * 7919).padStart(12, "0").slice(-12)}`;
  const NAMES = ["akira_k", "mononoke", "neko_sensei", "yuki_tsubasa", "ronin_42", "hikari", "shiro_neko", "tanuki_dev", "moon_rabbit", "sora_blue", "kaze_no", "ame_furi",
    "hoshi", "tsuki_mi", "ryu_sei", "kitsune_bi", "sakura_chan", "momiji", "inari", "kumo", "hotaru", "yama_no", "umi_sora", "taiyou", "fuyu", "natsu_kaze", "aki_ochiba", "haru_hana", "kage", "hibiki"];
  const BIOS = ["Пересматриваю классику и спорю о финалах.", "Только онгоинги, только по выходу серии.", "Собираю коллекции по студиям.", "", "Слушаю OST чаще, чем смотрю.",
    "Люблю длинные сериалы и медленные истории.", "", "Пишу короткие отзывы после каждой серии.", "Меха, космос и всё, где есть роботы.", "Смотрю с субтитрами, иногда с озвучкой AniLibria."];
  const USERS = NAMES.map((username, i) => ({ id: uid(i + 1), username, avatar_url: null, cover_url: null, bio: BIOS[i % BIOS.length] || null, is_superuser: username === "neko_sensei" }));
  const byId = new Map(USERS.map((u) => [u.id, u]));
  // Кто на кого подписан (без «вас» — вашу подписку хранит localStorage).
  const GRAPH = new Map(USERS.map((u, i) => [u.id, {
    followers: USERS.filter((_, j) => j !== i && (j * 7 + i * 3) % 5 !== 0).slice(0, 27 - (i * 7) % 23).map((x) => x.id),
    following: USERS.filter((_, j) => j !== i && (j + i) % 4 === 0).slice(0, 2 + (i * 5) % 9).map((x) => x.id),
    favorites_count: 12 + (i * 37) % 180, comments_count: 5 + (i * 13) % 64,
  }]));
  const follows = {
    read() { try { return new Set(JSON.parse(localStorage.getItem("kitsu-demo-follows") || "[]")); } catch (_) { return new Set(); } },
    write(set) { try { localStorage.setItem("kitsu-demo-follows", JSON.stringify([...set])); } catch (_) { /* приватный режим */ } },
  };
  const target = () => ID || USERS[0].id;
  const pick = (u) => ({ id: u.id, username: u.username, avatar_url: u.avatar_url, bio: u.bio });

  const api = {
    // GET /users/me — только чтобы узнать свой id; без токена 401, и тогда страница работает как для гостя
    async me() { await sleep(120); if (STATE === "guest") throw httpError(401, "Not authenticated"); return ME; },
    // GET /users/public/{id} → {id, username, avatar_url, cover_url, bio, is_superuser}
    // 404 «User not found» — нет такого или отключён; не-UUID — 422 (ошибка валидации пути)
    async user(id) {
      await sleep(260);
      if (STATE === "error") throw httpError(0, "network");
      if (STATE === "notfound") throw httpError(404, "User not found");
      if (!UUID.test(id)) throw httpError(422, "Input should be a valid UUID");
      if (id === ME.id) return { ...ME, cover_url: null, is_superuser: false };
      const u = byId.get(id); if (!u) throw httpError(404, "User not found");
      return { ...u };
    },
    // GET /users/public/{id}/stats → {favorites_count, comments_count, followers_count, following_count}
    async stats(id) {
      await sleep(240);
      if (STATE === "error") throw httpError(0, "network");
      if (STATE === "notfound") throw httpError(404, "User not found");
      if (!UUID.test(id)) throw httpError(422, "Input should be a valid UUID");
      if (!GRAPH.has(id)) { if (id === ME.id) return { favorites_count: 15, comments_count: 42, followers_count: 27, following_count: 19 }; throw httpError(404, "User not found"); }
      if (STATE === "empty") return { favorites_count: 0, comments_count: 0, followers_count: 0, following_count: 0 };
      const g = GRAPH.get(id); const mine = follows.read().has(id) ? 1 : 0;
      return { favorites_count: g.favorites_count, comments_count: g.comments_count, followers_count: g.followers.length + mine, following_count: g.following.length };
    },
    // GET /interactions/follows/{id}/followers?skip&limit и …/following?skip&limit → [{id, username, avatar_url, bio}]
    // Без total; сервер сортирует по id пользователя (не по дате подписки), limit по умолчанию 50.
    async people(id, kind, skip, limit) {
      await sleep(320);
      if (STATE === "empty") return [];
      const g = GRAPH.get(id); if (!g) return [];
      let list = g[kind].map((x) => pick(byId.get(x)));
      if (kind === "followers" && follows.read().has(id)) list.push(pick(ME));
      list.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      return list.slice(skip, skip + limit);
    },
    // GET /interactions/follows/{id}/status (с токеном) → {is_following}
    async status(id) { await sleep(160); return { is_following: follows.read().has(id) }; },
    // POST /interactions/follows/{id} (с токеном) — ПЕРЕКЛЮЧАЕТ подписку и отвечает новым состоянием {is_following}.
    // Повторный запрос отменит первый, поэтому кнопка заблокирована, пока ответ не пришёл. 400 «Cannot follow yourself».
    async toggle(id) {
      await sleep(380);
      const set = follows.read(); if (set.has(id)) set.delete(id); else set.add(id); follows.write(set);
      return { is_following: set.has(id) };
    },
  };

  /* ---------- Общие куски ---------- */
  function toast(title, message, tone = "success") {
    const region = $("#toast-region"); $$(".toast.is-leaving", region).forEach((n) => n.remove());
    const el = document.createElement("div"); el.className = `toast toast--${tone}`; el.setAttribute("role", tone === "danger" ? "alert" : "status");
    el.innerHTML = `<span class="toast-icon"><i data-lucide="${tone === "danger" ? "circle-alert" : "check"}"></i></span><span><strong>${esc(title)}</strong><small>${esc(message)}</small></span><button type="button" aria-label="Закрыть уведомление"><i data-lucide="x"></i></button>`;
    const close = () => { el.classList.add("is-leaving"); setTimeout(() => el.remove(), 190); };
    $("button", el).addEventListener("click", close); region.append(el); icons(el); setTimeout(close, 4200);
  }
  // Буква на цветной плитке, пока у человека нет аватара; тон стабилен для одного id.
  const tone = (id) => [...String(id)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 997, 7) % 4;
  const face = (u) => (u.avatar_url ? `<img src="${esc(u.avatar_url)}" alt="" loading="lazy" />` : `<span>${esc((u.username || "?").charAt(0).toUpperCase())}</span>`);
  const plural = (n, one, few, many) => { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many; };
  function countUp(el, to) {
    if (reduced || to < 2) { el.textContent = nf.format(to); return; }
    const t0 = performance.now(); const dur = 700;
    const step = (t) => { const k = Math.min(1, (t - t0) / dur); el.textContent = nf.format(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }

  /* ---------- Шапка ---------- */
  let me = null; let user = null; let stats = null; let following = false; let busy = false;

  function paintHero() {
    $("[data-name]").textContent = user.username;
    document.title = `${user.username} — профиль Kitsu · Кицунэ`;
    const role = $("[data-role]"); role.hidden = !user.is_superuser;
    role.innerHTML = user.is_superuser ? '<i data-lucide="crown"></i>Администратор' : "";
    const bio = $("[data-bio]"); bio.textContent = user.bio?.trim() || "Пока ничего не рассказал(а) о себе";
    bio.classList.toggle("is-empty", !user.bio?.trim());
    const av = $("[data-avatar]"); av.innerHTML = face(user); if (!user.avatar_url) av.dataset.tone = tone(user.id);
    if (user.cover_url) { const cv = $("[data-cover]"); cv.style.backgroundImage = `url("${String(user.cover_url).replace(/"/g, "%22")}")`; cv.classList.add("has-image"); }
    icons($("[data-hero]"));
  }
  function paintCounts(animate) {
    for (const [key, value] of Object.entries(stats)) {
      const dd = $(`[data-count="${key}"]`); if (dd) { if (animate) countUp(dd, value); else dd.textContent = nf.format(value); }
      const b = $(`[data-tab-count="${key}"]`); if (b) b.textContent = nf.format(value);
    }
  }

  /* ---------- Подписка ---------- */
  function paintFollow() {
    const box = $("[data-actions]"); let btn = $("[data-follow]", box);
    if (!me) {
      // Гость: подписка требует входа — ведём на вход, как обещает подпись.
      if (btn) btn.outerHTML = `<a class="button button--primary" href="./auth.html#login" data-follow-login><i data-lucide="log-in"></i><span>Войти, чтобы подписаться</span></a>`;
      icons(box); return;
    }
    btn.disabled = busy; btn.setAttribute("aria-pressed", String(following)); btn.classList.toggle("is-following", following);
    btn.classList.toggle("button--primary", !following); btn.classList.toggle("button--secondary", following);
    btn.setAttribute("aria-label", following ? `Отписаться от ${user.username}` : `Подписаться на ${user.username}`);
    btn.innerHTML = busy
      ? `<i data-lucide="loader-circle" class="us-spin"></i><span>${following ? "Отписываю…" : "Подписываю…"}</span>`
      : following
        ? '<i data-lucide="user-check" class="us-follow__now"></i><i data-lucide="user-minus" class="us-follow__hover"></i><span class="us-follow__now">Вы подписаны</span><span class="us-follow__hover">Отписаться</span>'
        : '<i data-lucide="user-plus"></i><span>Подписаться</span>';
    icons(btn);
  }
  async function toggleFollow() {
    if (busy || !me) return;
    busy = true; paintFollow();
    try {
      const was = following; ({ is_following: following } = await api.toggle(user.id));
      if (following !== was) { stats.followers_count = Math.max(0, stats.followers_count + (following ? 1 : -1)); paintCounts(false); }
      toast(following ? "Вы подписались" : "Подписка отменена", following ? `Новое от ${user.username} будет в вашей ленте` : `Вы больше не подписаны на ${user.username}`);
      if (people.kind === "followers") loadPeople(true);
    } catch (err) {
      toast("Не получилось", err.status === 401 ? "Сеанс закончился — войдите заново" : "Сервер не ответил, повторите попытку", "danger");
    } finally { busy = false; paintFollow(); $("[data-follow]")?.focus(); }
  }
  async function share() {
    const url = location.href.replace(/[?&]state=[^&#]*/, "").replace(/\?&/, "?");
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches) { await navigator.share({ title: `${user.username} — Kitsu`, url }); return; }
      await navigator.clipboard.writeText(url); toast("Ссылка скопирована", "Её можно отправить кому угодно — профиль открыт всем");
    } catch (err) { if (err?.name !== "AbortError") toast("Не получилось скопировать", url, "danger"); }
  }

  /* ---------- Подписчики и подписки ---------- */
  const people = { kind: "followers", skip: 0, done: false, loading: false, loaded: false, token: 0 };
  const EMPTY = {
    followers: ["users", "Подписчиков пока нет", "Станьте первым — кнопка «Подписаться» в шапке профиля."],
    following: ["user-search", "Ни на кого не подписан(а)", "Когда человек подпишется на кого-то, список появится здесь."],
  };
  function personHtml(p) {
    const self = me && p.id === me.id;
    return `<li><a class="us-person" href="${self ? "./profile.html" : `./user.html?id=${encodeURIComponent(p.id)}`}">
      <span class="us-av"${p.avatar_url ? "" : ` data-tone="${tone(p.id)}"`} aria-hidden="true">${face(p)}</span>
      <span class="us-person__text"><strong>${esc(p.username)}${self ? '<span class="us-tag">вы</span>' : ""}</strong><small>${p.bio?.trim() ? esc(p.bio) : "Без описания"}</small></span>
      <i data-lucide="chevron-right" class="us-person__go"></i></a></li>`;
  }
  async function loadPeople(reset) {
    const list = $("[data-people-list]"); const more = $("[data-people-more]");
    if (reset) { people.skip = 0; people.done = false; list.innerHTML = Array.from({ length: 6 }, () => '<li class="pf-skel us-skel"></li>').join(""); more.hidden = true; }
    const token = ++people.token; people.loading = true; more.disabled = true; $("span", more).textContent = "Загружаю…";
    try {
      const rows = await api.people(user.id, people.kind, people.skip, PAGE);
      if (token !== people.token) return; // вкладку переключили, пока шёл запрос
      if (reset) list.innerHTML = "";
      people.skip += rows.length;
      // total список не отдаёт: конец — неполная страница или достигнут счётчик из /stats (он считает те же строки).
      people.done = rows.length < PAGE || people.skip >= (stats?.[`${people.kind}_count`] ?? Infinity);
      if (!people.skip) {
        const [icon, title, text] = EMPTY[people.kind];
        list.innerHTML = `<li class="pf-state us-empty"><i data-lucide="${icon}"></i><strong>${title}</strong><span>${text}</span></li>`;
      } else list.insertAdjacentHTML("beforeend", rows.map(personHtml).join(""));
      more.hidden = people.done; icons(list);
    } catch (_) {
      if (token !== people.token) return;
      list.innerHTML = `<li class="pf-state pf-state--error us-empty"><i data-lucide="wifi-off"></i><strong>Не получилось загрузить</strong><span>Сервер не ответил. Повторите попытку.</span><button class="button button--secondary" type="button" data-people-retry><i data-lucide="refresh-cw"></i><span>Повторить</span></button></li>`;
      $("[data-people-retry]", list).addEventListener("click", () => loadPeople(true)); icons(list);
    } finally {
      if (token === people.token) { people.loading = false; more.disabled = false; $("span", more).textContent = "Показать ещё"; }
    }
  }
  function selectTab(kind, focus = false, load = true) {
    if (!["followers", "following"].includes(kind)) kind = "followers";
    const tabs = $("[data-people-tabs]"); const thumb = $(".pf-seg__thumb", tabs);
    $$("[role=tab]", tabs).forEach((t) => { const on = t.dataset.people === kind; t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; if (on) { thumb.style.width = `${t.offsetWidth}px`; thumb.style.transform = `translateX(${t.offsetLeft}px)`; if (focus) t.focus(); } });
    $("[data-people-panel]").setAttribute("aria-labelledby", `tab-${kind}`);
    if (load && (people.kind !== kind || !people.loaded)) { people.kind = kind; people.loaded = true; loadPeople(true); }
  }
  function initPeople() {
    const tabs = $("[data-people-tabs]");
    tabs.addEventListener("click", (e) => { const t = e.target.closest("[role=tab]"); if (t) selectTab(t.dataset.people); });
    tabs.addEventListener("keydown", (e) => {
      const keys = { ArrowRight: "following", ArrowLeft: "followers", Home: "followers", End: "following" };
      if (keys[e.key]) { e.preventDefault(); selectTab(keys[e.key], true); }
    });
    $("[data-people-more]").addEventListener("click", () => { if (!people.loading && !people.done) loadPeople(false); });
    // «Подписчики» / «Подписки» в счётчиках шапки открывают нужный список.
    $$("[data-people-link]").forEach((a) => a.addEventListener("click", (e) => {
      e.preventDefault(); selectTab(a.dataset.peopleLink);
      $("#us-people").scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      history.replaceState(null, "", `#${a.dataset.peopleLink}`);
    }));
    addEventListener("resize", () => selectTab(people.kind, false, false));
    document.fonts?.ready.then(() => selectTab(people.kind, false, false));
  }

  /* ---------- Не найден и сбой ---------- */
  function missing(kind) {
    $("[data-hero]").hidden = true; $("#us-people").hidden = true;
    const box = $("[data-missing]"); box.hidden = false;
    box.innerHTML = kind === "error"
      ? `<i data-lucide="wifi-off"></i><h1>Профиль не загрузился</h1><span>Сервер не ответил. Проверьте соединение и повторите.</span>
         <div class="pf-actions"><button class="button button--primary" type="button" data-retry><i data-lucide="refresh-cw"></i><span>Повторить</span></button><a class="button button--secondary" href="./index.html"><i data-lucide="house"></i><span>На главную</span></a></div>`
      : `<i data-lucide="user-x"></i><h1>Пользователь не найден</h1><span>Возможно, профиль удалён или ссылка устарела.</span>
         <div class="pf-actions"><a class="button button--primary" href="./index.html"><i data-lucide="house"></i><span>На главную</span></a>${history.length > 1 ? '<button class="button button--secondary" type="button" data-back><i data-lucide="arrow-left"></i><span>Назад</span></button>' : ""}</div>`;
    document.title = kind === "error" ? "Профиль не загрузился — Kitsu · Кицунэ" : "Пользователь не найден — Kitsu · Кицунэ";
    icons(box);
    $("[data-retry]", box)?.addEventListener("click", () => location.reload());
    $("[data-back]", box)?.addEventListener("click", () => history.back());
  }

  async function init() {
    document.addEventListener("visibilitychange", () => document.body.classList.toggle("is-hidden-tab", document.hidden));
    icons(document);
    const id = target();
    try { me = await api.me(); } catch (_) { me = null; }
    if (!me) $$(".header-account").forEach((a) => { a.outerHTML = '<a class="header-login" href="./auth.html#login">Войти</a>'; });
    // Свой профиль открывается на profile.html — там то же самое и ещё личные разделы (как в рабочем проекте).
    if (me && id === me.id) { location.replace("./profile.html"); return; }
    try {
      [user, stats] = await Promise.all([api.user(id), api.stats(id)]);
    } catch (err) { missing(err.status === 404 || err.status === 422 ? "notfound" : "error"); $("#user-main").removeAttribute("aria-busy"); return; }
    paintHero(); paintCounts(true);
    $("[data-hero]").classList.add("is-ready"); $("#user-main").removeAttribute("aria-busy");
    $("[data-share]").addEventListener("click", share);
    $("[data-follow]")?.addEventListener("click", toggleFollow);
    if (me) { try { ({ is_following: following } = await api.status(id)); } catch (_) { following = false; } }
    paintFollow();
    initPeople(); selectTab(location.hash === "#following" ? "following" : "followers");
    // Раздел «Люди» проявляется при прокрутке, как разделы своего профиля.
    if ("IntersectionObserver" in window) {
      const rev = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-in"); rev.unobserve(en.target); } }), { rootMargin: "0px 0px -8% 0px" });
      $$("[data-reveal]").forEach((n) => rev.observe(n));
    } else $$("[data-reveal]").forEach((n) => n.classList.add("is-in"));
    if (location.hash === "#followers" || location.hash === "#following") $("#us-people").scrollIntoView({ block: "start" });
  }
  init();
})();
