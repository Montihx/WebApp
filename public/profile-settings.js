/* Настройки профиля. Вместо сервера — `api` на демо-значениях; у каждого метода записан настоящий запрос.
   Сохранённое лежит в localStorage ("kitsu-demo-profile") и подхватывается на profile.html. */
(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const STATE = new URLSearchParams(location.search).get("state");
  const KEY = "kitsu-demo-profile";
  const icons = (root) => window.lucide?.createIcons({ attrs: { "aria-hidden": "true", "stroke-width": 1.8 }, root });
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // Ограничения сервера: backend-go/internal/handlers/uploads.go и users_me.go.
  const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const LIMITS = { avatar: 5 * 1024 * 1024, cover: 15 * 1024 * 1024 };
  const LIMIT_TEXT = { avatar: "5 МБ", cover: "15 МБ" };
  const BIO_MAX = 500; // сервер принимает до 5000, рабочий проект держит 500

  /* ---------- Демо-данные ---------- */
  const BASE = {
    username: "kitsune_noa", email: "noa@example.com", created_at: "2026-03-12T09:20:00", is_verified: STATE !== "unverified", role: { name: "Зритель" },
    bio: "Смотрю по вечерам, пишу заметки к каждому сезону. Люблю спокойные истории про дорогу и тихих героев.",
    gender: "", avatar_url: null, cover_url: null, active_avatar: null, decoration: null,
    preferences: { vk: "", telegram: "", discord: "", two_factor_enabled: false, unsubscribe_all_publications: false },
  };
  // GET /avatar-collection/?category — image_url у каждого; в демо вместо картинок буквы на цветных плитках.
  const AVATARS = [
    { id: "av1", title: "Кицунэ", category: "Лисы", tone: 0 }, { id: "av2", title: "Лис-самурай", category: "Лисы", tone: 1 }, { id: "av3", title: "Огонёк", category: "Лисы", tone: 3 },
    { id: "av4", title: "Тихий вечер", category: "Минимализм", tone: 2 }, { id: "av5", title: "Луна", category: "Минимализм", tone: 1 }, { id: "av6", title: "Сакура", category: "Минимализм", tone: 3 },
  ];
  // GET /decorations/ — рамки; decoration_id 0 снимает рамку.
  const FRAMES = [{ id: 1, title: "Лаванда", frame: 1 }, { id: 2, title: "Сакура", frame: 2 }, { id: 3, title: "Золото", frame: 3 }];

  const store = {
    read() { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (_) { return {}; } },
    write(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (_) { /* приватный режим: сохранение живёт до перезагрузки */ } },
  };
  const clone = (o) => JSON.parse(JSON.stringify(o));

  const api = {
    // GET /users/me
    async me() { await sleep(180); const s = store.read(); return { ...clone(BASE), ...s, preferences: { ...BASE.preferences, ...(s.preferences || {}) } }; },
    // POST /users/me/avatar (multipart file) → {avatar_url}
    async uploadAvatar(file) { await sleep(450); return { avatar_url: await shrink(file, 256) }; },
    // POST /users/me/cover (multipart file) → {cover_url}
    async uploadCover(file) { await sleep(500); return { cover_url: await shrink(file, 1400) }; },
    // PUT /users/me {bio, gender, avatar_url, cover_url, active_avatar_id, decoration_id, preferences}
    async updateMe(body) { await sleep(450); store.write(body); return body; },
    // POST /auth/change-password {current_password, new_password} → 200 с новой парой токенов; 400 «Incorrect current password»
    async changePassword(body) { await sleep(600); if (body.current_password === "wrong-password") { const e = new Error("Incorrect current password"); e.status = 400; throw e; } return { ok: true }; },
    // POST /auth/logout-all → токены всех устройств перестают работать (10 в час)
    async logoutAll() { await sleep(500); return { ok: true }; },
    // POST /auth/send-verification (3 в час); 400 «Email already verified»
    async sendVerification() { await sleep(600); return { ok: true }; },
  };

  // Картинка уменьшается перед записью в демо-хранилище; на сервер уйдёт сам файл.
  function shrink(file, max) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file); const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); resolve(c.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("bad image")); };
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
  let saved = null;      // что на сервере
  let draft = null;      // что в форме
  const files = { avatar: null, cover: null }; const previews = { avatar: null, cover: null };
  let busy = false;

  const snapshot = () => JSON.stringify([draft.bio, draft.gender, draft.removeAvatar, draft.removeCover, draft.active_avatar?.id || null, draft.decoration?.id || 0, draft.preferences, !!files.avatar, !!files.cover]);
  let baseline = "";
  const isDirty = () => snapshot() !== baseline;

  function fromMe(me) {
    return { bio: me.bio || "", gender: me.gender || "", removeAvatar: false, removeCover: false, active_avatar: me.active_avatar, decoration: me.decoration, preferences: clone(me.preferences) };
  }

  /* ---------- Превью ---------- */
  function paintPreview() {
    const me = saved; const av = $("[data-pv-avatar]");
    const url = files.avatar ? previews.avatar : draft.removeAvatar ? null : me.avatar_url;
    const letter = (draft.active_avatar?.title || me.username).charAt(0).toUpperCase();
    av.innerHTML = url ? `<img src="${esc(url)}" alt="" />` : `<span>${esc(letter)}</span>`;
    if (url || !draft.active_avatar) delete av.dataset.tone; else av.dataset.tone = draft.active_avatar.tone;
    if (draft.decoration) av.dataset.frame = draft.decoration.frame; else delete av.dataset.frame;
    const cover = files.cover ? previews.cover : draft.removeCover ? null : me.cover_url;
    $("[data-pv-cover]").style.backgroundImage = cover ? `url("${cover}")` : "";
    $("[data-pv-cover]").classList.toggle("has-image", Boolean(cover));
    const shot = $("[data-cover-shot]"); shot.style.backgroundImage = cover ? `url("${cover}")` : ""; shot.classList.toggle("has-image", Boolean(cover));
    $("[data-pv-name]").textContent = me.username;
    $("[data-pv-meta]").textContent = [me.role?.name, draft.gender ? { male: "мужской", female: "женский", other: "другой" }[draft.gender] : ""].filter(Boolean).join(" · ");
    $("[data-clear=avatar]").hidden = !files.avatar; $("[data-clear=cover]").hidden = !files.cover;
    $("[data-remove-cover]").hidden = !(me.cover_url || files.cover) || draft.removeCover || Boolean(files.cover);
    $("[data-remove-avatar]").checked = draft.removeAvatar;
  }

  function paintDirty() {
    const dirty = isDirty();
    $("[data-save]").disabled = !dirty || busy; $("[data-reset]").disabled = !dirty || busy;
    $("[data-save-text]").textContent = busy ? "Сохраняю…" : dirty ? "Есть несохранённые изменения" : "Нет изменений";
    $("[data-save-bar]").classList.toggle("is-dirty", dirty);
  }
  const refresh = () => { paintPreview(); paintDirty(); };

  /* ---------- Файлы ---------- */
  function setFile(kind, file) {
    const err = $(`[data-error=${kind}]`); err.textContent = "";
    if (!file) return;
    if (!TYPES.includes(file.type)) { err.textContent = "Подходят только JPG, PNG, WebP и GIF"; return; }
    // Тексты ошибок сервера: «File too large — maximum 5 MB» (аватар), 15 МБ (обложка).
    if (file.size > LIMITS[kind]) { err.textContent = `Файл слишком большой — не больше ${LIMIT_TEXT[kind]}`; return; }
    if (previews[kind]) URL.revokeObjectURL(previews[kind]);
    files[kind] = file; previews[kind] = URL.createObjectURL(file);
    if (kind === "avatar") { draft.removeAvatar = false; draft.active_avatar = null; paintAvatarPicker(); }
    if (kind === "cover") draft.removeCover = false;
    $(`[data-drop-hint=${kind}]`).textContent = `${file.name} · ${(file.size / 1024).toFixed(0)} КБ`;
    refresh();
  }
  function clearFile(kind) {
    if (previews[kind]) URL.revokeObjectURL(previews[kind]);
    files[kind] = null; previews[kind] = null; $(`[data-error=${kind}]`).textContent = "";
    $(`[data-drop-hint=${kind}]`).textContent = kind === "avatar" ? "Перетащите файл сюда или нажмите. JPG, PNG, WebP, GIF — до 5 МБ" : "Перетащите файл или нажмите. До 15 МБ";
    $(`[data-file=${kind}]`).value = ""; refresh();
  }
  function initFiles() {
    $$("[data-file]").forEach((input) => input.addEventListener("change", () => setFile(input.dataset.file, input.files[0])));
    $$("[data-clear]").forEach((b) => b.addEventListener("click", () => clearFile(b.dataset.clear)));
    $$("[data-drop]").forEach((zone) => {
      const kind = zone.dataset.drop;
      ["dragenter", "dragover"].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add("is-over"); }));
      ["dragleave", "drop"].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.remove("is-over"); }));
      zone.addEventListener("drop", (e) => setFile(kind, e.dataTransfer?.files?.[0]));
    });
    $("[data-remove-avatar]").addEventListener("change", (e) => { draft.removeAvatar = e.target.checked; if (draft.removeAvatar) { clearFile("avatar"); draft.active_avatar = null; paintAvatarPicker(); } refresh(); });
    $("[data-remove-cover]").addEventListener("click", () => { draft.removeCover = true; clearFile("cover"); refresh(); });
  }

  /* ---------- Коллекция аватаров и рамки ---------- */
  let cat = "";
  function paintAvatarPicker() {
    const cats = [...new Set(AVATARS.map((a) => a.category))];
    $("[data-avatar-cats]").innerHTML = ["", ...cats].map((c) => `<button type="button" class="st-chip" aria-pressed="${c === cat}" data-cat="${esc(c)}">${c || "Все"}</button>`).join("");
    const list = AVATARS.filter((a) => !cat || a.category === cat); const cur = draft.active_avatar?.id;
    $("[data-avatars]").innerHTML = list.map((a) => `<button type="button" role="radio" class="st-pick" aria-checked="${a.id === cur}" data-avatar="${a.id}" aria-label="${esc(a.title)}"><span class="st-pick__art pf-art" data-tone="${a.tone}">${esc(a.title.charAt(0))}</span><span>${esc(a.title)}</span></button>`).join("");
    $("[data-frames]").innerHTML = [{ id: 0, title: "Без рамки", frame: null }, ...FRAMES].map((f) => `<button type="button" role="radio" class="st-pick st-pick--frame" aria-checked="${(draft.decoration?.id || 0) === f.id}" data-frame="${f.id}" aria-label="${esc(f.title)}"><span class="st-pick__art st-pick__ring" ${f.frame ? `data-frame="${f.frame}"` : ""}>${f.frame ? "" : '<i data-lucide="minus"></i>'}</span><span>${esc(f.title)}</span></button>`).join("");
    icons($("[data-frames]"));
  }
  function initPickers() {
    $("[data-avatar-cats]").addEventListener("click", (e) => { const b = e.target.closest("[data-cat]"); if (b) { cat = b.dataset.cat; paintAvatarPicker(); } });
    $("[data-avatars]").addEventListener("click", (e) => {
      const b = e.target.closest("[data-avatar]"); if (!b) return;
      const a = AVATARS.find((x) => x.id === b.dataset.avatar);
      draft.active_avatar = draft.active_avatar?.id === a.id ? null : { id: a.id, title: a.title, tone: a.tone };
      if (draft.active_avatar) { clearFile("avatar"); draft.removeAvatar = false; }
      paintAvatarPicker(); refresh();
    });
    $("[data-frames]").addEventListener("click", (e) => {
      const b = e.target.closest("[data-frame]"); if (!b) return; const id = Number(b.dataset.frame);
      draft.decoration = id ? { id, title: FRAMES.find((f) => f.id === id).title, frame: FRAMES.find((f) => f.id === id).frame } : null;
      paintAvatarPicker(); refresh();
    });
    // Стрелки перемещают выбор внутри группы radio.
    $$("[role=radiogroup]").forEach((g) => g.addEventListener("keydown", (e) => {
      const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!k) return;
      const items = $$("[role=radio]", g); const i = items.indexOf(document.activeElement); if (i < 0) return;
      e.preventDefault(); const next = items[(i + k + items.length) % items.length]; next.focus(); next.click();
    }));
  }

  /* ---------- Поля профиля ---------- */
  function fillForm() {
    const f = $("[data-profile-form]");
    $("#bio").value = draft.bio; $("[data-bio-count]").textContent = `${draft.bio.length} / ${BIO_MAX}`;
    ["vk", "telegram", "discord"].forEach((k) => { f.elements[k].value = draft.preferences[k] || ""; });
    f.elements.two_factor_enabled.checked = Boolean(draft.preferences.two_factor_enabled);
    f.elements.unsubscribe_all_publications.checked = Boolean(draft.preferences.unsubscribe_all_publications);
    paintGender(); paintAvatarPicker();
  }
  function paintGender() {
    const seg = $("[data-gender]"); const thumb = $(".pf-seg__thumb", seg);
    $$("[data-gender-value]", seg).forEach((b) => b.setAttribute("aria-checked", String(b.dataset.genderValue === draft.gender)));
    const on = $("[aria-checked=true]", seg); if (on) { thumb.style.width = `${on.offsetWidth}px`; thumb.style.transform = `translateX(${on.offsetLeft}px)`; }
  }
  function initForm() {
    const f = $("[data-profile-form]");
    $("#bio").addEventListener("input", (e) => { draft.bio = e.target.value; $("[data-bio-count]").textContent = `${draft.bio.length} / ${BIO_MAX}`; refresh(); });
    $("[data-gender]").addEventListener("click", (e) => { const b = e.target.closest("[data-gender-value]"); if (b) { draft.gender = b.dataset.genderValue; paintGender(); refresh(); } });
    ["vk", "telegram", "discord"].forEach((k) => f.elements[k].addEventListener("input", (e) => { draft.preferences[k] = e.target.value.trim(); refresh(); }));
    ["two_factor_enabled", "unsubscribe_all_publications"].forEach((k) => f.elements[k].addEventListener("change", (e) => { draft.preferences[k] = e.target.checked; refresh(); }));
    $("[data-reset]").addEventListener("click", () => { reset(); toast("Изменения сброшены", "Форма вернулась к сохранённым значениям", "success"); });
    f.addEventListener("submit", async (e) => {
      e.preventDefault(); if (busy || !isDirty()) return; busy = true; paintDirty();
      const label = $("[data-save-text]");
      try {
        let avatar_url = draft.removeAvatar ? null : saved.avatar_url; let cover_url = draft.removeCover ? null : saved.cover_url;
        if (files.avatar) { label.textContent = "Загружаю аватар…"; avatar_url = (await api.uploadAvatar(files.avatar)).avatar_url; }
        if (files.cover) { label.textContent = "Загружаю обложку…"; cover_url = (await api.uploadCover(files.cover)).cover_url; }
        label.textContent = "Сохраняю профиль…";
        const body = { bio: draft.bio, gender: draft.gender, avatar_url, cover_url, active_avatar: draft.active_avatar, decoration: draft.decoration, preferences: draft.preferences };
        await api.updateMe(body);
        saved = { ...saved, ...body }; ["avatar", "cover"].forEach((k) => clearFile(k));
        draft = fromMe(saved); baseline = snapshot(); fillForm(); busy = false; refresh();
        toast("Профиль обновлён", "Изменения видны на странице профиля");
      } catch (_) { busy = false; refresh(); toast("Не получилось сохранить", "Сервер не ответил или файл не подошёл. Повторите попытку", "danger"); }
    });
    addEventListener("beforeunload", (e) => { if (isDirty()) { e.preventDefault(); e.returnValue = ""; } });
  }
  function reset() { ["avatar", "cover"].forEach((k) => clearFile(k)); draft = fromMe(saved); fillForm(); refresh(); }

  /* ---------- Пароль ---------- */
  function initPassword() {
    const form = $("[data-password-form]"); const cur = form.elements.current_password; const nw = form.elements.new_password; const rep = form.elements.repeat;
    const meter = $("[data-meter]"); meter.innerHTML = "<b></b>".repeat(8);
    const submit = $("[data-pw-submit]");
    const check = () => {
      const len = nw.value.length >= 8 && nw.value.length <= 128; const diff = nw.value.length > 0 && nw.value !== cur.value; const same = rep.value.length > 0 && rep.value === nw.value;
      $("[data-rule=len]").classList.toggle("is-ok", len); $("[data-rule=diff]").classList.toggle("is-ok", diff); $("[data-rule=same]").classList.toggle("is-ok", same);
      $$("b", meter).forEach((b, i) => b.classList.toggle("is-on", i < Math.min(nw.value.length, 8))); meter.classList.toggle("is-strong", nw.value.length >= 12);
      submit.disabled = !(cur.value && len && diff && same);
    };
    [cur, nw, rep].forEach((i) => i.addEventListener("input", () => { $("[data-error=current]").textContent = ""; cur.closest(".pf-field").classList.remove("is-bad"); check(); }));
    $$("[data-eye]", form).forEach((b) => b.addEventListener("click", () => {
      const input = $("input", b.closest(".pf-field")); const show = input.type === "password"; input.type = show ? "text" : "password";
      b.setAttribute("aria-pressed", String(show)); b.setAttribute("aria-label", show ? "Скрыть пароль" : "Показать пароль");
      b.innerHTML = `<i data-lucide="${show ? "eye-off" : "eye"}"></i>`; icons(b);
    }));
    form.addEventListener("submit", async (e) => {
      e.preventDefault(); if (submit.disabled) return; submit.disabled = true; submit.classList.add("is-busy"); $("span", submit).textContent = "Меняю…";
      try {
        await api.changePassword({ current_password: cur.value, new_password: nw.value });
        form.reset(); check(); toast("Пароль изменён", "Это устройство осталось в аккаунте, остальные придётся войти заново");
      } catch (err) {
        // 400 «Incorrect current password» — под полем текущего пароля.
        if (err.message === "Incorrect current password") { $("[data-error=current]").textContent = "Текущий пароль указан неверно"; cur.closest(".pf-field").classList.add("is-bad"); cur.focus(); }
        else toast("Не получилось", "Сервер не ответил, повторите попытку", "danger");
        submit.disabled = false;
      }
      submit.classList.remove("is-busy"); $("span", submit).textContent = "Изменить пароль";
    });
    check();
  }

  /* ---------- Диалог подтверждения ---------- */
  function confirmDialog({ title, text, ok, danger = true, onOk }) {
    const d = $("#confirm-dialog"); $("#confirm-title").textContent = title; $("[data-confirm-text]").textContent = text;
    const btn = $("[data-confirm-ok]"); $("span", btn).textContent = ok; btn.hidden = !onOk;
    btn.classList.toggle("st-danger", danger); btn.onclick = async () => { btn.disabled = true; try { await onOk(); } finally { btn.disabled = false; d.close(); } };
    d.showModal();
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
      title: "Удаление аккаунта", text: "Самостоятельного удаления нет. Напишите в поддержку с почты аккаунта — удалим вместе с закладками, историей и коллекциями.", ok: "Понятно", danger: false, onOk: null,
    }));
  }

  /* ---------- Аккаунт ---------- */
  let cooldown = 0; let timer = 0;
  function paintAccount() {
    const me = saved; const since = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(me.created_at));
    $("[data-facts]").innerHTML = [["Имя пользователя", me.username], ["Почта", me.email], ["Роль", me.role?.name || "—"], ["Дата регистрации", since]].map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("");
    paintVerify();
  }
  function paintVerify() {
    const box = $("[data-verify]");
    if (saved.is_verified) { box.innerHTML = '<p class="st-ok"><i data-lucide="mail-check"></i>Почта подтверждена</p><p class="st-note">Подтверждение пока ни для чего не обязательно: все функции сайта доступны и без него.</p>'; icons(box); return; }
    box.innerHTML = `<p class="st-note">Почта не подтверждена. Письмо со ссылкой действует 24 часа. Отправить можно не чаще трёх раз в час.</p>
      <div class="st-actions"><button class="button button--primary" type="button" data-send ${cooldown ? "disabled" : ""}><i data-lucide="mail"></i><span>${cooldown ? `Ещё раз через ${cooldown} с` : "Отправить письмо"}</span></button></div>`;
    icons(box);
    $("[data-send]", box).addEventListener("click", async () => {
      const b = $("[data-send]", box); b.disabled = true; $("span", b).textContent = "Отправляю…";
      try { await api.sendVerification(); toast("Письмо отправлено", `Проверьте ${saved.email}`); cooldown = 60; clearInterval(timer); timer = setInterval(() => { cooldown -= 1; if (cooldown <= 0) clearInterval(timer); paintVerify(); }, 1000); paintVerify(); }
      catch (_) { toast("Не получилось", "Письмо не отправлено, повторите позже", "danger"); b.disabled = false; $("span", b).textContent = "Отправить письмо"; }
    });
  }

  /* ---------- Разделы ---------- */
  const TABS = ["profile", "password", "account"];
  function showTab(name, push = true) {
    if (!TABS.includes(name)) name = "profile";
    $$("[data-panel]").forEach((p) => { const on = p.dataset.panel === name; p.hidden = !on; if (on) { p.classList.remove("is-entering"); void p.offsetWidth; p.classList.add("is-entering"); } });
    const tabs = $("[data-tabs]"); const bar = $(".st-tabs__bar", tabs);
    $$("[data-tab]", tabs).forEach((t) => { const on = t.dataset.tab === name; t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; if (on) { bar.style.width = `${t.offsetWidth}px`; bar.style.height = `${t.offsetHeight}px`; bar.style.transform = `translate(${t.offsetLeft}px, ${t.offsetTop}px)`; } });
    if (push && location.hash !== `#${name}`) history.replaceState(null, "", `#${name}`);
    if (name === "profile") paintGender();
  }
  function initTabs() {
    const tabs = $("[data-tabs]");
    tabs.addEventListener("click", (e) => { const t = e.target.closest("[data-tab]"); if (t) showTab(t.dataset.tab); });
    tabs.addEventListener("keydown", (e) => {
      const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!k) return;
      const i = TABS.indexOf($("[aria-selected=true]", tabs).dataset.tab); const next = TABS[(i + k + TABS.length) % TABS.length];
      showTab(next); $(`[data-tab=${next}]`, tabs).focus(); e.preventDefault();
    });
    addEventListener("hashchange", () => showTab(location.hash.slice(1), false));
    addEventListener("resize", () => showTab($("[aria-selected=true]", tabs).dataset.tab, false));
    document.fonts?.ready.then(() => showTab($("[aria-selected=true]", tabs).dataset.tab, false));
  }

  async function init() {
    document.addEventListener("visibilitychange", () => document.body.classList.toggle("is-hidden-tab", document.hidden));
    icons(document);
    saved = await api.me(); draft = fromMe(saved); baseline = snapshot();
    initTabs(); initFiles(); initPickers(); initForm(); initPassword(); initDialogs();
    fillForm(); paintAccount(); refresh(); showTab(location.hash.slice(1) || "profile", false);
  }
  init();
})();
