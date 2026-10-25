# Админка Kitsu v4 — примечание для переноса

Этот файл — единственная действующая документация админки. Старые документы
(`ROUTE_ACTION_MATRIX`, `FUNCTIONAL_COVERAGE`, `CODEX_MIGRATION_RUNBOOK` и
другие) удалены: они описывали прежний шаблон и местами расходились с кодом.

Сверено с `github.com/Montihx/kitsu-enterprise-site`, коммит `d2bd1c5`
(25.10.2026), по коду `backend-go`, `nginx/nginx.conf`, схеме
`backend/audit/schema.prod.20260829.sql` и миграции `20261025_monitor_tables`.
Документации проекта при сверке не доверял: каждое утверждение ниже проверено
по исходнику, ссылки даны на файлы и строки.

## Что это

Статичный интерактивный шаблон: `admin/index.html` открывается без сборки.
Он показывает, как должна выглядеть и вести себя админка, когда её будут
переносить в Next.js (`frontend/` в kitsu-enterprise-site — зона владельца;
целевой стек описан в `PROJECT.md`).

- `admin/data.js` — демонстрационные данные. Формы полей повторяют ответы API,
  время — наивный UTC, как отдаёт сервер. Пользователи синтетические.
- `admin/contracts.js` — карта «кнопка → запрос → кто может» и чистые
  помощники: время Алматы, cron, проверка форм, реальные права ролей.
- `admin/app.js` — экраны, панели, подтверждения, поиск по `Ctrl+K` или `/`.
- `admin/styles.css` — оформление поверх общих токенов `../tokens.css`.

Запросы шаблон не отправляет. Любая кнопка с последствиями открывает
подтверждение с точным методом, путём и телом запроса, а после «ОК» честно
пишет «Макет: запрос не отправлен».

## Карта разделов

Раньше было 20 экранов в одном плоском меню, сгруппированных по таблицам базы.
Теперь 7 разделов, сгруппированных по задачам оператора:

| Раздел | Страницы | Зачем |
|---|---|---|
| Пульт | одна | Сутки стенда по `stack_heartbeats`, «Требует внимания», текущая задача, цифры каталога |
| Каталог | Тайтлы · Добавить из Kodik · Серии и источники · Коллекции | Контент |
| Очереди | Модерация · Конфликты · Комментарии | То, что синхронизация не решила сама |
| Парсер | Запуск · Задачи · Расписание · Журнал · Исключения | Всё про синхронизацию |
| Стенд | Проверки · Ресурсы · Резервные копии · Журнал действий | Здоровье и безопасность |
| Люди | Пользователи · Доступ · Оформление | Аккаунты, реальные права, аватары и рамки |
| Настройки | одна | Где на самом деле живёт каждая настройка |

Адреса — `#/раздел/страница`, например `#/parser/schedule`. Это прямо
переносится в App Router: `/dashboard/parser/schedule`.

## Находки в бэкенде

Это не задачи для шаблона, а факты, из-за которых интерфейс устроен так, как
устроен. Решать их — владельцу.

1. **Настройки парсера ни на что не влияют.** Таблицу `parser_settings`
   (10 категорий в старом дашборде, 61 поле) Go-бэкенд только отдаёт и
   сохраняет (`internal/handlers/parsers_admin.go:24`, `:53`). Единственный
   разборщик `mediapipeline.ConfigFromMap` (`internal/mediapipeline/mediapipeline.go:53`)
   нигде не вызывается. Python-читатели (`app/tasks/parsers.py`,
   `services/parsers/reconciliation.py`) не запускаются: Python-воркера в
   `docker-compose.prod.yml` нет.
2. **Настройки сайта тоже не читаются.** Ключи `site_name`, `maintenance_mode`,
   `allow_registration`, `accent_primary`, `accent_danger` нигде не используются,
   ни в Go, ни во фронтенде. `PATCH /system/settings/site` делает только UPDATE
   существующих ключей, неизвестные молча пропускает (`system_admin.go:52`).
   Пункт меню «Настройки» ведёт на `/dashboard/settings/site`, а такой
   страницы нет (`frontend/components/dashboard/Sidebar.tsx:59`).
