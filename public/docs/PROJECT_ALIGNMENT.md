# Соответствие текущему проекту

Дата повторного аудита: 21 августа 2026 года. Источник истины — фактический код ветки `main` переданного repository mirror, а не старые screenshots или документация.

## Проверенные frontend owners

- `frontend/app/page.tsx` — server orchestration главной, параллельная загрузка trending/ongoing/season/schedule/recent.
- `frontend/components/Hero.tsx`, `ContinueWatching.tsx`, `components/home/HomeGrid.tsx`, `SchedulePanel.tsx`, `UpdatesPanel.tsx` — реальные блоки главной.
- `frontend/app/anime/[slug]/page.tsx` — SSR fetch, metadata, canonical, JSON-LD, revalidation и not-found.
- `frontend/app/anime/[slug]/AnimePageClient.tsx` — Kodik/HLS player, серии, переводы, progress, skip-times, auto-next и related.
- `frontend/components/AnimeInfo.tsx` — favorites categories и `preferences.anime_notifications`.
- `frontend/hooks/queries.ts`, `mutations.ts`, `lib/services/anime.ts` — query/mutation contracts.
- `frontend/components/player/HlsPlayer.tsx`, `PlayerOverlay.tsx` — реальный playback runtime и error states.

## Проверенные backend owners

- `backend-go/cmd/api/main.go` — активные Go routes каталога, anime detail, episodes/releases, interactions, schedule history и notification reads.
- `backend-go/internal/handlers/*` — response shapes и authorization текущего Go слоя.
- `backend/app/api/v1/endpoints/anime.py` — Kodik playlist, skip-times и оставшиеся title routes.
- `backend/app/api/v1/endpoints/stream.py` — HLS proxy/master routes.
- `backend/app/api/v1/endpoints/schedule.py` — calendar и history Python implementation.
- `backend/app/api/v1/endpoints/notifications.py` — mark-read writes, пока они не зарегистрированы в Go.
- `backend/app/api/v1/endpoints/interactions.py` — favorite categories и interaction semantics для parity проверки.

## UI ↔ code alignment

| Блок шаблона | Подтверждённый consumer/contract | Решение |
| --- | --- | --- |
| Главный hero | `Hero`, anime fields `title`, `description`, `poster_url`, score/year/studio | сохранены пять API-слайдов, 7-секундный timer, background/focus image layers и controls; визуальная палитра адаптирована под Anime Graphite |
| Продолжить | `ContinueWatching`, local + authenticated watch progress | локальное автономное состояние; production owner не меняется |
| Каталог tabs | `/anime` с `sort_by`, `status`, `season`; `/recent-updates` | три понятных discovery состояния |
| Расписание | `/schedule/history` + `/schedule/calendar` | время скрывается, если API его не вернул |
| Публичные коллекции | `/interactions/collections/public` | только read-only cards |
| Title hero | SSR `/anime/{slug}` + `AnimeInfo` | сохранены metadata/SEO boundaries; mobile-композиция опирается на полный poster, быстрые actions и компактную сетку фактов без повторной details-секции |
| Мой список | favorites categories и отдельный DELETE | ровно пять подтверждённых categories; popover на desktop и modal sheet на mobile |
| Уведомления тайтла | `users/me.preferences.anime_notifications` | episode/dubbing/all/none; trigger расположен у списка серий, где понятен объект подписки |
| Плеер | Kodik playlist → HLS/iframe fallback → generic releases | макет оформляет shell, не заменяет runtime |
| Источник/перевод | `release.source` и `translation_team`/Kodik translator | намеренно разделены |
| Player preferences | local prefs + `/interactions/preferences/kodik/{slug}` | bottom sheet показывает только opening/ending/auto-next/quality/speed/mode; mini-player/download не добавлены |
| Серии | `/anime/{id}/episodes`, Kodik playlist episodes | season/episode selection без invented grouping |
| Комментарии | public GET + authenticated create/reply/like/update/delete | показано честное пустое состояние |
| Нижний rail | score-sorted catalog | не выдаётся за related без `anime.related` |

## Что намеренно не добавлено

- вымышленные social counters, live viewers, critic reviews и recommendations service;
- stream health/probe, download/offline, party watch и chat;
- фиктивные related titles для конкретного тайтла;
- success для auth/API mutations внутри автономного HTML;
- административные controls на публичных страницах;
- маркировки «данные проверены/синхронизированы», которые нельзя доказать runtime response.

## Статические fixtures

Названия и числа в HTML демонстрируют реальные поля и граничные состояния, но не являются текущими production данными. При переносе они заменяются responses существующих queries. Внешние poster URLs не входят в архив; production должен использовать API URLs и существующую image policy.
