/* Демонстрационные данные админки Kitsu.
   Формы полей повторяют ответы бэкенда (kitsu-enterprise-site, backend-go/internal/handlers).
   Время — как отдаёт API: «наивный» UTC без зоны. Показывается в Asia/Almaty (UTC+5).
   Пользователи синтетические: ни одного реального email или имени. */
(() => {
  "use strict";

  const NOW = "2026-10-25T21:40:00";

  /* Реестр операций парсера. Сейчас в бэкенде такого эндпоинта нет (план 0.3:
     GET /dashboard/parsers/job-types из asynqtasks/jobmodes.go). Шаблон рисует
     операции только отсюда, чтобы при переносе список пришёл с сервера. */
  const operations = [
    {
      key: "kodik:incremental", parser: "kodik", job_type: "incremental", group: "daily",
      title: "Новые серии и озвучки", icon: "sparkles",
      summary: "Забирает из Kodik всё, что обновилось с прошлого прохода: новые серии и озвучки у тайтлов, которые уже есть в каталоге. Новых тайтлов не создаёт: для этого импорт или полный обход.",
      duration: "1–3 мин", timeout: "5 мин", blocks: false, schedulable: true, works: true, progress: "end",
    },
    {
      key: "shikimori:calendar_snapshot", parser: "shikimori", job_type: "calendar_snapshot", group: "daily",
      title: "Календарь выхода", icon: "calendar-days",
      summary: "Сохраняет снимок календаря Shikimori: из него строится расписание на сайте на 14 дней вперёд.",
      duration: "до 1 мин", timeout: "2 мин", blocks: false, schedulable: true, works: true, progress: "end",
    },
    {
      key: "shikimori:shikimori_related_refresh", parser: "shikimori", job_type: "shikimori_related_refresh", group: "long",
      title: "Связанные тайтлы и названия", icon: "git-fork",
      summary: "Проходит тайтлы без связей: дописывает «связанные», ромадзи и синонимы. Сомнительные совпадения уходят в конфликты.",
      duration: "до 2 ч", timeout: "2 ч", blocks: true, schedulable: true, works: true, progress: "live",
      guard: "Останавливается сама после трёх ответов 429 от Shikimori или если строка начинает идти дольше 12 секунд. Продолжить можно повторным запуском.",
    },
    {
      key: "kodik:full_sync", parser: "kodik", job_type: "full_sync", group: "long",
      title: "Полный обход каталога Kodik", icon: "library",
      summary: "Пролистывает весь каталог Kodik, до 400 страниц: добавляет тайтлы, которых ещё нет, и обновляет остальные. Нужен редко: после долгого простоя или для сверки.",
      duration: "20–30 мин", timeout: "30 мин", blocks: true, schedulable: false, works: true, danger: true, progress: "end",
      guard: "Процент не растёт до самого конца: счётчики записываются один раз, в финале. 30 минут на нуле — это нормально.",
      scheduleNote: "В расписании этот тип выполняется как «Новые серии и озвучки», а не как полный обход. Поэтому планировать его бессмысленно.",
    },
    {
      key: "kodik:episodes_recompute", parser: "kodik", job_type: "episodes_recompute", dry: "episodes_recompute_dry", group: "repair",
      title: "Пересчёт серий и сезонов", icon: "list-restart",
      summary: "Заново раскладывает серии по сезонам по живому плейлисту Kodik и обновляет превью.",
      duration: "до 1 ч", timeout: "1 ч", blocks: true, schedulable: false, works: true, danger: true, progress: "live",
    },
    {
      key: "kodik:episodes_zero_fix", parser: "kodik", job_type: "episodes_zero_fix", dry: "episodes_zero_fix_dry", group: "repair",
      title: "Нулевой сезон в первый", icon: "wrench",
      summary: "Переносит серии, которые Kodik отдал в «нулевом» сезоне, в первый. Работает только с базой, Kodik не запрашивает.",
      duration: "секунды", timeout: "5 мин", blocks: false, schedulable: false, works: true, progress: "end",
    },
    {
      key: "shikimori:incremental", parser: "shikimori", job_type: "incremental", group: "missing",
      title: "Инкремент Shikimori", icon: "ban",
      summary: "В Go-воркер не перенесено. Задача завершится ошибкой «shikimori sync not yet ported to Go worker» за 0 секунд.",
      works: false,
    },
    {
      key: "shikimori:full_sync", parser: "shikimori", job_type: "full_sync", group: "missing",
      title: "Полная синхронизация Shikimori", icon: "ban",
      summary: "Тоже не перенесено и падает сразу. Кнопки для этих двух задач есть в текущем дашборде, поэтому здесь они показаны выключенными.",
      works: false,
    },
  ];

  const anime = [
    { id: "2f6c1a8e-41d3-4b7a-9a52-0c1e6b8d4a11", slug: "monster", title: "Монстр", title_en: "Monster", title_jp: "MONSTER", title_romaji: "Monster", kind: "tv", status: "released", rating: "r", score: 8.87, episodes_aired: 74, episodes_total: 74, aired_on: "2004-04-07", shikimori_id: 19, mal_id: 19, kodik_id: "serial-1471", kodik_shikimori_id: 19, views_count: 18420, favorites_count: 640, needs_moderation: false, poster: true, description: true, updated_at: "2026-10-25T21:30:41", genres: ["Детектив", "Драма", "Психологическое", "Сейнен"], studios: ["Madhouse"], synonyms: ["Монстр (2004)"], related: 1 },
    { id: "7a0e9c33-2d55-4f19-8c0a-91b2f6e3c702", slug: "fullmetal-alchemist-brotherhood", title: "Стальной алхимик: Братство", title_en: "Fullmetal Alchemist: Brotherhood", title_jp: "鋼の錬金術師 FULLMETAL ALCHEMIST", title_romaji: "Hagane no Renkinjutsushi: Fullmetal Alchemist", kind: "tv", status: "released", rating: "r", score: 9.1, episodes_aired: 64, episodes_total: 64, aired_on: "2009-04-05", shikimori_id: 5114, mal_id: 5114, kodik_id: "serial-2212", kodik_shikimori_id: 5114, views_count: 32110, favorites_count: 1904, needs_moderation: false, poster: true, description: true, updated_at: "2026-10-25T20:02:13", genres: ["Приключения", "Драма", "Фэнтези", "Сёнен"], studios: ["Bones"], synonyms: [], related: 6 },
    { id: "c4d8b1f2-6e70-4a3d-b9e1-55a0f7d2e913", slug: "steins-gate", title: "Врата Штейна", title_en: "Steins;Gate", title_jp: "シュタインズ・ゲート", title_romaji: "Steins;Gate", kind: "tv", status: "released", rating: "pg_13", score: 9.08, episodes_aired: 24, episodes_total: 24, aired_on: "2011-04-06", shikimori_id: 9253, mal_id: 9253, kodik_id: "serial-3307", kodik_shikimori_id: 9253, views_count: 27904, favorites_count: 1530, needs_moderation: false, poster: true, description: true, updated_at: "2026-10-25T19:58:00", genres: ["Фантастика", "Триллер", "Драма"], studios: ["White Fox"], synonyms: ["Steins Gate"], related: 4 },
    { id: "a91f0d6c-3b84-4e2a-8d17-7c6e2b0f5a24", slug: "jujutsu-kaisen", title: "Магическая битва", title_en: "Jujutsu Kaisen", title_jp: "呪術廻戦", title_romaji: "Jujutsu Kaisen", kind: "tv", status: "released", rating: "r", score: 8.6, episodes_aired: 47, episodes_total: 47, aired_on: "2020-10-03", shikimori_id: 40748, mal_id: 40748, kodik_id: "serial-40031", kodik_shikimori_id: 40748, views_count: 41200, favorites_count: 2210, needs_moderation: false, poster: true, description: true, updated_at: "2026-10-25T21:00:07", genres: ["Экшен", "Сверхъестественное", "Сёнен"], studios: ["MAPPA"], synonyms: [], related: 3 },
    { id: "5e2b7d90-8c1f-4a6e-a0d3-2f9c4b1e6d35", slug: "one-piece", title: "Ван-Пис", title_en: "One Piece", title_jp: "ワンピース", title_romaji: "One Piece", kind: "tv", status: "ongoing", rating: "pg_13", score: 8.7, episodes_aired: 1155, episodes_total: null, aired_on: "1999-10-20", shikimori_id: 21, mal_id: 21, kodik_id: "serial-21", kodik_shikimori_id: 21, views_count: 52890, favorites_count: 3120, needs_moderation: false, poster: true, description: true, updated_at: "2026-10-25T21:30:44", genres: ["Экшен", "Приключения", "Комедия", "Сёнен"], studios: ["Toei Animation"], synonyms: [], related: 28 },
    { id: "d3a6f8b1-0e92-4c57-b4a8-6e1d9c2f7b46", slug: "re-zero-3", title: "Re:Zero. Жизнь с нуля в альтернативном мире 3", title_en: "Re:ZERO -Starting Life in Another World- Season 3", title_jp: "Re:ゼロから始める異世界生活 3rd season", title_romaji: null, kind: "tv", status: "announced", rating: "r", score: null, episodes_aired: 0, episodes_total: 16, aired_on: "2026-10-02", shikimori_id: 54857, mal_id: 54857, kodik_id: null, kodik_shikimori_id: null, views_count: 3120, favorites_count: 410, needs_moderation: true, moderation_reason: "no_video", poster: true, description: true, updated_at: "2026-10-25T18:12:30", genres: ["Драма", "Фэнтези", "Психологическое"], studios: ["White Fox"], synonyms: [], related: 0 },
    { id: "8b4e1c07-5f3a-4d92-8e6b-0a7c3d5f1e57", slug: "dandadan-2", title: "Дандадан 2", title_en: "Dan Da Dan Season 2", title_jp: "ダンダダン 第2期", title_romaji: null, kind: "tv", status: "ongoing", rating: "pg_13", score: 8.3, episodes_aired: 4, episodes_total: 12, aired_on: "2026-07-04", shikimori_id: 60543, mal_id: 60543, kodik_id: "serial-60011", kodik_shikimori_id: 60543, views_count: 6120, favorites_count: 280, needs_moderation: true, moderation_reason: "description", poster: true, description: false, updated_at: "2026-10-25T21:30:39", genres: ["Экшен", "Комедия", "Сверхъестественное"], studios: ["Science SARU"], synonyms: [], related: 0 },
    { id: "f0c9a2d4-7b16-4e3f-9a58-3c2e8b6d0f68", slug: "kusuriya-no-hitorigoto-3", title: "Монолог фармацевта 3", title_en: "The Apothecary Diaries Season 3", title_jp: "薬屋のひとりごと 第3期", title_romaji: null, kind: "tv", status: "ongoing", rating: "pg_13", score: null, episodes_aired: 3, episodes_total: 24, aired_on: "2026-10-09", shikimori_id: 61204, mal_id: 61204, kodik_id: "serial-61880", kodik_shikimori_id: 61204, views_count: 2210, favorites_count: 190, needs_moderation: true, moderation_reason: "poster_url,description", poster: false, description: false, updated_at: "2026-10-25T21:00:02", genres: ["Детектив", "Драма", "Исторический"], studios: ["OLM"], synonyms: [], related: 0 },
    { id: "1d7e3b5a-9c20-4f81-a6d4-8e0b2c4f6a79", slug: "cowboy-bebop", title: "Ковбой Бибоп", title_en: "Cowboy Bebop", title_jp: "カウボーイビバップ", title_romaji: "Cowboy Bebop", kind: "tv", status: "released", rating: "r", score: 8.75, episodes_aired: 26, episodes_total: 26, aired_on: "1998-04-03", shikimori_id: 1, mal_id: 1, kodik_id: "serial-1", kodik_shikimori_id: 1, views_count: 15480, favorites_count: 1012, needs_moderation: false, poster: true, description: true, updated_at: "2026-10-24T22:41:09", genres: ["Экшен", "Фантастика", "Драма"], studios: ["Sunrise"], synonyms: [], related: 3 },
    { id: "6a2c8e4f-1b93-4d07-b5e2-9f1a3c7e5b80", slug: "frieren-2", title: "Провожающая в последний путь Фрирен 2", title_en: "Frieren: Beyond Journey's End Season 2", title_jp: "葬送のフリーレン 第2期", title_romaji: "Sousou no Frieren 2nd Season", kind: "tv", status: "ongoing", rating: "pg_13", score: 9.02, episodes_aired: 3, episodes_total: 10, aired_on: "2026-10-03", shikimori_id: 59978, mal_id: 59978, kodik_id: "serial-59120", kodik_shikimori_id: 59978, views_count: 9870, favorites_count: 760, needs_moderation: false, poster: true, description: true, updated_at: "2026-10-25T21:30:42", genres: ["Приключения", "Драма", "Фэнтези"], studios: ["Madhouse"], synonyms: ["Фрирен 2"], related: 2 },
    { id: "9e5b0d2c-4a71-4f36-8c9e-1b6d3f8a2c91", slug: "chainsaw-man-reze", title: "Человек-бензопила: Арка Резе", title_en: "Chainsaw Man – The Movie: Reze Arc", title_jp: "劇場版 チェンソーマン レゼ篇", title_romaji: null, kind: "movie", status: "released", rating: "r_plus", score: 8.9, episodes_aired: 1, episodes_total: 1, aired_on: "2025-09-19", shikimori_id: 57555, mal_id: 57555, kodik_id: "movie-90213", kodik_shikimori_id: 57555, views_count: 7710, favorites_count: 530, needs_moderation: false, poster: true, description: true, updated_at: "2026-10-23T10:15:00", genres: ["Экшен", "Романтика", "Сёнен"], studios: ["MAPPA"], synonyms: [], related: 1 },
    { id: "b8d1f4a6-2e05-4c9b-9f73-5a8c0e2d4b02", slug: "ghost-in-the-shell-2026", title: "Призрак в доспехах (2026)", title_en: "The Ghost in the Shell", title_jp: "攻殻機動隊", title_romaji: null, kind: "tv", status: "announced", rating: "r", score: null, episodes_aired: 0, episodes_total: null, aired_on: "2026-12-01", shikimori_id: 58811, mal_id: 58811, kodik_id: null, kodik_shikimori_id: null, views_count: 1408, favorites_count: 96, needs_moderation: true, moderation_reason: "description", poster: true, description: false, updated_at: "2026-10-25T18:12:31", genres: ["Фантастика", "Экшен"], studios: ["Science SARU"], synonyms: [], related: 0 },
  ];

  const moderation = anime.filter(item => item.needs_moderation).map(item => ({
    id: item.id, slug: item.slug, title: item.title, poster_url: item.poster ? `/media/posters/${item.slug}.webp` : null,
    description: item.description ? "Есть" : null, moderation_reason: item.moderation_reason, updated_at: item.updated_at,
    status: item.status, kodik_url: item.kodik_id ? `//kodik.info/serial/${item.kodik_id}` : null,
  }));
  moderation.push({ id: "e7f2a9c1-3d68-4b05-a2e9-4c7b1d0f8e13", slug: "isekai-shokudou-3", title: "Ресторан «Другой мир» 3", poster_url: null, description: null, moderation_reason: "poster_url,description", updated_at: "2026-10-25T21:00:04", status: "ongoing", kodik_url: "//kodik.info/serial/62004" });

  const conflicts = [
    {
      id: "0b6e2d8f-5a91-4c37-8e04-2d9f6b1a3c55", conflict_type: "shikimori_identity_mismatch", item_type: "anime", status: "pending",
      external_id: "48569", created_at: "2026-10-24T19:44:12", reason: "season_mismatch",
      existing_data: { title: "Атака титанов: Финал (часть 2)", title_en: "Attack on Titan: The Final Season Part 2", shikimori_id: 48569, slug: "attack-on-titan-final-2", season_number: 4, season_number_reliable: true },
      incoming_data: { russian: "Атака титанов: Финал. Заключительные главы", name: "Shingeki no Kyojin: The Final Season - Kanketsu-hen", english: "Attack on Titan: The Final Season - The Final Chapters", id: 51535, season_number: 5, season_number_reliable: true },
    },
    {
      id: "4c8a1e3f-7d02-4b69-a5c1-8e3b0d7f2a66", conflict_type: "shikimori_identity_mismatch", item_type: "anime", status: "pending",
      external_id: "34572", created_at: "2026-10-24T20:03:51", reason: "no_match",
      existing_data: { title: "Чёрный клевер", title_en: "Black Clover", shikimori_id: 34572, slug: "black-clover", season_number: null, season_number_reliable: false },
      incoming_data: { russian: "Чёрный клевер: Меч короля магов", name: "Black Clover: Mahou Tei no Ken", english: "Black Clover: Sword of the Wizard King", id: 50796, season_number: null, season_number_reliable: false },
    },
    {
      id: "9d3f5b7a-1c46-4e28-b0d9-3a6e8c1f5b77", conflict_type: "shikimori_identity_mismatch", item_type: "anime", status: "pending",
      external_id: "38000", created_at: "2026-10-24T20:31:07", reason: "season_mismatch",
      existing_data: { title: "Клинок, рассекающий демонов 2", title_en: "Demon Slayer: Mugen Train Arc", shikimori_id: 38000, slug: "kimetsu-no-yaiba-2", season_number: 2, season_number_reliable: true },
      incoming_data: { russian: "Клинок, рассекающий демонов", name: "Kimetsu no Yaiba", english: "Demon Slayer: Kimetsu no Yaiba", id: 38000, season_number: 1, season_number_reliable: false },
    },
    {
      id: "2e7a9c1d-6b38-4f50-9e2a-7c4d1b8f3e88", conflict_type: "shikimori_identity_mismatch", item_type: "anime", status: "auto_accepted",
      external_id: "52991", created_at: "2026-10-24T21:12:40", reason: "metadata",
      existing_data: { title: "Провожающая в последний путь Фрирен", title_en: "Frieren", shikimori_id: 52991, slug: "frieren", aired_on_year: 2023, episodes_total: 28 },
      incoming_data: { russian: "Провожающая в последний путь Фрирен", name: "Sousou no Frieren", id: 52991, aired_on_year: 2023, episodes: 28, title_matched: false, year_matched: true, episodes_matched: true },
    },
  ];

  const comments = [
    { id: "c1", user: "yuki_rain", anime: "Провожающая в последний путь Фрирен 2", episode: 3, content: "Третья серия просто идеальная по темпу. Наконец-то флешбеки к месту.", created_at: "2026-10-25T21:12:00", likes_count: 14, replies_count: 2, is_deleted: false },
    { id: "c2", user: "neko_shift", anime: "Дандадан 2", episode: 4, content: "Озвучка AniLibria вышла раньше, чем я думал. Спасибо за быстрое обновление.", created_at: "2026-10-25T20:47:00", likes_count: 6, replies_count: 0, is_deleted: false },
    { id: "c3", user: "kaze_07", anime: "Ван-Пис", episode: 1155, content: "Кто-нибудь понял, что было в сцене после титров? Без спойлеров, пожалуйста.", created_at: "2026-10-25T19:30:00", likes_count: 3, replies_count: 5, is_deleted: false },
    { id: "c4", user: "tsuki_moon", anime: "Монолог фармацевта 3", episode: 3, content: "Постера пока нет, но серия есть. Хорошо, что видео уже работает.", created_at: "2026-10-25T18:02:00", likes_count: 2, replies_count: 0, is_deleted: false },
    { id: "c5", user: "hoshi_dev", anime: "Врата Штейна", episode: 12, content: "[удалено]", created_at: "2026-10-25T16:40:00", likes_count: 0, replies_count: 0, is_deleted: true },
    { id: "c6", user: "akari_s", anime: "Магическая битва", episode: 47, content: "Пересматриваю перед новым сезоном. Плеер запомнил место, удобно.", created_at: "2026-10-25T14:15:00", likes_count: 9, replies_count: 1, is_deleted: false },
  ];

  const jobs = [
    { id: "7c2e9a41-6d08-4b3f-a2c5-1e9f0b7d3a90", parser_name: "shikimori", job_type: "shikimori_related_refresh", status: "running", progress: 38, created_at: "2026-10-25T21:05:00", started_at: "2026-10-25T21:05:02", completed_at: null, duration_seconds: null, items_processed: 1186, items_created: 0, items_updated: 1021, items_skipped: 143, items_failed: 22, error_message: null, source: "Вручную", total: 3120 },
    { id: "a3f1c9e2-0b74-4d58-9e16-5c2a8d3f7b01", parser_name: "kodik", job_type: "incremental_sync", status: "pending", progress: 0, created_at: "2026-10-25T21:30:00", started_at: null, completed_at: null, duration_seconds: null, items_processed: 0, items_created: 0, items_updated: 0, items_skipped: 0, items_failed: 0, error_message: null, source: "Расписание", waited: "Ждёт в очереди: слот занят «Связанными тайтлами»" },
    { id: "b7e2d4f1-3c85-4a69-b0e7-6d3b9e4a8c12", parser_name: "kodik", job_type: "incremental_sync", status: "completed", progress: 100, created_at: "2026-10-25T21:00:00", started_at: "2026-10-25T21:00:01", completed_at: "2026-10-25T21:01:48", duration_seconds: 107, items_processed: 58, items_created: 1, items_updated: 14, items_skipped: 43, items_failed: 0, error_message: null, source: "Расписание" },
    { id: "c9a4e6b2-5d17-4f80-a1c3-7e5d0f2b9d23", parser_name: "shikimori", job_type: "shikimori_related_refresh", status: "completed", progress: 100, created_at: "2026-10-25T19:08:00", started_at: "2026-10-25T19:08:02", completed_at: "2026-10-25T20:58:30", duration_seconds: 6628, items_processed: 1970, items_created: 0, items_updated: 1702, items_skipped: 241, items_failed: 27, error_message: null, source: "Вручную" },
    { id: "d1b6f8c3-7e29-4a92-b3d5-9f7e2a4c0e34", parser_name: "kodik", job_type: "incremental_sync", status: "completed", progress: 100, created_at: "2026-10-25T20:30:00", started_at: "2026-10-25T20:58:31", completed_at: "2026-10-25T21:00:02", duration_seconds: 91, items_processed: 40, items_created: 0, items_updated: 11, items_skipped: 29, items_failed: 0, error_message: null, source: "Расписание", waited: "Ждала 28 мин: слот был занят долгой задачей" },
    { id: "e5c8a0d4-9f3b-4cb4-85e7-0a9f4b6d2f45", parser_name: "shikimori", job_type: "incremental", status: "failed", progress: 0, created_at: "2026-10-25T17:20:00", started_at: "2026-10-25T17:20:01", completed_at: "2026-10-25T17:20:01", duration_seconds: 0, items_processed: 0, items_created: 0, items_updated: 0, items_skipped: 0, items_failed: 0, error_message: "shikimori sync not yet ported to Go worker", source: "Вручную" },
    { id: "f2d0b3e6-1a4c-4d27-97f9-2b1c6d8e4a56", parser_name: "shikimori", job_type: "calendar_snapshot", status: "completed", progress: 100, created_at: "2026-10-25T05:20:04", started_at: "2026-10-25T05:20:05", completed_at: "2026-10-25T05:20:41", duration_seconds: 37, items_processed: 14, items_created: 14, items_updated: 0, items_skipped: 0, items_failed: 0, error_message: null, source: "Расписание", waited: "Слот 04:00 UTC пришёлся на простой стенда; пульс догнал запуск после включения" },
    { id: "0a7e4c1f-8b52-4e93-a6b8-3d2e7f9a5b67", parser_name: "kodik", job_type: "episodes_recompute_dry", status: "completed", progress: 100, created_at: "2026-10-24T16:10:00", started_at: "2026-10-24T16:10:02", completed_at: "2026-10-24T16:44:19", duration_seconds: 2057, items_processed: 5661, items_created: 0, items_updated: 0, items_skipped: 5402, items_failed: 0, error_message: null, source: "kitsu-admin" },
    { id: "1b8f5d2a-9c63-4fa4-b7c9-4e3f8a0b6c78", parser_name: "kodik", job_type: "incremental_sync", status: "cancelled", progress: 35, created_at: "2026-10-24T22:30:00", started_at: "2026-10-24T22:30:01", completed_at: "2026-10-24T22:31:10", duration_seconds: 69, items_processed: 12, items_created: 0, items_updated: 3, items_skipped: 9, items_failed: 0, error_message: "Остановлено вручную", source: "Расписание" },
  ];

  const jobLogs = [
    { level: "INFO", created_at: "2026-10-25T21:05:02", message: "Старт прохода: 3120 строк без related, запуск 2 из 3", job: "7c2e9a41" },
    { level: "WARNING", created_at: "2026-10-25T21:21:47", message: "Атака титанов: Финал (часть 2): сезоны не совпали (4 и 5), строка ушла в конфликты", job: "7c2e9a41" },
    { level: "INFO", created_at: "2026-10-25T21:35:02", message: "Прогресс: related updated 1021 · no_change 143 · suspicious 22 · names written 944 · 3,1 с на строку", job: "7c2e9a41" },
    { level: "INFO", created_at: "2026-10-25T21:01:48", message: "Новые серии: Дандадан 2, серия 4 (AniLibria); Фрирен 2, серия 3 (AniDUB)", job: "b7e2d4f1" },
    { level: "WARNING", created_at: "2026-10-25T21:01:40", message: "Монолог фармацевта 3: нет постера, тайтл оставлен на модерации", job: "b7e2d4f1" },
    { level: "INFO", created_at: "2026-10-25T20:58:30", message: "Прогресс: related updated 1702 · no_change 241 · suspicious 27 · names written 1588", job: "c9a4e6b2" },
    { level: "ERROR", created_at: "2026-10-25T17:20:01", message: "shikimori sync not yet ported to Go worker", job: "e5c8a0d4" },
    { level: "WARNING", created_at: "2026-10-25T20:12:44", message: "Shikimori ответил 429, пауза 4 с (1 из 3 до остановки)", job: "c9a4e6b2" },
    { level: "INFO", created_at: "2026-10-25T05:20:41", message: "Календарь сохранён: 14 дней вперёд, 212 записей", job: "f2d0b3e6" },
  ];

  /* scheduled_parser_jobs. cron — в UTC, его разбирает пульс воркера раз в 15 минут. */
  const schedules = [
    { id: "s-1", parser_name: "kodik", job_type: "incremental_sync", cron_expression: "*/30 * * * *", is_active: true, last_run_at: "2026-10-25T21:30:00", next_run_at: "2026-10-25T22:00:00" },
    { id: "s-2", parser_name: "kodik", job_type: "full_sync", cron_expression: "0 3 * * *", is_active: true, last_run_at: "2026-10-25T05:20:02", next_run_at: "2026-10-26T03:00:00", trap: "Название «full_sync», но пульс запускает его как «Новые серии и озвучки». Полного обхода по расписанию нет." },
    { id: "s-3", parser_name: "shikimori", job_type: "calendar_snapshot", cron_expression: "0 4 * * *", is_active: true, last_run_at: "2026-10-25T05:20:04", next_run_at: "2026-10-26T04:00:00" },
  ];

  /* Сутки стенда по таблице stack_heartbeats: такт раз в 15 минут, разрыв > 35 минут = стенд лежал. */
  const stack = {
    alive: true, up_since: "2026-10-25T14:30:00", uptime_24h_hours: 16.4,
    window_from: "2026-10-24T21:40:00", window_to: NOW,
    gaps: [
      { from: "2026-10-24T23:10:00", to: "2026-10-25T05:20:00" },
      { from: "2026-10-25T13:05:00", to: "2026-10-25T14:30:00" },
    ],
    long_jobs: [
      { from: "2026-10-25T19:08:00", to: "2026-10-25T20:58:30", label: "Связанные тайтлы", tone: "info" },
      { from: "2026-10-25T21:05:00", to: NOW, label: "Связанные тайтлы, идёт", tone: "live" },
    ],
  };

  const monitor = { state: "ok", last_tick_at: "2026-10-25T21:30:02", oldest_check_run_at: "2026-10-25T21:30:02" };

  /* GET /dashboard/monitoring/checks → checks[]: порядок задаёт сервер (худшие первыми). */
  const checks = [
    { id: "silent_failures_24h", name: "Отказы задач за 24 часа", state: "warn", value: 1, unit: "jobs", threshold: "0", evidence: "shikimori/incremental: «shikimori sync not yet ported to Go worker», 1 раз", last_run_at: "2026-10-25T21:30:02" },
    { id: "related_backlog", name: "Строки без прохода related_refresh (старше окна)", state: "warn", value: 3120, unit: "rows", threshold: "≤ 500", evidence: "Очередь разгружается запусками по 2 часа", last_run_at: "2026-10-25T21:30:02" },
    { id: "routes_reachable", name: "Доступность семейств маршрутов через nginx", state: "unknown", value: null, unit: "probes_broken", threshold: null, evidence: "prober not wired: сертификат стенда без SAN", last_run_at: "2026-10-25T21:30:02" },
    { id: "field_import_single_title_romaji", name: "title_romaji у строк ImportSingle", state: "unknown", value: null, unit: "ratio", threshold: "≥ 0.5", evidence: "Меньше 720 ч аптайма: ручной путь, отсутствие может быть намеренным", last_run_at: "2026-10-25T21:30:02" },
    { id: "field_creation_title_romaji", name: "title_romaji у созданных строк", state: "no_sample", value: null, unit: "ratio", threshold: "≥ 0.5", evidence: "За окно не создано ни одной строки этим путём", last_run_at: "2026-10-25T21:30:02" },
    { id: "schedule_s-2", name: "Расписание kodik/full_sync (0 3 * * *)", state: "ok", value: 0, unit: "minutes", threshold: "≤ 150", evidence: "Слот пришёлся на простой стенда; догнан в 05:20 UTC, выполнен как инкремент", last_run_at: "2026-10-25T21:30:02" },
    { id: "scheduler_pulse_lag", name: "Запаздывание пульса относительно слота", state: "ok", value: 5, unit: "minutes", threshold: null, evidence: "Худший слот за сутки: 02:15 UTC", last_run_at: "2026-10-25T21:30:02" },
    { id: "schedule_s-1", name: "Расписание kodik/incremental_sync (*/30 * * * *)", state: "ok", value: 0, unit: "minutes", threshold: "≤ 30", evidence: "Последний успешный прогон 21:01 UTC", last_run_at: "2026-10-25T21:30:02" },
    { id: "schedule_s-3", name: "Расписание shikimori/calendar_snapshot (0 4 * * *)", state: "ok", value: 0, unit: "minutes", threshold: "≤ 150", evidence: "Догнан после включения стенда", last_run_at: "2026-10-25T21:30:02" },
    { id: "backup_database", name: "Возраст новейшего годного бэкапа: database", state: "ok", value: 21.7, unit: "hours", threshold: "≤ 24", evidence: "kitsu_backup_20261025_000004.sql.gz · 38,2 МБ", last_run_at: "2026-10-25T21:30:02" },
    { id: "backup_media", name: "Возраст новейшего годного бэкапа: media", state: "ok", value: 21.7, unit: "hours", threshold: "≤ 24", evidence: "media_20261025_000031.tar.gz · 112,4 МБ", last_run_at: "2026-10-25T21:30:02" },
    { id: "schedule_snapshots_age", name: "Свежесть schedule_snapshots", state: "ok", value: 16.3, unit: "hours", threshold: "≤ 36", evidence: "max(saved_at) = 05:20 UTC", last_run_at: "2026-10-25T21:30:02" },
    { id: "schedule_snapshots_ahead", name: "Запас дней вперёд в schedule_snapshots", state: "ok", value: 14, unit: "days", threshold: "≥ 3", evidence: "до 2026-11-08", last_run_at: "2026-10-25T21:30:02" },
    { id: "field_names_title_romaji", name: "title_romaji у строк, прошедших связи/имена", state: "ok", value: 0.81, unit: "ratio", threshold: "≥ 0.5", evidence: "1588 из 1970", last_run_at: "2026-10-25T21:30:02" },
    { id: "field_names_synonyms", name: "synonyms у строк, прошедших связи/имена", state: "ok", value: 0.64, unit: "ratio", threshold: "≥ 0.3", evidence: "1261 из 1970", last_run_at: "2026-10-25T21:30:02" },
    { id: "kodik_key_leak", name: "Ключ Kodik в сохранённых текстах за 7 суток", state: "ok", value: 0, unit: "rows", threshold: "0", evidence: "parser_jobs, parser_job_logs, parser_conflicts, audit_logs", last_run_at: "2026-10-25T21:30:02" },
    { id: "tls_cert_expiry", name: "Срок годности сертификата стенда", state: "ok", value: 224, unit: "days", threshold: "≥ 30", evidence: "Истекает 2027-06-06", last_run_at: "2026-10-25T21:30:02" },
    { id: "ssr_path", name: "Путь серверного рендера (web, nginx:8081)", state: "ok", value: 0, unit: "problems", threshold: "0", evidence: "SOLE GUARD: только эта проверка видит обход nginx", last_run_at: "2026-10-25T21:30:02" },
  ];

  const health = {
    status: "healthy",
    services: { database: { status: "online", latency_ms: 0.84 }, cache: { status: "online" }, worker: { status: "online", count: 1 } },
    resources: { cpu_percent: 7.4, memory_percent: 46.2, memory_app_mb: 38.6, disk_percent: 61.8, load_avg: [0.42, 0.51, 0.47] },
  };

  const overview = {
    audience: { value: 214, trend: 12.6 }, catalog: { value: 5721, trend: 3.1 }, assets: { value: 61240, trend: 4.4 }, uptime: "7h 10m",
  };
  /* stats/charts: items_processed по дням. name — английские сокращения дней (как отдаёт API). */
  const charts = [
    { name: "Mon", kodik: 1240, shikimori: 0 }, { name: "Tue", kodik: 1388, shikimori: 0 }, { name: "Wed", kodik: 980, shikimori: 14 },
    { name: "Thu", kodik: 1510, shikimori: 14 }, { name: "Fri", kodik: 1175, shikimori: 1990 }, { name: "Sat", kodik: 860, shikimori: 1984 },
    { name: "Sun", kodik: 1092, shikimori: 1984 },
  ];
  const popular = [
    { title: "Ван-Пис", views: 52890, score: 8.7 }, { title: "Магическая битва", views: 41200, score: 8.6 },
    { title: "Стальной алхимик: Братство", views: 32110, score: 9.1 }, { title: "Врата Штейна", views: 27904, score: 9.08 },
    { title: "Монстр", views: 18420, score: 8.87 },
  ];
  const genres = [
    { name: "Комедия", value: 2140 }, { name: "Экшен", value: 1980 }, { name: "Фэнтези", value: 1510 }, { name: "Драма", value: 1390 },
    { name: "Романтика", value: 1120 }, { name: "Приключения", value: 1040 }, { name: "Сёнен", value: 990 }, { name: "Фантастика", value: 870 },
  ];
  const kodikStats = { kodik_total: 32759, local_total: 5721, local_with_kodik: 5672, local_ongoing: 214, coverage_pct: 17.3 };

  const episodes = [
    { id: "e-1", anime: "Дандадан 2", anime_slug: "dandadan-2", season: 1, episode: 4, title: "Пусть будет так", aired_at: "2026-10-25T15:30:00", is_filler: false, is_recap: false, releases: 3 },
    { id: "e-2", anime: "Дандадан 2", anime_slug: "dandadan-2", season: 1, episode: 3, title: null, aired_at: "2026-10-18T15:30:00", is_filler: false, is_recap: false, releases: 4 },
    { id: "e-3", anime: "Провожающая в последний путь Фрирен 2", anime_slug: "frieren-2", season: 1, episode: 3, title: "Северные земли", aired_at: "2026-10-24T14:00:00", is_filler: false, is_recap: false, releases: 5 },
    { id: "e-4", anime: "Монолог фармацевта 3", anime_slug: "kusuriya-no-hitorigoto-3", season: 1, episode: 3, title: null, aired_at: "2026-10-23T16:00:00", is_filler: false, is_recap: false, releases: 2 },
    { id: "e-5", anime: "Ван-Пис", anime_slug: "one-piece", season: 1, episode: 1155, title: null, aired_at: "2026-10-19T00:15:00", is_filler: false, is_recap: false, releases: 6 },
    { id: "e-6", anime: "Ван-Пис", anime_slug: "one-piece", season: 1, episode: 1154, title: null, aired_at: "2026-10-12T00:15:00", is_filler: false, is_recap: true, releases: 6 },
    { id: "e-7", anime: "Магическая битва", anime_slug: "jujutsu-kaisen", season: 2, episode: 23, title: "Сикоку", aired_at: "2023-12-28T14:56:00", is_filler: false, is_recap: false, releases: 7 },
    { id: "e-8", anime: "Наруто: Ураганные хроники", anime_slug: "naruto-shippuden", season: 1, episode: 257, title: "Встреча", aired_at: "2012-04-19T10:30:00", is_filler: true, is_recap: false, releases: 3 },
  ];

  const releases = [
    { id: "r-1", anime: "Дандадан 2", episode: 4, source: "kodik", translation_type: "voice", translation_team: "AniLibria.TV", translation_language: "ru", quality: "1080p", is_active: true, is_verified: true, url: "https://kodik.info/seria/1420021/a7f2/720p" },
    { id: "r-2", anime: "Дандадан 2", episode: 4, source: "kodik", translation_type: "subtitles", translation_team: "Crunchyroll", translation_language: "ru", quality: "1080p", is_active: true, is_verified: false, url: "https://kodik.info/seria/1420022/b3c4/720p" },
    { id: "r-3", anime: "Провожающая в последний путь Фрирен 2", episode: 3, source: "kodik", translation_type: "voice", translation_team: "AniDUB", translation_language: "ru", quality: "720p", is_active: true, is_verified: true, url: "https://kodik.info/seria/1419807/c9d1/720p" },
    { id: "r-4", anime: "Монолог фармацевта 3", episode: 3, source: "kodik", translation_type: "voice", translation_team: "Studio Band", translation_language: "ru", quality: "720p", is_active: true, is_verified: false, url: "https://kodik.info/seria/1419533/d2e8/720p" },
    { id: "r-5", anime: "Ван-Пис", episode: 1155, source: "kodik", translation_type: "subtitles", translation_team: "Anilibria Subs", translation_language: "ru", quality: "1080p", is_active: false, is_verified: false, url: "https://kodik.info/seria/1418002/e1f0/720p" },
    { id: "r-6", anime: "Магическая битва", episode: 23, source: "kodik", translation_type: "voice", translation_team: "Dream Cast", translation_language: "ru", quality: "1080p", is_active: true, is_verified: true, url: "https://kodik.info/seria/1201112/f4a2/720p" },
  ];

  const collections = [
    { id: "col-1", title: "Осень 2026: что смотреть", user: "akari_s", items_count: 18, views_count: 1240, likes_count: 88, is_public: true, is_featured: true, updated_at: "2026-10-25T12:00:00" },
    { id: "col-2", title: "Короткие сериалы на вечер", user: "yuki_rain", items_count: 9, views_count: 410, likes_count: 31, is_public: true, is_featured: false, updated_at: "2026-10-24T09:20:00" },
    { id: "col-3", title: "Классика 90-х", user: "kaze_07", items_count: 24, views_count: 980, likes_count: 72, is_public: true, is_featured: false, updated_at: "2026-10-20T18:00:00" },
    { id: "col-4", title: "Пересмотреть", user: "neko_shift", items_count: 6, views_count: 0, likes_count: 0, is_public: false, is_featured: false, updated_at: "2026-10-19T22:10:00" },
  ];

  const roles = [
    { id: "role-super", name: "super_admin", description: "Полный доступ", permissions: ["*"] },
    { id: "role-admin", name: "admin", description: "Контент и пользователи", permissions: ["content.*", "users.view", "users.edit", "parsers.*", "analytics.view"] },
    { id: "role-mod", name: "moderator", description: "Модерация", permissions: ["content.view", "content.edit", "comments.moderate"] },
    { id: "role-user", name: "user", description: "Обычный пользователь", permissions: ["content.view", "comments.write"] },
  ];

  const users = [
    { id: "u-1", username: "admin", email: "admin@kitsu.local", role: "super_admin", is_superuser: true, is_active: true, is_verified: true, created_at: "2026-02-18T10:00:00", last_seen_at: "2026-10-25T21:38:00" },
    { id: "u-2", username: "akari_s", email: "akari@example.test", role: "moderator", is_superuser: false, is_active: true, is_verified: true, created_at: "2026-03-02T12:40:00", last_seen_at: "2026-10-25T20:11:00" },
    { id: "u-3", username: "yuki_rain", email: "yuki@example.test", role: "user", is_superuser: false, is_active: true, is_verified: true, created_at: "2026-04-11T08:05:00", last_seen_at: "2026-10-25T21:12:00" },
    { id: "u-4", username: "neko_shift", email: "neko@example.test", role: "user", is_superuser: false, is_active: true, is_verified: false, created_at: "2026-05-27T19:30:00", last_seen_at: "2026-10-25T20:47:00" },
    { id: "u-5", username: "kaze_07", email: "kaze@example.test", role: "admin", is_superuser: false, is_active: true, is_verified: true, created_at: "2026-06-14T15:00:00", last_seen_at: "2026-10-24T23:02:00" },
    { id: "u-6", username: "spam_bot_441", email: "bot441@example.test", role: "user", is_superuser: false, is_active: false, is_verified: false, created_at: "2026-09-30T03:12:00", last_seen_at: "2026-09-30T03:20:00" },
    { id: "u-7", username: "tsuki_moon", email: "tsuki@example.test", role: null, is_superuser: false, is_active: true, is_verified: true, created_at: "2026-08-08T11:11:00", last_seen_at: "2026-10-25T18:02:00" },
  ];

  const avatars = [
    { id: "av-1", title: "Лиса в сумерках", category: "kitsune", is_active: true },
    { id: "av-2", title: "Лунный кролик", category: "kitsune", is_active: true },
    { id: "av-3", title: "Сакура", category: "nature", is_active: true },
    { id: "av-4", title: "Тории", category: "nature", is_active: true },
    { id: "av-5", title: "Неон-город", category: "city", is_active: false },
    { id: "av-6", title: "Маска они", category: "default", is_active: true },
  ];
  const decorations = [
    { id: 1, title: "Лепестки", is_active: true }, { id: 2, title: "Лисий огонь", is_active: true },
    { id: 3, title: "Иней", is_active: true }, { id: 4, title: "Хэллоуин 2025", is_active: false },
  ];

  const backups = [
    { run: "2026-10-25T00:00:04", type: "auto", items: [
      { id: "bk-1", kind: "database", filename: "kitsu_backup_20261025_000004.sql.gz", size: 40054210, status: "completed", failure_reason: null },
      { id: "bk-2", kind: "media", filename: "media_20261025_000031.tar.gz", size: 117860352, status: "completed", failure_reason: null },
    ] },
    { run: "2026-10-24T13:41:10", type: "manual", items: [
      { id: "bk-3", kind: "database", filename: "kitsu_backup_20261024_134110.sql.gz", size: 39981003, status: "completed", failure_reason: null },
      { id: "bk-4", kind: "media", filename: "media_20261024_134139.tar.gz", size: 117801984, status: "completed", failure_reason: null },
    ] },
    { run: "2026-10-24T00:00:03", type: "auto", items: [
      { id: "bk-5", kind: "database", filename: "kitsu_backup_20261024_000003.sql.gz", size: 39912877, status: "completed", failure_reason: null },
      { id: "bk-6", kind: "media", filename: "media_20261024_000029.tar.gz", size: 83886080, status: "failed", failure_reason: "Воркер перезапущен во время упаковки: архив обрезан и помечен .invalid" },
    ] },
    { run: "2026-10-23T00:00:05", type: "auto", items: [
      { id: "bk-7", kind: "database", filename: "kitsu_backup_20261023_000005.sql.gz", size: 39804411, status: "completed", failure_reason: null },
      { id: "bk-8", kind: "media", filename: "media_20261023_000034.tar.gz", size: 117440512, status: "completed", failure_reason: null },
    ] },
  ];

  const audit = [
    { created_at: "2026-10-25T21:02:11", actor: "admin", actor_ip: "172.18.0.9", action: "update", resource_type: "anime", resource: "Дандадан 2", success: true, error_message: null },
    { created_at: "2026-10-25T19:08:00", actor: "admin", actor_ip: "172.18.0.9", action: "trigger", resource_type: "parser", resource: "shikimori_related_refresh", success: true, error_message: null },
    { created_at: "2026-10-25T17:20:00", actor: "admin", actor_ip: "172.18.0.9", action: "trigger", resource_type: "parser", resource: "shikimori/incremental", success: true, error_message: null },
    { created_at: "2026-10-25T16:41:30", actor: "admin", actor_ip: "172.18.0.9", action: "import", resource_type: "anime", resource: "shikimori_id 61204, создан", success: true, error_message: null },
    { created_at: "2026-10-25T15:12:09", actor: "admin", actor_ip: "172.18.0.9", action: "resolve_conflict", resource_type: "parser", resource: "Атака титанов: Финал (часть 1)", success: true, error_message: null },
    { created_at: "2026-10-25T14:58:44", actor: "kaze_07", actor_ip: "172.18.0.9", action: "update", resource_type: "anime", resource: "Ван-Пис", success: false, error_message: "Not enough permissions" },
    { created_at: "2026-10-24T13:41:10", actor: "admin", actor_ip: "172.18.0.9", action: "create", resource_type: "backup", resource: "manual", success: true, error_message: null },
    { created_at: "2026-10-24T11:20:00", actor: "admin", actor_ip: "172.18.0.9", action: "ban", resource_type: "user", resource: "spam_bot_441", success: true, error_message: null },
  ];

  const blacklist = [
    { id: "bl-1", shikimori_id: 33352, kodik_id: null, slug: null, created_at: "2026-09-12T10:00:00", note: "Дубликат сезона" },
    { id: "bl-2", shikimori_id: null, kodik_id: "serial-77120", slug: null, created_at: "2026-10-02T18:30:00", note: "Неверная склейка в Kodik" },
    { id: "bl-3", shikimori_id: null, kodik_id: null, slug: "test-title-import", created_at: "2026-10-23T22:05:00", note: "Тестовый импорт" },
  ];

  /* Поиск Kodik (GET /dashboard/parsers/kodik/search?q=) — демонстрационный ответ; in_catalog соответствует already_exists. */
  const kodikSearch = [
    { kodik_id: "serial-61880", shikimori_id: 61204, title: "Монолог фармацевта 3", title_orig: "Kusuriya no Hitorigoto 3rd Season", year: 2026, type: "anime-serial", episodes: 3, translations: 4, in_catalog: "kusuriya-no-hitorigoto-3" },
    { kodik_id: "serial-56210", shikimori_id: 54492, title: "Монолог фармацевта 2", title_orig: "Kusuriya no Hitorigoto 2nd Season", year: 2025, type: "anime-serial", episodes: 24, translations: 7, in_catalog: null },
    { kodik_id: "serial-49901", shikimori_id: 54492, title: "Монолог фармацевта", title_orig: "Kusuriya no Hitorigoto", year: 2023, type: "anime-serial", episodes: 24, translations: 9, in_catalog: "kusuriya-no-hitorigoto" },
    { kodik_id: "movie-91203", shikimori_id: null, title: "Монолог фармацевта: спецвыпуск", title_orig: "Kusuriya no Hitorigoto Special", year: 2024, type: "anime", episodes: 1, translations: 1, in_catalog: null },
  ];

  /* Где на самом деле живут настройки. */
  const settings = {
    site: [
      { key: "site_name", label: "Название сайта", type: "string", value: "Kitsu Enterprise", wired: false },
      { key: "allow_registration", label: "Регистрация открыта", type: "boolean", value: true, wired: false },
      { key: "maintenance_mode", label: "Режим обслуживания", type: "boolean", value: false, wired: false },
      { key: "accent_primary", label: "Основной цвет", type: "color", value: "#8b5cf6", wired: false, retire: true },
      { key: "accent_danger", label: "Цвет ошибки", type: "color", value: "#ef4444", wired: false, retire: true },
    ],
    parserArchive: [
      { category: "general", title: "Сеть и провайдеры", fields: ["kodik_api_key", "proxy_enabled", "proxy_address", "proxy_port", "shikimori_api_domain", "user_agent"], note: "Ключ Kodik берётся из окружения сервера (KODIK_API_KEY). Поле в базе ключом не является и показывать его нельзя." },
      { category: "grabbing", title: "Фильтры граббера", fields: ["source_mode", "kodik_types", "kinds_allowed", "allowed_genres", "blocked_genres", "allowed_countries", "blocked_countries", "unblocked_countries", "allowed_years", "blocked_years", "year_start", "year_end", "min_score", "mpaa_rating", "audio_type", "voice_kind", "sort_order", "if_camrip", "if_lgbt", "includes", "filter", "cron_auto_add", "cron_release_updates"] },
      { category: "updates", title: "Обновления", fields: ["auto_update", "update_frequency", "detect_episode_change", "detect_metadata_change", "force_shikimori_score", "notify_on_fail"] },
      { category: "images", title: "Изображения", fields: ["localize_images", "optimize_webp", "max_width", "quality_percent", "enable_watermark", "watermark_text"], note: "В Go есть разбор этих полей (mediapipeline.ConfigFromMap), но его никто не вызывает. Водяного знака в Go нет вовсе: решение владельца, пункт 4.3 плана." },
      { category: "fields", title: "Шаблоны полей", fields: ["tpl_title", "tpl_description", "tpl_meta_keywords", "custom_tag_prefix"] },
      { category: "categories", title: "Жанры и студии", fields: ["auto_assign_genres", "create_missing_studios", "sync_franchise_taxonomy"] },
      { category: "blacklist", title: "Стоп-слова", fields: ["banned_genres", "banned_keywords"], note: "Настоящий чёрный список — отдельная таблица parser_anime_blacklist. Он работает и вынесен в «Парсер, «Исключения»»." },
      { category: "notifications", title: "Уведомления", fields: ["email_notifications", "admin_email", "webhook_enabled", "webhook_url"] },
      { category: "advanced", title: "Тонкая настройка", fields: ["async_semaphores", "request_delay_ms"] },
      { category: "player", title: "Плеер", fields: ["primary_source", "fallback_source", "default_quality", "auto_next", "skip_opening"], note: "Автопереход и пропуск опенинга — настройки зрителя (user_anime_preferences), а не сайта." },
    ],
    real: [
      { title: "Расписание задач", where: "Парсер, «Расписание»", how: "Когда задачи запускаются сами. Работает: воркер проверяет расписание раз в 15 минут.", icon: "calendar-clock", route: "parser/schedule" },
      { title: "Исключения из импорта", where: "Парсер, «Исключения»", how: "Тайтлы, которые импорт и синхронизация никогда не добавят. Работает.", icon: "ban", route: "parser/blacklist" },
      { title: "Роли и права", where: "Люди, «Доступ»", how: "Кто что может в админке. На деле сервер различает только два права.", icon: "key-round", route: "people/access" },
      { title: "Оформление профилей", where: "Люди, «Оформление»", how: "Коллекция аватаров и рамок, их выбирают пользователи.", icon: "sparkles", route: "people/cosmetics" },
    ],
    env: [
      { name: "Ключ Kodik", value: "Задан, скрыт", note: "Хранится только на сервере. Монитор следит, чтобы он не попал в журналы." },
      { name: "Почта для писем", value: "Настроена на сервере", note: "Письма с подтверждением почты и сбросом пароля" },
      { name: "Суточная резервная копия", value: "Каждый день в 05:00", note: "Не перезапускать воркер с 05:00 до 05:05: копия оборвётся." },
      { name: "Проверка расписания", value: "Раз в 15 минут", note: "Поэтому задачи не запускаются чаще, чем раз в 15 минут" },
      { name: "Очередь парсера", value: "1 задача одновременно", note: "Долгая задача задерживает остальные и резервную копию" },
      { name: "Защита от перебора", value: "Вход — 5 попыток в минуту, регистрация — 3 в час", note: "С одного адреса" },
    ],
  };


  /* Текущие значения parser_settings.config по категориям (GET /dashboard/parsers/settings).
     Значения по умолчанию взяты из вкладок текущего дашборда (frontend/components/dashboard/parsers/tabs). */
  const parserConfig = {
    general: { shikimori_api_domain: "https://shikimori.io/", proxy_enabled: false, proxy_address: "", proxy_port: "", user_agent: "KitsuEngine/2.0" },
    grabbing: {
      source_mode: "shikimori", kodik_types: "anime,anime-serial", min_score: 6, if_camrip: false, if_lgbt: true,
      year_start: 1995, year_end: 2026, kinds_allowed: ["tv", "movie", "ova", "ona"],
      allowed_countries: "", blocked_countries: "", unblocked_countries: "", allowed_years: "", blocked_years: "",
      allowed_genres: "", blocked_genres: "хентай, яой, юри", mpaa_rating: "", audio_type: "any", voice_kind: "", sort_order: "year_desc",
      cron_auto_add: "*/30 * * * *", cron_release_updates: "0 * * * *",
    },
    updates: { auto_update: true, update_frequency: "hourly", detect_episode_change: true, detect_metadata_change: false, force_shikimori_score: true, notify_on_fail: true },
    images: { localize_images: true, optimize_webp: true, quality_percent: 100, max_width: 1200, enable_watermark: false, watermark_text: "KITSU" },
    fields: { tpl_title: "{title} / {title_en}", tpl_description: "{description}", tpl_meta_keywords: "{genres}, {studios}, anime {year}", custom_tag_prefix: "kitsu_" },
    categories: { auto_assign_genres: true, create_missing_studios: true, sync_franchise_taxonomy: true },
    blacklist: { banned_genres: "хентай", banned_keywords: "camrip, ts" },
    notifications: { email_notifications: false, admin_email: "", webhook_enabled: false, webhook_url: "" },
    advanced: { async_semaphores: 5, request_delay_ms: 200 },
    player: { primary_source: "kodik", fallback_source: "aniboom", default_quality: "1080p", auto_next: true, skip_opening: false },
  };

  window.KitsuAdminData = {
    NOW, operations, anime, moderation, conflicts, comments, jobs, jobLogs, schedules, stack, monitor, checks, health,
    overview, charts, popular, genres, kodikStats, episodes, releases, collections, roles, users, avatars, decorations,
    backups, audit, blacklist, kodikSearch, settings, parserConfig,
  };
})();
