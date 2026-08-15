import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
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

function relativeLuminance(hex) {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(foreground, background) {
  const values = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

const required = [
  ...pages,
  "styles.css",
  "app.js",
  "vendor/lucide.min.js",
  "vendor/LUCIDE-LICENSE.txt",
  "fonts/MANROPE-LICENSE.txt",
  "fonts/OUTFIT-LICENSE.txt",
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

const contrastPairs = [
  ["#f3f2f4", "#0d0d0f"], ["#b9b6bc", "#19191c"], ["#8b8790", "#19191c"],
  ["#171719", "#eceaec"], ["#c392b7", "#0d0d0f"], ["#252225", "#f5f4f2"],
  ["#5e5960", "#ffffff"], ["#746e74", "#ffffff"], ["#ffffff", "#381932"],
  ["#5b344f", "#f5f4f2"],
];
const contrastValues = contrastPairs.map(([foreground, background]) => contrastRatio(foreground, background));
const minimumContrast = Math.min(...contrastValues);
add("css.contrast", "CSS: контраст токенов", minimumContrast >= 4.5, `${contrastPairs.length} пар, минимум ${minimumContrast.toFixed(2)}:1`);

const fontUrls = [...css.matchAll(/url\(["']?(\.\/fonts\/[^)"']+)/g)].map((match) => match[1]);
const missingFonts = fontUrls.filter((reference) => !existsSync(resolve(root, reference)));
add("css.fonts", "CSS: локальные шрифты", fontUrls.length >= 8 && missingFonts.length === 0, missingFonts.length ? missingFonts.join(", ") : `${fontUrls.length} локальных файлов подключено`);

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
];
const missingCapabilities = jsCapabilities.filter((token) => !js.includes(token));
add("js.capabilities", "JS: ключевые сценарии", missingCapabilities.length === 0, missingCapabilities.length ? `Не найдены: ${missingCapabilities.join(", ")}` : `${jsCapabilities.length} сценариев покрыто`);
add("js.storage", "JS: локальные предпочтения", js.includes("localStorage") && js.includes("kitsu-theme"), "тема и демонстрационные состояния сохраняются локально");

const fontFiles = readdirSync(resolve(root, "fonts")).filter((name) => name.endsWith(".woff2"));
add("assets.fontInventory", "Ассеты: набор шрифтов", fontFiles.length >= 10, `${fontFiles.length} WOFF2-файлов`);

const failed = results.filter((result) => result.status === "fail");
const report = {
  schema_version: 1,
  project: "Kitsu public template · Anime Graphite",
  generated_at: new Date().toISOString(),
  summary: {
    status: failed.length ? "fail" : "pass",
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
  },
  results,
};

const rendered = `${JSON.stringify(report, null, 2)}\n`;
if (process.argv.includes("--write")) writeFileSync(resolve(root, "qa-results.json"), rendered);
process.stdout.write(rendered);
if (failed.length) process.exitCode = 1;