3. **Две кнопки запуска в текущем дашборде всегда падают.** «Инкремент
   Shikimori» и «Полная синхронизация» (`frontend/app/dashboard/parsers/page.tsx:226-227`)
   уходят в воркер, который для Shikimori умеет только `related_refresh` и
   `calendar_snapshot` (`internal/parserworker/parserworker.go:109-127`):
   задача сразу завершается ошибкой «shikimori sync not yet ported to Go worker».
4. **Ночная строка расписания `kodik/full_sync` (`0 3 * * *`) выполняет
   инкремент, а не полный обход.** Пульс и «Запустить сейчас» берут режим из
   `asynqtasks.ModeForScheduled`: для Kodik всё, кроме пересчёта серий, —
   `incremental` (`scheduler_admin.go:233`). Полный обход бывает только при
   ручном `POST /jobs/trigger`.
5. **Кнопка «Применить данные Shikimori» в конфликтах ничего не меняет.**
   Единственный тип конфликта — `shikimori_identity_mismatch`. Его
   `incoming_data` (`russian`, `name`, `english`, `id`, `season_number`…) не
   пересекается со списком разрешённых колонок `anifieldsWhitelist`
   (`parsers_admin.go:160`), поэтому стратегия `replace` не пишет в `anime`
   ни одного поля и только закрывает конфликт.
6. **Очередь комментариев пуста по построению.** Комментарии создаются с
   `is_hidden = false`, а действия «скрыть» в API нет. `approve` снимает флаг,
   которого никто не ставит. Модератор с `comments.moderate` не может удалить
   чужой комментарий — это может только суперпользователь
   (`comments_mutations.go`, проверка `is_superuser` перед удалением).
7. **Из прав ролей проверяются только два:** `content.edit` (серии и источники)
   и `comments.moderate` (лента комментариев) — `cmd/api/main.go:196`, `:208`,
   `:290`. Всё остальное требует флага `is_superuser`. Права `users.view`,
   `users.edit`, `parsers.*`, `analytics.view` у ролей записаны, но нигде не
   проверяются. Роль `admin` без флага не откроет ни парсер, ни пользователей.
8. **Два значения статуса «анонс».** Синхронизация пишет `announced`
   (`kodiksync/kodiksync.go:44`), а массовая смена статуса разрешает только
   `anons` (`bulk.go:22`). Код, который ждёт `announced` (например, правило
   одобрения модерации, `parsers_admin.go:308`), тайтл с `anons` не узнает.
9. **Расписание принимает что угодно.** Создание не проверяет cron,
   `parser_name` и `job_type`; первый запуск — через час, независимо от cron
   (`scheduler_admin.go:109`); правка cron не пересчитывает `next_run_at`;
   неверный cron молча превращается в «раз в час»
   (`parserworker.go`, `nextRunFromCron`). Пульс срабатывает раз в 15 минут,
   поэтому чаще задачи не идут.
10. **`POST /jobs/trigger` принимает любые значения.** Неизвестный тип для
    Kodik выполнится как инкремент, для Shikimori упадёт. Список типов в
    дашборде захардкожен (пункт 0.3 плана: эндпоинт `job-types`).
11. **Инкремент Kodik не создаёт тайтлы.** Он дописывает серии и озвучки
    уже существующим тайтлам (`kodiksync/sync_incremental.go`); новые
    тайтлы приходят только из полного обхода или импорта.
12. **Процент у задач.** По ходу работы прогресс пишут только пересчёт серий
    и «Связанные тайтлы»; инкремент и полный обход Kodik пишут счётчики один
    раз в конце. Полоса на нуле полчаса — норма.
13. **`/monitoring/health` не измеряет кэш:** `cache.status` всегда `online`
    (`monitoring.go:96`). `uptime` в `stats/overview` — время жизни процесса
    `api-go`, а не стенда; `trend` — рост к числу строк старше 30 дней.
