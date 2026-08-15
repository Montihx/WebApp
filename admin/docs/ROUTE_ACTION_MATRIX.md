# Route/action matrix

Снимок активной Go registration на 13 августа 2026 года. Base prefix берётся из `cfg.APIV1Str` и в просмотренной конфигурации соответствует `/api/v1`. Это evidence index для старта, а не замена повторного чтения текущей ветки.

Главный evidence file: `backend-go/cmd/api/main.go`. Перед реализацией каждой строки открыть указанный handler, request/response structs, model/query/migration и tests.

## Dashboard и контент

| UI                      | Method + path                                                                           | Gate            | Handler / важная граница                                                             |
| ----------------------- | --------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------ |
| Overview totals         | `GET /dashboard/stats/overview`                                                         | superuser       | `GetDashboardOverview`; показывать только response fields                            |
| Popular                 | `GET /dashboard/stats/popular`                                                          | superuser       | `GetDashboardPopular`                                                                |
| Genres                  | `GET /dashboard/stats/genres`                                                           | superuser       | `GetDashboardGenres`                                                                 |
| Charts                  | `GET /dashboard/stats/charts`                                                           | superuser       | `GetDashboardCharts`; Recharts только для этих real series                           |
| Admin Anime list        | `GET /dashboard/parsers/anime-list`                                                     | superuser       | `AdminAnimeListHandler`; `search/kind/status/has_video/needs_moderation/skip/limit`  |
| Public Anime list       | `GET /anime/`                                                                           | public          | `ListAnimeCatalog`; public filters проверять отдельно, не копировать admin allowlist |
| Anime detail            | `GET /anime/{slug}`                                                                     | public          | `GetAnimeBySlug`                                                                     |
| Anime episodes          | `GET /anime/{id}/episodes`                                                              | public          | `GetAnimeEpisodes`                                                                   |
| Anime create            | `POST /anime/`                                                                          | audit/superuser | `CreateAnime`; required `title`, `slug`; write DTO authoritative                     |
| Anime update            | `PATCH /anime/{id}`                                                                     | audit/superuser | `UpdateAnime`; `year` не является write field                                        |
| Anime delete            | `DELETE /anime/{id}`                                                                    | audit/superuser | `DeleteAnime`; exact target confirmation                                             |
| Anime bulk              | `POST /dashboard/bulk/anime`                                                            | audit/superuser | `BulkAnimeOps`; only `delete`/`update_status`, one audit/request                     |
| Episode list with Anime | `GET /episodes/with-anime`                                                              | public          | `ListEpisodesWithAnime`; only `skip/limit`, plain array                              |
| Episode detail          | `GET /episodes/{id}`                                                                    | public          | `GetEpisode`                                                                         |
| Episode releases        | `GET /episodes/{id}/releases`                                                           | public          | `ListEpisodeReleases`                                                                |
| Episode create          | `POST /episodes/`                                                                       | `content.edit`  | `CreateEpisode`; write DTO narrower than list model                                  |
| Episode update          | `PATCH /episodes/{id}`                                                                  | `content.edit`  | `UpdateEpisode`; `anime_id` не меняется                                              |
| Episode delete          | `DELETE /episodes/{id}`                                                                 | `content.edit`  | `DeleteEpisode`                                                                      |
| Episode bulk            | `POST /dashboard/bulk/episodes`                                                         | audit/superuser | `BulkEpisodeOps`; only delete                                                        |
| Release list            | `GET /releases/`                                                                        | public          | `ListReleases`; optional `episode_id`, no Anime title join/total                     |
| Release detail          | `GET /releases/{id}`                                                                    | public          | `GetRelease`                                                                         |
| Release create          | `POST /releases/`                                                                       | `content.edit`  | `CreateRelease`; requires `episode_id/source/url`                                    |
| Release update          | `PATCH /releases/{id}`                                                                  | `content.edit`  | `UpdateRelease`; `episode_id` не меняется                                            |
| Release delete          | `DELETE /releases/{id}`                                                                 | `content.edit`  | `DeleteRelease`; URL probe отсутствует                                               |
| Avatar list/detail      | `GET /avatar-collection/`, `GET /avatar-collection/{id}`                                | public          | `ListAvatars`, `GetAvatar`                                                           |
| Avatar CRUD             | `POST /avatar-collection/`, `PATCH/DELETE /avatar-collection/{id}`                      | superuser       | create metadata first; no audit middleware                                           |
| Avatar upload           | `POST /avatar-collection/{id}/upload`                                                   | superuser       | multipart only after real ID                                                         |
| Decoration list/detail  | `GET /decorations/`, `GET /decorations/{id}`                                            | public          | `ListDecorations`, `GetDecoration`                                                   |
| Decoration CRUD/upload  | `POST /decorations/`, `PATCH/DELETE /decorations/{id}`, `POST /decorations/{id}/upload` | superuser       | no category field for Decoration; no audit middleware                                |

