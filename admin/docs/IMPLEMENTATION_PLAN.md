# План внедрения redesign

План разбит на маленькие change sets. Нельзя объединять Next/Tailwind/Radix/Zod/Biome/player и полный visual rewrite в один неделимый PR: при регрессии должна быть понятна причина и существовать безопасный rollback.

## Этап 0 — baseline и полномочия

### Действия

1. Прочитать repo instructions, ownership и deployment workflow.
2. Зафиксировать branch/commit/dirty worktree.
3. Снять frontend route tree, package/import graph, API clients, auth/provider boundaries.
4. Снять active backend routes и request/response contracts.
5. Для каждого action сверить handler с model/query/migration и runtime/contract tests; documentation/OpenAPI не считать доказательством без этой сверки.
6. Выполнить frozen install, typecheck, build, lint, unit/E2E.
7. Снять current screenshots и bundle baseline.

### Выход

- baseline report с существующими failures;
- route/endpoint inventory;
- список файлов в scope;
- подтверждение owner на frontend edits.

### Gate

Ни один старый failure не приписывается redesign; ни одно чужое изменение не перезаписано.

## Этап 1 — безопасная миграция foundation

### 1.1 Next/React

- сначала установить security patch текущей линии;
- затем отдельным change set обновить целевой Next major по official guide;
- исправить async request APIs, caching changes, route handlers и build config;
- React 19 сохраняется, strict TypeScript остаётся включён.

Gate: typecheck/build/current E2E зелёные до visual changes.

### 1.2 Tailwind 4

- запустить официальный upgrade tool на чистой ветке;
- перенести theme values в CSS `@theme` и semantic custom properties;
- заменить dynamic class concatenation на explicit maps;
- перенести plugins/sources/safelist/animations;
- сравнить screenshots;
- только затем удалить `tailwind.config.js`.

Gate: light/dark baseline без uncontrolled shifts.

### 1.3 shadcn + unified Radix

- инвентаризировать используемые primitives;
- обновить source-owned shadcn components;
- выполнить `pnpm dlx shadcn@latest migrate radix`;
- проверить SSR/hydration/focus для Dialog, Select, Popover, DropdownMenu, Tabs, Tooltip, Command;
- убрать отдельные `@radix-ui/react-*` только после нулевого import graph.

Gate: keyboard/focus test и bundle comparison.

### 1.4 Zod, Motion, dates, Biome

- Zod 4: адаптировать schemas/error formatting по form-by-form tests;
- `framer-motion` imports заменить на `motion/react`; GSAP удалить после parity;
- ввести одну date utility и мигрировать call sites;
- добавить Biome config/CI/editor; потом удалить ESLint/Prettier.

Gate: typecheck/build/Biome/unit tests; no duplicate runtimes.

## Этап 2 — design foundation

### Tokens

Создать один CSS contract:

- background/surface/elevated/inverse;
- foreground/muted/subtle;
- border/focus;
- primary/primary-foreground;
- success/warning/danger/info + foreground;
- radii, shadow, spacing, type scale, motion duration/easing.

Palette contract: dark `#0d0d0f/#111113/#19191c` со светлым primary и mauve только для focus/selection; light `#f5f4f2/#fbfaf9/#ffffff` с `#381932` как primary anchor. Green не становится primary, slate-blue используется только для info, amber — warning, red — destructive/error.

Site settings `accent_primary`/`accent_danger` маппятся только через validated theme boundary, а не в arbitrary inline styles.

### Primitives

Собрать и протестировать:

- Button/IconButton/Badge/StatusDot;
- Input/Textarea/Select/Checkbox/Switch/FormField;
- Dialog/AlertDialog/Drawer/Popover/Tooltip/DropdownMenu;
- Tabs/Command/Toast/Skeleton/EmptyState/ErrorState;
- Table shell/Toolbar/Pagination/BulkBar;
- MetricCard/Panel/Callout/LogViewer.

### Shell

- responsive sidebar + mobile drawer/dock;
- topbar, breadcrumb, command palette, account menu;
- notification popover read-only до mark-read endpoint;
- permission-aware nav, но server 403 остаётся окончательным решением.

Gate: Storybook/preview states или route fixture page, keyboard/a11y and 360–1440 screenshots.

