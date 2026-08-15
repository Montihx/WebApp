# Runbook переноса в production frontend

## 1. Baseline

1. Прочитать repository instructions и ownership rules.
2. Зафиксировать commit SHA, Node/pnpm versions, lockfile и deployment target.
3. Выполнить frozen install, typecheck, lint/format, Next build, unit/integration/E2E как есть.
4. Отдельно записать существующие failures; не приписывать их redesign.
5. Снять screenshots текущих `/`, `/anime/{slug}` и player states на `360/390/768/1024/1440` в обеих темах.

## 2. Обновить contract inventory

Для каждой строки `ROUTE_DATA_MATRIX.md` найти регистрацию, middleware, handler, DTO, model/schema, SQL/migration, frontend consumer и test. Обновить owner и payload до написания компонентов.

Особенно проверить гибридные участки:

- `/schedule/calendar`;
- `/anime/{slug}/kodik-playlist` и `/skip-times`;
- `/stream/*`;
- notification writes;
- translation view tracking.

## 3. Ввести токены

Перенести semantic tokens в существующий CSS-first theme layer. Сначала заменить только palette/typography/radii/focus, не меняя API, routes и component ownership. Dashboard и public должны ссылаться на общий versioned token contract.

## 4. Общий shell

Собрать header/search/notification popover/mobile drawer/bottom nav поверх существующих auth и query hooks. Не переносить автономный `localStorage` там, где production уже имеет server state. Theme persistence адаптировать к текущему theme owner.

## 5. Главная

1. Сохранить server parallel fetch в `app/page.tsx`.
2. Обернуть существующий `Hero`, а не переносить fixture HTML.
3. Сохранить guest/auth behavior `ContinueWatching`.
4. Перенести presentation HomeGrid tabs без изменения query contracts.
5. Объединять history/calendar по текущему dedupe rule.
6. Public collections подключать отдельным query; при ошибке показывать error, а не пустой rail.

## 6. Страница тайтла

1. Не менять SSR fetch, metadata, canonical, JSON-LD и revalidation.
2. Перенести hero/details в новые primitives, сохранив nullable fields.
3. Favorite list control подключить к текущим mutations и invalidation.
4. Subscription control обновляет только `anime_notifications`, сохраняя остальные preferences.
5. Вставить текущий Kodik/HLS player внутрь нового shell.
6. Source и translation держать независимыми; generic releases остаются fallback.
7. Progress, skip-times, auto-next, quality/mode и view tracking сохранить без упрощения.
8. Comments подключить к существующим query/mutations и permissions.

## 7. State matrix

Для каждого async блока реализовать отдельно:

- loading/skeleton;
- authenticated/guest;
- empty response;
- network/server error;
- partial/nullable data;
- success;
- stale/revalidating, если consumer реально различает состояние.

Player дополнительно проверяет no-video, not-released, no-translation, source-error и autoplay/fullscreen restrictions.

## 8. Quality gates

- formatter/linter проекта;
- TypeScript strict/typecheck;
- Next production build;
- unit/contract tests для URL/query/payload mapping;
- Playwright для search/theme/drawer/list/subscription/player/episodes/comments;
- axe или эквивалент на главной и title page;
- visual diff dark/light на пяти viewport;
- slow network, image failure, long Russian title, 0/1/74/1000 episodes.

## 9. Безопасное удаление старого UI

Удалять старые components/styles/packages только после подтверждения нулевого import graph, зелёной сборки и visual parity. Не смешивать redesign, data migration и dependency cleanup в один необратимый commit.