## Parser center

| UI                 | Method + path                                                                             | Gate            | Handler / важная граница                                                |
| ------------------ | ----------------------------------------------------------------------------------------- | --------------- | ----------------------------------------------------------------------- |
| Search live        | `POST /dashboard/parsers/search-live`                                                     | superuser       | `SearchLiveOrchestrator`; partial provider behavior проверять в handler |
| Kodik search       | `GET /dashboard/parsers/kodik/search`                                                     | superuser       | `KodikSearchHandler`                                                    |
| Kodik search list  | `GET /dashboard/parsers/kodik/search-list`                                                | superuser       | `KodikSearchListHandler`                                                |
| Safe preview       | `POST /dashboard/parsers/fetch-full`                                                      | superuser       | `FetchFullNode`; не равен mutation                                      |
| Add from Kodik     | `POST /dashboard/parsers/add-from-kodik`                                                  | superuser       | `AddFromKodikHandler`; synchronous direct command                       |
| Import one         | `POST /dashboard/parsers/kodik/import`                                                    | superuser       | `KodikImportSingleHandler`; synchronous                                 |
| Direct refresh     | `POST /dashboard/parsers/kodik/refresh/{slug}`                                            | superuser       | `RefreshAnimeFromKodik`; не ParserJob                                   |
| Poster refresh     | `POST /dashboard/parsers/kodik/refresh-poster/{slug}`                                     | superuser       | `RefreshPosterFromShikimori`; меняет `poster_url`                       |
| Direct list sync   | `POST /dashboard/parsers/kodik/list-sync`                                                 | superuser       | `KodikListSync`; synchronous, не job trigger                            |
| Direct incremental | `POST /dashboard/parsers/kodik/incremental-sync`                                          | superuser       | `KodikIncrementalSync`; synchronous                                     |
| Kodik stats        | `GET /dashboard/parsers/kodik/stats`                                                      | superuser       | `KodikStatsHandler`; не source-health score                             |
| Jobs list          | `GET /dashboard/parsers/jobs`                                                             | superuser       | `ListParserJobs`; status/parser filters + pagination по handler         |
| Job detail         | `GET /dashboard/parsers/jobs/{id}`                                                        | superuser       | `GetParserJob`                                                          |
| Job logs           | `GET /dashboard/parsers/jobs/{id}/logs`                                                   | superuser       | `ListJobLogs`; REST log source                                          |
| Global logs        | `GET /dashboard/parsers/logs`                                                             | superuser       | `ListGlobalLogs`                                                        |
| Trigger job        | `POST /dashboard/parsers/jobs/trigger`                                                    | superuser       | `TriggerParserJob`; body only `parser_name/job_type`                    |
| Stop job           | `POST /dashboard/parsers/jobs/{id}/stop`                                                  | superuser       | `StopParserJob`; only running/pending                                   |
| Delete job         | `DELETE /dashboard/parsers/jobs/{id}`                                                     | superuser       | `DeleteParserJob`                                                       |
| Clear jobs         | `DELETE /dashboard/parsers/jobs`                                                          | superuser       | `ClearParserJobs`; query status behavior проверить заново               |
| Job telemetry      | `GET WS /dashboard/parsers/ws/jobs/{job_id}?token=…`                                      | token in query  | `JobTelemetryWS`; progress/stats, не log stream                         |
| Conflicts list     | `GET /dashboard/parsers/conflicts`                                                        | superuser       | `ListConflicts`                                                         |
| Resolve conflict   | `POST /dashboard/parsers/conflicts/{id}/resolve`                                          | audit/superuser | `ResolveConflict`; exact two strategies from handler                    |
| Moderation queue   | `GET /dashboard/parsers/moderation`                                                       | superuser       | `ListModerationQueue`                                                   |
| Approve moderation | `POST /dashboard/parsers/moderation/approve`                                              | superuser       | `ApproveModeration`; honor `approved/skipped/skipped_ids`               |
| Blacklist          | `GET/POST /dashboard/parsers/blacklist`, `DELETE /dashboard/parsers/blacklist/{entry_id}` | superuser       | only `shikimori_id/kodik_id/slug`; no rules engine                      |
| Parser settings    | `GET /dashboard/parsers/settings`, `PATCH /dashboard/parsers/settings/{category}`         | superuser       | arbitrary JSON object; active Go consumer not confirmed                 |

