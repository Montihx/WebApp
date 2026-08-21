# QA report — Kitsu Public Anime Graphite

Дата последней сверки документа с `qa-results.json`: 21 августа 2026 года.

## Итог

- `31/31` автоматических статических проверок — pass (`node tools/qa.mjs`);
- `29/29` браузерных проверок — pass (Chrome for Testing + Playwright);
- `2/2` HTML documents разобраны без parser errors;
- `0` duplicate IDs;
- `0` unresolved `aria-controls`, `aria-labelledby` и label `for` references;
- `0` отсутствующих локальных HTML/CSS assets;
- `0` buttons без явного `type`;
- `0` images без `alt`;
- `0` bare `href="#"`/`javascript:` links;
- CSS: `717` сбалансированных блоков, контрольные точки `1180`/`920`/`720`/`460 px`;
- `node --check app.js` — pass;
- `24` локальных WOFF2 font-файлов подключено;
- `11` ключевых JS interaction families и отдельный пятистатусный bookmark-сценарий обнаружены QA-script;
- сетка постеров подтверждена как `6/5/4/3/2` колонок на desktop/tablet/mobile gates;
- отдельный runtime-harness: `12/12` — меню, выбор, повторное снятие, persistence, синхронизация дубликатов и keyboard focus;
- browser runtime: карточка `213.9 px` при `1440 px`, меню полностью читается на `390 px`, horizontal overflow `0 px` на всех контрольных ширинах;
- `18` contrast pairs (9 на тему), минимум `4.97:1`.

Полный machine-readable результат: `qa-results.json`. Повторный запуск:

```bash
node --check app.js
node tools/qa.mjs --write
```

## Проверенные сценарии по коду и разметке

- theme persistence и синхронизация `theme-color`;
- global search, keyboard navigation и empty result;
- menus/popovers, outside click и mobile drawer focus;
- catalog/schedule roving tabs;
- bookmark overlay на постере, пять статусов на токенах темы, компактный статусный чип, тонкий нижний маркер, persistence и синхронизация одинаковых тайтлов;
- list/subscription local states;
- dialogs, backdrop/Escape close и focus trap;
- source/translation summary и player controls;
- episode selection, incremental load и grid/list view;
- remote image failure state;
- `prefers-reduced-motion`.

## Контраст

| Pair | Ratio |
| --- | ---: |
| Dark text / surface | `15.72:1` |
| Dark secondary / surface | `8.75:1` |
| Dark muted / surface | `4.98:1` |
| Dark primary | `14.96:1` |
| Dark accent text / surface | `10.76:1` |
| Light text / surface | `15.74:1` |
| Light secondary / surface | `6.83:1` |
| Light muted / surface | `4.97:1` |
| Light primary | `16.73:1` |
| Light accent text / surface | `13.32:1` |

Полный набор — 18 пар (9 на тему, включает green/amber/red/info) в `qa-results.json`; таблица выше — только репрезентативная выборка.

## Ограничение среды

Изменения проверены в реальном Chrome for Testing: dark/light desktop и мобильное меню просмотрены по контрольным снимкам, все `29/29` interaction/layout checks прошли, JavaScript console/page errors — `0`.

В изолированной среде внешние poster URL Shikimori возвращали transport errors. Это не скрыто как успешная загрузка: сработало штатное состояние «Изображение недоступно», а геометрия карточек, bookmark overlay, статусный чип и нижний маркер остались корректными. Сами production-постеры этим прогоном не подтверждаются.

Перед production merge остаётся обязательной браузерная matrix: `360×800`, `390×844`, `768×1024`, `1024×768`, `1440×900`; обе темы; bookmark menu/status chip/marker, search, drawer, tabs, list/subscription, player, episodes, dialogs, comments; horizontal overflow и console errors.

## Граница результата

Автономный HTML проверяет дизайн, responsive contracts и локальные interaction states. Он не подтверждает production API, auth, HLS/Kodik playback, caching, SSR hydration или mutation rollback. Эти gates выполняются только после переноса в фактическую ветку.