## Этап 3 — data architecture

### API boundary

- один typed base client: base URL, credentials/auth, request ID, JSON/problem parsing, abort signal;
- server wrapper для RSC/cache/revalidate;
- browser wrapper для TanStack Query;
- единый `ApiError` с status/code/message/field errors/requestId;
- никаких silent `catch(() => [])`.

### Query architecture

- feature-scoped query key factories;
- list key включает нормализованные URL params;
- detail key отделён от list;
- mutation invalidates минимально необходимый list/detail/stats;
- polling выключается на hidden tab и прекращается для terminal job;
- WebSocket/live transport не заменяет REST recovery.

### URL state

- подключить nuqs App Router adapter;
- parsers для page/limit/search/kind/status/has_video/needs_moderation;
- invalid URL values нормализуются и не ломают server fetch;
- back/forward восстанавливают table state.

### Zustand

Оставить только:

- theme preference;
- player volume/rate/quality/subtitle preference.

Удалить server data, catalog filters, auth entity, sidebar и modals из global store.

Gate: unit tests query keys, URL codecs, API errors, date utility; hydration test theme/player.

## Этап 4 — admin routes

### Волна A: безопасные read screens

1. Overview: только exact stats/charts.
2. Roles: read-only.
3. Monitoring: snapshot + `not probed` cache.
4. Audit: loaded selection, no total/server filters/diff promise.
5. Collections: read-only admin overview.

Gate: loading/error/empty/success, 401/403, no invented fields.

### Волна B: content CRUD

1. Anime list + URL filters + detail/editor + delete.
2. Anime bulk delete/update status.
3. Episodes editor по write schema; extended fields read-only.
4. Releases CRUD без fake validation.
5. Avatars/decorations metadata + upload to selected entity.

Gate: RHF/Zod schemas совпадают с request handlers; mutation responses отображаются; audit expectations корректны.

### Волна C: parser operations

1. Search/search-list/fetch-full/import/add/refresh как отдельные commands.
2. Job list/detail/logs/stop/delete/clear.
3. Trigger form с allowlist трёх safe pairs.
4. Conflicts exact two strategies.
5. Moderation approve response со skipped IDs.
6. Blacklist exact three identifiers.
7. Scheduler с UI gate только Kodik incremental.
8. Parser settings support matrix.

Gate: direct write vs queued job явно различаются; backend gaps невозможно случайно запустить из UI.

### Волна D: community/system

1. Comments hidden/visible queue, approve, soft delete.
2. Users patch + ban/unban + superuser confirmation.
3. Backups DB+media, download/delete, no restore.
4. Site settings five keys + maintenance confirmation.
5. Notifications read-only popover.

Gate: no target logout-all, reports, incidents, mark-read, restore or fake audit.

## Этап 5 — public template

Public template начинается после стабилизации primitives/tokens, но использует тот же monorepo package/design contract.

Порядок:

1. public shell, SEO metadata, theme bootstrap;
2. catalog/search URL state в RSC + nuqs client controls;
3. anime detail;
4. watch route + Vidstack/hls.js;
5. auth/profile;
6. favorites/progress/follows/comments/collections islands;
7. notifications list/unread без mark-read;
8. static legal/info routes с реальным контентом.

Подробности — `SITE_TEMPLATE_ROADMAP.md`.

## Этап 6 — cleanup и QA

- удалить старые imports/packages только по import graph;
- проверить no duplicate React/query/toast/motion/date libs;
- запустить Biome, typecheck, build, tests, Playwright;
- пройти `QA_CHECKLIST.md`;
- снять фактические screenshots light/dark/mobile;
- обновить docs и migration log;
- выполнить bundle/performance/accessibility review.

## Отдельные backend tasks, не маскировать frontend-ом

1. Scheduler cron calculation/recalculation и правильный dispatch mode.
2. Shikimori sync runtime или строгая server validation допустимых job pairs.
3. Parser settings consumer contract.
4. Реальный cache probe.
5. Notification mark-read, если продукту нужен.
6. Target-user sessions, если продукту нужен.
7. Reports endpoint, если продукту нужен.
8. Audit coverage/structured meta для неинструментированных mutations.

Каждый пункт вводится отдельным backend contract + tests до появления control в UI.
