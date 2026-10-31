// Builds vendor/lucide.min.js with only the icons the templates use.
// The full Lucide bundle (~350 KB) was parsed on every page load; the subset is a few KB.
// Source of truth for icon shapes: tools/vendor/lucide-0.460.0.full.js (unchanged upstream file).
// Usage: node tools/lucide-subset.mjs   (run again after adding a new icon name)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const full = read('tools/vendor/lucide-0.460.0.full.js');
const ctx = {}; ctx.self = ctx; ctx.globalThis = ctx;
createContext(ctx);
runInContext(full, ctx);
const icons = ctx.lucide.icons;
const pascal = name => name.replace(/(\w)(\w*)(_|-|\s*)/g, (_, a, b) => a.toUpperCase() + b.toLowerCase());

// Every quoted string or attribute value that names a Lucide icon counts as used: this catches
// icons built from data (`icon(op.icon)`, `{ icon: "play" }`) as well as literal markup.
const sources = ['public', 'admin'].flatMap(dir => readdirSync(new URL(dir + '/', root))
  .filter(file => /\.(html|js)$/.test(file) && !file.startsWith('lucide'))
  .map(file => read(`${dir}/${file}`)));
const used = new Set();
for (const text of sources) {
  for (const [, name] of text.matchAll(/["'`=]([a-z][a-z0-9]*(?:-[a-z0-9]+)*)["'`\s>]/g)) {
    if (icons[pascal(name)]) used.add(name);
  }
}
const table = Object.fromEntries([...used].sort().map(name => [name, icons[pascal(name)]]));

const runtime = `/**
 * @license lucide v0.460.0 - ISC (subset: ${used.size} icons, built by tools/lucide-subset.mjs)
 * This source code is licensed under the ISC license. See LUCIDE-LICENSE.txt.
 */
(() => {
  "use strict";
  const ICONS = ${JSON.stringify(table)};
  const NS = "http://www.w3.org/2000/svg";
  const make = ([tag, attrs, children = []]) => {
    const el = document.createElementNS(NS, tag);
    for (const key of Object.keys(attrs)) el.setAttribute(key, String(attrs[key]));
    for (const child of children) el.appendChild(make(child));
    return el;
  };
  // Same contract as lucide.createIcons: replaces [data-lucide] placeholders with SVG,
  // element attributes win over defaults, classes are merged. \`root\` narrows the search.
  function createIcons({ nameAttr = "data-lucide", attrs = {}, root = document } = {}) {
    root.querySelectorAll(\`[\${nameAttr}]\`).forEach(node => {
      if (node.namespaceURI === NS) return;
      const name = node.getAttribute(nameAttr);
      const icon = ICONS[name];
      if (!icon) { console.warn(\`[icons] нет иконки «\${name}» в наборе: запустите node tools/lucide-subset.mjs\`); return; }
      const own = {};
      for (const a of node.attributes) own[a.name] = a.value;
      const [tag, defaults, children] = icon;
      const merged = { ...defaults, "data-lucide": name, ...attrs, ...own };
      const classes = ["lucide", \`lucide-\${name}\`, ...String(own.class || "").split(" "), ...String(attrs.class || "").split(" ")]
        .map(c => c.trim()).filter((c, i, list) => c && list.indexOf(c) === i).join(" ");
      merged.class = classes;
      node.parentNode?.replaceChild(make([tag, merged, children]), node);
    });
  }
  window.lucide = { createIcons, icons: ICONS };
})();
`;
for (const dir of ['public', 'admin']) writeFileSync(new URL(`${dir}/vendor/lucide.min.js`, root), runtime);
console.log(`lucide subset: ${used.size} icons, ${(runtime.length / 1024).toFixed(1)} KB`);