## Scheduler, monitoring и system

| UI                   | Method + path                                         | Gate            | Handler / важная граница                                         |
| -------------------- | ----------------------------------------------------- | --------------- | ---------------------------------------------------------------- |
| Schedule list        | `GET /dashboard/parsers/scheduler/jobs`               | superuser       | `ListScheduledJobs`                                              |
| Schedule create      | `POST /dashboard/parsers/scheduler/jobs`              | audit/superuser | `CreateScheduledJob`; UI gates to Kodik incremental              |
| Schedule update      | `PATCH /dashboard/parsers/scheduler/jobs/{id}`        | audit/superuser | `UpdateScheduledJob`; cron PATCH не пересчитывает next run сразу |
| Schedule delete      | `DELETE /dashboard/parsers/scheduler/jobs/{id}`       | audit/superuser | `DeleteScheduledJob`                                             |
| Schedule run now     | `POST /dashboard/parsers/scheduler/jobs/{id}/run-now` | superuser       | `RunScheduledJobNow`; Kodik dispatch currently incremental       |
| Monitoring           | `GET /monitoring/health`                              | superuser       | `GetDetailedHealth`; snapshot; cache is not probed               |
| Site settings read   | `GET /system/settings/site`                           | superuser       | `GetSiteSettings`; key/value map, no actor/time                  |
| Site settings update | `PATCH /system/settings/site`                         | audit/superuser | `UpdateSiteSettings`; only existing five keys                    |
| Audit list           | `GET /system/audit-logs`                              | superuser       | `ListAuditLogs`; skip/limit plain array                          |
| Backup list/create   | `GET/POST /backups/`                                  | superuser       | `ListBackups`, `TriggerBackup`; create is synchronous DB+media   |
| Backup download      | `GET /backups/{id}/download`                          | superuser       | direct response, not signed URL                                  |
| Backup delete        | `DELETE /backups/{id}`                                | superuser       | removes file + row; no restore route                             |

## Users, roles, comments и collections

