# QA report — Kitsu Public Anime Graphite

Дата последней сверки документа с `qa-results.json`: 29 августа 2026 года.

## Итог

- `96/96` автоматических статических проверок — pass (`node tools/qa.mjs`);
- `95/95` браузерных проверок предыдущей визуальной ревизии — только baseline: `58` regression + `37` целевых для hero/title/player; после текущей переработки hero, continue rail и title требуется повторный browser gate;
- `8/8` HTML documents разобраны без parser errors;
- `0` duplicate IDs;
- `0` unresolved `aria-controls`, `aria-labelledby` и label `for` references;
- `0` отсутствующих локальных HTML/CSS assets;
- `0` buttons без явного `type`;
- `0` images без `alt`;
- `0` bare `href="#"`/`javascript:` links;
- CSS: структура сбалансирована, контрольные точки `1279`/`1180`/`920`/`720`/`639`/`460 px`;
- `node --check app.js` — pass;
- `24` локальных WOFF2 font-файлов подключено;
- `18` ключевых JS interaction families, включая hero, continue rail и отдельный пятистатусный bookmark-сценарий, обнаружены QA-script;
- сетка постеров подтверждена как `7/6/5/4/3` колонок: карточки увеличены на desktop и ноутбуках, tablet/mobile gates сохранены;
- отдельный runtime-harness: `18/18` — адаптивная структура, выбор, явное удаление, защита от случайного toggle-off, persistence, синхронизация дубликатов и keyboard focus;
- предыдущий browser runtime подтвердил базовую геометрию hero, poster grid и sheets; новый встроенный search и внутренний poster overlay требуют повторной browser-matrix перед merge;
- шесть новых разделов имеют отдельные structural contracts: profile tabs, недельное расписание, update filters, сезонную сетку, collection search и bookmark filters;
- `18` contrast pairs (9 на тему), минимум `4.97:1`.
- опубликованный commit-preview текущей ревизии проверен при `1363×936`: четыре метрики просмотра занимают полную ширину, недельный график имеет область `457×200 px`, семь подписанных столбцов, шкалу `0/4/8`, итог `34`, среднее `4,9`, даты и выделение текущего дня; horizontal overflow отсутствует. Светлая и тёмная темы используют свои поверхности. Предыдущей browser-матрицей также подтверждены шесть новых маршрутов, круглый avatar профиля `112×112`, status colors, list-trigger, bookmark filter и внутренний poster menu.

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
- карточка постера не содержит rating/episode badges поверх изображения; под названием расположены актуальные/общие серии и компактный рейтинг;
- bookmark overlay строго изолирован внутри постера на desktop: короткий заголовок, полные названия пяти статусов без ellipsis и отдельное закрытие вместо дублирующей bookmark-кнопки; все внутренние действия блокируют переход родительской ссылки постера; mobile использует sheet с отдельным удалением, а выбранный статус остаётся в полноширинной нижней полоске;
- встроенный header search без modal backdrop: на desktop поле раскрывается строго в собственных координатах и ширине до `320 px`, одинаковая структура на обеих страницах, 5 фильтров, недавние, компактные результаты, outside click, `Escape`, клавиатурная навигация и отдельный mobile-trigger на странице тайтла; поверхность непрозрачна и не смешивает текст с фоном страницы;
- hero повторяет геометрию основного проекта: `480/580 px`, центральный sharp-art максимум `1600 px`, маска `transparent → 15% → 85% → transparent`, размытый full-width фон и выравнивание текста/controls по общей page safe-area;
- уведомления тайтла: desktop non-modal dropdown под постером, mobile bottom sheet, общий radio-state и возврат focus;
- title: desktop poster `340/280 px`, community-строка под ним и не обрезаемое пятистатусное меню; mobile poster-first hero `3:4` и контекстный toolbar; оба счётчика видимы, metadata оформлены естественными вертикальными строками без карточек/колонок/разделителей;
- list/subscription local states; desktop-уведомления находятся под постером, mobile-колокольчик — справа сверху; оба открывают единый адаптивный dialog/sheet, share и повторная details-секция отсутствуют, focus возвращается инициатору;
- dialogs, backdrop/Escape close и focus trap;
- player settings: desktop dialog/mobile bottom sheet, три select и три синхронных switch без неподтверждённых mini-player/download controls;
- source/translation summary и player controls;
- episode selection, incremental load и grid/list view;
- remote image failure state;
- `prefers-reduced-motion`.
- новые разделы: переключение профильных и календарных tab panels, фильтры updates/season/collections/bookmarks, локальный поиск коллекций и синхронизация изменённого bookmark-status с активным фильтром.

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

Полный прогон `95/95` в Chrome for Testing относится к предыдущей визуальной ревизии. Текущая ревизия проходит `96/96` статических проверок, `node --check` и desktop browser smoke на точном commit-preview. До production merge требуется проверить mobile/tablet ширины, недельный график профиля, сетки `5/4/3`, mobile sheets, drawer и горизонтальные rails. Неповторённый baseline не считается pass для изменённых узлов.

В изолированной среде внешние poster URL Shikimori возвращали transport errors. Regression-прогон подтвердил штатное состояние «Изображение недоступно». Целевой visual harness подставлял детерминированные локальные SVG-fixtures только для проверки crop/mask/геометрии hero и постера; сами production-постеры этим прогоном не подтверждаются.

Перед production merge остаётся обязательной браузерная matrix: `360×800`, `390×844`, `768×1024`, `1024×768`, `1440×900`; обе темы; восемь маршрутов, bookmark popover/sheet/status strip, search, drawer, tabs, filters, collection search, list/subscription, player, episodes, dialogs, comments; horizontal overflow и console errors.

## Граница результата

Автономный HTML проверяет дизайн, responsive contracts и локальные interaction states. Он не подтверждает production API, auth, HLS/Kodik playback, caching, SSR hydration или mutation rollback. Эти gates выполняются только после переноса в фактическую ветку.
