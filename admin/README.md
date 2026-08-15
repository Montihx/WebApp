# Kitsu Enterprise Admin — Anime Graphite

Автономный интерактивный redesign административной панели Kitsu. За основу взята компактная композиция понравившегося шаблона: постоянная боковая навигация, спокойные заголовки, плотные таблицы, предметные drawers и подтверждения опасных действий. Каркас и функциональные границы сохранены; финальная цветовая система стала нейтральной, контрастной и спокойной.

## Просмотр

Откройте `index.html` в современном браузере. Сборка и сеть не нужны: шрифты, Lucide, CSS и JavaScript находятся внутри папки.

- `Ctrl/Cmd + K` — command palette;
- `1`, `2`, `3`, `4` — обзор, каталог, parser center и мониторинг;
- переключатель в шапке — светлая/тёмная тема;
- навигация, таблицы, drawers и dialogs адаптированы для mobile;
- все числовые значения в автономном макете являются демонстрационными, а названия полей и границы действий сверены с кодом backend.

## Визуальное направление

- Dark: `#0D0D0F` canvas, нейтральные graphite surfaces и светлая primary-кнопка в духе зрелых media-приложений.
- Light: `#F5F4F2` canvas, белые поверхности и `#381932` только как сильный брендовый action anchor.
- Mauve используется для focus, selection и небольших identity cues, а не как заливка всего интерфейса.
- Green, amber, red и slate-blue используются только семантически: success, warning, danger и info; каждый status имеет текст/иконку.
- Никакого neon/lime, синего SaaS-оформления, стеклянных карточек, случайных bento-блоков или бесконечных эффектов.
- Направление dark опирается на нейтральную иерархию Anixart-референсов, но не копирует их экраны, assets или layout.

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
