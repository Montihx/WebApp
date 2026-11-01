/* Экраны входа: переключение по хэшу и проверка полей по правилам бэкенда
   (backend-go/internal/handlers/auth.go). Запросов нет: ответы сервера изображены
   на демо-значениях, у каждой формы в auth.html записан её запрос. */
(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const VIEWS = ["login", "register", "forgot", "reset", "verify", "sent-verify", "sent-reset", "reset-done"];
  const params = new URLSearchParams(location.search);
  const expired = params.get("expired") === "1";
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  let loginAttempts = [];
  let shown = null;
  // Ленты постеров и огни не крутятся на свёрнутой вкладке.
  document.addEventListener("visibilitychange", () => document.body.classList.toggle("is-hidden-tab", document.hidden));

  window.lucide?.createIcons({ attrs: { "aria-hidden": "true", "stroke-width": 1.8 } });

  function show(view) {
    if (!VIEWS.includes(view)) view = "login";
    $$("[data-view]").forEach((node) => { node.hidden = node.dataset.view !== view; });
    const tabbed = view === "login" || view === "register";
    $("[data-auth-tabs]").hidden = !tabbed;
    $$("[data-auth-tab]").forEach((tab) => {
      const active = tab.dataset.authTab === view;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    const entering = $(`[data-view="${view}"]`);
    if (entering) { entering.classList.remove("is-entering"); void entering.offsetWidth; entering.classList.add("is-entering"); }
    shown = view;
    document.title = `${{ login: "Вход", register: "Регистрация", forgot: "Восстановление пароля", reset: "Новый пароль", verify: "Подтверждение почты" }[view] || "Аккаунт"} — Kitsu · Кицунэ`;
    if (view === "verify") paintVerify();
    const first = $(`[data-view="${view}"] input`);
    if (first && document.activeElement !== first && matchMedia("(pointer: fine)").matches) first.focus({ preventScroll: true });
  }

  // GET /auth/verify-email: 400 «Invalid or expired verification token» после 24 часов.
  function paintVerify() {
    if (!expired) return;
    const mark = $("[data-verify-mark]");
    mark.innerHTML = '<i data-lucide="hourglass"></i>';
    window.lucide?.createIcons({ attrs: { "aria-hidden": "true", "stroke-width": 1.6 }, root: mark });
    $("[data-verify-title]").textContent = "Ссылка устарела";
    $("[data-verify-text]").textContent = "Ссылка для подтверждения действует 24 часа. Войдите и отправьте письмо ещё раз из настроек профиля.";
    const action = $("[data-verify-action]");
    action.textContent = "Войти";
    action.href = "#login";
  }

  // Зелёная галочка у почты и имени, когда значение уже подходит под правила.
  const RULES = { email: (v) => EMAIL.test(v), username: (v) => v.trim().length >= 3 && v.trim().length <= 50 };
  function tick(input) {
    const rule = RULES[input.name];
    if (rule) input.closest(".auth-field")?.classList.toggle("is-valid", rule(input.value));
    if (input.name === "password") meter(input);
  }
  // Восемь делений: по одному на символ до минимальной длины пароля, дальше — зелёное.
  $$("[data-meter]").forEach((node) => { node.innerHTML = "<b></b>".repeat(8); });
  function meter(input) {
    const node = $("[data-meter]", input.closest(".auth-field"));
    if (!node) return;
    const n = Math.min(input.value.length, 8);
    $$("b", node).forEach((cell, index) => cell.classList.toggle("is-on", index < n));
    node.classList.toggle("is-full", input.value.length >= 8);
  }

  const fail = (form, message, field) => {
    const error = $("[data-error]", form);
    error.textContent = message;
    error.hidden = false;
    $$("input", form).forEach((input) => input.removeAttribute("aria-invalid"));
    if (field) { const input = $(`[name="${field}"]`, form); input?.setAttribute("aria-invalid", "true"); input?.focus(); }
    return false;
  };
  const clear = (form) => { $("[data-error]", form).hidden = true; $$("input", form).forEach((input) => input.removeAttribute("aria-invalid")); };
  const busy = (form, on) => {
    const submit = $(".auth-submit", form);
    submit.disabled = on;
    submit.classList.toggle("is-busy", on);
  };
  const sent = (view, email) => { $$(`[data-view="${view}"] [data-sent-email]`).forEach((node) => { node.textContent = email; }); location.hash = view; };

  const handlers = {
    login(form, data) {
      if (!EMAIL.test(data.email)) return fail(form, "Введите почту полностью, например name@mail.ru.", "email");
      if (!data.password) return fail(form, "Введите пароль.", "password");
      const now = Date.now();
      loginAttempts = loginAttempts.filter((time) => now - time < 60000).concat(now);
      if (loginAttempts.length > 5) return fail(form, "Слишком много попыток. Подождите минуту и попробуйте снова.");
      if (data.email.toLowerCase() === "banned@kitsu.local") return fail(form, "Этот аккаунт отключён. Напишите администрации, если считаете это ошибкой.");
      if (data.password === "wrong") return fail(form, "Неверная почта или пароль.", "password");
      $(".auth-card").classList.add("is-leaving");
      setTimeout(() => { location.href = "./index.html"; }, 420);
      return true;
    },
    register(form, data) {
      const name = data.username.trim();
      if (name.length < 3 || name.length > 50) return fail(form, "Имя пользователя — от 3 до 50 символов.", "username");
      if (!EMAIL.test(data.email)) return fail(form, "Введите почту полностью, например name@mail.ru.", "email");
      if (data.password.length < 8) return fail(form, "Пароль — не меньше 8 символов.", "password");
      if (data.password.length > 128) return fail(form, "Пароль — не больше 128 символов.", "password");
      if (name.toLowerCase() === "admin") return fail(form, "Это имя уже занято.", "username");
      if (data.email.toLowerCase() === "taken@kitsu.local") return fail(form, "На эту почту уже есть аккаунт. Войдите или восстановите пароль.", "email");
      sent("sent-verify", data.email);
      return true;
    },
    forgot(form, data) {
      if (!EMAIL.test(data.email)) return fail(form, "Введите почту полностью, например name@mail.ru.", "email");
      sent("sent-reset", data.email);
      return true;
    },
    reset(form, data) {
      if (expired) return fail(form, "Ссылка устарела: она действует 1 час и только один раз. Запросите новую на экране «Забыли пароль».");
      if (data.password.length < 8) return fail(form, "Пароль — не меньше 8 символов.", "password");
      if (data.password !== data.repeat) return fail(form, "Пароли не совпадают.", "repeat");
      location.hash = "reset-done";
      return true;
    },
  };

  $$("form[data-view]").forEach((form) => {
    form.addEventListener("input", (event) => { clear(form); tick(event.target); });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      busy(form, true);
      // Пауза изображает ответ сервера, чтобы было видно состояние кнопки.
      setTimeout(() => { busy(form, false); handlers[form.dataset.view](form, data); }, 450);
    });
  });

  $$("[data-toggle-password]").forEach((button) => button.addEventListener("click", () => {
    const input = button.closest(".auth-field__box").querySelector("input");
    const visible = input.type === "password";
    input.type = visible ? "text" : "password";
    button.setAttribute("aria-pressed", String(visible));
    button.setAttribute("aria-label", visible ? "Скрыть пароль" : "Показать пароль");
    button.innerHTML = `<i data-lucide="${visible ? "eye-off" : "eye"}"></i>`;
    window.lucide?.createIcons({ attrs: { "aria-hidden": "true", "stroke-width": 1.8 }, root: button });
  }));

  // Свет под курсором: подсветка карточки идёт за мышью (только с указателем-мышью).
  const card = $(".auth-card"), glow = $(".auth-card__glow");
  if (matchMedia("(hover: hover) and (pointer: fine)").matches && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    let frame = 0, x = 0, y = 0;
    card.addEventListener("pointermove", (event) => {
      const box = card.getBoundingClientRect();
      x = event.clientX - box.left; y = event.clientY - box.top;
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0;
        glow.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        // Портрет едет навстречу курсору: от -1 до 1 по каждой оси.
        card.style.setProperty("--mx", ((x / box.width) * 2 - 1).toFixed(3));
        card.style.setProperty("--my", ((y / box.height) * 2 - 1).toFixed(3));
      });
    });
  }

  // Подсказка к паролю меняется по мере ввода: сколько ещё символов нужно.
  const hint = $("[data-password-hint]");
  $('[data-view="register"] [name="password"]')?.addEventListener("input", (event) => {
    const n = event.target.value.length;
    hint.textContent = n === 0 ? "Не меньше 8 символов." : n < 8 ? `Ещё ${8 - n} — и хватит.` : "Длины достаточно.";
    hint.classList.toggle("is-ok", n >= 8);
  });

  let resends = 0;
  $("[data-resend]")?.addEventListener("click", () => {
    resends += 1;
    $("[data-resend-note]").textContent = resends > 3 ? "Лимит — 3 письма в час. Попробуйте позже." : "Письмо отправлено ещё раз.";
  });

  addEventListener("hashchange", () => show(location.hash.slice(1)));
  show(location.hash.slice(1));
})();
