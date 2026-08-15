# QA report — Kitsu Public Anime Graphite

Дата последней сверки документа с `qa-results.json`: 15 августа 2026 года.

## Итог

- `28/28` автоматических статических checks — pass (`node tools/qa.mjs`);
- `2/2` HTML documents разобраны без parser errors;
- `0` duplicate IDs;
- `0` unresolved `aria-controls`, `aria-labelledby` и label `for` references;
- `0` отсутствующих локальных HTML/CSS assets;
- `0` buttons без явного `type`;
- `0` images без `alt`;
- `0` bare `href="#"`/`javascript:` links;
- CSS: `673` сбалансированных block, контрольные точки `1180`/`920`/`720`/`460 px`;
- `node --check app.js` — pass;
- `24` локальных WOFF2 font-файлов подключено;
- `11` ключевых JS interaction families обнаружены QA-script;
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
- bookmark/list/subscription local states;
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

Исходное ограничение (browser runtime без доступа к preview server) снято: последующие сессии подтвердили headless Chromium через `playwright-core` и добавили реальные screenshot/interaction прогоны — theme toggle, search dialog (trending → результаты), catalog filters (включая новую вкладку «Анонсы»), day-tabs расписания, hover-состояния карточек, мобильные/планшетные ширины `390`/`900`/`1440 px`. Console errors и duplicate ids проверены на каждом прогоне — не найдено.

Не заменяет полноценный проектный Playwright/CI на реальном frontend перед production merge — минимальная matrix остаётся: `360×800`, `390×844`, `768×1024`, `1024×768`, `1440×900`; обе темы; search, drawer, tabs, list/subscription, player, episodes, dialogs, comments; horizontal overflow и console errors.

## Граница результата

Автономный HTML проверяет дизайн, responsive contracts и локальные interaction states. Он не подтверждает production API, auth, HLS/Kodik playback, caching, SSR hydration или mutation rollback. Эти gates выполняются только после переноса в фактическую ветку.
