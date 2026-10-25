# Kitsu Enterprise Admin — Кицунэ

Автономный интерактивный redesign административной панели Kitsu. За основу взята компактная композиция понравившегося шаблона: постоянная боковая навигация, спокойные заголовки, плотные таблицы, предметные drawers и подтверждения опасных действий. Каркас и функциональные границы сохранены; финальная цветовая система стала нейтральной, контрастной и спокойной.

## Просмотр

Откройте `index.html` в современном браузере. Сборка и сеть не нужны: шрифты, Lucide, CSS и JavaScript находятся внутри папки.

- `Ctrl/Cmd + K` — command palette;
- `1`, `2`, `3`, `4` — обзор, каталог, parser center и мониторинг;
- переключатель в шапке — светлая/тёмная тема;
- навигация, таблицы, drawers и dialogs адаптированы для mobile;
- все числовые значения в автономном макете являются демонстрационными, а названия полей и границы действий сверены с кодом backend.

## Визуальное направление

Арт-направление «Кицунэ» ([docs/ART_DIRECTION.md](../docs/ART_DIRECTION.md), правила для админки — в [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)):

- Dark: тёплая тушь `#0F0C0B`, поверхности `#17120F`…; Light: «бумага днём» `#F4EEE3`. Токены общие с публичной частью (`../tokens.css`).
- Киноварь — логотип, главная кнопка экрана и активный пункт меню. Лисий огонь (`--kitsunebi`) значит «происходит прямо сейчас», золото (`--kin`) — «требует внимания оператора». Ошибка и удаление — малиновый, всегда с текстом.
- Dela Gothic One только для H1 и крупных чисел, Onest для интерфейса, JetBrains Mono для ID, времени и числовых колонок.
- Один фирменный элемент — «балка тории» у заголовка страницы и активного пункта меню. Никакого неона, стеклянных карточек и декоративных bento.

Перед тем как добавлять или менять цвет любого статус-индикатора (badge, dot, glyph, полоска состава) — прочитать раздел «Индикаторы статуса в текущем статическом шаблоне» в `docs/DESIGN_SYSTEM.md`. Там описан единственный источник тона (`toneForStatus`/`labelForStatus` в `app.js`) и разобрана конкретная ловушка каскада `styles.css`, из-за которой один и тот же статус в этом шаблоне уже реально расходился по цвету в разных местах.

## Функциональная честность

Макет не подключён к production API и никогда не выдаёт локальную имитацию за выполненную server mutation. Кнопки показывают подтверждённый request contract; успешное изменение допускается только после реального response при переносе.

Покрыты 20 экранов:

- overview, Anime, Episode, Release, Collection, Avatar и Decoration;
- формы Anime/Episode/Release по write DTO, а не по более богатым read models;
- parser search/import, jobs, REST logs, conflicts, scheduler, moderation и blacklist;
- users/roles, monitoring snapshot, SystemSetting, backups и audit;
- честные ограничения: нет stream probe, retry/duplicate job, restore backup, mark-read notification, target-user sessions и неподтверждённых метрик.

## Состав

- `index.html` — shell и доступные overlay-слои;
- `styles.css` — темы, tokens, компоненты и responsive rules;
- `app.js` — 20 экранов и автономные interaction contracts;
- `fonts/`, `vendor/` — локальные зависимости и лицензии;
- `screenshots/`, `qa-results.json` — visual/functional QA;
- `AGENT_HANDOFF.md` — краткий обязательный handoff для Codex;
- `docs/CODEX_MIGRATION_RUNBOOK.md` — пошаговый перенос в текущий проект;
- `docs/FUNCTIONAL_COVERAGE.md` — границы подтверждённого backend;
- `docs/ROUTE_ACTION_MATRIX.md` — точные method/path/gate и отсутствующие controls;
- `docs/SITE_TEMPLATE_ROADMAP.md` — единый redesign остальных public routes;
- `docs/DESIGN_SYSTEM.md`, `docs/VISUAL_REFERENCE_ANALYSIS.md`, `docs/STACK_DECISION.md` — визуальный, референсный и технический contracts.

Финальный автономный QA: `80` route checks в обеих темах, `184` interaction
checks, `18` contrast checks и `2` theme persistence checks в Chromium на
desktop/mobile — без runtime errors, необработанных действий и горизонтального переполнения. Полный протокол находится в
`docs/QA_REPORT.md`.

Архив является полным проектом, а не patch: в нём находятся HTML, CSS, JS,
локальные шрифты, Lucide bundle и лицензии, документация, QA JSON и визуальные
эталоны. Контрольный перечень находится в `docs/ARCHIVE_INVENTORY.md`.

Начинать production-перенос нужно с повторного аудита фактической ветки. Код, route registration, handlers, models, migrations, SQL, middleware, imports и runtime tests имеют приоритет над любым текстом в этом архиве.
