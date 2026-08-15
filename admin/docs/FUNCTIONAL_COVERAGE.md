# Функциональное покрытие по текущему backend

Источник истины — активные Go routes/handlers, database schema и зарегистрированный middleware. Старый frontend используется только как список возможных маршрутов, но не как доказательство функциональности.

## Карта экранов админки

| Экран                 | Подтверждённые данные                                               | Разрешённые действия                                                      | Чего не показывать                                            |
| --------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Обзор                 | users/anime/releases/uptime; 7-day Shikimori/Kodik processed series | refresh, переходы                                                         | неподтверждённые trends, p95, revenue, synthetic health       |
| Аниме                 | admin anime list + detail                                           | create, update, delete, bulk delete/status, Kodik refresh, poster refresh | отдельный write `year`, server filter по score/source/year    |
| Эпизоды               | list with anime, duration/title_en/opening/ending read fields       | create/update/delete, bulk delete                                         | редактирование read-only extended fields, CSV import          |
| Релизы                | episode/source/translation/quality/url/embed/flags                  | create/update/delete                                                      | server URL validator, stream-test endpoint                    |
| Коллекции             | superuser list all                                                  | inspect/export loaded rows                                                | edit/delete чужих collections из admin list                   |
| Аватары               | avatar collection                                                   | create/update/delete, upload to existing id                               | upload без выбранной/созданной entity                         |
| Декорации             | user decorations                                                    | create/update/delete, upload to existing id                               | category для decoration, audit claim                          |
| Командный центр       | confirmed parser operations/gaps                                    | safe trigger, direct poster refresh, навигация                            | Shikimori sync кроме related refresh; synthetic source health |
| Поиск/импорт          | search-live, search, search-list, fetch-full, add/import, refresh   | поиск, preview response, confirmed write                                  | единая магическая import-команда, audit claim                 |
| Jobs                  | job list/detail/logs                                                | trigger, stop, delete, clear allowed statuses, download loaded log        | trigger note/target/creator fields                            |
| Conflicts             | existing/incoming data                                              | resolve stored/incoming                                                   | rules editor                                                  |
| Scheduler             | scheduled job fields                                                | safe create/toggle/run/delete subset                                      | name, timezone, history relation, ложный cron preview         |
| Модерация импорта     | moderation queue + parser blacklist                                 | bulk approve eligible, create/delete blacklist                            | keyword/type/scope/reason/enabled/hit history                 |
| Comments              | staff queue CommentOut                                              | approve hidden, inspect target/thread separately, soft delete             | reports, total, review time, moderation rules                 |
| Users                 | FullUser + roles                                                    | patch supported fields, ban/unban, assign existing role_id                | target-user logout-all, session list, comment stats           |
| Roles                 | role name/description/permissions                                   | filter users by loaded role                                               | role CRUD, user counts, invented capability matrix            |
| Monitoring            | one health snapshot                                                 | refresh                                                                   | history, incidents, API p95, cache latency, free GB           |
| Backups               | artifact rows                                                       | trigger DB+media, list, download, delete                                  | restore, policy-check endpoint, audit claim                   |
| Site settings         | five keys                                                           | validate/save/reset local form                                            | author/time metadata not in response                          |
| Parser settings       | category JSON + support state                                       | list/update/export loaded config                                          | promise that Go worker consumes stored config                 |
| Audit                 | actor_id/IP/action/resource/meta/success/error/time                 | inspect/export loaded rows                                                | total, server filters, guaranteed diff/user join              |
| Notifications popover | list + unread count                                                 | navigate                                                                  | mark-read/mark-all-read                                       |

## Аниме

### List

`GET /api/v1/dashboard/parsers/anime-list`:

- query: `search`, `kind`, `status`, `has_video`, `needs_moderation`, `skip`, `limit`;
- response: `items`, `total`, `page`, `pages`;
- `year` в response вычисляется из `aired_on`; отдельной колонки/write-поля `year` нет.