14. **Причину модерации `no_video` Go-код не ставит.** Новые тайтлы без видео
    импорт просто пропускает (`kodiksync/import_single.go:126`), а синхронизация
    пишет только `poster_url` и `description`. Строки с `no_video` могли
    остаться от Python; правило одобрения для них в `parsers_admin.go:307`.
15. **Одобрение модерации и правка настроек парсера не попадают в журнал
    действий** (`ApproveModeration` и `UpdateParserSettings` без `RequireAudit`).
16. **Коллекции в админке только читаются.** Поле `is_featured` есть, а
    эндпоинта, который его меняет, нет.

## Что упрощено в интерфейсе и почему

- **Настройки** превращены в одну честную страницу: что работает и где это
  настраивается (расписание, исключения, роли, оформление); настройки сайта с
  пометкой «сайт не читает»; что задано на сервере (ключ Kodik, почта, время
  бэкапа, шаг пульса, один слот очереди); архив старых категорий парсера
  свёрнут, с кнопкой выгрузки JSON. Поля ключа Kodik в интерфейсе нет вовсе:
  настоящий ключ живёт в окружении, а история утечки ключа есть в плане.
- **Расписание** задаётся пресетами «каждые N минут», «раз в день»,
  «раз в неделю» со временем по Алматы. Под строкой мелко виден cron в UTC.
  «Карта суток» показывает, когда что срабатывает, включая бэкап в 05:00.
  Запланировать можно только операции, которые имеет смысл планировать.
- **Запуск** — карточки операций из одного реестра (`data.js`, `operations`):
  что делает, сколько идёт, занимает ли очередь, можно ли планировать,
  пробный режим для починки данных. Неработающие Shikimori-операции показаны
  выключенными, с объяснением.
- **Конфликты** — «У нас» против «Shikimori», несовпавший сезон подсвечен.
  Действия названы по факту: «Верно, закрыть» и «Исправить Shikimori ID».
- **Модерация** — причина словами, «Одобрить» доступно только тому, что сервер
  действительно одобрит; остальное — «Заполнить» с переходом в редактор.
- **Доступ** — для каждой роли показано, что она реально открывает, и в
  карточке пользователя виден итог «что увидит в админке».
- **Проверки** — страница только рисует ответ сервера, без своих порогов и
  списков, с объяснением каждого состояния.

## Что сознательно не вынесено в шаблон

- `POST /dashboard/parsers/add-from-kodik` — привязывает Kodik к уже
  существующему тайтлу (ищет по `shikimori_id`, затем `kodik_shikimori_id`,
  затем `kodik_id`) или вызывает тот же импорт. Похоже на кнопку «Привязать
  видео» для тайтлов «Нет видео», но эта ручка не пишет `kodik_url` и не
  снимает `needs_moderation` (`kodiksync/add_from_kodik.go`). Перед тем как
  делать такую кнопку, это нужно решить в бэкенде.
- `POST /dashboard/parsers/search-live` и `POST /dashboard/parsers/fetch-full` —
  объединённый предпросмотр Kodik и Shikimori. Подойдут для карточки
  предпросмотра в «Добавить из Kodik», в шаблоне не показаны.
- `POST /dashboard/parsers/kodik/list-sync` и `/kodik/incremental-sync` —
  синхронизация прямо в HTTP-запросе, без очереди и без строки в
  `parser_jobs`. Держат запрос минутами и не видны мониторингу. В шаблоне
  вместо них только `POST /jobs/trigger`.
- `GET /dashboard/parsers/kodik/search-list` — сырой ответ Kodik без
  дедупликации и без отметки «уже в каталоге». Шаблон использует
  `kodik/search`: он берёт 50 результатов, убирает дубликаты по
  `shikimori_id`, отмечает `already_exists` и `has_video` и режет на страницы.
- `GET /dashboard/parsers/settings` и `PATCH .../settings/{category}` — только
  выгрузка архива; вкладок редактирования нет (находка 1).

## Что нужно от бэкенда, чтобы шаблон стал полностью честным

В порядке пользы:

