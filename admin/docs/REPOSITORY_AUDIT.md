# Аудит исходного проекта

## Вывод

Текущий frontend нельзя использовать как функциональный source of truth: он отстаёт от backend, содержит отсутствующие страницы и местами выводит более богатую модель, чем активные write handlers. Источник истины для переноса — зарегистрированные Go routes, handlers, schema/SQL и middleware. OpenAPI следует регенерировать и сверять с кодом, а не предполагать, что старый файл актуален.

## Наблюдаемая frontend-база

На момент аудита проект использовал App Router/React 19/strict TypeScript, Tailwind 3.x, множество отдельных Radix packages, React Query, Zustand, React Hook Form/Zod, Framer Motion и GSAP, Lucide, Sonner, Recharts, date-fns, Playwright, ESLint/Prettier и pnpm. Перед реализацией агент обязан повторно прочитать фактический `package.json`, lockfile и imports: версии и ветка могли измениться.

Frontend owner-controlled. Standalone artifact не даёт разрешения переписывать production frontend без явного scope.

## Что подтверждено backend

Go API закрывает:

- catalog/anime/episode/release reads и admin mutations;
- avatars/decorations и multipart uploads;
- users/roles, auth/self profile и logout-all self;
- comments/favorites/progress/preferences/follows/collections;
- notifications list/unread;
- dashboard overview/charts;
- parser search/import/refresh/jobs/logs/WebSocket/conflicts/moderation/blacklist/settings/scheduler;
- monitoring snapshot;
- backups;
- site settings и audit log.

Точные границы приведены в `FUNCTIONAL_COVERAGE.md`.

## Главные расхождения, исправленные в шаблоне

| Область             | Ошибочное предположение                 | Фактический контракт                                          |
| ------------------- | --------------------------------------- | ------------------------------------------------------------- |
| Site settings       | только 3 ключа или произвольная тема    | 5 ключей, включая два accent colors                           |
| Episodes            | все list fields можно редактировать     | duration/title_en/opening/ending read-only; write handler уже |
| Anime               | `year` — write field                    | вычисляется из `aired_on`                                     |
| Releases            | есть validate/test stream               | таких endpoints нет                                           |
| Admin anime filters | year/score/source                       | search/kind/status/has_video/needs_moderation                 |
| Scheduler           | name/timezone/cron preview/history      | только parser/type/cron/active/run timestamps; runtime gaps   |
| Parser job trigger  | target/note/любые типы                  | только parser_name/job_type; три безопасные пары              |
| Moderation          | reports/rules/keywords                  | отдельная anime queue + простой parser blacklist              |
| Comments            | reports/total/review metrics            | plain CommentOut array, hidden filter, approve/soft delete    |
| Users               | target logout-all/session list          | отсутствуют; logout-all только self                           |
| Roles               | CRUD/counts/capability matrix           | read-only seeded roles/permissions                            |
| Monitoring          | history/API p95/incidents/cache latency | один snapshot; cache hardcoded online                         |
| Backups             | restore/policy endpoint/audit           | list/trigger/download/delete; DB+media; no restore/no audit   |
| Audit               | total/filters/diff/username join        | skip/limit plain array; arbitrary meta, actor_id              |
| Notifications       | mark-read                               | list + unread count only                                      |

## Read/write asymmetry

Главный риск миграции — генерировать form schema по detail/list response.

- Episode list богаче Create/Update request.
- Anime list отдаёт derived `year`, но editor пишет `aired_on`.
- User detail богаче patch body, а ban/unban являются отдельными commands.
- Scheduler response timestamps не доказывают корректный cron calculation.
- Monitoring response — snapshot; frontend не может превратить его в историю без отдельного storage/endpoint.

Правило: для каждого editor отдельно фиксировать `readSchema`, `createSchema`, `updateSchema`, mutation response и invalidation scope.

## Backend gaps, которые UI обязан показывать честно

1. Scheduler безопасен только для Kodik incremental до исправления dispatch modes и cron calculation.
2. Shikimori full/incremental sync не портирован в Go worker; related refresh поддержан только через job trigger.
3. Go parser worker не читает `parser_settings`; сохранение JSON не означает применение.
4. Cache health не измеряется, хотя response говорит online.
5. Notification mark-read и report submission не подтверждены.
6. Target-user session management отсутствует.
7. Audit instrumentation неполна у comments, parser settings, blacklist/moderation, assets и backups.

Эти gaps не нужно «лечить» фиктивными frontend controls. Для каждого требуется отдельная backend задача и contract test.

## Время и даты

Backend содержит offset-aware и местами naive timestamp semantics, подразумевающие UTC. Нельзя раскидывать `new Date(value)` по компонентам. Нужна единая utility:

- распознавать строки с `Z`/offset без повторного изменения;
- allowlist-ить naive fields, которые backend трактует как UTC;
- форматировать в одной выбранной timezone;
- иметь unit tests на DST/offset/midnight.

## Проверка перед любым production edit

1. Прочитать repository instructions и ownership rules.
2. Зафиксировать dirty worktree, не перезаписывать чужие изменения.
3. Переснять routes из активного server registration.
4. Сверить request/response structs и middleware каждого изменяемого экрана.
5. Перечитать текущие manifests/import graph.
6. Запустить baseline install/typecheck/build/tests.
7. Только после этого выполнять шаги `CODEX_MIGRATION_RUNBOOK.md`.
