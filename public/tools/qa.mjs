import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pages = [
  "index.html",
  "anime.html",
  "profile.html",
  "schedule.html",
  "updates.html",
  "season.html",
  "collections.html",
  "bookmarks.html",
];
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
  "art-direction.css",
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
const artCss = read("art-direction.css");
const structure = cssStructure(css);
add("css.structure", "CSS: синтаксическая структура", structure.ok, structure.detail);
const artStructure = cssStructure(artCss);
add("css.artDirection", "CSS: единый слой арт-дирекции", artStructure.ok && pages.every((page) => read(page).includes("art-direction.css")), artStructure.ok ? "все восемь страниц используют общий визуальный слой" : artStructure.detail);
add("css.artDirectionResponsive", "CSS: адаптивная арт-дирекция", [1180, 920, 720, 639].every((value) => artCss.includes(`max-width: ${value}px`)) && artCss.includes("prefers-reduced-motion"), "desktop/tablet/mobile и reduced-motion определены без конфликта с базовой сеткой");
const artPosterGridChecks = [
  /\.anime-grid\s*{[^}]*repeat\(7,/s.test(artCss),
  /@media \(min-width: 1280px\) and \(max-width: 1599px\)[\s\S]*?\.anime-grid,[\s\S]*?repeat\(6,/s.test(artCss),
  /@media \(max-width: 920px\)[\s\S]*?repeat\(5,/s.test(artCss),
  /@media \(max-width: 720px\)[\s\S]*?repeat\(4,/s.test(artCss),
  /@media \(max-width: 639px\)[\s\S]*?repeat\(3,/s.test(artCss),
];
add("css.artPosterGrid", "CSS: стабильный размер постеров", artPosterGridChecks.every(Boolean), artPosterGridChecks.every(Boolean) ? "7/6/5/4/3 колонки без скачка к двум чрезмерно крупным постерам" : "арт-дирекция нарушает согласованную плотность постеров");
add("css.themes", "CSS: две темы", /:root\s*{/.test(css) && /html\[data-theme="light"\]/.test(css), "тёмные и светлые токены присутствуют");
add("css.responsive", "CSS: адаптивность", [1279, 1180, 920, 720, 639, 460].every((value) => css.includes(`max-width: ${value}px`)), "контрольные точки 1279/1180/920/720/639/460 px");
add("css.a11y", "CSS: доступность", css.includes(":focus-visible") && css.includes("prefers-reduced-motion"), "focus-visible и reduced-motion присутствуют");
function mediaSource(maxWidth) {
  const start = css.indexOf(`@media (max-width: ${maxWidth}px)`);
  if (start === -1) return "";
  const next = css.indexOf("@media", start + 1);
  return css.slice(start, next === -1 ? css.length : next);
}
const baseCss = css.slice(0, css.indexOf("@media (max-width"));
const posterDensityChecks = [
  /\.anime-grid\s*{[^}]*repeat\(7,/s.test(baseCss),
  /\.anime-grid\s*{[^}]*repeat\(6,/s.test(mediaSource(1279)),
  /\.anime-grid\s*{[^}]*repeat\(6,/s.test(mediaSource(1180)),
  /\.anime-grid\s*{[^}]*repeat\(5,/s.test(mediaSource(920)),
  /\.anime-grid\s*{[^}]*repeat\(4,/s.test(mediaSource(720)),
  /\.anime-grid\s*{[^}]*repeat\(3,/s.test(mediaSource(639)),
  /\.anime-grid\.anime-grid--compact\s*{[^}]*minmax\(168px, 200px\)/s.test(baseCss),
];
add(
  "css.posterDensity",
  "CSS: плотность постеров",
  posterDensityChecks.every(Boolean),
  posterDensityChecks.every(Boolean) ? "7/6/5/4/3 колонок: крупные desktop-постеры и стабильный tablet/mobile" : "сетка постеров не соответствует адаптивному контракту 7/6/5/4/3",
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
  ".is-bookmark-menu-open",
  "@container (max-width: 135px)",
  "[data-bookmark-tone=\"watching\"]",
  "justify-content: center",
  "border-top: 1px solid color-mix",
];
const missingBookmarkCss = bookmarkCssTokens.filter((token) => !css.includes(token));
const bookmarkPosterLayoutChecks = [
  /\.poster-frame\s*{[^}]*isolation:\s*isolate[^}]*contain:\s*paint/s.test(baseCss),
  /\.bookmark-menu__label\s*{[^}]*overflow:\s*visible[^}]*white-space:\s*nowrap/s.test(baseCss),
  /\.bookmark-menu \[data-bookmark-option\]\s*{[^}]*grid-template-columns:\s*20px minmax\(0, 1fr\)/s.test(baseCss),
  /\.anime-card\.is-bookmark-menu-open \.poster-bookmark-button\s*{[^}]*opacity:\s*0[^}]*pointer-events:\s*none/s.test(baseCss),
];
add(
  "css.bookmarks",
  "CSS: закладки на постере",
  missingBookmarkCss.length === 0 && bookmarkPosterLayoutChecks.every(Boolean),
  missingBookmarkCss.length
    ? `Не найдены: ${missingBookmarkCss.join(", ")}`
    : bookmarkPosterLayoutChecks.every(Boolean)
      ? "desktop overlay изолирован границами постера, сохраняет полные названия и отдельное закрытие; mobile sheet и статусная полоска оформлены токенами темы"
      : "внутренний poster overlay снова допускает выход слоя, обрезание названий или дублирующую trigger-кнопку",
);

const statusSemanticChecks = [
  /\[data-bookmark-tone="watching"\]\s*{[^}]*--bookmark-color:\s*var\(--green\)[^}]*--bookmark-status-color:\s*var\(--green\)/s.test(css),
  /\[data-bookmark-tone="planned"\]\s*{[^}]*--bookmark-color:\s*var\(--info\)[^}]*--bookmark-status-color:\s*var\(--info\)/s.test(css),
  /\[data-bookmark-tone="completed"\]\s*{[^}]*--bookmark-color:\s*var\(--accent-strong\)[^}]*--bookmark-status-color:\s*var\(--accent-strong\)/s.test(css),
  /\[data-bookmark-tone="on_hold"\]\s*{[^}]*--bookmark-color:\s*var\(--amber\)[^}]*--bookmark-status-color:\s*var\(--amber\)/s.test(css),
  /\[data-bookmark-tone="dropped"\]\s*{[^}]*--bookmark-color:\s*var\(--red\)[^}]*--bookmark-status-color:\s*var\(--red\)/s.test(css),
  css.includes('[data-list-filter="bookmarks"] [data-filter-value].is-active'),
  css.includes('#list-trigger[data-bookmark-tone]'),
  /\.profile-avatar\s*{[^}]*border-radius:\s*50%/s.test(css),
  /\.owner-avatar\s*{[^}]*border-radius:\s*50%/s.test(css),
];
add(
  "css.statusSemantics",
  "CSS: единые цвета статусов и круглые аватары",
  statusSemanticChecks.every(Boolean),
  statusSemanticChecks.every(Boolean) ? "5 статусов окрашивают кнопки, фильтры, полоски и статистику; profile/owner avatars круглые" : "семантика статусов или геометрия аватаров расходится между разделами",
);

const headerSearchChecks = [
  css.includes("@keyframes header-search-in"),
  css.includes(".search-dialog::backdrop"),
  css.includes(".search-filters"),
  css.includes(".search-recent"),
  css.includes("width: var(--search-width, 320px)"),
  css.includes("background: var(--surface)"),
];
add(
  "css.headerSearch",
  "Header: встроенный поиск",
  headerSearchChecks.every(Boolean),
  headerSearchChecks.every(Boolean) ? "popover совпадает с шириной header-поля, использует непрозрачную surface, фильтры, недавние и результаты без fullscreen backdrop" : "не найден контракт встроенного поиска",
);

const searchMarkupTokens = [
  "data-search-filter-toggle",
  "data-search-filter=\"genre\"",
  "data-search-filter=\"status\"",
  "data-search-filter=\"type\"",
  "data-search-filter=\"year\"",
  "data-search-filter=\"rating\"",
  "data-search-clear-recent",
  "search-results__label",
];
const searchMarkupChecks = pages.flatMap((page) => searchMarkupTokens.map((token) => read(page).includes(token)));
add(
  "html.headerSearch",
  "HTML: поиск по структуре основного проекта",
  searchMarkupChecks.every(Boolean),
  searchMarkupChecks.every(Boolean) ? "все публичные страницы используют одну структуру: поле, 5 фильтров, недавние, результаты и очистку" : "структура поиска расходится между страницами",
);

const directoryPageContracts = {
  "profile.html": ["data-page=\"profile\"", "profile-identity", "profile-metrics", "data-page-tabs=\"profile-content\""],
  "schedule.html": ["data-page=\"schedule\"", "calendar-tabs", "data-page-tabs=\"schedule-days\"", "schedule-release"],
  "updates.html": ["data-page=\"updates\"", "updates-feed", "data-list-filter=\"updates\"", "update-release"],
  "season.html": ["data-page=\"season\"", "season-hero", "data-list-filter=\"season\"", "season-page-grid"],
  "collections.html": ["data-page=\"collections\"", "collection-page-grid", "data-list-filter=\"collections\"", "data-local-search=\"collections\""],
  "bookmarks.html": ["data-page=\"bookmarks\"", "bookmark-summary", "data-list-filter=\"bookmarks\"", "data-bookmark-default"],
};
const missingDirectoryContracts = Object.entries(directoryPageContracts).flatMap(([page, tokens]) => {
  const source = read(page);
  return tokens.filter((token) => !source.includes(token)).map((token) => `${page}:${token}`);
});
add(
  "html.directoryPages",
  "HTML: шесть новых публичных разделов",
  missingDirectoryContracts.length === 0,
  missingDirectoryContracts.length ? `Не найдены: ${missingDirectoryContracts.join(", ")}` : "профиль, расписание, обновления, сезон, коллекции и закладки имеют самостоятельную структуру",
);

const directoryCssTokens = [
  ".directory-hero",
  ".schedule-page-layout",
  ".calendar-tabs",
  ".updates-feed",
  ".season-hero",
  ".collection-page-grid",
  ".bookmark-summary",
  ".profile-identity",
  ".profile-metrics",
  ".profile-layout",
];
const missingDirectoryCss = directoryCssTokens.filter((token) => !css.includes(token));
add(
  "css.directoryPages",
  "CSS: адаптивные стили новых разделов",
  missingDirectoryCss.length === 0,
  missingDirectoryCss.length ? `Не найдены: ${missingDirectoryCss.join(", ")}` : "все шесть разделов используют общий responsive-контракт и токены тем",
);

const directoryControlContracts = {
  "updates.html": ["toolbar-group", "toolbar-field", "Тип обновления", "Период"],
  "season.html": ["toolbar-group", "toolbar-field", "Сезон", "Статус", "Год"],
  "collections.html": ["toolbar-group", "toolbar-field--search", "Автор", "Поиск"],
  "bookmarks.html": ["toolbar-group--grow", "toolbar-field", "Статус списка", "Сортировка"],
};
const missingDirectoryControlContracts = Object.entries(directoryControlContracts).flatMap(([page, tokens]) => {
  const source = read(page);
  return tokens.filter((token) => !source.includes(token)).map((token) => `${page}:${token}`);
});
add(
  "html.directoryControlPanels",
  "HTML: подписанные панели управления разделами",
  missingDirectoryControlContracts.length === 0,
  missingDirectoryControlContracts.length
    ? `Не найдены: ${missingDirectoryControlContracts.join(", ")}`
    : "фильтры, поиск, сезон, период и сортировка сгруппированы и имеют постоянные подписи",
);

const wideDirectoryLayoutChecks = [
  /@media \(min-width: 1181px\)[\s\S]*?\.profile-identity\s*{[^}]*grid-template-areas:[^}]*avatar actions[^}]*copy actions/s.test(css),
  /@media \(min-width: 1181px\)[\s\S]*?\.profile-layout\s*{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) 410px/s.test(css),
  /@media \(min-width: 1181px\)[\s\S]*?\.profile-sidebar\s*{[^}]*position:\s*sticky[^}]*grid-column:\s*2/s.test(css),
  /@media \(min-width: 1181px\)[\s\S]*?\.schedule-page-layout,[\s\S]*?\.updates-layout\s*{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) 320px/s.test(css),
  /@media \(min-width: 1280px\) and \(max-width: 1599px\)[\s\S]*?\.season-page-grid,[\s\S]*?\.bookmarks-page-grid\s*{[^}]*repeat\(6,/s.test(css),
  /\.directory-toolbar\s*{[^}]*align-items:\s*end[^}]*min-height:\s*70px[^}]*background:\s*var\(--surface\)/s.test(css),
  css.includes(".toolbar-caption"),
];
add(
  "css.wideDirectoryComposition",
  "CSS: композиция профиля и каталогов на больших экранах",
  wideDirectoryLayoutChecks.every(Boolean),
  wideDirectoryLayoutChecks.every(Boolean)
    ? "профиль центрирует identity и ставит статистику справа; расписание/обновления имеют выровненный sidebar, сезон/закладки — 6 крупных постеров"
    : "desktop-композиция профиля, каталогов или панелей управления расходится с контрактом",
);