| UI                      | Method + path                                                                                                                    | Gate                                 | Handler / важная граница                             |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------- |
| Roles                   | `GET /roles/`                                                                                                                    | superuser                            | `ListRoles`; read-only four seeded roles             |
| Admin users list/detail | `GET /users/`, `GET /users/{user_id}`                                                                                            | superuser                            | `ListUsersAdmin`, `GetUserByID`; list is plain array |
| Admin user patch        | `PATCH /users/{user_id}`                                                                                                         | audit/superuser                      | `UpdateUserAdmin`; exact patch fields only           |
| Ban/unban               | `POST /users/{user_id}/ban`, `POST /users/{user_id}/unban`                                                                       | audit/superuser                      | no body; superuser ban protected                     |
| Self profile            | `GET /users/me`, `PUT /users/me`                                                                                                 | active user                          | `GetMe`, `UpdateMe`                                  |
| Self images             | `POST /users/me/avatar`, `POST /users/me/cover`                                                                                  | active user                          | own account only                                     |
| Staff comments          | `GET /interactions/comments/staff-queue`                                                                                         | `comments.moderate`                  | plain array; `is_hidden/skip/limit`                  |
| Approve comment         | `POST /interactions/comments/{id}/approve`                                                                                       | `comments.moderate`                  | sets `is_hidden=false`; audit not guaranteed         |
| Delete comment          | `DELETE /interactions/comments/{id}`                                                                                             | active owner or superuser in handler | soft delete; no reason body                          |
| Collections admin list  | `GET /interactions/collections/all`                                                                                              | superuser                            | read-only admin UI                                   |
| Public collections      | `GET /interactions/collections/public`, `GET /interactions/collections/{slug_or_id}`                                             | public                               | public discovery/detail                              |
| My collections          | `GET/POST /interactions/collections`, `PATCH/DELETE /interactions/collections/{id}`, `POST /interactions/collections/{id}/items` | active user                          | owner checks remain authoritative                    |

## Auth/public continuation

| Area          | Routes confirmed in registration                                                                                                                                                                                                               | Constraint                                                             |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Auth          | `POST /auth/login/access-token`, `/auth/register`, `/auth/refresh-token`, `/auth/forgot-password`, `/auth/reset-password`; `GET /auth/verify-email`; authenticated `POST /auth/send-verification`, `/auth/change-password`, `/auth/logout-all` | inspect rate limits, cookie/token ownership and exact bodies before UI |
| Notifications | `GET /notifications/`, `GET /notifications/unread-count`                                                                                                                                                                                       | no mark-read route                                                     |
| Favorites     | `GET/POST/DELETE /interactions/favorites`                                                                                                                                                                                                      | active user; exact query/body semantics from handler                   |
| Comments      | public `GET /interactions/comments`; authenticated create/reply/like/update/delete                                                                                                                                                             | permissions and parent/target fields from handler                      |
| Watch         | Kodik optional-auth progress/preferences plus authenticated continue/progress/history/stats routes                                                                                                                                             | isolate in player client boundary; do not put history in Zustand       |
| Follows       | public followers/following; authenticated toggle/status                                                                                                                                                                                        | small Query island                                                     |
| Public users  | `GET /users/public/{user_id}`, `/users/public/{user_id}/stats`                                                                                                                                                                                 | Server Component reads where cache-safe                                |
| Schedule      | `GET /schedule/history`                                                                                                                                                                                                                        | read contract must be rechecked before `/schedule` redesign            |

## Подтверждённо отсутствующие controls

Не создавать UI без отдельного backend change + tests:

- parser job retry, duplicate, checkpoint или resume;
- stream/URL availability probe;
- backup restore или signed download URL;
- notification mark-read/mark-all-read;
- target-user session/device list, logout-one или admin logout-all;
- comment report queue/reason body;
- generic moderation reject;
- monitoring history/incidents/API p95/cache latency;
- role CRUD;
- server audit filters/total/guaranteed before-after diff;
- report submission endpoint.

## Обновление matrix при внедрении

Для production PR расширить каждую затронутую строку колонками: evidence file:line, request type, response type, error codes, cache/revalidate, query key, invalidation, optimistic policy и test ID. Если эта таблица расходится с текущим кодом, обновить её до UI change.
