import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pages = ["index.html", "anime.html"];
const results = [];

function add(id, label, pass, detail) {
  results.push({ id, label, status: pass ? "pass" : "fail", detail });
}

function read(relative) {
  return readFileSync(resolve(root, relative), "utf8");
}

function count(source, pattern) {
  return (source.match(pattern) || []).length;
}

function cssStructure(source) {
  const stack = [];
  let state = "code";
  let quote = "";
  let line = 1;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (char === "\n") line += 1;
    if (state === "comment") {
      if (char === "*" && next === "/") {
        state = "code";
        index += 1;
      }
      continue;
    }
    if (state === "string") {
      if (char === "\\") index += 1;
      else if (char === quote) state = "code";
      continue;
    }
    if (char === "/" && next === "*") {
      state = "comment";
      index += 1;
    } else if (char === "\"" || char === "'") {
      state = "string";
      quote = char;
    } else if (char === "{") stack.push(line);
    else if (char === "}") {
      if (!stack.length) return { ok: false, detail: `лишняя закрывающая скобка, строка ${line}` };
      stack.pop();
    }
  }
  if (state !== "code") return { ok: false, detail: `незавершённый блок: ${state}` };
  if (stack.length) return { ok: false, detail: `незакрытая скобка, строка ${stack.at(-1)}` };
  return { ok: true, detail: `${count(source, /{/g)} блоков, структура сбалансирована` };
}

