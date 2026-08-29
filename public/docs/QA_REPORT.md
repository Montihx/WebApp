# QA report — Kitsu Public Anime Graphite

Дата последней сверки документа с `qa-results.json`: 29 августа 2026 года.

## Итог

- `43/43` автоматические статические проверки — pass (`node tools/qa.mjs`);
- `95/95` браузерных проверок предыдущей визуальной ревизии — только baseline: `58` regression + `37` целевых для hero/title/player; после текущей переработки hero, continue rail и title требуется повторный browser gate;
- `2/2` HTML documents разобраны без parser errors;
- `0` duplicate IDs;
- `0` unresolved `aria-controls`, `aria-labelledby` и label `for` references;
- `0` отсутствующих локальных HTML/CSS assets;
- `0` buttons без явного `type`;
- `0` images без `alt`;
- `0` bare `href="#"`/`javascript:` links;
- CSS: структура из `860` блоков сбалансирована, контрольные точки `1180`/`920`/`720`/`460 px`;
- `node --check app.js` — pass;
- `24` локальных WOFF2 font-файлов подключено;
- `18` ключевых JS interaction families, включая hero, continue rail и отдельный пятистатусный bookmark-сценарий, обнаружены QA-script;
- сетка постеров подтверждена как production `10/8/5/4/3` колонок на desktop/tablet/mobile gates;
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
- hero: пять слайдов, 7-секундный progress, разнесённые pagination/navigation controls, pause, keyboard, swipe и исключение скрытых ссылок из tab-порядка;
- continue rail: пять `16:9` карточек, оставшееся время, процент, progress overlay, отдельное удаление, scroll-snap и стрелки;
- bookmark overlay на постере, desktop popover, mobile modal sheet, пять статусов на токенах темы, явное удаление, полноширинная нижняя полоска с текстом статуса, persistence и синхронизация одинаковых тайтлов;
- title: desktop poster `340/280 px`, community-строка под ним и не обрезаемое пятистатусное меню; mobile poster-first hero `3:4` и контекстный toolbar; оба счётчика видимы, metadata оформлены естественными вертикальными строками без карточек/колонок/разделителей;
- list/subscription local states; desktop-уведомления находятся под постером, mobile-колокольчик — справа сверху; оба открывают единый адаптивный dialog/sheet, share и повторная details-секция отсутствуют, focus возвращается инициатору;
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

Полный прогон `95/95` в Chrome for Testing относится к предыдущей визуальной ревизии. Текущая ревизия проходит `43/43` статические проверки и `node --check`; до production merge необходимо заново проверить hero, continue rail, mobile toolbar, notification sheet, оба счётчика и metadata rows в реальном browser viewport. Неповторённый baseline не считается pass для изменённых узлов.

В изолированной среде внешние poster URL Shikimori возвращали transport errors. Regression-прогон подтвердил штатное состояние «Изображение недоступно». Целевой visual harness подставлял детерминированные локальные SVG-fixtures только для проверки crop/mask/геометрии hero и постера; сами production-постеры этим прогоном не подтверждаются.

Перед production merge остаётся обязательной браузерная matrix: `360×800`, `390×844`, `768×1024`, `1024×768`, `1440×900`; обе темы; bookmark popover/sheet/status strip, search, drawer, tabs, list/subscription, player, episodes, dialogs, comments; horizontal overflow и console errors.

## Граница результата

Автономный HTML проверяет дизайн, responsive contracts и локальные interaction states. Он не подтверждает production API, auth, HLS/Kodik playback, caching, SSR hydration или mutation rollback. Эти gates выполняются только после переноса в фактическую ветку.