Фильтры каталога должны жить в URL через nuqs. Нельзя добавлять server filters `year`, `score` или `source`, пока handler их не принимает.

### Create

Обязательны `title`, `slug`. Поддержаны: `kind`, `status`, `score`, `episodes_total`, `poster_url`, `cover_url`, `aired_on`, `next_episode_at`, `title_en`, `title_jp`, `description`, `genres[]`, `studios[]`, `shikimori_id`, `mal_id`, `kodik_id`, `kodik_url`, `kodik_shikimori_id`, `rating`.

### Update

Поддержаны present-only fields: названия/slug/description/kind/status, poster/cover, external IDs/URLs, aired/next episode, rating, score, episode counters, genres/studios. Slug и Shikimori ID имеют uniqueness behavior, который UI должен показывать как field error.

### Bulk

- anime: `delete` или `update_status`;
- допустимые statuses: `anons`, `cancelled`, `hiatus`, `ongoing`, `released`;
- один audit event создаётся на bulk request, не на каждый ID.

## Эпизоды

Write contract create/update:

- create: `anime_id`, `season`, `episode`, `title`, `thumbnail_url`, `aired_at`, `is_filler`, `is_recap`;
- update: те же изменяемые поля, кроме `anime_id`;
- bulk: только delete.

Расширенный list может отдавать `title_en`, `duration`, opening/ending ranges. Эти поля показываются read-only, пока соответствующие write fields не появятся в active handler. Нельзя строить editor по response model, игнорируя request model.

## Релизы плеера

Create требует `episode_id`, `source`, `url`. Поддержаны `external_id`, `quality`, `translation_type`, `translation_team`, `translation_language`, `embed_url`, `is_active`, `is_verified`. Update меняет все поля, кроме `episode_id`.

`is_verified` меняется только явным действием. Backend не предоставляет отдельный validate/test-stream endpoint: локальная URL schema проверяет только формат, а реальную доступность нельзя выдавать за server validation.

## Аватары и декорации

- create требует `title`, `image_url`;
- avatar дополнительно имеет `category`, default `default`;
- update меняет metadata и `is_active`;
- multipart upload существует только для уже созданного `{id}` и обновляет `image_url`;
- JPEG/PNG/WebP/GIF, максимум 5 MB;
- CRUD/upload не audit-gated в текущем backend.

## Collections

`GET /interactions/collections/all` даёт superuser обзор. Update/delete handlers всё равно проверяют owner, поэтому общая admin-таблица остаётся read-only. Управление своей коллекцией относится к публичному/profile шаблону.

## Parser operations

Подтверждены отдельные команды:

- `POST /search-live` — merged search, Shikimori error превращается в пустой список; это не независимый health probe;
- `GET /kodik/search`, `GET /kodik/search-list`;
- `POST /fetch-full`;
- `POST /add-from-kodik`, `POST /kodik/import`;
- `POST /kodik/refresh/{slug}` — синхронная прямая запись;
- `POST /kodik/refresh-poster/{slug}` — синхронная прямая запись poster URL;
- list/incremental sync endpoints также синхронные; queue-based ручной запуск — только `/jobs/trigger`.

Ни один из этих parser endpoints не должен автоматически называться audit-gated.

## Parser jobs

Trigger body содержит только `parser_name` и `job_type`.

Операционно поддержанные пары:

- `kodik / incremental`;
- `kodik / full_sync`;
- `shikimori / shikimori_related_refresh`.

Другие Shikimori sync modes сейчас явно завершаются ошибкой worker. Targeted anime/poster refresh не являются job type этого trigger.

Job UI показывает только фактические поля `ParserJob`: `status`, `progress`, пять item counters, `error_message`, timestamps/duration, а также отдельные `ParserJobLog`. WebSocket публикует progress/stats, а не поток логов. Для Kodik full sync текущий worker не обновляет live progress/counters до terminal state; partial stats при cancel/timeout могут быть в `ParserJobLog.details`. Поля checkpoint и resume endpoint нет.

## Scheduler

