// Сторож «признаков ИИ-шаблона» (01.11.2026). Считает эффекты и разброс значений в стилях и скриптах
// сайта и админки. Потолки равны текущим значениям и только опускаются: каждый PR, убравший эффект,
// опускает свой потолок; новый шаблонный приём не пройдёт тест. Финальные цели — в CEILINGS_TARGET.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import postcss from 'postcss';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const listed = (dir, ext) => readdirSync(new URL(dir, root)).filter(name => name.endsWith(ext) && !/lucide|\.min\./.test(name)).map(name => `${dir}${name}`);

const strip = css => css.replace(/\/\*[\s\S]*?\*\//g, '');
const cssOf = files => files.map(file => strip(read(file))).join('\n');
const jsOf = files => files.map(file => read(file)).join('\n');
const count = (text, re) => (text.match(re) || []).length;
// Цветные градиенты: слои с акцентом, «огнём», закладкой или насыщенным цветом. Затемнения и маски под текст не в счёте.
// Превью палитры (`swatch`) — это сами образцы цвета, не оформление.
const coloredGradients = css => {
  let n = 0;
  postcss.parse(css).walkDecls(decl => {
    if (!/gradient\(/.test(decl.value) || /swatch/.test(decl.parent.selector || '')) return;
    for (const layer of splitTop(decl.value)) {
      if (!/(?:linear|radial|conic)-gradient\(/.test(layer)) continue;
      if (/--accent|--kitsunebi|--kin\b|--aurora|--bookmark|--moon/.test(layer)) { n += 1; continue; }
      for (const m of layer.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)) {
        const h = m[1].length === 3 ? [...m[1]].map(c => c + c).join('') : m[1];
        const c = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
        if (Math.max(...c) - Math.min(...c) > 24) { n += 1; break; }
      }
    }
  });
  return n;
};
function splitTop(value) {
  const out = []; let depth = 0, cur = '';
  for (const ch of value) { if (ch === '(') depth++; if (ch === ')') depth--; if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch; }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
const distinct = (text, re) => new Set([...text.matchAll(re)].map(m => m[1].trim().toLowerCase())).size;

export function measure() {
  const siteCss = cssOf([...listed('public/', '.css'), 'tokens.css']);
  const adminCss = cssOf(listed('admin/', '.css'));
  const siteJs = jsOf(listed('public/', '.js'));
  const adminJs = jsOf(listed('admin/', '.js'));
  const siteHtml = listed('public/', '.html').map(file => read(file)).join('\n');
  const layer = (css, re) => count(css, re);
  return {
    site: {
      fontSizes: distinct(siteCss, /font-size:\s*([^;}]+)/g),
      radii: distinct(siteCss, /border(?:-(?:top|bottom)-(?:left|right))?-radius:\s*([^;}]+)/g),
      gradients: coloredGradients(siteCss),
      gradientText: layer(siteCss, /background-clip:\s*text/g),
      backdropFilters: layer(siteCss, /backdrop-filter:/g),
      glows: layer(siteCss, /(?:box-shadow|drop-shadow|text-shadow)[^;{}]*-glow/g),
      keyframes: layer(siteCss, /@keyframes\s/g),
      accentGradUses: layer(siteCss + siteJs + siteHtml, /var\(--accent-grad/g),
      sectionKickers: layer(siteHtml, /section-kicker/g),
      ambientParticles: layer(siteJs, /function initAmbient/g),
      pointerTilt: layer(siteJs, /style\.setProperty\(["'`]--m[xy]["'`]/g),
      countUp: layer(siteJs, /function countUp/g),
      scrollReveal: layer(siteJs, /classList\.add\(["']is-in["']\)/g),
    },
    admin: {
      fontSizes: distinct(adminCss, /font-size:\s*([^;}]+)/g),
      radii: distinct(adminCss, /border(?:-(?:top|bottom)-(?:left|right))?-radius:\s*([^;}]+)/g),
      gradients: coloredGradients(adminCss),
      backdropFilters: layer(adminCss, /backdrop-filter:/g),
      glows: layer(adminCss, /(?:box-shadow|drop-shadow|text-shadow)[^;{}]*-glow/g),
      keyframes: layer(adminCss, /@keyframes\s/g),
      accentGradUses: layer(adminCss + adminJs, /var\(--accent-grad/g),
      aurora: layer(adminCss, /--aurora-\d/g),
      countUp: layer(adminJs, /data-count=/g),
    },
  };
}

// Потолки: значения на коммите b191fb9 (считает этот же тест: токены, html и js включены). Опускать, не поднимать.
export const CEILINGS = {
  site: { fontSizes: 12, radii: 10, gradients: 4, gradientText: 0, backdropFilters: 3, glows: 0, keyframes: 8, accentGradUses: 2, sectionKickers: 0, ambientParticles: 0, pointerTilt: 0, countUp: 0, scrollReveal: 0 },
  admin: { fontSizes: 13, radii: 13, gradients: 7, backdropFilters: 4, glows: 10, keyframes: 8, accentGradUses: 9, aurora: 3, countUp: 4 },
};
// Цели финала (раздел «Готово, когда» промта). Тест ниже печатает расстояние до них.
export const TARGET = {
  site: { fontSizes: 12, radii: 8, gradients: 12, gradientText: 0, backdropFilters: 3, glows: 0, keyframes: 8, accentGradUses: 4, sectionKickers: 0, ambientParticles: 0, pointerTilt: 0, countUp: 0, scrollReveal: 0 },
  admin: { fontSizes: 12, radii: 8, gradients: 4, backdropFilters: 3, glows: 0, keyframes: 4, accentGradUses: 2, aurora: 0, countUp: 0 },
};

test('design tells never grow past their ceilings', () => {
  const now = measure();
  for (const area of Object.keys(CEILINGS)) {
    for (const [key, ceiling] of Object.entries(CEILINGS[area])) {
      assert.ok(now[area][key] <= ceiling, `${area}.${key}: ${now[area][key]} > потолок ${ceiling} — шаблонный приём вернулся или потолок не опущен после чистки`);
    }
  }
});

test('ceilings are tight: lowered right after a cleanup', () => {
  const now = measure();
  const loose = [];
  for (const area of Object.keys(CEILINGS)) {
    for (const [key, ceiling] of Object.entries(CEILINGS[area])) {
      if (now[area][key] < ceiling) loose.push(`${area}.${key}: ${now[area][key]} < потолок ${ceiling} — опусти потолок`);
    }
  }
  assert.deepEqual(loose, [], 'потолок выше достигнутого значения: опусти его, иначе эффект сможет вернуться');
});
