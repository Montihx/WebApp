# QA report — Anime Graphite

Дата финальной проверки: 13 августа 2026 года. Браузер: Chromium `138.0.7204.0`.

## Итог

- `20/20` маршрутов проверены в обеих темах на desktop `1440×900`;
- `20/20` маршрутов проверены в обеих темах на mobile `390×844`;
- всего `80` route checks (`40` dark + `40` light) и `184` interaction checks;
- `18` token contrast checks для text/secondary/muted/accent/primary/status pairs, все не ниже `4.5:1`;
- `2/2` theme persistence checks: DOM theme, `localStorage` и `<meta name="theme-color">` синхронны;
- `0` runtime/console errors;
- `0` необработанных `data-action`;
- `0` незакрывающихся dialog/drawer цепочек;
- `0` duplicate IDs;
- `0` видимых кнопок без доступного имени;
- `0 px` горизонтального переполнения body;
- `node --check app.js` проходит;
- устаревшие холодные и лаймовые значения не найдены статическим поиском;
- светлая и тёмная темы синхронизируют `color-scheme`, `theme-color` и состояния controls.
- основные text, secondary, muted, accent-text, primary и semantic status pairs проверены по WCAG AA; декоративный marker token не используется как малый текст без `accent-text`.

Проверенные маршруты:

`overview`, `catalog`, `episodes`, `releases`, `collections`, `assets`,
`anime-editor`, `episode-editor`, `release-editor`, `parsers`, `imports`,
`conflicts`, `scheduler`, `parser-settings`, `moderation`, `users`,
`monitoring`, `settings`, `backups`, `audit`.

## Проверенные взаимодействия

- desktop sidebar, mobile sidebar и bottom navigation;
- command palette: открытие, поиск, переход, `Escape` и возврат фокуса;
- dark/light theme и сохранение выбора;
- фильтры, tabs, pagination, selection и bulk-action boundaries;
- формы Anime, Episode и Release;
- ParserJob drawer, REST logs, telemetry state и stop/delete confirmations;
- conflict resolution, moderation approval и blacklist actions;
- scheduler create/update/delete/run-now boundaries;
- users, settings, assets, backups и audit read/actions;
- вложенные цепочки до трёх уровней: trigger → drawer/dialog → confirm/cancel;
- disabled, read-only и отсутствующие controls не маскируются под доступные действия.

## Визуальные эталоны

- `screenshots/overview-dark.png`
- `screenshots/overview-light.png`
- `screenshots/overview-mobile-dark.png`
- `screenshots/overview-mobile-light.png`
- `screenshots/catalog-dark.png`
- `screenshots/catalog-light.png`
- `screenshots/catalog-mobile-light.png`
- `screenshots/parsers-dark.png`
- `screenshots/monitoring-dark.png`
- `screenshots/anime-editor-light.png`
- `screenshots/settings-light.png`
- `screenshots/imports-mobile-dark.png`
- `screenshots/parser-settings-dark.png`
- `screenshots/conflicts-dark.png`
- `screenshots/scheduler-light.png`
- `screenshots/users-light.png`
- `screenshots/backups-dark.png`
- `screenshots/audit-light.png`

## Граница проверки

Это автономный contract-first прототип. Он проверяет структуру экранов,
адаптивность, доступность, interaction state и соответствие подтверждённым
backend routes/DTO. Production API намеренно не вызывается: при переносе ни одна
локальная имитация успеха не должна считаться успешной server mutation. Итоговый
production PR обязан повторить проверку на фактической ветке и добавить API,
integration и Playwright tests поверх реальных responses.
