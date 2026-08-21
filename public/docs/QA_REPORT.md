# QA report — Kitsu Public Anime Graphite

Дата последней сверки документа с `qa-results.json`: 21 августа 2026 года.

## Итог

- `37/37` автоматических статических проверок — pass (`node tools/qa.mjs`);
- `95/95` браузерных проверок — pass: `58` regression + `37` целевых для hero/title/player (Chrome for Testing + Playwright);
- `2/2` HTML documents разобраны без parser errors;
- `0` duplicate IDs;
- `0` unresolved `aria-controls`, `aria-labelledby` и label `for` references;
- `0` отсутствующих локальных HTML/CSS assets;
- `0` buttons без явного `type`;
- `0` images без `alt`;
- `0` bare `href="#"`/`javascript:` links;
- CSS: структура из `845` блоков сбалансирована, контрольные точки `1180`/`920`/`720`/`460 px`;
- `node --check app.js` — pass;
- `24` локальных WOFF2 font-файлов подключено;
- `15` ключевых JS interaction families и отдельный пятистатусный bookmark-сценарий обнаружены QA-script;
- сетка постеров подтверждена как `6/5/4/3/2` колонок на desktop/tablet/mobile gates;
- отдельный runtime-harness: `18/18` — адаптивная структура, выбор, явное удаление, защита от случайного toggle-off, persistence, синхронизация дубликатов и keyboard focus;
- browser runtime: hero `1440×590 px` на desktop и `358×590 px` на mobile; карточка каталога `213.9 px` при `1440 px`; desktop popover не выходит за viewport; poster bookmark sheet имеет отступ `12 px`, а title list/player sheets прижаты к нижней границе; horizontal overflow `0 px`;
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
- hero: пять слайдов, 7-секундный progress, pause, arrows, dots, keyboard, swipe и исключение скрытых ссылок из tab-порядка;
- bookmark overlay на постере, desktop popover, mobile modal sheet, пять статусов на токенах темы, явное удаление, полноширинная нижняя полоска с текстом статуса, persistence и синхронизация одинаковых тайтлов;
- mobile title: скрытие общего header, контекстный toolbar, poster `2:3`, расположение info icon, touch targets и линейные metadata rows;
- list/subscription local states; отдельный title list sheet синхронизирует mobile/desktop labels и возвращает focus;
- dialogs, backdrop/Escape close и focus trap;
- player settings: desktop dialog/mobile bottom sheet, три select и три синхронных switch без неподтверждённых mini-player/download controls;
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

Изменения проверены в реальном Chrome for Testing: главная и title page, dark/light, desktop/tablet/mobile, list/player sheets просмотрены по контрольным снимкам. Все `95/95` interaction/layout checks прошли, JavaScript console/page errors — `0`.

В изолированной среде внешние poster URL Shikimori возвращали transport errors. Regression-прогон подтвердил штатное состояние «Изображение недоступно». Целевой visual harness подставлял детерминированные локальные SVG-fixtures только для проверки crop/mask/геометрии hero и постера; сами production-постеры этим прогоном не подтверждаются.

Перед production merge остаётся обязательной браузерная matrix: `360×800`, `390×844`, `768×1024`, `1024×768`, `1440×900`; обе темы; bookmark popover/sheet/status strip, search, drawer, tabs, list/subscription, player, episodes, dialogs, comments; horizontal overflow и console errors.

## Граница результата

Автономный HTML проверяет дизайн, responsive contracts и локальные interaction states. Он не подтверждает production API, auth, HLS/Kodik playback, caching, SSR hydration или mutation rollback. Эти gates выполняются только после переноса в фактическую ветку.