const profileSource = read("profile.html");
const profileViewingTokens = [
  "Статистика просмотра",
  "тайтлов в списке",
  "серий просмотрено",
  "время просмотра",
  "серии за 7 дней",
  "profile-dynamics__summary",
  "watch-chart__scale",
  "watch-chart__bar is-today",
  "серии за неделю",
  "4,9 серии в день",
];
const missingProfileViewingTokens = profileViewingTokens.filter((token) => !profileSource.includes(token));
add(
  "html.profileViewingStats",
  "HTML: профиль показывает измеримую статистику просмотра",
  missingProfileViewingTokens.length === 0,
  missingProfileViewingTokens.length
    ? `Не найдены: ${missingProfileViewingTokens.join(", ")}`
    : "четыре профильные метрики и недельный график содержат числа серий, даты, итог и среднее",
);

const profileChartCssTokens = [
  ".profile-metrics div > svg",
  ".profile-dynamics__head",
  ".watch-chart__scale",
  ".watch-chart__line--middle",
  ".watch-chart__bar > b",
  ".watch-chart__bar.is-today > span",
  ".profile-dynamics__footer",
];
const missingProfileChartCss = profileChartCssTokens.filter((token) => !css.includes(token));
add(
  "css.profileViewingChart",
  "CSS: читаемый график просмотра серий",
  missingProfileChartCss.length === 0,
  missingProfileChartCss.length
    ? `Не найдены: ${missingProfileChartCss.join(", ")}`
    : "график имеет шкалу, сетку, точные значения, даты и выделение текущего дня",
);

