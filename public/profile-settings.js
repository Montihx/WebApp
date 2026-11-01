/* Настройки профиля. Вместо сервера — `api` на демо-значениях; у каждого метода записан настоящий запрос
   и то, как сервер его понимает (backend-go/internal/handlers/users_me.go, uploads.go, auth.go).
   Сохранённое лежит в localStorage ("kitsu-demo-profile") и подхватывается на profile.html.
   Состояния для проверки: ?state=guest (нет входа, 401), ?state=error (сервер не ответил), ?state=unverified. */
(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const STATE = new URLSearchParams(location.search).get("state");
  const KEY = "kitsu-demo-profile";
  const icons = (root) => window.lucide?.createIcons({ attrs: { "aria-hidden": "true", "stroke-width": 1.8 }, root });
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const bytes = (s) => new TextEncoder().encode(s).length;

  // Ограничения сервера. Файлы: JPG/PNG/WebP/GIF, аватар до 5 МБ, обложка до 15 МБ (uploads.go).
  // Пароль: от 8 до 128 БАЙТ — сервер считает len() строки Go, буква кириллицы занимает два (auth.go).
  const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const LIMITS = { avatar: 5 * 1024 * 1024, cover: 15 * 1024 * 1024 };
  const LIMIT_TEXT = { avatar: "5 МБ", cover: "15 МБ" };
  const HINT = { avatar: "Перетащите файл сюда или нажмите. JPG, PNG, WebP, GIF — до 5 МБ", cover: "Перетащите файл или нажмите. JPG, PNG, WebP, GIF — до 15 МБ" };
  const BIO_MAX = 500; // сервер принимает до 5000 байт, рабочий проект держит 500 знаков
  const GENDER = { male: "мужской", female: "женский", other: "другой" };

  /* ---------- Соцсети ---------- */
  // Та же проверка стоит в profile.js: там ссылка строится только на домен самой сети.
  // В preferences уходит имя без «@» и без адреса — так профиль всегда собирает ссылку сам.
  const SOCIAL = {
    vk: { label: "VK", base: "https://vk.com/", hosts: ["vk.com", "m.vk.com", "vk.ru"], handle: /^[a-z0-9_.]{2,32}$/i,
      bad: "Имя в VK — от 2 до 32 латинских букв, цифр, «_» или «.»" },
    telegram: { label: "Telegram", base: "https://t.me/", hosts: ["t.me", "telegram.me"], handle: /^[a-z0-9_]{5,32}$/i,
      bad: "Имя в Telegram — от 5 до 32 латинских букв, цифр или «_»" },
    discord: { label: "Discord", base: "", hosts: [], handle: /^(?:[a-z0-9_.]{2,32}|[^#@:]{2,32}#\d{4})$/,
      bad: "Имя в Discord — от 2 до 32 строчных латинских букв, цифр, «_» или «.»" },
  };
  function parseSocial(key, raw) {
    const rule = SOCIAL[key]; let v = String(raw ?? "").trim();
    if (!v) return { handle: "", href: "" };
    if (rule.hosts.length && (/^https?:\/\//i.test(v) || /^([a-z0-9-]+\.)+[a-z]{2,}\//i.test(v))) {
      let url; try { url = new URL(/^https?:/i.test(v) ? v : `https://${v}`); } catch (_) { return { handle: "", href: "", error: "Не похоже на ссылку" }; }
      if (!rule.hosts.includes(url.hostname.toLowerCase().replace(/^www\./, ""))) return { handle: "", href: "", error: `Ссылка должна вести на ${rule.hosts[0]}` };
      v = url.pathname.split("/").filter(Boolean)[0] || "";
    }
    v = v.replace(/^@/, "");
    if (!rule.handle.test(v)) return { handle: "", href: "", error: rule.bad };
    return { handle: v, href: rule.base ? rule.base + v : "" };
  }

  /* ---------- Демо-данные ---------- */
  const BASE = {
    username: "kitsune_noa", email: "noa@example.com", created_at: "2026-03-12T09:20:00", is_verified: STATE !== "unverified", role: { name: "Зритель" },
    bio: "Смотрю по вечерам, пишу заметки к каждому сезону. Люблю спокойные истории про дорогу и тихих героев.",
    gender: "", avatar_url: null, cover_url: null, active_avatar: null, decoration: null,
    preferences: { vk: "", telegram: "", discord: "", two_factor_enabled: false, unsubscribe_all_publications: false },
  };
  const EDITABLE = ["bio", "gender", "avatar_url", "cover_url", "active_avatar", "decoration", "preferences"];

  // GET /avatar-collection/ → [{id, title, category, image_url}] — публичный список, только is_active.
  // В демо image_url — нарисованные здесь SVG, поэтому выбор ведёт себя как настоящий: картинка уходит в avatar_url.
  const TONES = [["#c4a1ff", "#ff9ccb"], ["#7aa7ff", "#c4a1ff"], ["#5be3a8", "#7de3ff"], ["#ffcb70", "#ff9ccb"], ["#3b2a57", "#c4a1ff"], ["#2b2118", "#ffb547"]];
  const ink = "#1b1424";
  const SHAPES = {
    fox: `<path d="M22 28l14 30 12 7 12-7 14-30-15 15H37z" fill="#fff" fill-opacity=".94"/><path d="M41 51h4M51 51h4" stroke="${ink}" stroke-width="3.2" stroke-linecap="round"/>`,
    blade: `<path d="M16 80L80 16" stroke="#fff" stroke-opacity=".5" stroke-width="5" stroke-linecap="round"/><path d="M28 32l11 22 9 5 9-5 11-22-12 11H40z" fill="#fff" fill-opacity=".94"/>`,
    flame: `<path d="M49 16c4 14 19 21 19 39a20 20 0 0 1-40 0c0-10 6-16 10-21 1 8 4 11 9 12-3-12 0-21 2-30z" fill="#fff" fill-opacity=".94"/>`,
    dusk: `<circle cx="62" cy="34" r="11" fill="#fff" fill-opacity=".85"/><path d="M8 78l26-32 15 17 11-11 28 26z" fill="#fff" fill-opacity=".94"/>`,
    moon: `<path d="M58 20a29 29 0 1 0 20 48A25 25 0 0 1 58 20z" fill="#fff" fill-opacity=".94"/><path d="M26 26h.01M34 18h.01M22 40h.01" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`,
    bloom: `<g fill="#fff" fill-opacity=".92">${[0, 72, 144, 216, 288].map((d) => `<ellipse cx="48" cy="30" rx="10" ry="16" transform="rotate(${d} 48 48)"/>`).join("")}</g><circle cx="48" cy="48" r="7" fill="${ink}" fill-opacity=".55"/>`,
  };
  const art = (tone, shape) => {
    const [a, b] = TONES[tone];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="96" height="96" fill="url(#g)"/>${SHAPES[shape]}</svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  };
  const AVATARS = [
    { id: "6f1c2a10-0000-4000-8000-000000000001", title: "Кицунэ", category: "Лисы", image_url: art(0, "fox") },
    { id: "6f1c2a10-0000-4000-8000-000000000002", title: "Лис-самурай", category: "Лисы", image_url: art(4, "blade") },
    { id: "6f1c2a10-0000-4000-8000-000000000003", title: "Огонёк", category: "Лисы", image_url: art(3, "flame") },
    { id: "6f1c2a10-0000-4000-8000-000000000004", title: "Тихий вечер", category: "Пейзажи", image_url: art(1, "dusk") },
    { id: "6f1c2a10-0000-4000-8000-000000000005", title: "Луна", category: "Пейзажи", image_url: art(5, "moon") },
    { id: "6f1c2a10-0000-4000-8000-000000000006", title: "Сакура", category: "Пейзажи", image_url: art(2, "bloom") },
  ];
  // GET /decorations/ → [{id, title, image_url}] — рамки поверх аватара; в демо рамка рисуется стилями по номеру.
  const FRAMES = [{ id: 1, title: "Лаванда", frame: 1 }, { id: 2, title: "Сакура", frame: 2 }, { id: 3, title: "Золото", frame: 3 }];

  const store = {
    read() { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (_) { return {}; } },
    write(user) { try { localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(EDITABLE.map((k) => [k, user[k]])))); } catch (_) { /* приватный режим: живёт до перезагрузки */ } },
  };
  const httpError = (status, detail) => Object.assign(new Error(detail), { status, detail });
  let server = null; // «сервер» демо: текущая запись пользователя

  // Сервер принимает в PUT /users/me только присланные ключи со значением не null (users_me.go):
  //   avatar_url / cover_url: "" убирает картинку, null пропускается — поэтому снимаем пустой строкой;
  //   gender: "male" | "female" | "other" | "" (сброс), иначе 400;
  //   preferences: сливается с тем, что уже лежит, — ключ стирается только пустым значением, не пропуском;
  //   decoration_id: число, 0 снимает рамку;
  //   active_avatar_id: UUID активного аватара коллекции, иначе 422/404. Сбросить его нельзя (null пропускается,
  //     "" — 422), поэтому выбор из коллекции пишем ещё и в avatar_url: профиль показывает avatar_url, как рабочий проект.
  function applyUpdate(user, req) {
    const next = clone(user);
    for (const k of ["bio", "avatar_url", "cover_url"]) if (req[k] != null) next[k] = req[k];
    if (req.gender != null) { if (!(req.gender in GENDER) && req.gender !== "") throw httpError(400, "gender must be 'male', 'female', 'other', or empty string"); next.gender = req.gender; }
    if (req.preferences) next.preferences = { ...next.preferences, ...req.preferences };
    if (req.decoration_id != null) next.decoration = req.decoration_id === 0 ? null : clone(FRAMES.find((f) => f.id === req.decoration_id) || null);
    if (req.active_avatar_id != null) { const a = AVATARS.find((x) => x.id === req.active_avatar_id); if (!a) throw httpError(404, "Avatar not found"); next.active_avatar = { id: a.id, title: a.title, image_url: a.image_url }; }
    return next;
  }

  const api = {
    // GET /users/me → FullUser; без входа 401
    async me() {
      await sleep(220);
      if (STATE === "guest") throw httpError(401, "Not authenticated");
      if (STATE === "error") throw httpError(0, "network");
      const s = store.read(); server = { ...clone(BASE), ...s, preferences: { ...BASE.preferences, ...(s.preferences || {}) } };
      return clone(server);
    },
    // POST /users/me/avatar, multipart «file» → FullUser. Сервер СРАЗУ пишет avatar_url — до PUT /users/me.
    // 400 «File too large — maximum 5 MB» / «Invalid file type…»
    async uploadAvatar(file) { await sleep(450); server.avatar_url = await shrink(file, 256); store.write(server); return clone(server); },
    // POST /users/me/cover, multipart «file» → FullUser; так же сразу пишет cover_url; до 15 МБ
    async uploadCover(file) { await sleep(500); server.cover_url = await shrink(file, 1400); store.write(server); return clone(server); },
    // PUT /users/me {bio?, gender?, avatar_url?, cover_url?, active_avatar_id?, decoration_id?, preferences?} → FullUser
    async updateMe(req) { await sleep(420); server = applyUpdate(server, req); store.write(server); return clone(server); },
    // POST /auth/change-password {current_password, new_password} → 200 {access_token, refresh_token}: токены этого
    // устройства заменяются новыми, остальные устройства выходят. 400 «Incorrect current password»,
    // 400 «New password must differ from current», 422 — длина вне 8–128 байт.
    async changePassword(body) {
      await sleep(600);
      if (body.current_password === "wrong-password") throw httpError(400, "Incorrect current password");
      if (body.current_password === body.new_password) throw httpError(400, "New password must differ from current");
      return { access_token: "demo", refresh_token: "demo", token_type: "bearer" };
    },
    // POST /auth/logout-all → все токены, включая этот, перестают работать; не чаще 10 раз в час
    async logoutAll() { await sleep(500); return { ok: true }; },
    // POST /auth/send-verification — не чаще 3 раз в час (429), 400 «Email already verified»
    async sendVerification() { await sleep(600); return { ok: true }; },
  };

  // В демо картинка уменьшается перед записью в localStorage; на сервер уходит сам файл.
  function shrink(file, max) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file); const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); resolve(c.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(httpError(400, "Invalid image")); };
      img.src = url;
    });
  }

  function toast(title, message, tone = "success") {
    const region = $("#toast-region"); $$(".toast.is-leaving", region).forEach((n) => n.remove());
    const el = document.createElement("div"); el.className = `toast toast--${tone}`; el.setAttribute("role", tone === "danger" ? "alert" : "status");
    el.innerHTML = `<span class="toast-icon"><i data-lucide="${tone === "danger" ? "circle-alert" : "check"}"></i></span><span><strong>${esc(title)}</strong><small>${esc(message)}</small></span><button type="button" aria-label="Закрыть уведомление"><i data-lucide="x"></i></button>`;
    const close = () => { el.classList.add("is-leaving"); setTimeout(() => el.remove(), 190); };
    $("button", el).addEventListener("click", close); region.append(el); icons(el); setTimeout(close, 4200);
  }

  /* ---------- Состояние формы ---------- */
  // saved — что на сервере; draft — что в форме. avatar.mode: keep | file | collection | remove.
  let saved = null; let draft = null;
  const files = { avatar: null, cover: null }; const previews = { avatar: null, cover: null };
  let busy = false;
  const fromMe = (me) => ({ bio: me.bio || "", gender: me.gender || "", avatar: { mode: "keep" }, removeCover: false, decoration: me.decoration ? me.decoration.id : 0, preferences: clone(me.preferences || {}) });
  const socialState = () => Object.fromEntries(Object.keys(SOCIAL).map((k) => [k, parseSocial(k, draft.preferences[k])]));
  const snapshot = () => JSON.stringify([draft.bio, draft.gender, draft.avatar, draft.removeCover, draft.decoration, draft.preferences, Boolean(files.cover)]);
  let baseline = "";
  const isDirty = () => snapshot() !== baseline;
  const invalid = () => Object.values(socialState()).some((s) => s.error);

  function avatarUrl() {
    const a = draft.avatar;
    if (a.mode === "file") return previews.avatar;
    if (a.mode === "collection") return AVATARS.find((x) => x.id === a.id)?.image_url || null;
    if (a.mode === "remove") return null;
    return saved.avatar_url || null;
  }
  // Какой аватар коллекции сейчас стоит: выбранный в форме или тот, чья картинка уже лежит в avatar_url.
  const currentCollectionId = () => draft.avatar.mode === "collection" ? draft.avatar.id
    : draft.avatar.mode === "keep" ? AVATARS.find((x) => x.image_url === saved.avatar_url)?.id || null : null;
  const face = (url) => url ? `<img src="${esc(url)}" alt="" />` : `<span>${esc(saved.username.charAt(0).toUpperCase())}</span>`;

  /* ---------- Превью ---------- */
  function paintPreview() {
    const url = avatarUrl(); const av = $("[data-pv-avatar]");
    av.innerHTML = face(url);
    const frame = FRAMES.find((f) => f.id === draft.decoration);
    if (frame) av.dataset.frame = frame.frame; else delete av.dataset.frame;
    const cover = files.cover ? previews.cover : draft.removeCover ? null : saved.cover_url;
    for (const node of [$("[data-pv-cover]"), $("[data-cover-shot]")]) { node.style.backgroundImage = cover ? `url("${String(cover).replace(/"/g, "%22")}")` : ""; node.classList.toggle("has-image", Boolean(cover)); }
    $("[data-pv-name]").textContent = saved.username;
    $("[data-pv-meta]").textContent = [saved.role?.name, GENDER[draft.gender]].filter(Boolean).join(" · ");
    $("[data-pv-bio]").textContent = draft.bio.trim() || "Статус не установлен";
    const socials = socialState();
    $("[data-pv-social]").innerHTML = Object.entries(socials).filter(([, s]) => s.handle)
      .map(([k, s]) => `<span class="pf-chip"><i data-lucide="${s.href ? "external-link" : "copy"}"></i>${SOCIAL[k].label}${s.href ? "" : `: ${esc(s.handle)}`}</span>`).join("");
    icons($("[data-pv-social]"));
    $("[data-clear=avatar]").hidden = draft.avatar.mode !== "file";
    $("[data-clear=cover]").hidden = !files.cover;
    $("[data-remove-cover]").hidden = !saved.cover_url || draft.removeCover || Boolean(files.cover);
    $("[data-restore-cover]").hidden = !draft.removeCover;
    const sw = $("[data-remove-avatar]"); sw.checked = draft.avatar.mode === "remove"; sw.disabled = !saved.avatar_url && draft.avatar.mode === "keep";
    $("[data-remove-avatar-note]").textContent = sw.disabled ? "Сейчас аватара нет — показывается буква имени" : "Останется буква имени";
    paintFrames();
  }

  function paintDirty() {
    const dirty = isDirty(); const bad = invalid();
    $("[data-save]").disabled = !dirty || busy || bad; $("[data-reset]").disabled = !dirty || busy;
    $("[data-save-text]").textContent = busy ? "Сохраняю…" : bad ? "Исправьте поля, отмеченные красным" : dirty ? "Есть несохранённые изменения" : "Все изменения сохранены";
    $("[data-save-bar]").classList.toggle("is-dirty", dirty);
    $("[data-save-bar]").classList.toggle("is-bad", bad && dirty);
  }
  const refresh = () => { paintPreview(); paintDirty(); };

  /* ---------- Файлы ---------- */
  function setFile(kind, file) {
    const err = $(`[data-error=${kind}]`); err.textContent = "";
    if (!file) return;
    if (!TYPES.includes(file.type)) { err.textContent = "Подходят только JPG, PNG, WebP и GIF"; return; }
    if (file.size > LIMITS[kind]) { err.textContent = `Файл слишком большой — не больше ${LIMIT_TEXT[kind]}`; return; }
    if (previews[kind]) URL.revokeObjectURL(previews[kind]);
    files[kind] = file; previews[kind] = URL.createObjectURL(file);
    if (kind === "avatar") draft.avatar = { mode: "file" };
    if (kind === "cover") draft.removeCover = false;
    $(`[data-drop-hint=${kind}]`).textContent = `${file.name} · ${Math.max(1, Math.round(file.size / 1024))} КБ`;
    paintAvatars(); refresh();
  }
  function clearFile(kind) {
    if (previews[kind]) URL.revokeObjectURL(previews[kind]);
    files[kind] = null; previews[kind] = null; $(`[data-error=${kind}]`).textContent = "";
    if (kind === "avatar" && draft.avatar.mode === "file") draft.avatar = { mode: "keep" };
    $(`[data-drop-hint=${kind}]`).textContent = HINT[kind];
    $(`[data-file=${kind}]`).value = "";
  }
  function initFiles() {
    $$("[data-file]").forEach((input) => input.addEventListener("change", () => setFile(input.dataset.file, input.files[0])));
    $$("[data-clear]").forEach((b) => b.addEventListener("click", () => { clearFile(b.dataset.clear); paintAvatars(); refresh(); $(`[data-file=${b.dataset.clear}]`).focus(); }));
    $$("[data-drop]").forEach((zone) => {
      const kind = zone.dataset.drop;
      ["dragenter", "dragover"].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add("is-over"); }));
      ["dragleave", "drop"].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); if (ev === "drop" || !zone.contains(e.relatedTarget)) zone.classList.remove("is-over"); }));
      zone.addEventListener("drop", (e) => setFile(kind, e.dataTransfer?.files?.[0]));
    });
    $("[data-remove-avatar]").addEventListener("change", (e) => {
      if (e.target.checked) { clearFile("avatar"); draft.avatar = { mode: "remove" }; } else draft.avatar = { mode: "keep" };
      paintAvatars(); refresh();
    });
    $("[data-remove-cover]").addEventListener("click", () => { draft.removeCover = true; clearFile("cover"); refresh(); $("[data-restore-cover]").focus(); });
    $("[data-restore-cover]").addEventListener("click", () => { draft.removeCover = false; refresh(); $("#cover-file").focus(); });
  }

  /* ---------- Коллекция аватаров и рамки ---------- */
  let cat = "";
  function paintAvatars() {
    const cats = [...new Set(AVATARS.map((a) => a.category))];
    $("[data-avatar-cats]").innerHTML = ["", ...cats].map((c) => `<button type="button" class="st-chip" aria-pressed="${c === cat}" data-cat="${esc(c)}">${c ? esc(c) : "Все"}</button>`).join("");
    const cur = currentCollectionId(); const list = AVATARS.filter((a) => !cat || a.category === cat);
    const focusable = list.some((a) => a.id === cur) ? cur : list[0]?.id;
    $("[data-avatars]").innerHTML = list.map((a) => `<button type="button" role="radio" class="st-pick" aria-checked="${a.id === cur}" tabindex="${a.id === focusable ? 0 : -1}" data-avatar="${a.id}"><span class="st-pick__art"><img src="${esc(a.image_url)}" alt="" /></span><span>${esc(a.title)}</span></button>`).join("");
  }
  function paintFrames() {
    const url = avatarUrl(); const box = $("[data-frames]"); const had = box.contains(document.activeElement) ? document.activeElement.dataset.frame : null;
    box.innerHTML = [{ id: 0, title: "Без рамки", frame: null }, ...FRAMES].map((f) => `<button type="button" role="radio" class="st-pick" aria-checked="${draft.decoration === f.id}" tabindex="${draft.decoration === f.id ? 0 : -1}" data-frame="${f.id}"><span class="st-pick__art st-pick__ring"${f.frame ? ` data-frame="${f.frame}"` : ""}>${face(url)}</span><span>${esc(f.title)}</span></button>`).join("");
    if (had != null) $(`[data-frame="${had}"]`, box)?.focus();
  }
  function initPickers() {
    $("[data-avatar-cats]").addEventListener("click", (e) => { const b = e.target.closest("[data-cat]"); if (b) { cat = b.dataset.cat; paintAvatars(); } });
    $("[data-avatars]").addEventListener("click", (e) => {
      const b = e.target.closest("[data-avatar]"); if (!b) return;
      clearFile("avatar");
      // Уже стоит в профиле — значит, менять нечего; иначе — выбор из коллекции.
      draft.avatar = AVATARS.find((x) => x.id === b.dataset.avatar)?.image_url === saved.avatar_url ? { mode: "keep" } : { mode: "collection", id: b.dataset.avatar };
      paintAvatars(); refresh(); $(`[data-avatar="${b.dataset.avatar}"]`).focus();
    });
    $("[data-frames]").addEventListener("click", (e) => { const b = e.target.closest("[data-frame]"); if (!b) return; draft.decoration = Number(b.dataset.frame); refresh(); $(`[data-frames] [data-frame="${b.dataset.frame}"]`).focus(); });
    // Стрелки перемещают выбор внутри группы radio (как у нативных радиокнопок).
    $$("[role=radiogroup]").forEach((g) => g.addEventListener("keydown", (e) => {
      const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!k) return;
      const items = $$("[role=radio]", g); const i = items.indexOf(document.activeElement); if (i < 0) return;
      e.preventDefault(); const next = items[(i + k + items.length) % items.length]; next.click(); (g.contains(next) ? next : $(`[role=radio][aria-checked=true]`, g))?.focus();
    }));
  }

  /* ---------- Поля профиля ---------- */
  function paintSocialFields() {
    const f = $("[data-profile-form]"); const st = socialState();
    for (const k of Object.keys(SOCIAL)) {
      const field = f.elements[k].closest(".pf-field"); const s = st[k]; const note = $(`[data-social-note=${k}]`);
      field.classList.toggle("is-bad", Boolean(s.error)); f.elements[k].setAttribute("aria-invalid", String(Boolean(s.error)));
      note.classList.toggle("st-error", Boolean(s.error));
      note.textContent = s.error || (s.href ? `Ссылка: ${s.href.replace(/^https:\/\//, "")}` : s.handle ? "Покажем имя — по нажатию оно скопируется" : "");
    }
  }
  function paintBioCount() {
    const n = draft.bio.length; const c = $("[data-bio-count]");
    c.textContent = `${n} / ${BIO_MAX}`; c.classList.toggle("is-near", n >= BIO_MAX - 50);
  }
  function fillForm() {
    const f = $("[data-profile-form]");
    $("#bio").value = draft.bio; paintBioCount();
    Object.keys(SOCIAL).forEach((k) => { f.elements[k].value = draft.preferences[k] || ""; });
    f.elements.two_factor_enabled.checked = Boolean(draft.preferences.two_factor_enabled);
    f.elements.unsubscribe_all_publications.checked = Boolean(draft.preferences.unsubscribe_all_publications);
    paintSeg($("[data-gender]"), draft.gender); paintAvatars(); paintSocialFields();
  }
  function paintSeg(seg, value) {
    const thumb = $(".pf-seg__thumb", seg);
    $$("[role=radio]", seg).forEach((b) => { const on = b.dataset.value === value; b.setAttribute("aria-checked", String(on)); b.tabIndex = on ? 0 : -1; });
    const on = $("[aria-checked=true]", seg); if (on && on.offsetWidth) { thumb.style.width = `${on.offsetWidth}px`; thumb.style.transform = `translateX(${on.offsetLeft}px)`; }
  }

  // PUT /users/me шлёт только изменённое: так не затираются поля, которые могли поменяться с другого устройства.
  function buildRequest() {
    const req = {};
    if (draft.bio !== (saved.bio || "")) req.bio = draft.bio;
    if (draft.gender !== (saved.gender || "")) req.gender = draft.gender;
    if (draft.avatar.mode === "remove") req.avatar_url = "";
    if (draft.avatar.mode === "collection") { const a = AVATARS.find((x) => x.id === draft.avatar.id); req.active_avatar_id = a.id; req.avatar_url = a.image_url; }
    if (draft.removeCover) req.cover_url = "";
    if (draft.decoration !== (saved.decoration?.id || 0)) req.decoration_id = draft.decoration;
    const st = socialState(); const prefs = {};
    for (const k of Object.keys(SOCIAL)) if (st[k].handle !== (saved.preferences?.[k] || "")) prefs[k] = st[k].handle;
    for (const k of ["two_factor_enabled", "unsubscribe_all_publications"]) if (Boolean(draft.preferences[k]) !== Boolean(saved.preferences?.[k])) prefs[k] = Boolean(draft.preferences[k]);
    if (Object.keys(prefs).length) req.preferences = prefs;
    return req;
  }
  const DETAIL = {
    "File too large — maximum 5 MB": "Файл слишком большой — не больше 5 МБ",
    "File too large — maximum 15 MB": "Файл слишком большой — не больше 15 МБ",
    "Bio too long": "Текст «О себе» слишком длинный",
    "Avatar not found": "Этот аватар убрали из коллекции — выберите другой",
    "Invalid image": "Картинку не получилось прочитать — выберите другой файл",
  };
  const ru = (detail) => DETAIL[detail] || (/^Invalid file type/.test(detail || "") ? "Подходят только JPG, PNG, WebP и GIF" : "");

  async function save() {
    if (busy || !isDirty() || invalid()) return;
    // Пока идёт сохранение, поля заблокированы: правка, сделанная после отправки, иначе молча пропала бы,
    // когда форма перезаполнится ответом сервера.
    const form = $("[data-profile-form]"); const lock = $$("fieldset", form).filter((f) => !f.querySelector("[data-look]"));
    busy = true; paintDirty(); form.setAttribute("aria-busy", "true"); lock.forEach((f) => { f.disabled = true; });
    const label = $("[data-save-text]"); let step = ""; let done = 0;
    try {
      // Загрузка сама записывает картинку в профиль, поэтому после неё saved обновляется сразу:
      // если дальше что-то упадёт, повторное сохранение не загрузит файл второй раз.
      if (files.avatar) { step = "avatar"; label.textContent = "Загружаю аватар…"; saved = await api.uploadAvatar(files.avatar); clearFile("avatar"); draft.avatar = { mode: "keep" }; done++; }
      if (files.cover) { step = "cover"; label.textContent = "Загружаю обложку…"; saved = await api.uploadCover(files.cover); clearFile("cover"); done++; }
      const req = buildRequest();
      if (Object.keys(req).length) { step = "profile"; label.textContent = "Сохраняю профиль…"; saved = await api.updateMe(req); }
      draft = fromMe(saved); baseline = snapshot(); fillForm();
      toast("Профиль обновлён", "Изменения уже видны на странице профиля");
    } catch (err) {
      const text = ru(err.detail);
      if ((step === "avatar" || step === "cover") && text) $(`[data-error=${step}]`).textContent = text;
      if (err.status === 401) toast("Сеанс закончился", "Войдите заново — несохранённое останется в форме до перезагрузки", "danger");
      else toast(done ? "Сохранено не всё" : "Не получилось сохранить", text || (done ? "Картинка загружена, остальные изменения — нет. Повторите сохранение" : "Сервер не ответил. Повторите попытку"), "danger");
    } finally {
      busy = false; form.removeAttribute("aria-busy"); lock.forEach((f) => { f.disabled = false; }); refresh();
    }
  }
  function reset() { clearFile("avatar"); clearFile("cover"); draft = fromMe(saved); fillForm(); refresh(); }

  function initForm() {
    const f = $("[data-profile-form]");
    $("#bio").addEventListener("input", (e) => { draft.bio = e.target.value; paintBioCount(); refresh(); });
    $("[data-gender]").addEventListener("click", (e) => { const b = e.target.closest("[role=radio]"); if (b) { draft.gender = b.dataset.value; paintSeg(e.currentTarget, draft.gender); refresh(); } });
    Object.keys(SOCIAL).forEach((k) => f.elements[k].addEventListener("input", (e) => { draft.preferences[k] = e.target.value; paintSocialFields(); refresh(); }));
    // Значение приводим к виду, в котором оно уйдёт на сервер, когда поле теряет фокус: «https://t.me/durov» → «durov».
    Object.keys(SOCIAL).forEach((k) => f.elements[k].addEventListener("blur", (e) => { const s = parseSocial(k, e.target.value); if (!s.error && s.handle !== e.target.value) { e.target.value = s.handle; draft.preferences[k] = s.handle; paintSocialFields(); refresh(); } }));
    ["two_factor_enabled", "unsubscribe_all_publications"].forEach((k) => f.elements[k].addEventListener("change", (e) => { draft.preferences[k] = e.target.checked; refresh(); }));
    $("[data-reset]").addEventListener("click", () => { reset(); toast("Изменения отменены", "Форма вернулась к сохранённым значениям"); });
    f.addEventListener("submit", (e) => { e.preventDefault(); save(); });
    // Ctrl/Cmd + S — сохранить, пока открыт раздел «Профиль».
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && !$("#panel-profile").hidden) { e.preventDefault(); save(); }
    });
    addEventListener("beforeunload", (e) => { if (draft && isDirty()) { e.preventDefault(); e.returnValue = ""; } });
  }

  /* ---------- Оформление (тема и палитра этого браузера) ---------- */
  // Не относится к профилю на сервере: переключается сразу теми же кнопками, что и в шапке сайта.
  function initLook() {
    const root = document.documentElement;
    const segs = { theme: $("[data-look=theme]"), palette: $("[data-look=palette]") };
    const current = { theme: () => (root.dataset.theme === "light" ? "light" : "dark"), palette: () => root.dataset.palette || "sakura" };
    const paint = () => Object.entries(segs).forEach(([k, seg]) => paintSeg(seg, current[k]()));
    Object.entries(segs).forEach(([k, seg]) => seg.addEventListener("click", (e) => {
      const b = e.target.closest("[role=radio]"); if (!b || b.dataset.value === current[k]()) return;
      $(k === "theme" ? "[data-theme-toggle]" : "[data-palette-toggle]")?.click();
    }));
    new MutationObserver(paint).observe(root, { attributes: true, attributeFilter: ["data-theme", "data-palette"] });
    paint();
    return paint;
  }

  /* ---------- Пароль ---------- */
  function initPassword() {
    const form = $("[data-password-form]"); const cur = form.elements.current_password; const nw = form.elements.new_password; const rep = form.elements.repeat;
    const meter = $("[data-meter]"); meter.innerHTML = "<b></b>".repeat(4);
    const submit = $("[data-pw-submit]");
    const fieldError = (name, text) => { const box = $(`[data-error=${name}]`); box.textContent = text; box.closest(".pf-field").classList.toggle("is-bad", Boolean(text)); };
    // Сила — подсказка, а не правило: сервер требует только длину. Учитываем длину и разнообразие знаков.
    const strength = (s) => {
      if (!s) return 0;
      const kinds = [/[a-zа-яё]/, /[A-ZА-ЯЁ]/, /\d/, /[^\p{L}\d]/u].filter((r) => r.test(s)).length;
      return Math.min(4, (s.length >= 8 ? 1 : 0) + (s.length >= 12 ? 1 : 0) + (kinds >= 2 ? 1 : 0) + (kinds >= 3 ? 1 : 0));
    };
    const LEVEL = ["", "Слабый", "Средний", "Хороший", "Надёжный"];
    const check = () => {
      const size = bytes(nw.value);
      const len = size >= 8 && size <= 128; const diff = nw.value.length > 0 && nw.value !== cur.value; const same = rep.value.length > 0 && rep.value === nw.value;
      $("[data-rule=len]").classList.toggle("is-ok", len); $("[data-rule=diff]").classList.toggle("is-ok", diff); $("[data-rule=same]").classList.toggle("is-ok", same);
      $("[data-rule=len]").classList.toggle("is-bad", size > 128);
      const lvl = len ? strength(nw.value) : nw.value ? 1 : 0;
      $$("b", meter).forEach((b, i) => b.classList.toggle("is-on", i < lvl)); meter.dataset.level = lvl;
      $("[data-meter-text]").textContent = nw.value ? `${LEVEL[lvl] || LEVEL[1]}${size > 128 ? " · слишком длинный" : ""}` : "";
      rep.closest(".pf-field").classList.toggle("is-bad", rep.value.length > 0 && rep.value.length >= nw.value.length && !same);
      submit.disabled = !(cur.value && len && diff && same);
    };
    [cur, nw, rep].forEach((i) => i.addEventListener("input", () => { if (i === cur) fieldError("current", ""); if (i === nw) fieldError("new", ""); check(); }));
    // Caps Lock: предупреждаем, пока фокус в поле пароля.
    const caps = $("[data-caps]");
    [cur, nw, rep].forEach((i) => {
      ["keydown", "keyup"].forEach((ev) => i.addEventListener(ev, (e) => { if (e.getModifierState) caps.hidden = !e.getModifierState("CapsLock"); }));
      i.addEventListener("blur", () => { caps.hidden = true; });
    });
    $$("[data-eye]", form).forEach((b) => b.addEventListener("click", () => {
      const input = $("input", b.closest(".pf-field")); const show = input.type === "password"; input.type = show ? "text" : "password";
      b.setAttribute("aria-pressed", String(show)); b.setAttribute("aria-label", show ? "Скрыть пароль" : "Показать пароль");
      b.innerHTML = `<i data-lucide="${show ? "eye-off" : "eye"}"></i>`; icons(b);
    }));
    form.addEventListener("submit", async (e) => {
      e.preventDefault(); if (submit.disabled) return; submit.disabled = true; submit.classList.add("is-busy"); $("span", submit).textContent = "Меняю…";
      try {
        await api.changePassword({ current_password: cur.value, new_password: nw.value });
        // В рабочем проекте здесь же сохраняется новая пара токенов из ответа (storage.setToken).
        form.reset(); $$("[data-eye]", form).forEach((b) => { if (b.getAttribute("aria-pressed") === "true") b.click(); });
        toast("Пароль изменён", "Вы остались в аккаунте на этом устройстве, на остальных нужно войти заново");
      } catch (err) {
        if (err.detail === "Incorrect current password") { fieldError("current", "Текущий пароль указан неверно"); cur.focus(); cur.select(); }
        else if (err.detail === "New password must differ from current") { fieldError("new", "Новый пароль совпадает с текущим"); nw.focus(); }
        else if (err.status === 422) { fieldError("new", "Пароль — от 8 до 128 байт: латиница занимает один, кириллица — два"); nw.focus(); }
        else if (err.status === 401) toast("Сеанс закончился", "Войдите заново и повторите смену пароля", "danger");
        else toast("Не получилось", "Сервер не ответил, повторите попытку", "danger");
      }
      submit.classList.remove("is-busy"); $("span", submit).textContent = "Изменить пароль"; check();
    });
    check();
  }

  /* ---------- Диалог подтверждения ---------- */
  function confirmDialog({ title, text, ok, danger = true, onOk }) {
    const d = $("#confirm-dialog"); $("#confirm-title").textContent = title; $("[data-confirm-text]").textContent = text;
    const btn = $("[data-confirm-ok]"); $("span", btn).textContent = ok || "";
    btn.hidden = !onOk; btn.classList.toggle("st-danger", danger);
    $("footer [data-confirm-close] span", d).textContent = onOk ? "Отмена" : "Понятно";
    btn.onclick = async () => {
      btn.disabled = true; btn.classList.add("is-busy");
      try { await onOk(); d.close(); } catch (_) { toast("Не получилось", "Сервер не ответил, повторите попытку", "danger"); }
      finally { btn.disabled = false; btn.classList.remove("is-busy"); }
    };
    d.showModal(); $("footer [data-confirm-close]", d).focus();
  }
  function initDialogs() {
    const d = $("#confirm-dialog");
    $$("[data-confirm-close]", d).forEach((b) => b.addEventListener("click", () => d.close()));
    d.addEventListener("click", (e) => { if (e.target === d) d.close(); });
    $("[data-logout-all]").addEventListener("click", () => confirmDialog({
      title: "Выйти на всех устройствах?", text: "Все сеансы завершатся, включая этот. Чтобы продолжить, нужно будет войти заново.", ok: "Выйти везде",
      onOk: async () => { await api.logoutAll(); location.href = "./auth.html#login"; },
    }));
    $("[data-delete]").addEventListener("click", () => confirmDialog({
      title: "Удаление аккаунта", danger: false, onOk: null,
      text: "Самостоятельного удаления в бэкенде нет. Напишите в поддержку с почты аккаунта — удалим вместе с закладками, историей и коллекциями.",
    }));
  }

  /* ---------- Аккаунт ---------- */
  let cooldown = 0; let timer = 0;
  function paintAccount() {
    const since = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(window.KitsuContent?.parseDateAsUtc(saved.created_at) || new Date(saved.created_at)); // наивный UTC из API
    $("[data-facts]").innerHTML = [["Имя пользователя", saved.username], ["Почта", saved.email], ["Роль", saved.role?.name || "—"], ["Дата регистрации", since]]
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("");
    paintVerify();
  }
  function paintVerify() {
    const box = $("[data-verify]");
    if (saved.is_verified) { box.innerHTML = '<p class="st-ok"><i data-lucide="mail-check"></i>Почта подтверждена</p><p class="st-note">Подтверждение пока ни для чего не обязательно: все функции сайта доступны и без него.</p>'; icons(box); return; }
    const sendLabel = cooldown ? `Ещё раз через ${cooldown} с` : "Отправить письмо";
    if (!$("[data-send]", box)) {
      box.innerHTML = `<p class="st-note">Почта <b>${esc(saved.email)}</b> не подтверждена. Письмо со ссылкой действует 24 часа, отправить его можно не чаще трёх раз в час.</p>
        <div class="st-actions"><button class="button button--primary" type="button" data-send><i data-lucide="mail"></i><span></span></button></div>`;
      icons(box);
      $("[data-send]", box).addEventListener("click", async () => {
        const b = $("[data-send]", box); b.disabled = true; $("span", b).textContent = "Отправляю…";
        try {
          await api.sendVerification(); toast("Письмо отправлено", `Проверьте ${saved.email}, и папку «Спам» тоже`);
          cooldown = 60; clearInterval(timer); timer = setInterval(() => { cooldown -= 1; if (cooldown <= 0) clearInterval(timer); paintVerify(); }, 1000);
        } catch (err) {
          toast("Письмо не отправлено", err.status === 429 ? "Слишком часто: попробуйте через час" : "Сервер не ответил, повторите позже", "danger");
        }
        paintVerify();
      });
    }
    // Кнопку не перерисовываем каждую секунду — иначе с неё слетал бы фокус.
    const b = $("[data-send]", box); b.disabled = cooldown > 0; $("span", b).textContent = sendLabel;
  }

  /* ---------- Разделы ---------- */
  const TABS = ["profile", "password", "account"];
  let paintLook = () => {};
  function showTab(name, push = true) {
    if (!TABS.includes(name)) name = "profile";
    $$("[data-panel]").forEach((p) => { const on = p.dataset.panel === name; const was = !p.hidden; p.hidden = !on; if (on && !was) { p.classList.remove("is-entering"); void p.offsetWidth; p.classList.add("is-entering"); } });
    const tabs = $("[data-own-tabs]"); const bar = $(".st-tabs__bar", tabs);
    $$("[data-tab]", tabs).forEach((t) => { const on = t.dataset.tab === name; t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; if (on) { bar.style.width = `${t.offsetWidth}px`; bar.style.height = `${t.offsetHeight}px`; bar.style.transform = `translate(${t.offsetLeft}px, ${t.offsetTop}px)`; } });
    if (push && location.hash !== `#${name}`) history.replaceState(null, "", `#${name}`);
    if (name === "profile") { paintSeg($("[data-gender]"), draft.gender); paintLook(); }
  }
  function initTabs() {
    const tabs = $("[data-own-tabs]");
    tabs.addEventListener("click", (e) => { const t = e.target.closest("[data-tab]"); if (t) showTab(t.dataset.tab); });
    // Стрелки, Home и End по вкладкам обрабатывает общий initRovingTabs() в app.js: он фокусирует и нажимает вкладку.
    addEventListener("hashchange", () => showTab(location.hash.slice(1), false));
    const again = () => showTab($("[aria-selected=true]", tabs)?.dataset.tab || "profile", false);
    addEventListener("resize", again); document.fonts?.ready.then(again);
  }

  /* ---------- Вход и сбой загрузки ---------- */
  function gate(kind) {
    const box = $("[data-gate]"); $("[data-layout]").hidden = true; box.hidden = false;
    box.innerHTML = kind === "guest"
      ? `<i data-lucide="lock"></i><strong>Настройки доступны после входа</strong><span>Войдите в аккаунт, чтобы поменять аватар, обложку, пароль и почту.</span>
         <div class="st-actions"><a class="button button--primary" href="./auth.html#login"><i data-lucide="log-in"></i><span>Войти</span></a><a class="button button--secondary" href="./auth.html#register"><i data-lucide="user-plus"></i><span>Регистрация</span></a></div>`
      : `<i data-lucide="wifi-off"></i><strong>Не получилось загрузить настройки</strong><span>Сервер не ответил. Проверьте соединение и повторите.</span>
         <div class="st-actions"><button class="button button--secondary" type="button" data-retry><i data-lucide="refresh-cw"></i><span>Повторить</span></button></div>`;
    if (kind === "guest") $$(".header-account").forEach((a) => { a.outerHTML = '<a class="header-login" href="./auth.html#login">Войти</a>'; });
    icons(box);
    $("[data-retry]", box)?.addEventListener("click", () => { box.innerHTML = '<span class="st-note">Загружаю…</span>'; load(); });
  }

  let started = false;
  async function load() {
    try { saved = await api.me(); }
    catch (err) { gate(err.status === 401 ? "guest" : "error"); return; }
    $("[data-gate]").hidden = true; $("[data-layout]").hidden = false; $("#settings-main").removeAttribute("aria-busy");
    draft = fromMe(saved); baseline = snapshot();
    if (!started) { started = true; initTabs(); initFiles(); initPickers(); initForm(); initPassword(); initDialogs(); paintLook = initLook(); }
    fillForm(); paintAccount(); refresh(); showTab(location.hash.slice(1) || "profile", false);
  }

  document.addEventListener("visibilitychange", () => document.body.classList.toggle("is-hidden-tab", document.hidden));
  icons(document);
  load();
})();
