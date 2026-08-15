# Handoff для Codex

## Цель

Перенести `Anime Graphite` из автономных `index.html` и `anime.html` в существующий Next.js frontend Kitsu, сохранив текущие data owners, SEO, auth, query cache, player и error semantics. Это визуально-функциональная спецификация, а не замена рабочей архитектуры.

## Сначала повторить аудит

Перед изменениями прочитать repository instructions, проверить dirty worktree и зафиксировать commit SHA. Затем заново сверить:

1. `frontend/app/page.tsx`, `components/Hero`, `ContinueWatching`, `components/home/*`.
2. `frontend/app/anime/[slug]/page.tsx`, `AnimePageClient.tsx`, `CinematicHero.tsx`, `components/AnimeInfo.tsx`.
3. `frontend/hooks/queries.ts`, `mutations.ts`, `lib/services/anime.ts`, API client и query keys.
4. `frontend/components/player/HlsPlayer.tsx`, `PlayerOverlay.tsx`, локальные player/progress utilities.
5. Регистрацию маршрутов в `backend-go/cmd/api/main.go` и соответствующие Go handlers.
6. Оставшиеся Python routes в `backend/app/api/v1/endpoints/`, особенно calendar, Kodik playlist/skip-times, stream и notification writes.
7. DTO, models, migrations, SQL и contract/E2E tests для каждой переносимой mutation.

Если фактическая ветка расходится с `docs/ROUTE_DATA_MATRIX.md`, код ветки имеет приоритет, а matrix обновляется до начала UI-работы.

## Непереговорные правила

- Не переносить демонстрационные числа, даты и уведомления как product data.
- Не заменять server error пустым состоянием.
- Не показывать success до подтверждённого response.
- Не объединять `release.source` и `translation_team`: источник потока и перевод остаются разными controls и разными полями.
- Favorite category допускает только `watching`, `completed`, `planned`, `on_hold`, `dropped`; удаление выполняется отдельным DELETE.
- Настройки уведомлений тайтла сохраняются в `users/me.preferences.anime_notifications`, пока код ветки не докажет другой контракт.
- Guest progress сначала сохраняется локально; authenticated progress синхронизируется через существующие Kodik progress routes.
- Не удалять SSR metadata, canonical, JSON-LD, ISR/revalidation и существующую not-found semantics страницы тайтла.
- Не подменять существующий HLS/Kodik runtime декоративным макетом плеера.

## Design contract

- Переиспользовать токены из `docs/DESIGN_SYSTEM.md`; public и dashboard должны выглядеть как один продукт.
- Сохранить крупную медийную иерархию public hero, но избегать neon/glow, gradient text, glassmorphism и bento ради bento.
- Mauve занимает малую площадь. Green — только success, amber — warning, red — error/destructive, blue — info.
- Все icon-only controls получают accessible name; keyboard focus и `prefers-reduced-motion` обязательны.
- На `360/390 px` нижняя навигация не перекрывает контент, плеер не создаёт horizontal overflow, source/translation остаются читаемыми.

## Рекомендуемый порядок

1. Baseline screenshots/tests на текущей ветке.
2. Versioned public tokens и общие primitives без изменения data flow.
3. Shell/header/search/theme/mobile navigation.
4. Главная: hero → continue → HomeGrid → schedule/updates → public collections.
5. Тайтл: hero/AnimeInfo → favorites/subscriptions → player shell вокруг существующего runtime → episode browser → comments.
6. Loading/error/empty/partial states по каждому запросу.
7. Route tests, typecheck, build, Playwright, visual diff и accessibility QA.
8. Удаление старых styles/components только после нулевого import graph.

## Definition of done

- все route/action contracts повторно подтверждены evidence paths;
- сборка, typecheck, lint/format и релевантные tests зелёные;
- нет fake current data, dead navigation, placeholder actions и optimistic success без rollback;
- dark/light/system theme, keyboard, focus return, screen-reader names, contrast и reduced motion проверены;
- viewport `360`, `390`, `768`, `1024`, `1440` проверены на реальных loading/error/empty/large datasets;
- source, translation, quality, season и episode не смешаны в один непрозрачный state;
- production screenshots и документация обновлены после реального browser QA.