const sliderCssTokens = [
  ".feature-slider",
  ".feature-slide.is-active",
  ".feature-slider__controls",
  ".feature-slider__pagination",
  ".feature-slider__nav",
  ".feature-slider__progress",
  "@keyframes hero-progress",
  "touch-action: pan-y",
  "width: min(100%, 1600px)",
  "#000 15%, #000 85%",
  "height: 580px",
];
const missingSliderCss = sliderCssTokens.filter((token) => !css.includes(token));
add(
  "css.heroSlider",
  "CSS: адаптивный hero-слайдер",
  missingSliderCss.length === 0,
  missingSliderCss.length ? `Не найдены: ${missingSliderCss.join(", ")}` : "desktop hero использует центральный sharp-art 1600 px, симметричное растворение краёв и safe-area; mobile composition, controls и progress оформлены",
);

const continueCssTokens = [
  ".continue-grid",
  "grid-auto-flow: column",
  "scroll-snap-type: x mandatory",
  ".continue-progress-copy",
  ".continue-progress",
  ".continue-remove",
  ".continue-nav",
  "grid-auto-columns: 320px",
  "grid-auto-columns: 44vw",
];
const missingContinueCss = continueCssTokens.filter((token) => !css.includes(token));
add(
  "css.continueRail",
  "CSS: горизонтальная история просмотра",
  missingContinueCss.length === 0,
  missingContinueCss.length ? `Не найдены: ${missingContinueCss.join(", ")}` : "16:9 rail, progress overlay, remove action, snap и навигация оформлены",
);

