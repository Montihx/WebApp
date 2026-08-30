# Route/data matrix

Префикс для строк ниже: `/api/v1`. Владельцы повторно сверены с mirror ветки `main` 21 августа 2026 года и обязаны быть ещё раз проверены в фактической ветке переноса.

| Method | Path | Owner | UI consumer | Integration rule |
| --- | --- | --- | --- | --- |
| GET | `/anime/` | Go | каталог, high-score rail | URL state: q/status/kind/genre/year/min_score/sort/season |
| GET | `/anime/genres` | Go | categories/filter options | не хардкодить production genre inventory |
| GET | `/anime/recent-updates` | Go | новые серии/обновления | не смешивать transport error и пустой массив |
| GET | `/anime/{slug}` | Go | title SSR/hero/details | сохранять `{data}` envelope и not-found semantics |
| GET | `/anime/{id}/episodes` | Go | generic episode browser | season/episode/duration/thumbnail/skip fields |
| GET | `/episodes/{id}/releases` | Go | fallback release selector | `source` отдельно от `translation_team` |
| GET | `/anime/{slug}/last-update` | Go | last release label | optional поля не заменять вымышленной датой |
| GET | `/anime/{slug}/translation-views` | Go | translator ordering/metadata | не превращать в общий view counter |
| GET | `/anime/{slug}/kodik-playlist` | Python/hybrid | primary Kodik player | translators/seasons/episodes/iframe base |
| GET | `/anime/{slug}/skip-times` | Python/hybrid | opening/ending controls | применять только при наличии диапазонов |
| POST | `/anime/{slug}/translations/{id}/view` | Python/hybrid | translation view tracking | после реального playback start |
| GET | `/stream/m3u8` | Python | native HLS source | параметры текущего consumer не угадывать |
| GET | `/stream/master.m3u8` | Python | HLS master | сохранять proxy/error behavior |
| GET | `/schedule/history?days=7` | Go | прошедшие/изменённые релизы | `next_episode_at` optional |
| GET | `/schedule/calendar` | Python/hybrid | будущие релизы | merge/dedupe остаётся в текущем owner до рефакторинга |
| GET | `/interactions/watch-progress/continue` | Go, auth | главная «Продолжить» | guest local history и auth history не смешивать без sync |
| DELETE | `/interactions/watch-progress/{item_id}` | Go, auth | убрать из истории | скрывать после успешного response |
| PATCH | `/interactions/watch-progress/kodik` | Go, optional auth | progress player | local write всегда; API — по текущей auth semantics |
| GET | `/interactions/watch-progress/kodik/{slug}` | Go, optional auth | resume position | graceful guest response допускается handler contract |
| GET/PUT | `/interactions/preferences/kodik/{slug}` | Go, optional auth | player preferences | sync с local prefs без потери user choice |
| GET | `/interactions/favorites` | Go, auth | текущая list category | optional `category` query |
| POST | `/interactions/favorites` | Go, auth | add/change category | query/body форму подтвердить текущим client/handler |
| DELETE | `/interactions/favorites` | Go, auth | remove from list | отдельное удаление, не category=`none` на wire |
| GET | `/interactions/comments` | Go, public | comments list | anime filters/pagination сверить перед переносом |
| POST | `/interactions/comments` | Go, auth | create comment | success только после response |
| POST | `/interactions/comments/{id}/reply` | Go, auth | reply | сохранять parent/thread semantics |
| POST | `/interactions/comments/{id}/like` | Go, auth | like | rollback optimistic state при ошибке |
| GET | `/interactions/collections/public` | Go, public | public collections | не показывать private collections |
| GET | `/notifications/` | Go, auth | notification popover | unread/read fields из response |
| GET | `/notifications/unread-count` | Go, auth | header badge | raw integer в текущем frontend consumer |
| POST | `/notifications/mark-all-read` | Python/hybrid, auth | «Прочитать все» | Go route в audited registration отсутствует |
| PATCH | `/notifications/{id}/read` | Python/hybrid, auth | read single item | owner повторно проверить после migration waves |
| GET/PUT | `/users/me` | Go, auth | preferences/profile | merge `preferences`, не затирать соседние keys |

## Response fields used by the template

Anime: `id`, `slug`, `title`, `title_en`, `title_jp`, `description`, `kind`, `status`, `score`, `rating`, `year`/`aired_on`, `poster_url`, `cover_url`, `episodes_total`, `episodes_aired`, `genres`, `studios`, `next_episode_at`, `related`, `favorites_count`, `comments_count`.

Episode: `id`, `season`, `episode`, `thumbnail`, `aired_at`, `duration`, `is_filler`, `is_recap`, opening/ending skip ranges.

Release: `id`, `source`, `translation_type`, `translation_team`, `language`, `quality`, `url`, `embed_url`, `is_active`, `is_verified`.

Unknown/nullable values остаются unknown/nullable. UI не заменяет их нулём, «сегодня» или «доступно» без основания.
