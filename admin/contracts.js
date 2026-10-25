/* Контракты админки: какие запросы стоят за кнопками, кто их может делать,
   и чистые помощники (время, cron, проверка форм). Ни один помощник не
   отправляет запросов. Сверено с kitsu-enterprise-site (backend-go) 25.10.2026. */
(() => {
  "use strict";

  const SU = "суперпользователь";
  const CE = "право content.edit";
  const CM = "право comments.moderate";

  /* key → [метод, путь, кто может, примечание]. Пути относительно /api/v1. */
  const endpoints = {
    "overview.stats": ["GET", "/dashboard/stats/overview", SU, "audience/catalog/assets: value и trend (рост к числу строк старше 30 дней); uptime — время жизни процесса api-go"],
    "overview.charts": ["GET", "/dashboard/stats/charts", SU, "7 дней, items_processed по парсерам; name — английское сокращение дня"],
    "overview.popular": ["GET", "/dashboard/stats/popular", SU, "5 тайтлов по views_count"],
    "overview.genres": ["GET", "/dashboard/stats/genres", SU, "8 жанров"],
    "checks.list": ["GET", "/dashboard/monitoring/checks", SU, "monitor, stack, summary, checks[] — порядок задаёт сервер"],
    "health.get": ["GET", "/monitoring/health", SU, "cache.status захардкожен как online — не измерение"],
    "kodik.stats": ["GET", "/dashboard/parsers/kodik/stats", SU, "покрытие каталога Kodik"],

    "anime.list": ["GET", "/dashboard/parsers/anime-list", SU, "search, kind, status, has_video, needs_moderation, skip, limit"],
    "anime.get": ["GET", "/anime/{slug}", "все", ""],
    "anime.create": ["POST", "/anime/", SU, "обязательны title и slug; запись в audit_logs"],
    "anime.update": ["PATCH", "/anime/{id}", SU, "только присланные поля; при постере и описании снимает needs_moderation"],
    "anime.delete": ["DELETE", "/anime/{id}", SU, "необратимо"],
    "anime.refresh": ["POST", "/dashboard/parsers/kodik/refresh/{slug}", SU, "перечитать тайтл из Kodik"],
    "anime.refreshPoster": ["POST", "/dashboard/parsers/kodik/refresh-poster/{slug}", SU, "постер из Shikimori"],
    "bulk.anime": ["POST", "/dashboard/bulk/anime", SU, "{ids, action: delete | update_status, new_status}; допустимые статусы anons, cancelled, hiatus, ongoing, released"],
    "bulk.episodes": ["POST", "/dashboard/bulk/episodes", SU, "{ids, action: delete}"],
    "import.search": ["GET", "/dashboard/parsers/kodik/search", SU, "q, page, limit; дубликаты по shikimori_id убраны, есть already_exists и has_video"],
    "import.single": ["POST", "/dashboard/parsers/kodik/import", SU, "{shikimori_id, kodik_id}; ответ: status created | updated | skipped, needs_review, missing_fields"],
    "episodes.list": ["GET", "/episodes/with-anime", "все", "только skip и limit: поиска по тайтлу на сервере нет"],
    "episodes.byAnime": ["GET", "/anime/{id}/episodes", "все", ""],
    "episodes.create": ["POST", "/episodes/", CE, "{anime_id, episode, season, title, thumbnail_url, aired_at, is_filler, is_recap}"],
    "episodes.update": ["PATCH", "/episodes/{id}", CE, "title, thumbnail_url, season, episode, aired_at, is_filler, is_recap"],
    "episodes.delete": ["DELETE", "/episodes/{id}", CE, ""],
    "releases.byEpisode": ["GET", "/episodes/{id}/releases", "все", ""],
    "releases.create": ["POST", "/releases/", CE, "{episode_id, source, url} обязательны"],
    "releases.update": ["PATCH", "/releases/{id}", CE, ""],
    "releases.delete": ["DELETE", "/releases/{id}", CE, ""],
    "collections.list": ["GET", "/interactions/collections/all", SU, "только чтение: правок коллекций из админки в API нет"],

    "moderation.list": ["GET", "/dashboard/parsers/moderation", SU, "anime.needs_moderation = true"],
    "moderation.approve": ["POST", "/dashboard/parsers/moderation/approve", SU, "{anime_ids}; одобряет только подходящие, остальные в skipped_ids; без записи в журнал"],
    "conflicts.list": ["GET", "/dashboard/parsers/conflicts", SU, "status: pending | auto_accepted | resolved"],
    "conflicts.resolve": ["POST", "/dashboard/parsers/conflicts/{id}/resolve", SU, "{strategy}; для shikimori_identity_mismatch любая стратегия только закрывает конфликт"],
    "comments.list": ["GET", "/interactions/comments/staff-queue", CM, "is_hidden, skip, limit"],
    "comments.delete": ["DELETE", "/interactions/comments/{id}", SU, "мягкое удаление: текст становится «[удалено]»; модератор чужое удалить не может"],

    "jobs.trigger": ["POST", "/dashboard/parsers/jobs/trigger", SU, "{parser_name, job_type}; сервер принимает любые значения"],
    "jobs.list": ["GET", "/dashboard/parsers/jobs", SU, "status, parser_name, skip, limit"],
    "jobs.get": ["GET", "/dashboard/parsers/jobs/{id}", SU, ""],
    "jobs.logs": ["GET", "/dashboard/parsers/jobs/{id}/logs", SU, ""],
    "jobs.live": ["WS", "/dashboard/parsers/ws/jobs/{id}", SU, "живой прогресс"],
    "jobs.stop": ["POST", "/dashboard/parsers/jobs/{id}/stop", SU, "только pending и running"],
    "jobs.delete": ["DELETE", "/dashboard/parsers/jobs/{id}", SU, ""],
    "jobs.clear": ["DELETE", "/dashboard/parsers/jobs", SU, "status: completed | failed | cancelled"],
    "logs.list": ["GET", "/dashboard/parsers/logs", SU, "level, job_id"],
    "schedule.list": ["GET", "/dashboard/parsers/scheduler/jobs", SU, ""],
    "schedule.create": ["POST", "/dashboard/parsers/scheduler/jobs", SU, "{parser_name, job_type, cron_expression, is_active}; первый запуск через час, cron не проверяется"],
    "schedule.update": ["PATCH", "/dashboard/parsers/scheduler/jobs/{id}", SU, "next_run_at при смене cron не пересчитывается"],
    "schedule.delete": ["DELETE", "/dashboard/parsers/scheduler/jobs/{id}", SU, ""],
    "schedule.runNow": ["POST", "/dashboard/parsers/scheduler/jobs/{id}/run-now", SU, "kodik всегда как инкремент"],
    "blacklist.list": ["GET", "/dashboard/parsers/blacklist", SU, ""],
    "blacklist.create": ["POST", "/dashboard/parsers/blacklist", SU, "{shikimori_id | kodik_id | slug}"],
    "blacklist.delete": ["DELETE", "/dashboard/parsers/blacklist/{id}", SU, ""],

    "backups.list": ["GET", "/backups/", SU, "две строки на запуск: database и media"],
    "backups.create": ["POST", "/backups/", SU, "синхронно, 1–2 минуты; пишет две строки"],
    "backups.download": ["GET", "/backups/{id}/download", SU, ""],
    "backups.delete": ["DELETE", "/backups/{id}", SU, ""],
    "audit.list": ["GET", "/system/audit-logs", SU, "skip, limit"],

    "users.list": ["GET", "/users/", SU, "q (username или email), skip, limit"],
    "users.update": ["PATCH", "/users/{id}", SU, "email, username, gender, bio, is_active, is_superuser, is_verified, role_id, password"],
    "users.ban": ["POST", "/users/{id}/ban", SU, "суперпользователя забанить нельзя (400)"],
    "users.unban": ["POST", "/users/{id}/unban", SU, ""],
    "roles.list": ["GET", "/roles/", SU, "создавать и менять роли через API нельзя"],
    "avatars.create": ["POST", "/avatar-collection/", SU, "{title, image_url, category, is_active}"],
    "avatars.update": ["PATCH", "/avatar-collection/{id}", SU, ""],
    "avatars.delete": ["DELETE", "/avatar-collection/{id}", SU, ""],
    "avatars.upload": ["POST", "/avatar-collection/{id}/upload", SU, "multipart, поле file"],
    "decorations.create": ["POST", "/decorations/", SU, "{title, image_url, is_active}"],
    "decorations.update": ["PATCH", "/decorations/{id}", SU, ""],
    "decorations.delete": ["DELETE", "/decorations/{id}", SU, ""],
    "decorations.upload": ["POST", "/decorations/{id}/upload", SU, "multipart, поле file"],

    "site.get": ["GET", "/system/settings/site", SU, "ключи site_name, maintenance_mode, allow_registration, accent_primary, accent_danger"],
    "site.update": ["PATCH", "/system/settings/site", SU, "только UPDATE существующих ключей; неизвестные молча пропускаются; сайт эти значения не читает"],
    "parserSettings.list": ["GET", "/dashboard/parsers/settings", SU, "архив: текущий бэкенд эти значения не читает"],
  };

  /* Право → что оно реально открывает (authmw.RequirePermissions). */
  const permissionEffects = {
    "content.edit": ["Создавать, править и удалять серии", "Создавать, править и удалять источники видео"],
    "comments.moderate": ["Смотреть ленту комментариев"],
  };
  function satisfies(perms, required) {
    return perms.includes("*") || perms.some(p => p === required || (p.endsWith(".*") && required.startsWith(p.slice(0, -2))));
  }
  function effectiveAccess(user, role) {
    if (user.is_superuser) return { level: "full", items: ["Всё в админке, включая парсер, бэкапы и пользователей"] };
    const perms = role?.permissions || [];
    const items = Object.entries(permissionEffects).filter(([perm]) => satisfies(perms, perm)).flatMap(([, list]) => list);
    return { level: items.length ? "partial" : "none", items };
  }

  /* --- Время: API отдаёт наивный UTC, показываем Asia/Almaty (UTC+5, без перехода на летнее). */
  const OFFSET_H = 5;
  function parseUtc(value) {
    if (!value) return null;
    const stamp = Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`);
    return Number.isFinite(stamp) ? new Date(stamp) : null;
  }
  function localParts(value) {
    const date = parseUtc(value);
    if (!date) return null;
    const shifted = new Date(date.getTime() + OFFSET_H * 3600000);
    return { y: shifted.getUTCFullYear(), mo: shifted.getUTCMonth(), d: shifted.getUTCDate(), h: shifted.getUTCHours(), mi: shifted.getUTCMinutes() };
  }
  const MONTHS = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  const pad = n => String(n).padStart(2, "0");
  function fmtTime(value) { const p = localParts(value); return p ? `${pad(p.h)}:${pad(p.mi)}` : "—"; }
  function fmtDate(value) { const p = localParts(value); return p ? `${p.d} ${MONTHS[p.mo]} ${p.y}` : "—"; }
  function fmtDateTime(value, now) {
    const p = localParts(value), n = localParts(now);
    if (!p) return "—";
    if (n && p.y === n.y && p.mo === n.mo && p.d === n.d) return `сегодня ${pad(p.h)}:${pad(p.mi)}`;
    if (n) {
      const yesterday = localParts(new Date(parseUtc(now).getTime() - 86400000).toISOString().slice(0, 19));
      if (p.y === yesterday.y && p.mo === yesterday.mo && p.d === yesterday.d) return `вчера ${pad(p.h)}:${pad(p.mi)}`;
    }
    return `${p.d} ${MONTHS[p.mo]} ${pad(p.h)}:${pad(p.mi)}`;
  }
  function plural(n, one, few, many) {
    const a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b > 1 && b < 5) return few;
    if (b === 1) return one;
    return many;
  }
  function fmtAgo(value, now) {
    const a = parseUtc(value), b = parseUtc(now);
    if (!a || !b) return "—";
    const minutes = Math.round((b - a) / 60000);
    if (minutes < 1) return "только что";
    if (minutes < 60) return `${minutes} ${plural(minutes, "минуту", "минуты", "минут")} назад`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ${plural(hours, "час", "часа", "часов")} назад`;
    const days = Math.floor(hours / 24);
    return `${days} ${plural(days, "день", "дня", "дней")} назад`;
  }
  function fmtDuration(seconds) {
    if (seconds == null) return "—";
    if (seconds < 60) return `${seconds} с`;
    const m = Math.floor(seconds / 60), s = seconds % 60;
    if (m < 60) return s ? `${m} мин ${s} с` : `${m} мин`;
    const h = Math.floor(m / 60);
    return m % 60 ? `${h} ч ${m % 60} мин` : `${h} ч`;
  }
  function fmtBytes(bytes) {
    if (bytes == null) return "—";
    const units = ["Б", "КБ", "МБ", "ГБ"];
    let value = bytes, unit = 0;
    while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1; }
    return `${value.toLocaleString("ru-RU", { maximumFractionDigits: unit ? 1 : 0 })} ${units[unit]}`;
  }

  /* --- Cron. Сервер понимает 5 полей в UTC (robfig/cron), пульс срабатывает раз в 15 минут. */
  function validCron(value) {
    const fields = String(value).trim().split(/\s+/);
    const ranges = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 7]];
    return fields.length === 5 && fields.every((field, i) => field.split(",").every(part => {
      const match = /^(\*|\d+(?:-\d+)?)(?:\/(\d+))?$/.exec(part);
      if (!match || (match[2] !== undefined && (+match[2] < 1 || +match[2] > ranges[i][1] + 1))) return false;
      if (match[1] === "*") return true;
      const [start, end = start] = match[1].split("-").map(Number);
      return start >= ranges[i][0] && end <= ranges[i][1] && start <= end;
    }));
  }
  const DAYS = ["Каждое воскресенье", "Каждый понедельник", "Каждый вторник", "Каждую среду", "Каждый четверг", "Каждую пятницу", "Каждую субботу"];
  /* Человеческий вид и подсказки для формы. Понимает формы, которые строит сама форма. */
  function describeCron(expr) {
    const value = String(expr || "").trim();
    if (!validCron(value)) return { ok: false, text: "Сервер не поймёт это выражение и молча будет запускать задачу раз в час" };
    const [mi, h, dom, mon, dow] = value.split(/\s+/);
    const every = /^\*\/(\d+)$/.exec(mi);
    if (every && h === "*" && dom === "*" && mon === "*" && dow === "*") {
      const n = +every[1];
      const note = n < 15 ? `Пульс срабатывает раз в 15 минут, поэтому чаще, чем раз в 15 минут, задача не пойдёт` : "";
      return { ok: true, text: `Каждые ${n} ${plural(n, "минуту", "минуты", "минут")}`, note, kind: "every", n };
    }
    if (/^\d+$/.test(mi) && h === "*" && dom === "*" && mon === "*" && dow === "*") {
      return { ok: true, text: `Каждый час в :${pad(+mi)}`, kind: "hourly", minute: +mi };
    }
    if (/^\d+$/.test(mi) && /^\d+$/.test(h) && dom === "*" && mon === "*") {
      const localMinutes = (+h * 60 + +mi + OFFSET_H * 60) % 1440;
      const dayShift = +h * 60 + +mi + OFFSET_H * 60 >= 1440 ? 1 : 0;
      const local = `${pad(Math.floor(localMinutes / 60))}:${pad(localMinutes % 60)}`;
      const utc = `${pad(+h)}:${pad(+mi)}`;
      if (dow === "*") return { ok: true, text: `Каждый день в ${local}`, utc: `${utc} UTC`, kind: "daily", local };
      if (/^\d$/.test(dow)) return { ok: true, text: `${DAYS[(+dow + dayShift) % 7]} в ${local}`, utc: `${utc} UTC`, kind: "weekly", local };
    }
    return { ok: true, text: "Особое расписание", kind: "custom" };
  }
  /* Из формы (время по Алматы) — в cron UTC. */
  function buildCron({ kind, minutes = 30, local = "09:00", weekday = 1 }) {
    if (kind === "every") return `*/${minutes} * * * *`;
    const [lh, lm] = String(local).split(":").map(Number);
    let total = lh * 60 + lm - OFFSET_H * 60, shift = 0;
    if (total < 0) { total += 1440; shift = -1; }
    const cron = `${total % 60} ${Math.floor(total / 60)} * *`;
    if (kind === "weekly") return `${cron} ${(weekday + shift + 7) % 7}`;
    return `${cron} *`;
  }
  /* Минуты суток (по Алматы), в которые сработает расписание — для «карты суток». */
  function fireMinutes(expr) {
    const d = describeCron(expr);
    if (!d.ok) return [];
    if (d.kind === "every") {
      const step = Math.max(15, d.n);
      return Array.from({ length: Math.floor(1440 / step) }, (_, i) => i * step);
    }
    if (d.kind === "hourly") return Array.from({ length: 24 }, (_, i) => i * 60 + d.minute);
    if (d.kind === "daily" || d.kind === "weekly") { const [h, m] = d.local.split(":").map(Number); return [h * 60 + m]; }
    return [];
  }

  function validUrl(value, allowRelative = true) {
    if (typeof value !== "string" || !value.trim()) return false;
    if (allowRelative && /^\/(?!\/)/.test(value) && !/[\\\s]/.test(value)) return true;
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) && !!url.hostname && !url.username && !url.password && !/[\s\\]/.test(value);
    } catch { return false; }
  }

  /* Читает форму с полями [name] в тело запроса. Пустые строки — null, числа — Number. */
  function readForm(root) {
    const payload = {};
    root.querySelectorAll("[name]").forEach(input => {
      if (input.disabled || input.dataset.readonly === "true") return;
      if (input.type === "checkbox") { payload[input.name] = input.checked; return; }
      let value = input.value.trim();
      if (input.dataset.list === "true") { payload[input.name] = value ? value.split(",").map(x => x.trim()).filter(Boolean) : []; return; }
      if (input.type === "number") value = value === "" ? null : Number(value);
      else if (value === "") value = null;
      if (input.type === "datetime-local" && value) value = localToUtc(value);
      payload[input.name] = value;
    });
    return payload;
  }
  /* Время Алматы из поля формы → наивный UTC для API. */
  function localToUtc(value) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
    const stamp = Date.parse(`${value}:00Z`) - OFFSET_H * 3600000;
    return new Date(stamp).toISOString().slice(0, 19);
  }
  function utcToLocalInput(value) {
    const date = parseUtc(value);
    if (!date) return "";
    return new Date(date.getTime() + OFFSET_H * 3600000).toISOString().slice(0, 16);
  }

  function errors(kind, payload) {
    const required = { anime: ["title", "slug"], episode: ["episode"], release: ["source", "url"], avatar: ["title", "image_url"], decoration: ["title", "image_url"] }[kind] || [];
    const out = [];
    for (const key of required) if (payload[key] == null || String(payload[key]).trim() === "") out.push({ field: key, text: "Обязательное поле" });
    for (const [key, value] of Object.entries(payload)) {
      if (value == null || value === "") continue;
      if (key === "slug" && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) out.push({ field: key, text: "Только латиница, цифры и дефисы" });
      if (key === "score" && (!Number.isFinite(value) || value < 0 || value > 10)) out.push({ field: key, text: "От 0 до 10" });
      if (["season", "episode", "episodes_total", "episodes_aired", "shikimori_id", "mal_id", "kodik_shikimori_id"].includes(key) && (!Number.isInteger(value) || value < 0)) out.push({ field: key, text: "Целое число не меньше 0" });
      if (/(?:^url$|_url$)/.test(key) && !validUrl(value, !["url", "embed_url", "kodik_url"].includes(key))) out.push({ field: key, text: "Нужна ссылка http(s)" });
    }
    return out;
  }

  window.KitsuAdminContracts = {
    endpoints, permissionEffects, satisfies, effectiveAccess,
    parseUtc, fmtTime, fmtDate, fmtDateTime, fmtAgo, fmtDuration, fmtBytes, plural,
    validCron, describeCron, buildCron, fireMinutes, validUrl, readForm, localToUtc, utcToLocalInput, errors, OFFSET_H,
  };
})();