const titleMobileCssTokens = [
  ".title-mobile-toolbar",
  ".title-mobile-actions",
  ".title-mobile-count",
  ".title-mobile-watch",
  ".title-list-dialog",
  ".mobile-subscribe-dialog",
  ".title-community-actions",
  ".title-subscription-icon",
  ".title-meta-flag",
  "@keyframes bottom-sheet-in",
];
const missingTitleMobileCss = titleMobileCssTokens.filter((token) => !css.includes(token));
const titleMobileLayoutChecks = [
  /\.title-meta-list\s*{[^}]*display:\s*flex[^}]*flex-direction:\s*column/s.test(baseCss),
  /\.title-meta-list > li\s*{[^}]*display:\s*flex/s.test(baseCss),
  /\.title-mobile-actions\s*{[^}]*width:\s*min\(100%, 520px\)[^}]*grid-template-columns:/s.test(mediaSource(720)),
  !/\.title-meta-list[^,{]*::after/.test(css),
  /\.title-poster\s*{[^}]*width:\s*100%[^}]*aspect-ratio:/s.test(mediaSource(720)),
  /\.title-description\s*{[^}]*background:\s*transparent/s.test(mediaSource(720)),
  /\.title-hero\s*{[^}]*overflow:\s*visible/s.test(baseCss),
  /\.title-hero\s*{[^}]*overflow:\s*hidden/s.test(mediaSource(720)),
  /\.title-layout\s*{[^}]*grid-template-columns:\s*340px/s.test(baseCss),
];
add(
  "css.titleMobile",
  "CSS: mobile title hierarchy",
  missingTitleMobileCss.length === 0 && titleMobileLayoutChecks.every(Boolean),
  missingTitleMobileCss.length
    ? `Не найдены: ${missingTitleMobileCss.join(", ")}`
    : titleMobileLayoutChecks.every(Boolean)
      ? "верхний bell, компактные действия, естественные metadata-строки без разделителей и оба mobile sheet оформлены"
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
const directoryJsTokens = [
  "function initDirectoryPages",
  "function applyListFilter",
  "data-page-tabs",
  "data-list-filter",
  "data-local-search",
  "dataset.filterTags",
];
const missingDirectoryJs = directoryJsTokens.filter((token) => !js.includes(token));
add(
  "js.directoryPages",
  "JS: навигация и фильтры новых разделов",
  missingDirectoryJs.length === 0,
  missingDirectoryJs.length ? `Не найдены: ${missingDirectoryJs.join(", ")}` : "табы, статусные фильтры, локальный поиск и синхронизация закладок подключены",
);
add(
  "js.titleStatusTone",
  "JS: выбранный статус окрашивает кнопку тайтла",
  js.includes("control.dataset.bookmarkTone = state.listStatus") && js.includes("delete control.dataset.bookmarkTone"),
  "desktop и mobile list triggers получают общий data-bookmark-tone",
);
add(
  "js.headerSearch",
  "JS: non-modal поиск",
  js.includes("dialog.show()") && js.includes("function closeSearch") && js.includes("data-search-filter-toggle") && js.includes("data-search-clear-recent"),
  js.includes("dialog.show()") && js.includes("function closeSearch") && js.includes("data-search-filter-toggle") && js.includes("data-search-clear-recent") ? "поиск раскрывается без showModal; очистка, фильтры и недавние управляются отдельными сценариями" : "поиск снова использует modal-сценарий или потерял интерактивные состояния",
);
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
  "data-continue-rail",
  "data-continue-next",
  "data-open-mobile-list",
  "data-open-title-notifications",
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
  'headingTitle.textContent = "В мой список"',
  'menu.addEventListener("click", (event) => {\n        event.preventDefault();',
];
const missingBookmarkBehavior = bookmarkBehaviorTokens.filter((token) => !js.includes(token));
const copiedStatusColors = ["#22c55e", "#3b82f6", "#a855f7", "#ef4444", "#eab308"].filter((color) => js.includes(color));
add(
  "js.bookmarks",
  "JS: статусы закладок",
  missingBookmarkStatuses.length === 0 && missingBookmarkBehavior.length === 0 && copiedStatusColors.length === 0,
  missingBookmarkStatuses.length || missingBookmarkBehavior.length || copiedStatusColors.length
    ? `Проблемы: ${[...missingBookmarkStatuses, ...missingBookmarkBehavior, ...copiedStatusColors].join(", ")}`
    : "5 статусов используют токены темы; desktop overlay остаётся внутри постера, mobile sheet, явное удаление, сохранение и синхронизация присутствуют",
);