1. `GET /dashboard/parsers/job-types` из `asynqtasks/jobmodes.go` (пункт 0.3):
   поля шаблона — `parser`, `job_type`, `title`, `summary`, `duration`,
   `timeout`, `blocks`, `schedulable`, `works`, `progress` (`live` | `end`),
   `dry`. Тогда реестр операций уходит из фронтенда.
2. Источник запуска в `parser_jobs` (пункт 3.5): `schedule` | `manual` |
   `run_now` | `cli`. В шаблоне он уже показан в «Задачах».
3. Решение по настройкам: удалить таблицы и вкладки или подключить нужное.
   Самое дешёвое полезное — `allow_registration` в `POST /auth/register`.
4. Одно значение статуса анонса (`announced`) во всех путях.
5. Конфликты: либо стратегия, которая правда пишет `shikimori_id`, либо
   оставить только «закрыть».
6. Комментарии: действие «скрыть» и право модератора удалять, если модерация
   нужна; иначе убрать очередь.
7. Колонка «зачем» у `parser_anime_blacklist`; `is_featured` для коллекций;
   настоящая проверка Redis в `/monitoring/health`.

## Карта запросов

Источник — `admin/contracts.js` (`endpoints`). Пути относительно `/api/v1`.

| Ключ | Запрос | Кто может | Примечание |
|---|---|---|---|
| `overview.stats` | `GET /dashboard/stats/overview` | суперпользователь | audience/catalog/assets: value и trend (рост к числу строк старше 30 дней); uptime — время жизни процесса api-go |
| `overview.charts` | `GET /dashboard/stats/charts` | суперпользователь | 7 дней, items_processed по парсерам; name — английское сокращение дня |
| `overview.popular` | `GET /dashboard/stats/popular` | суперпользователь | 5 тайтлов по views_count |
| `overview.genres` | `GET /dashboard/stats/genres` | суперпользователь | 8 жанров |
| `checks.list` | `GET /dashboard/monitoring/checks` | суперпользователь | monitor, stack, summary, checks[] — порядок задаёт сервер |
| `health.get` | `GET /monitoring/health` | суперпользователь | cache.status захардкожен как online — не измерение |
| `kodik.stats` | `GET /dashboard/parsers/kodik/stats` | суперпользователь | покрытие каталога Kodik |
| `anime.list` | `GET /dashboard/parsers/anime-list` | суперпользователь | search, kind, status, has_video, needs_moderation, skip, limit |
| `anime.get` | `GET /anime/{slug}` | все |  |
| `anime.create` | `POST /anime/` | суперпользователь | обязательны title и slug; запись в audit_logs |
| `anime.update` | `PATCH /anime/{id}` | суперпользователь | только присланные поля; при постере и описании снимает needs_moderation |
| `anime.delete` | `DELETE /anime/{id}` | суперпользователь | необратимо |
| `anime.refresh` | `POST /dashboard/parsers/kodik/refresh/{slug}` | суперпользователь | перечитать тайтл из Kodik |
| `anime.refreshPoster` | `POST /dashboard/parsers/kodik/refresh-poster/{slug}` | суперпользователь | постер из Shikimori |
| `bulk.anime` | `POST /dashboard/bulk/anime` | суперпользователь | {ids, action: delete \| update_status, new_status}; допустимые статусы anons, cancelled, hiatus, ongoing, released |
| `bulk.episodes` | `POST /dashboard/bulk/episodes` | суперпользователь | {ids, action: delete} |
| `import.search` | `GET /dashboard/parsers/kodik/search` | суперпользователь | q, page, limit; дубликаты по shikimori_id убраны, есть already_exists и has_video |
| `import.single` | `POST /dashboard/parsers/kodik/import` | суперпользователь | {shikimori_id, kodik_id}; ответ: status created \| updated \| skipped, needs_review, missing_fields |
| `episodes.list` | `GET /episodes/with-anime` | все | только skip и limit: поиска по тайтлу на сервере нет |
| `episodes.byAnime` | `GET /anime/{id}/episodes` | все |  |
| `episodes.create` | `POST /episodes/` | право content.edit | {anime_id, episode, season, title, thumbnail_url, aired_at, is_filler, is_recap} |
| `episodes.update` | `PATCH /episodes/{id}` | право content.edit | title, thumbnail_url, season, episode, aired_at, is_filler, is_recap |
| `episodes.delete` | `DELETE /episodes/{id}` | право content.edit |  |
| `releases.byEpisode` | `GET /episodes/{id}/releases` | все |  |
| `releases.create` | `POST /releases/` | право content.edit | {episode_id, source, url} обязательны |
| `releases.update` | `PATCH /releases/{id}` | право content.edit |  |
| `releases.delete` | `DELETE /releases/{id}` | право content.edit |  |
| `collections.list` | `GET /interactions/collections/all` | суперпользователь | только чтение: правок коллекций из админки в API нет |
| `moderation.list` | `GET /dashboard/parsers/moderation` | суперпользователь | anime.needs_moderation = true |
| `moderation.approve` | `POST /dashboard/parsers/moderation/approve` | суперпользователь | {anime_ids}; одобряет только подходящие, остальные в skipped_ids; без записи в журнал |
| `conflicts.list` | `GET /dashboard/parsers/conflicts` | суперпользователь | status: pending \| auto_accepted \| resolved |
| `conflicts.resolve` | `POST /dashboard/parsers/conflicts/{id}/resolve` | суперпользователь | {strategy}; для shikimori_identity_mismatch любая стратегия только закрывает конфликт |
| `comments.list` | `GET /interactions/comments/staff-queue` | право comments.moderate | is_hidden, skip, limit |
| `comments.delete` | `DELETE /interactions/comments/{id}` | суперпользователь | мягкое удаление: текст становится «[удалено]»; модератор чужое удалить не может |
| `jobs.trigger` | `POST /dashboard/parsers/jobs/trigger` | суперпользователь | {parser_name, job_type}; сервер принимает любые значения |
| `jobs.list` | `GET /dashboard/parsers/jobs` | суперпользователь | status, parser_name, skip, limit |
| `jobs.get` | `GET /dashboard/parsers/jobs/{id}` | суперпользователь |  |
| `jobs.logs` | `GET /dashboard/parsers/jobs/{id}/logs` | суперпользователь |  |
| `jobs.live` | `WS /dashboard/parsers/ws/jobs/{id}` | суперпользователь | живой прогресс |
| `jobs.stop` | `POST /dashboard/parsers/jobs/{id}/stop` | суперпользователь | только pending и running |
| `jobs.delete` | `DELETE /dashboard/parsers/jobs/{id}` | суперпользователь |  |
| `jobs.clear` | `DELETE /dashboard/parsers/jobs` | суперпользователь | status: completed \| failed \| cancelled |
| `logs.list` | `GET /dashboard/parsers/logs` | суперпользователь | level, job_id |
| `schedule.list` | `GET /dashboard/parsers/scheduler/jobs` | суперпользователь |  |
| `schedule.create` | `POST /dashboard/parsers/scheduler/jobs` | суперпользователь | {parser_name, job_type, cron_expression, is_active}; первый запуск через час, cron не проверяется |
| `schedule.update` | `PATCH /dashboard/parsers/scheduler/jobs/{id}` | суперпользователь | next_run_at при смене cron не пересчитывается |
| `schedule.delete` | `DELETE /dashboard/parsers/scheduler/jobs/{id}` | суперпользователь |  |
| `schedule.runNow` | `POST /dashboard/parsers/scheduler/jobs/{id}/run-now` | суперпользователь | kodik всегда как инкремент |
| `blacklist.list` | `GET /dashboard/parsers/blacklist` | суперпользователь |  |
| `blacklist.create` | `POST /dashboard/parsers/blacklist` | суперпользователь | {shikimori_id \| kodik_id \| slug} |
| `blacklist.delete` | `DELETE /dashboard/parsers/blacklist/{id}` | суперпользователь |  |
| `backups.list` | `GET /backups/` | суперпользователь | две строки на запуск: database и media |
| `backups.create` | `POST /backups/` | суперпользователь | синхронно, 1–2 минуты; пишет две строки |
| `backups.download` | `GET /backups/{id}/download` | суперпользователь |  |
| `backups.delete` | `DELETE /backups/{id}` | суперпользователь |  |
| `audit.list` | `GET /system/audit-logs` | суперпользователь | skip, limit |
| `users.list` | `GET /users/` | суперпользователь | q (username или email), skip, limit |
| `users.update` | `PATCH /users/{id}` | суперпользователь | email, username, gender, bio, is_active, is_superuser, is_verified, role_id, password |
| `users.ban` | `POST /users/{id}/ban` | суперпользователь | суперпользователя забанить нельзя (400) |
| `users.unban` | `POST /users/{id}/unban` | суперпользователь |  |
| `roles.list` | `GET /roles/` | суперпользователь | создавать и менять роли через API нельзя |
| `avatars.create` | `POST /avatar-collection/` | суперпользователь | {title, image_url, category, is_active} |
| `avatars.update` | `PATCH /avatar-collection/{id}` | суперпользователь |  |
| `avatars.delete` | `DELETE /avatar-collection/{id}` | суперпользователь |  |
| `avatars.upload` | `POST /avatar-collection/{id}/upload` | суперпользователь | multipart, поле file |
| `decorations.create` | `POST /decorations/` | суперпользователь | {title, image_url, is_active} |
| `decorations.update` | `PATCH /decorations/{id}` | суперпользователь |  |
| `decorations.delete` | `DELETE /decorations/{id}` | суперпользователь |  |
| `decorations.upload` | `POST /decorations/{id}/upload` | суперпользователь | multipart, поле file |
| `site.get` | `GET /system/settings/site` | суперпользователь | ключи site_name, maintenance_mode, allow_registration, accent_primary, accent_danger |
| `site.update` | `PATCH /system/settings/site` | суперпользователь | только UPDATE существующих ключей; неизвестные молча пропускаются; сайт эти значения не читает |
| `parserSettings.list` | `GET /dashboard/parsers/settings` | суперпользователь | архив: текущий бэкенд эти значения не читает |

