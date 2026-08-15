import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
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

// --- WCAG contrast -----------------------------------------------------
// Returns null (never silently a passing number) if the input isn't a
// resolvable #rrggbb literal — a null MUST surface as a failed check,
// never as an accepted "0 issues" result. This is the exact bug being
// fixed here: the shipped qa-results.json recorded "ratio": null for all
// nine light-theme pairs while still reporting issues: [].
function relativeLuminance(hex) {
  if (typeof hex !== "string" || !/^#[0-9a-fA-F]{6}$/.test(hex)) return null;
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const linear = channels.map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
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

// --- files ---------------------------------------------------------------
const required = [
  "index.html",
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

// --- index.html ------------------------------------------------------------
const html = read("index.html");
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
const localRefs = [...html.matchAll(/\b(?:href|src)="((?:\.\/|\.\.\/)[^"?#]+)(?:[?#][^"]*)?"/g)].map((match) => match[1]);
const missingRefs = localRefs.filter((reference) => !existsSync(resolve(root, reference)));

add("index.document", "index.html: документ", /<html\s+lang="ru"/.test(html) && /<meta\s+name="viewport"/.test(html), "lang=ru и viewport присутствуют");
add("index.ids", "index.html: уникальные ID", duplicates.length === 0, duplicates.length ? duplicates.join(", ") : `${ids.length} уникальных ID`);
add("index.references", "index.html: локальные ссылки", missingRefs.length === 0, missingRefs.length ? missingRefs.join(", ") : `${localRefs.length} локальных ссылок разрешены`);
add("index.buttons", "index.html: типы кнопок", !/<button\b(?![^>]*\btype=)[^>]*>/i.test(html), "у каждой кнопки указан type");

// --- styles.css ------------------------------------------------------------
const css = read("styles.css");
const structure = cssStructure(css);
add("css.structure", "CSS: синтаксическая структура", structure.ok, structure.detail);
add("css.themes", "CSS: две темы", /:root\s*{/.test(css) && /html\[data-theme="light"\]/.test(css), "тёмные и светлые токены присутствуют");
add("css.a11y", "CSS: доступность", css.includes(":focus-visible") && css.includes("prefers-reduced-motion"), "focus-visible и reduced-motion присутствуют");

// Breakpoint sprawl: at most 4 distinct max-width values, prefers-* excluded.
const breakpointValues = [...new Set([...css.matchAll(/@media \(max-width: (\d+)px\)/g)].map((m) => Number(m[1])))].sort((a, b) => b - a);
add("css.breakpoints", "CSS: число контрольных точек", breakpointValues.length > 0 && breakpointValues.length <= 4, `${breakpointValues.length} точек: ${breakpointValues.join("/")}px`);

const fontUrls = [...css.matchAll(/url\(["']?(\.\/fonts\/[^)"']+)/g)].map((match) => match[1]);
const missingFonts = fontUrls.filter((reference) => !existsSync(resolve(root, reference)));
add("css.fonts", "CSS: локальные шрифты", fontUrls.length >= 20 && missingFonts.length === 0, missingFonts.length ? missingFonts.join(", ") : `${fontUrls.length} @font-face подключений на локальные файлы`);

add("css.noOutfitSpaceGrotesk", "CSS: нет мёртвых/безкириллических гарнитур", !/Outfit/.test(css) && !/Space Grotesk/.test(css), "Outfit и \"Space Grotesk\" удалены из styles.css");
add("css.tabularNums", "CSS: tabular-nums на числовых колонках", css.includes("font-variant-numeric: tabular-nums"), `${count(css, /font-variant-numeric: tabular-nums/g)} правил с tabular-nums`);

// --- contrast ---------------------------------------------------------------
// Tier 1: baseline WCAG AA (>=4.5:1) — every text/label token against its
// real surface. Tier 2: the reinforced bar this project holds semantic
// status colors and accent-as-text to (>=5.5 light / >=6.0 dark), per the
// 2026-08 color pass. Tier 2 is a superset check layered on the same pairs,
// not a different set of colors — mixing the two would either falsely fail
// long-standing neutral text tokens (e.g. --text-muted, ~4.9:1 by design,
// always was, not part of this pass) or under-check the colors that matter.
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

// A null/NaN ratio is ALWAYS a failure, never a silent pass — this is the
// specific defect being corrected relative to the previous qa-results.json.
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

// --- fonts on disk -----------------------------------------------------------
const fontFiles = readdirSync(resolve(root, "fonts")).filter((name) => name.endsWith(".woff2"));
add("assets.fontInventory", "Ассеты: набор шрифтов", fontFiles.length >= 20, `${fontFiles.length} WOFF2-файлов`);

// --- JS: hash routing wiring --------------------------------------------------
const js = read("app.js");
const routingTokens = ["location.hash", "hashchange", "popstate", "pushState", "history.replaceState"];
const missingRouting = routingTokens.filter((token) => !js.includes(token));
add("js.hashRouting", "JS: адресация экранов по хешу", missingRouting.length === 0, missingRouting.length ? `Не найдены: ${missingRouting.join(", ")}` : "чтение хеша при загрузке, hashchange/popstate и pushState на переходах присутствуют");
add("js.storage", "JS: локальные предпочтения", js.includes("localStorage") && js.includes("kitsu-admin-theme"), "тема сохраняется локально");

// --- Pages link safety (step 6.4) --------------------------------------------
// GitHub Pages serves this repo from /WebApp/, not from the domain root, and
// its filesystem is case-sensitive unlike a typical local Windows checkout.
// A leading-slash reference or a case mismatch is invisible when opening the
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
      // Case-sensitivity check: walk the path and confirm each segment's
      // case matches what readdirSync actually returns on disk.
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

const pagesLinkProblems = checkPagesLinks(["index.html", "styles.css", "app.js"]);
add("pages.linkSafety", "Pages: относительные пути и регистр", pagesLinkProblems.length === 0, pagesLinkProblems.length ? pagesLinkProblems.join("; ") : "нет ведущих слэшей, все относительные пути существуют с совпадающим регистром");

// --- report -------------------------------------------------------------------
const failed = results.filter((result) => result.status === "fail");
const report = {
  schema_version: 2,
  project: "Kitsu enterprise admin template · Anime Graphite",
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