const indexSource = read("index.html");
const animeSource = read("anime.html");
const posterFactsChecks = [
  !indexSource.includes('class="score-badge"'),
  !indexSource.includes('class="episode-badge"'),
  !animeSource.includes('class="score-badge"'),
  count(indexSource, /class="card-facts"/g) >= 9,
  count(animeSource, /class="card-facts"/g) >= 4,
  /class="card-facts"><span>\d+ \/ (?:\d+|\?) эп\.<\/span><b/.test(indexSource),
];
add(
  "html.posterFacts",
  "HTML: серии и рейтинг под названием",
  posterFactsChecks.every(Boolean),
  posterFactsChecks.every(Boolean)
    ? "рейтинг и количество серий убраны с изображения; под названием показаны вышедшие/всего серии и компактная оценка"
    : "на постере остались лишние badges или карточки потеряли строку серий/рейтинга",
);
const heroSlideCount = count(indexSource, /data-hero-slide\b/g);
add(
  "html.heroSlider",
  "HTML: hero-слайдер",
  heroSlideCount === 5
    && indexSource.includes("data-hero-pause")
    && indexSource.includes("data-hero-live")
    && indexSource.includes("feature-slider__pagination")
    && indexSource.includes("feature-slider__nav"),
  `${heroSlideCount} слайдов, разнесённые controls, pause и live-status`,
);
const continueCardCount = count(indexSource, /class="continue-card"/g);
add(
  "html.continueRail",
  "HTML: история просмотра как 16:9 rail",
  continueCardCount === 5
    && count(indexSource, /class="continue-progress-copy"/g) === 5
    && count(indexSource, /class="continue-progress"/g) === 5
    && count(indexSource, /data-remove-card/g) === 5
    && indexSource.includes("data-continue-prev")
    && indexSource.includes("data-continue-next"),
  `${continueCardCount} карточек с оставшимся временем, процентом, удалением и стрелками`,
);
const titleInteractionTokens = ["title-mobile-toolbar", "mobile-list-menu", "mobile-list-label", "mobile-subscribe-menu", "title-mobile-watch"];
const missingTitleInteractions = titleInteractionTokens.filter((token) => !animeSource.includes(token));
const mobileListTriggerStart = animeSource.indexOf('id="mobile-list-trigger"');
const mobileListTriggerSource = animeSource.slice(mobileListTriggerStart, animeSource.indexOf("</button>", mobileListTriggerStart));
const titleMetaStart = animeSource.indexOf('class="title-meta-list"');
const titleMetaSource = animeSource.slice(titleMetaStart, animeSource.indexOf("</ul>", titleMetaStart));
const naturalTitleMetadata = titleMetaStart >= 0
  && count(titleMetaSource, /<li>/g) === 5
  && !/<small>|<strong>/.test(titleMetaSource)
  && !/Страна|Эпизоды|Формат|Показ/.test(titleMetaSource);