## Перенос в Next.js

- Каждая страница — один маршрут `app/dashboard/<раздел>/<страница>/page.tsx`;
  данные — TanStack Query, фильтры — в URL через nuqs.
- Панели справа (редакторы) — `Sheet` из shadcn/ui; подтверждения — `AlertDialog`
  с блоком запроса (метод, путь, тело) в режиме разработки.
- Статусы: один словарь `STATUS` (тон + подпись) из `app.js`, ничего не
  перекрашивать по месту.
- Время: API отдаёт наивный UTC; показывать Asia/Almaty, в формах вводить
  Алматы и переводить в UTC (`contracts.js`: `localToUtc`, `utcToLocalInput`).
- Реестр операций и проверки мониторинга — только с сервера.
- Мутации: успех показывать только после ответа сервера.

## Правила оформления

Общие правила — `.claude/skills/kitsu-design/SKILL.md`. Для админки главное:
только палитры «Сакура» и «Обсидиан», светлая и тёмная темы; иконки без
рамок и подложек; без эмодзи и символов-заменителей (стрелки, звёзды,
галочки); никаких круглых и «таблеточных» форм; адаптив 320–1920 px;
контраст текста от 4.5:1. Одна страница — один `h1` с балкой-градиентом.

## Проверки

- `npm test` — в том числе `tools/admin.test.mjs`: все экраны рисуются, у
  каждой кнопки есть обработчик и контракт, нет эмодзи, cron и время Алматы,
  реальные права ролей, честный реестр операций, прямоугольные формы.
- `npm run check` — `admin/tools/qa.mjs`: файлы, ссылки, структура CSS,
  контраст токенов.
- `tools/ui-audit/run.sh` — браузерные аудиты всех 21 экранов и открытых
  панелей: рамки у иконок, круглые формы, эмодзи, вёрстка на 9 ширинах,
  контраст.