Schema: `parser_name`, `job_type`, `cron_expression`, `is_active`, IDs и run timestamps. Нет `name` и `timezone`.

Текущие runtime gaps:

- create задаёт первый `next_run_at` примерно `now + 1h`, а не из cron;
- update cron не пересчитывает `next_run_at`;
- любой Kodik schedule dispatch идёт в mode `incremental`, даже если `job_type=full_sync`;
- Shikimori schedule не формирует `related_refresh` mode и текущим worker не выполняется успешно.

Поэтому UI разрешает создавать/включать/run-now только `kodik / incremental`, а существующие небезопасные строки показывает с `backend gap`. Расширять список можно после contract/runtime fix и тестов.

## Conflicts, moderation и blacklist

Conflict resolve имеет только две стратегии: сохранить existing или применить incoming. Это audit-gated действие.

Moderation queue содержит anime id/slug/title/poster/description/reason/updated. Bulk approve принимает `anime_ids` и возвращает `approved`, `skipped`, `skipped_ids`; неподходящие записи нельзя удалять из UI как успешные.

Blacklist entry содержит только `id`, `shikimori_id`, `kodik_id`, `slug`, `created_at`; доступны list/create/delete.

## Comments

Staff queue поддерживает `is_hidden`, `skip`, `limit`, но возвращает plain array без `total`. CommentOut включает content, user/target IDs, parent, likes/replies, timestamps и hidden/deleted flags.

- approve устанавливает `is_hidden=false`;
- delete — soft delete и разрешён owner или superuser;
- approve/delete сейчас не создают audit entry;
- reports и moderation analytics отсутствуют.

## Users и roles

User admin: list, detail, patch, ban, unban.

Patch fields: `email`, `username`, `gender`, `bio`, `is_active`, `is_superuser`, `is_verified`, `role_id`, optional new `password`. `full_name` не является реальной колонкой. Ban запрещён для `is_superuser`; ban body с reason отсутствует.

`POST /auth/logout-all` действует только для текущего авторизованного пользователя. В чужом admin detail кнопки logout-all быть не должно.

Roles — read-only список seeded roles: `super_admin`, `admin`, `moderator`, `user` с фактическими permission arrays. `is_superuser` — отдельный user flag.

## Monitoring

`GET /monitoring/health` — snapshot:

- overall status/timestamp;
- database status/latency;
- cache сейчас hardcoded online, поэтому UI маркирует `not probed`;
- worker status/count;
- CPU, memory percent/app MB, disk percent, load average.

Нет истории, incidents, API latency, pool breakdown или free disk GB.

## Backups

Один trigger создаёт два отдельных artifacts: database и media. Доступны list, trigger, download, delete. Restore отсутствует. Все четыре routes plain superuser и не audit-gated.

Политика продукта: automatic DB 30 дней, manual DB 90 дней, media — последние пять успешных; failed/invalid artifacts не скрываются и не удаляются автоматически.

## Settings и audit

Site settings имеют ровно пять keys: `site_name`, `maintenance_mode`, `allow_registration`, `accent_primary`, `accent_danger`. Maintenance требует impact confirmation. Response не даёт автора/время последнего изменения.

Parser settings categories: `general`, `notifications`, `advanced`, `blacklist`, `grabbing`, `fields`, `images`, `player`. Handler хранит произвольный JSON; Go parser worker его не загружает. Некоторые keys потребляет legacy Python, image config поддержан частично, watermark в Go pipeline не реализован. Update route сейчас не audit-gated.

Audit list поддерживает только `skip`/`limit`, возвращает plain array и не гарантирует before/after diff. UI может локально искать в загруженной выборке, но не должен выдавать это за server filtering.

## Public/auth gaps, важные для следующего шаблона

- notifications: list + unread count; mark-read отсутствует;
- self logout-all существует, session/device list и logout one session отсутствуют;
- report submission endpoint не подтверждён;
- player progress/preferences, favorites, follows, comments и collections подтверждены и планируются как authenticated client islands.