add(
  "html.titleMobile",
  "HTML: мобильный тайтл и список",
  missingTitleInteractions.length === 0
    && count(animeSource, /data-list-status=/g) === 12
    && !mobileListTriggerSource.includes("bookmark-plus")
    && naturalTitleMetadata,
  missingTitleInteractions.length
    ? `Не найдены: ${missingTitleInteractions.join(", ")}`
    : "mobile status без лишней ведущей иконки, 5 естественных metadata-строк и 5 статусов с отдельным удалением синхронизированы",
);
const mobileToolbarStart = animeSource.indexOf('class="title-mobile-toolbar"');
const mobileToolbarEnd = animeSource.indexOf('</div>', mobileToolbarStart);
const mobileToolbarSource = animeSource.slice(mobileToolbarStart, mobileToolbarEnd);
const communityStart = animeSource.indexOf('class="title-community-actions"');
const communityEnd = animeSource.indexOf('</div>', communityStart);
const communitySource = animeSource.slice(communityStart, communityEnd);
add(
  "html.titleNotifications",
  "HTML: адаптивные уведомления без дублей",
  communityStart >= 0
    && communitySource.includes("data-open-title-notifications")
    && mobileToolbarSource.includes("data-open-title-notifications")
    && !mobileToolbarSource.includes("data-open-mobile-list")
    && count(animeSource, /data-open-title-notifications/g) === 2
    && !animeSource.includes('id="subscribe-trigger"')
    && count(animeSource, /id="mobile-subscribe-menu"/g) === 1
    && css.includes(".title-subscription-popover")
    && js.includes("titleSubscriptionSheetQuery")
    && js.includes("dialog.show()"),
  "desktop trigger открывает non-modal dropdown под постером; mobile trigger использует тот же компонент как bottom sheet",
);
const mobileActionsStart = animeSource.indexOf('class="title-mobile-actions"');
const mobileActionsEnd = animeSource.indexOf('</div>', mobileActionsStart);
const mobileActionsSource = animeSource.slice(mobileActionsStart, mobileActionsEnd);
add(
  "html.titleCounters",
  "HTML: счётчики списков и комментариев",
  count(animeSource, /data-field="favorites_count"/g) === 2
    && count(animeSource, /data-field="comments_count"/g) === 2
    && count(mobileActionsSource, /<strong data-field="(?:favorites|comments)_count">/g) === 2
    && count(communitySource, /<strong data-field="(?:favorites|comments)_count">/g) === 2,
  "favorites_count и comments_count визуально показаны в mobile actions и desktop community strip",
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
  !animeSource.includes("details-title")
    && !animeSource.includes("Карточка тайтла")
    && !animeSource.includes('class="details-list"')
    && !animeSource.includes('class="title-stats"'),
  "метаданные представлены один раз в title hero; отдельные статистические плитки отсутствуют",
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
