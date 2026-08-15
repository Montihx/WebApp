# Соответствие текущему проекту Kitsu

Дата последней проверки шаблона: 13 августа 2026 года. Эта дата не делает документ вечным источником истины: агент повторяет аудит на фактической ветке перед изменениями.

## Иерархия доказательств

1. Активная регистрация route и middleware.
2. Handler/service implementation и error paths.
3. Request/response structs, database models, migrations и SQL/query.
4. Contract/integration/runtime tests.
5. Фактический frontend import graph и call sites.
6. Сгенерированный OpenAPI после сравнения с кодом.
7. Документация, старый frontend и этот prototype.

Если уровни расходятся, работу приостановить, сохранить evidence paths и обновить matrix. Нельзя «свести» расхождение догадкой в UI.

## Подтверждённые области

| Область              | Фактическая база                                                                    | Граница UI                                                           |
| -------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Anime                | list/detail, create/update/delete, bulk status/delete, Kodik refresh/poster refresh | `year` derived из `aired_on`; admin filters ограничены handler       |
| Episode              | list with anime, detail, create/update/delete, bulk delete                          | расширенные read fields не становятся editable                       |
| Release              | CRUD, source/translation/quality/url/embed/flags                                    | `is_verified` stored bool; stream probe отсутствует                  |
| Collections          | superuser list all, owner CRUD                                                      | admin обзор read-only для чужих collections                          |
| Avatar/Decoration    | CRUD + upload после созданного ID                                                   | separate upload; delete даёт linked user field `null`                |
| Parser search/import | search-live/search/list/fetch-full/add/import/direct refresh                        | нет одной универсальной async import job                             |
| Parser jobs          | list/detail/logs/trigger/stop/delete/clear + telemetry                              | WS telemetry не равен log stream; retry/duplicate/resume отсутствуют |
| Conflicts/moderation | resolve existing/incoming, approve eligible Anime, simple blacklist                 | нет reject endpoint/rules engine                                     |
| Scheduler            | schedule CRUD/run semantics                                                         | безопасный create/run UI только Kodik incremental до runtime fix     |
| Users/roles          | users list/detail/patch/ban/unban; four read-only roles                             | target session management и role CRUD отсутствуют                    |
| Comments             | staff queue, approve, soft delete                                                   | reports/reason body/audit guarantee отсутствуют                      |
| Monitoring           | database/worker/resources snapshot                                                  | cache status сейчас не probe; history/incidents/API p95 отсутствуют  |
| System settings      | пять seeded keys                                                                    | stored не означает consumed; GET не даёт actor/updated_at            |
| Parser settings      | восемь category JSON records                                                        | active Go worker consumer не подтверждён                             |
| Backups              | list/create/download/delete; DB + media rows                                        | restore и signed URL отсутствуют                                     |
| Audit                | skip/limit plain array                                                              | no total/server filters/guaranteed diff                              |
| Notifications        | list + unread count                                                                 | mark-read отсутствует                                                |

## Критические runtime нюансы

### Parser jobs

- `POST /jobs/trigger` принимает только `parser_name` и `job_type`.
- Поддержанные ручные пары: `kodik/incremental`, `kodik/full_sync`, `shikimori/shikimori_related_refresh`.
- Kodik full sync не публикует надёжный промежуточный percentage/counters; итог появляется после завершения.
- Checkpoint/resume endpoint не найден.
- Логи читаются отдельным REST route; WebSocket публикует telemetry/stats, а не полный log stream.

### Scheduler

- create первоначально задаёт `next_run_at` примерно `now + 1h`, затем recovery уточняет cron-time;
- PATCH cron не пересчитывает `next_run_at` сразу;
- Kodik scheduled dispatch фактически incremental;
- Shikimori schedule не формирует рабочий related-refresh mode.

До backend исправления UI не обещает другие schedule modes.

### Settings

Seeded SiteSetting keys: `site_name`, `maintenance_mode`, `allow_registration`, `accent_primary`, `accent_danger`. GET возвращает map key/value. PATCH принимает только существующие keys. Consumers для maintenance/registration/accent в просмотренном коде не подтверждены, поэтому хранение нельзя выдавать за применение.

ParserSetting categories: `general`, `notifications`, `advanced`, `blacklist`, `grabbing`, `fields`, `images`, `player`. Handler хранит arbitrary JSON object; active Go worker не был найден среди consumers.

### Monitoring

- database health делает `SELECT 1` и возвращает latency;
- worker health отражает Asynq worker count/status;
- resources включают CPU, memory percent, process RSS/app MB, root disk percent и load average;
- cache status hardcoded online и обязан отображаться `not probed`;
- history, incidents, API latency и free-disk GB не выводить без нового endpoint.

## Исправленные расхождения старого UI

- удалены синяя/зелёная theme direction и generic SaaS visual language;
- удалены retry/duplicate job, fake import history и fake live logs;
- удалены server URL/stream validation promises;
- parser settings показываются как raw category JSON + отдельный real blacklist;
- moderation оставляет approve, но не выдумывает reject;
- Release не получает Anime title join, которого list response не возвращает;
- Episode list не получает release count, которого response не возвращает;
- User detail не показывает IP/device/session duration, которых нет в `/users/me`;
- Backup не имеет restore/signed link;
- Collections admin route остаётся read-only;
- все local prototype mutations сообщают, что production request не выполнен.

## Frontend-перенос

Старый frontend нужен для route inventory, ownership/auth flow и сохранения реально используемого поведения, но не для определения backend capabilities. Перед переносом обязательно проверить:

- текущие App Router segments/layouts/loading/error/not-found;
- client/server boundaries и API clients;
- auth cookie/token refresh и role guards;
- existing Query/Zustand ownership;
- forms и schema generation;
- current Tailwind/shadcn/Radix setup;
- image domains, CSP, headers, cache/revalidate;
- Playwright coverage и deployment constraints.

## Времена и timezone

Все даты идут через одну utility на date-fns 4 + `@date-fns/tz`:

- offset/Z strings сохраняют исходный instant;
- naive fields обрабатываются только по documented allowlist;
- UI форматирует в выбранной timezone, по умолчанию Asia/Almaty для данного handoff;
- тесты покрывают UTC offset, midnight, DST других zones и invalid input;
- raw `new Date(value)` в feature components запрещён.

## Обязательная повторная проверка

Перед production PR приложить route/action matrix с колонками: экран, UI action, method/path, auth role, request schema, response schema, error codes, cache/invalidation, evidence file:line, test. Ни одна action-кнопка не принимается без заполненной строки.