// A null return is a computation failure and must surface as a failed
// check, never as a silently accepted result — the shipped admin
// qa-results.json once recorded "ratio": null for nine light-theme pairs
// while still reporting issues: [], which is the defect this guards against.
function relativeLuminance(hex) {
  if (typeof hex !== "string" || !/^#[0-9a-fA-F]{6}$/.test(hex)) return null;
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(foreground, background) {
  const lf = relativeLuminance(foreground);
  const lb = relativeLuminance(background);
  if (lf === null || lb === null || Number.isNaN(lf) || Number.isNaN(lb)) return null;
  const hi = Math.max(lf, lb);
  const lo = Math.min(lf, lb);
  return (hi + 0.05) / (lo + 0.05);
}

const required = [
  ...pages,
  "styles.css",
  "app.js",
  "vendor/lucide.min.js",
  "vendor/LUCIDE-LICENSE.txt",
  "fonts/MANROPE-LICENSE.txt",
  "fonts/ONEST-LICENSE.txt",
  "fonts/JETBRAINS-MONO-LICENSE.txt",
  "MANIFEST.sha256",
];
const missingRequired = required.filter((file) => !existsSync(resolve(root, file)));
add("files.required", "Обязательные файлы", missingRequired.length === 0, missingRequired.length ? `Не найдены: ${missingRequired.join(", ")}` : `${required.length} файлов на месте`);

for (const page of pages) {
  const source = read(page);
  const ids = [...source.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  const localRefs = [...source.matchAll(/\b(?:href|src)="((?:\.\/|\.\.\/)[^"?#]+)(?:[?#][^"]*)?"/g)].map((match) => match[1]);
  const missingRefs = localRefs.filter((reference) => !existsSync(resolve(root, reference)));
  const ariaRefs = [...source.matchAll(/\b(?:aria-controls|aria-labelledby|for)="([^"]+)"/g)]
    .flatMap((match) => match[1].split(/\s+/))
    .filter(Boolean);
  const unresolvedAria = [...new Set(ariaRefs.filter((id) => !ids.includes(id)))];

  add(`${page}.document`, `${page}: документ`, /<html\s+lang="ru"/.test(source) && /<meta\s+name="viewport"/.test(source) && count(source, /<h1\b/g) === 1, "lang=ru, viewport и один H1");
  add(`${page}.ids`, `${page}: уникальные ID`, duplicates.length === 0, duplicates.length ? duplicates.join(", ") : `${ids.length} уникальных ID`);
  add(`${page}.references`, `${page}: локальные ссылки`, missingRefs.length === 0, missingRefs.length ? missingRefs.join(", ") : `${localRefs.length} локальных ссылок разрешены`);
  add(`${page}.aria`, `${page}: ARIA-ссылки`, unresolvedAria.length === 0, unresolvedAria.length ? `Не найдены ID: ${unresolvedAria.join(", ")}` : `${ariaRefs.length} ссылок разрешены`);
  add(`${page}.buttons`, `${page}: типы кнопок`, !/<button\b(?![^>]*\btype=)[^>]*>/i.test(source), "у каждой кнопки указан type");
  add(`${page}.images`, `${page}: alt у изображений`, !/<img\b(?![^>]*\balt=)[^>]*>/i.test(source), `${count(source, /<img\b/g)} изображений проверено`);
  add(`${page}.anchors`, `${page}: ссылки без заглушек`, !/href="#"/.test(source) && !/javascript:/i.test(source), "нет href=\"#\" и javascript-ссылок");
}

const css = read("styles.css");
const structure = cssStructure(css);
add("css.structure", "CSS: синтаксическая структура", structure.ok, structure.detail);
add("css.themes", "CSS: две темы", /:root\s*{/.test(css) && /html\[data-theme="light"\]/.test(css), "тёмные и светлые токены присутствуют");
add("css.responsive", "CSS: адаптивность", [1180, 920, 720, 460].every((value) => css.includes(`max-width: ${value}px`)), "контрольные точки 1180/920/720/460 px");
add("css.a11y", "CSS: доступность", css.includes(":focus-visible") && css.includes("prefers-reduced-motion"), "focus-visible и reduced-motion присутствуют");
function mediaSource(maxWidth) {
  const start = css.indexOf(`@media (max-width: ${maxWidth}px)`);
  if (start === -1) return "";
  const next = css.indexOf("@media", start + 1);
  return css.slice(start, next === -1 ? css.length : next);
}
const posterDensityChecks = [
  /\.anime-grid\s*{[^}]*repeat\(6,/s.test(css.slice(0, css.indexOf("@media"))),
  /\.anime-grid\s*{[^}]*repeat\(5,/s.test(mediaSource(1180)),
  /\.anime-grid\s*{[^}]*repeat\(4,/s.test(mediaSource(920)),
  /\.anime-grid\s*{[^}]*repeat\(3,/s.test(mediaSource(720)),
  /\.anime-grid\s*{[^}]*repeat\(2,/s.test(mediaSource(460)),
];
add(
  "css.posterDensity",
  "CSS: плотность постеров",
  posterDensityChecks.every(Boolean),
  posterDensityChecks.every(Boolean) ? "6/5/4/3/2 колонок на контрольных ширинах" : "сетка постеров не соответствует 6/5/4/3/2",
);
const bookmarkCssTokens = [
  ".poster-bookmark-button",
  ".bookmark-menu",
  ".bookmark-menu__heading",
  ".bookmark-menu--sheet",
  ".bookmark-menu-scrim",
  ".bookmark-menu__remove",
  ".bookmark-status-bar",
  ".has-bookmark-status",
  "[data-bookmark-tone=\"watching\"]",
  "justify-content: center",
  "border-top: 1px solid color-mix",
];
const missingBookmarkCss = bookmarkCssTokens.filter((token) => !css.includes(token));
add(
  "css.bookmarks",
  "CSS: закладки на постере",
  missingBookmarkCss.length === 0,
  missingBookmarkCss.length ? `Не найдены: ${missingBookmarkCss.join(", ")}` : "desktop popover, mobile sheet, явное удаление и полноширинная статусная полоска оформлены токенами темы",
);

const sliderCssTokens = [
  ".feature-slider",
  ".feature-slide.is-active",
  ".feature-slider__controls",
  ".feature-slider__progress",
  "@keyframes hero-progress",
  "touch-action: pan-y",
];
const missingSliderCss = sliderCssTokens.filter((token) => !css.includes(token));
add(
  "css.heroSlider",
  "CSS: адаптивный hero-слайдер",
  missingSliderCss.length === 0,
  missingSliderCss.length ? `Не найдены: ${missingSliderCss.join(", ")}` : "полноширинный desktop hero, mobile composition, controls и progress оформлены",
);

const titleMobileCssTokens = [
  ".title-mobile-toolbar",
  ".title-mobile-actions",
  ".title-mobile-count",
  ".title-mobile-watch",
  ".title-list-dialog",
  ".mobile-subscribe-dialog",
  ".episode-subscribe__trigger",
  "color-mix(in srgb, var(--line) 42%, transparent)",
  "@keyframes bottom-sheet-in",
];
const missingTitleMobileCss = titleMobileCssTokens.filter((token) => !css.includes(token));
const titleMobileLayoutChecks = [
  /\.title-meta-list\s*{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/s.test(mediaSource(720)),
  /\.title-meta-list\s*{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/s.test(mediaSource(460)),
  /\.episode-subscribe\s*{[^}]*display:\s*none/s.test(mediaSource(720)),
];
add(
  "css.titleMobile",
  "CSS: mobile title hierarchy",
  missingTitleMobileCss.length === 0 && titleMobileLayoutChecks.every(Boolean),
  missingTitleMobileCss.length
    ? `Не найдены: ${missingTitleMobileCss.join(", ")}`
    : titleMobileLayoutChecks.every(Boolean)
      ? "верхний bell, счётчики, одноколоночные metadata с мягкими разделителями и оба mobile sheet оформлены"
      : "mobile metadata или скрытие дублирующего desktop subscription не соответствует контракту",
);

const playerSettingsCssTokens = [
  ".player-settings-dialog",
  ".player-setting-row",
  ".player-setting-row--toggle",
  ".player-switch",
];
const missingPlayerSettingsCss = playerSettingsCssTokens.filter((token) => !css.includes(token));
add(
  "css.playerSettings",
  "CSS: настройки плеера",
  missingPlayerSettingsCss.length === 0,
  missingPlayerSettingsCss.length ? `Не найдены: ${missingPlayerSettingsCss.join(", ")}` : "desktop dialog и mobile bottom sheet используют общую структуру",
);

// Tier 1: baseline WCAG AA (>=4.5:1) for every text/label token against its
// real surface. Tier 2: the reinforced bar semantic status colors and
// accent-as-text are held to (>=5.5 light / >=6.0 dark), per the 2026-08
// color pass — layered on the SAME pairs, not a separate color set, so
// long-standing neutral tokens (e.g. --text-muted, ~4.9:1 by design) aren't
// flaged against a bar they were never meant to clear.
const darkSurface = "#19191c";
const lightSurface = "#ffffff";
const baselinePairs = {
  dark: {
    text: "#f3f2f4",
    "text-secondary": "#b9b6bc",
    "text-muted": "#8b8790",
    "accent-text": "#d2c3f6",
    green: "#56ad91",
    amber: "#d0a052",
    red: "#ff7a7a",
    info: "#7f9fbd",
  },
  light: {
    text: "#252225",
    "text-secondary": "#5e5960",
    "text-muted": "#746e74",
    "accent-text": "#36255c",
    green: "#166534",
    amber: "#854d0e",
    red: "#b91c1c",
    info: "#1d4ed8",
  },
};
const reinforcedTokens = ["accent-text", "green", "amber", "red", "info"];
const primaryPairs = {
  dark: { fg: "#171719", bg: "#eceaec" },
  light: { fg: "#ffffff", bg: "#1f1d20" },
};

const contrastChecks = [];
for (const theme of ["dark", "light"]) {
  const surface = theme === "dark" ? darkSurface : lightSurface;
  const baselineMin = 4.5;
  const reinforcedMin = theme === "dark" ? 6.0 : 5.5;
  for (const [token, hex] of Object.entries(baselinePairs[theme])) {
    const ratio = contrastRatio(hex, surface);
    const threshold = reinforcedTokens.includes(token) ? reinforcedMin : baselineMin;
    const tier = reinforcedTokens.includes(token) ? "reinforced" : "baseline";
    contrastChecks.push({ theme, token, foreground: hex, background: surface, ratio, threshold, tier });
  }
  const primary = primaryPairs[theme];
  const primaryRatio = contrastRatio(primary.fg, primary.bg);
  contrastChecks.push({ theme, token: "primary-fg", foreground: primary.fg, background: primary.bg, ratio: primaryRatio, threshold: baselineMin, tier: "baseline" });
}

const contrastIssues = contrastChecks.filter((c) => c.ratio === null || Number.isNaN(c.ratio) || c.ratio < c.threshold);
for (const theme of ["dark", "light"]) {
  const themeChecks = contrastChecks.filter((c) => c.theme === theme);
  const themeIssues = contrastIssues.filter((c) => c.theme === theme);
  const worst = themeChecks.reduce((min, c) => (c.ratio === null ? min : Math.min(min, c.ratio)), Infinity);
  add(
    `css.contrast.${theme}`,
    `CSS: контраст токенов — ${theme === "dark" ? "тёмная" : "светлая"} тема`,
    themeIssues.length === 0,
    themeIssues.length
      ? `Не прошли: ${themeIssues.map((c) => `${c.token}=${c.ratio === null ? "не вычислено" : c.ratio.toFixed(2)} (нужно ≥${c.threshold})`).join(", ")}`
      : `${themeChecks.length} пар посчитаны, минимум ${worst.toFixed(2)}:1`,
  );
}

const fontUrls = [...css.matchAll(/url\(["']?(\.\/fonts\/[^)"']+)/g)].map((match) => match[1]);
const missingFonts = fontUrls.filter((reference) => !existsSync(resolve(root, reference)));
add("css.fonts", "CSS: локальные шрифты", fontUrls.length >= 20 && missingFonts.length === 0, missingFonts.length ? missingFonts.join(", ") : `${fontUrls.length} локальных файлов подключено`);
add("css.noOutfit", "CSS: нет безкириллической гарнитуры", !/Outfit/.test(css), "Outfit удалён из styles.css");
add("css.tabularNums", "CSS: tabular-nums на числовых узлах", css.includes("font-variant-numeric: tabular-nums"), `${count(css, /font-variant-numeric: tabular-nums/g)} правил с tabular-nums`);

const js = read("app.js");
const jsCapabilities = [
  "data-theme-toggle",
  "data-open-search",
  "mobile-menu-trigger",
  "data-filter",
  "data-day",
  "data-list-status",
  "data-subscribe",
  "data-episode",
  "source-select",
  "translation-select",
  "requestFullscreen",
  "data-hero-slide",
  "data-hero-pause",
  "data-open-mobile-list",
  "kitsu-demo-player-settings",
];
const missingCapabilities = jsCapabilities.filter((token) => !js.includes(token));
add("js.capabilities", "JS: ключевые сценарии", missingCapabilities.length === 0, missingCapabilities.length ? `Не найдены: ${missingCapabilities.join(", ")}` : `${jsCapabilities.length} сценариев покрыто`);
add("js.storage", "JS: локальные предпочтения", js.includes("localStorage") && js.includes("kitsu-theme"), "тема и демонстрационные состояния сохраняются локально");
const bookmarkStatuses = ["watching", "planned", "completed", "dropped", "on_hold"];
const missingBookmarkStatuses = bookmarkStatuses.filter((status) => !js.includes(`key: "${status}"`));
const bookmarkBehaviorTokens = [
  "data-bookmark-trigger",
  "data-bookmark-option",
  "data-bookmark-remove",
  "bookmarkSheetQuery",
  "aria-modal",
  "bookmarkTone",
  "kitsu-demo-bookmark-status",
  "data-bookmark-status-bar",
];
const missingBookmarkBehavior = bookmarkBehaviorTokens.filter((token) => !js.includes(token));
const copiedStatusColors = ["#22c55e", "#3b82f6", "#a855f7", "#ef4444", "#eab308"].filter((color) => js.includes(color));
add(
  "js.bookmarks",
  "JS: статусы закладок",
  missingBookmarkStatuses.length === 0 && missingBookmarkBehavior.length === 0 && copiedStatusColors.length === 0,
  missingBookmarkStatuses.length || missingBookmarkBehavior.length || copiedStatusColors.length
    ? `Проблемы: ${[...missingBookmarkStatuses, ...missingBookmarkBehavior, ...copiedStatusColors].join(", ")}`
    : "5 статусов используют токены темы; desktop popover, mobile sheet, явное удаление, сохранение и синхронизация присутствуют",
);

const indexSource = read("index.html");
const animeSource = read("anime.html");
const heroSlideCount = count(indexSource, /data-hero-slide\b/g);
add(
  "html.heroSlider",
  "HTML: hero-слайдер",
  heroSlideCount === 5 && indexSource.includes("data-hero-pause") && indexSource.includes("data-hero-live"),
  `${heroSlideCount} слайдов, pause control и live-status`,
);
const titleInteractionTokens = ["title-mobile-toolbar", "mobile-list-menu", "mobile-list-label", "mobile-subscribe-menu", "title-mobile-watch"];
const missingTitleInteractions = titleInteractionTokens.filter((token) => !animeSource.includes(token));
add(
  "html.titleMobile",
  "HTML: мобильный тайтл и список",
  missingTitleInteractions.length === 0 && count(animeSource, /data-list-status=/g) === 12,
  missingTitleInteractions.length ? `Не найдены: ${missingTitleInteractions.join(", ")}` : "desktop/mobile triggers и 5 статусов с отдельным удалением синхронизированы",
);
const episodesSectionIndex = animeSource.indexOf('class="episodes-section"');
const subscriptionIndex = animeSource.indexOf('id="subscribe-trigger"');
const relatedSectionIndex = animeSource.indexOf('aria-labelledby="related-title"');
const mobileToolbarStart = animeSource.indexOf('class="title-mobile-toolbar"');
const mobileToolbarEnd = animeSource.indexOf('</div>', mobileToolbarStart);
const mobileToolbarSource = animeSource.slice(mobileToolbarStart, mobileToolbarEnd);
add(
  "html.titleNotifications",
  "HTML: уведомления без мобильного дубля закладки",
  episodesSectionIndex >= 0
    && subscriptionIndex > episodesSectionIndex
    && (relatedSectionIndex < 0 || subscriptionIndex < relatedSectionIndex)
    && mobileToolbarSource.includes("data-open-mobile-notifications")
    && !mobileToolbarSource.includes("data-open-mobile-list")
    && count(animeSource, /id="mobile-subscribe-menu"/g) === 1,
  "desktop trigger расположен у серий; mobile trigger — справа сверху и открывает отдельный sheet",
);
add(
  "html.titleCounters",
  "HTML: счётчики списков и комментариев",
  count(animeSource, /data-field="favorites_count"/g) === 2 && count(animeSource, /data-field="comments_count"/g) === 2,
  "favorites_count и comments_count показаны в mobile actions и desktop statistics",
);
add(
  "html.titleNoShare",
  "HTML: share-действие удалено",
  !animeSource.includes("data-share") && !animeSource.includes("Поделиться") && !js.includes("navigator.share"),
  "в HTML и JS нет отдельного share-сценария",
);
add(
  "html.titleNoDuplicateDetails",
  "HTML: нет повторной карточки подробностей",
  !animeSource.includes("details-title") && !animeSource.includes("Карточка тайтла") && !animeSource.includes('class="details-list"'),
  "метаданные представлены один раз в title hero",
);
const unsupportedPlayerControls = ["мини-плеер", "скачать серию"].filter((label) => animeSource.toLowerCase().includes(label));
add(
  "html.playerSettings",
  "HTML: подтверждённые настройки плеера",
  count(animeSource, /<label class="player-setting-row/g) === 6 && unsupportedPlayerControls.length === 0,
  unsupportedPlayerControls.length ? `Неподтверждённые controls: ${unsupportedPlayerControls.join(", ")}` : "качество, скорость, режим, auto-next и skip opening/ending",
);

const fontFiles = readdirSync(resolve(root, "fonts")).filter((name) => name.endsWith(".woff2"));
add("assets.fontInventory", "Ассеты: набор шрифтов", fontFiles.length >= 20, `${fontFiles.length} WOFF2-файлов`);

// --- Pages link safety (step 6.4) --------------------------------------------
// GitHub Pages serves this repo from /WebApp/, not the domain root, and its
// filesystem is case-sensitive unlike a typical local Windows checkout. A
// leading-slash reference or a case mismatch is invisible when opening the
// file directly and only breaks once deployed.
function checkPagesLinks(filesToScan) {
  const problems = [];
  for (const file of filesToScan) {
    const source = read(file);
    const refPattern = /(?:href|src)="([^"]+)"|url\(["']?([^)"']+)["']?\)/g;
    for (const match of source.matchAll(refPattern)) {
      const ref = match[1] ?? match[2];
      if (!ref || /^(https?:|data:|mailto:|tel:|#)/.test(ref)) continue;
      if (ref.startsWith("/") && !ref.startsWith("//")) {
        problems.push(`${file}: ведущий слэш в "${ref}"`);
        continue;
      }
      if (!ref.startsWith("./") && !ref.startsWith("../")) continue;
      const clean = ref.split(/[?#]/)[0];
      const abs = resolve(root, clean);
      if (!existsSync(abs)) {
        problems.push(`${file}: путь не существует — "${ref}"`);
        continue;
      }
      const rel = clean.replace(/^\.\//, "");
      let dir = root;
      for (const segment of rel.split("/")) {
        const entries = readdirSync(dir);
        if (!entries.includes(segment)) {
          const insensitive = entries.find((e) => e.toLowerCase() === segment.toLowerCase());
          problems.push(insensitive ? `${file}: регистр не совпадает — "${ref}" (на диске "${insensitive}")` : `${file}: путь не существует — "${ref}"`);
          break;
        }
        dir = join(dir, segment);
      }
    }
  }
  return problems;
}

const pagesLinkProblems = checkPagesLinks([...pages, "styles.css", "app.js"]);
add("pages.linkSafety", "Pages: относительные пути и регистр", pagesLinkProblems.length === 0, pagesLinkProblems.length ? pagesLinkProblems.join("; ") : "нет ведущих слэшей, все относительные пути существуют с совпадающим регистром");

const failed = results.filter((result) => result.status === "fail");
const report = {
  schema_version: 2,
  project: "Kitsu public template · Anime Graphite",
  generated_at: new Date().toISOString(),
  summary: {
    status: failed.length ? "fail" : "pass",
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
  },
  results,
  contrastChecks,
};

const rendered = `${JSON.stringify(report, null, 2)}\n`;
if (process.argv.includes("--write")) writeFileSync(resolve(root, "qa-results.json"), rendered);
process.stdout.write(rendered);
if (failed.length) process.exitCode = 1;
