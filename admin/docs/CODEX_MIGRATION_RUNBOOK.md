# Codex migration runbook

Этот документ можно передать Codex вместе с архивом. Он описывает порядок действий, границы полномочий, ожидаемые артефакты и stop conditions. Не заменять чтение repository instructions.

## Цель

Внедрить Anime Graphite redesign в существующую админку Kitsu, сохранив backend contracts и целевой стек. После стабилизации админки использовать те же tokens/primitives для публичного сайта, но с правильным server/client data ownership.

## Жёсткие ограничения

- Не выдумывать endpoints, поля, metrics, reports или actions.
- Active Go route/handler/schema/middleware важнее старого frontend и старого OpenAPI.
- Не переписывать owner-controlled frontend без подтверждённого scope.
- Не перезаписывать dirty worktree и чужие изменения.
- Не объединять все major migrations и redesign в один change set.
- Не копировать mock data/timers/demo downloads из standalone prototype.
- Не ставить Magic UI, HyperUI, daisyUI, 21st.dev и Aceternity как пять dependencies.
- Zustand — только theme/player preferences.
- Все dangerous mutations — confirm + реальный response/error.
- Документы и prototype — hypotheses/evidence index, не source of truth. При расхождении с активным кодом остановиться и сначала обновить contract matrix.

## Фаза 0 — discovery

### 0.1 Репозиторий

Выполнить read-only discovery:

```bash
pwd
rg --files -g 'AGENTS.md' -g 'CLAUDE.md' -g 'package.json' -g 'pnpm-lock.yaml' -g 'next.config.*' -g 'components.json'
git status --short
git branch --show-current
git rev-parse --short HEAD
```

Прочитать все применимые instructions. Если worktree dirty, определить ownership каждого пересекающегося файла и не использовать destructive reset/checkout.

### 0.2 Frontend inventory

Найти:

```bash
rg --files | rg '(^|/)(app|pages|components|features|lib|hooks|stores|tests|e2e)/'
rg -n 'QueryClient|useQuery|useMutation|zustand|create\(|framer-motion|gsap|@radix-ui|sonner|toast|new Date\(' <frontend-root>
```

Составить таблицу:

- current route → page/layout files;
- feature → API client/hook/store;
- primitive → package/import;
- test coverage;
- owner/risk.

### 0.3 Backend inventory

Для каждого экрана прочитать route registration и handler. Зафиксировать:

- method/path/auth/permission/audit middleware;
- query/path/body fields;
- response shape;
- error codes/messages;
- direct write, synchronous command или queued job;
- cache invalidation/side effects.

Сверить с `FUNCTIONAL_COVERAGE.md`; если код изменился, обновить документ до реализации. Для каждой action сохранить evidence: route file, handler, request/response type, database/model/query, middleware и test. Простого совпадения URL недостаточно.

### 0.4 Baseline

Использовать scripts репозитория, не придумывать имена. Типичный набор:

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run build
pnpm run test
pnpm exec playwright test
```

Записать существующие failures и screenshots. Stop condition: baseline невозможно воспроизвести и причина не определена.

## Фаза 1 — change-set plan

Перед редактированием подготовить план с отдельными commits/PR slices:

1. security/baseline fixes;
2. Next major compatibility;
3. Tailwind 4;
4. shadcn/unified Radix;
5. shared data/error/date/state foundation;
6. Anime Graphite tokens/primitives/shell;
7. admin read routes;
8. admin CRUD;
9. parser/community/system routes;
10. public template;
11. cleanup/QA.

Если пользователь просит один итоговый PR, commits всё равно должны оставаться разделёнными и проверяемыми.

## Фаза 2 — package migrations

### 2.1 Next/React

Сначала прочитать official upgrade guide для фактической исходной версии. Обновить и стабилизировать Next отдельно. Не менять дизайн в этом change set.

### 2.2 Tailwind 4

На чистом change set:

```bash
pnpm dlx @tailwindcss/upgrade
```

Проверить CSS imports, `@theme`, content detection, custom utilities/plugins, dark mode, animations. `tailwind.config.js` удалить только после zero references и visual parity.

### 2.3 shadcn/Radix

Проверить `components.json`, затем:

```bash
pnpm dlx shadcn@latest migrate radix
```

Для добавления новых primitives сохранять Radix base. Проверить:

```bash
rg -n "@radix-ui/react-|from ['\"]radix-ui['\"]" <frontend-root>
```

Отдельные packages удалять только при нулевых imports и зелёном build/E2E.

### 2.4 Motion/Zod/Biome

- заменить imports Framer Motion на `motion/react`, сравнить behavior, затем удалить Framer/GSAP;
- мигрировать Zod form-by-form с schema tests;
- установить/configure Biome, выполнить миграцию правил, включить CI/editor;
- удалить ESLint/Prettier только после эквивалентного gate.

## Фаза 3 — структура frontend

Адаптировать к существующим conventions, но сохранить границы:

```text
app/
  (public)/
  (auth)/
  admin/
components/
  ui/
  admin/
  public/
features/
  anime/
  episodes/
  releases/
  parsers/
  users/
  comments/
  system/
lib/
  api/
  query/
  dates/
  permissions/
  validation/
stores/
  theme.ts
  player-preferences.ts
```

Не создавать второй параллельный tree, если repo уже имеет feature architecture; интегрировать по его conventions.

## Фаза 4 — shared foundation

### 4.1 API

Создать:

- `ApiError` с HTTP status, code/detail, request ID, field issues;
- server fetch wrapper с cache/auth rules;
- browser fetch wrapper для Query;
- abort/timeout policy только там, где это согласовано с backend job semantics;
- no silent fallback to `[]`/`null` on errors.

### 4.2 Query

Для каждого feature — key factory. Пример концепции:

```ts
const animeKeys = {
  all: ["admin", "anime"] as const,
  list: (params: AnimeListParams) =>
    [...animeKeys.all, "list", params] as const,
  detail: (id: string) => [...animeKeys.all, "detail", id] as const,
};
```

Нормализовать params до key. Mutation invalidates detail + затронутые lists/stats, а не весь QueryClient.

### 4.3 URL

Подключить nuqs adapter в App Router. Типизированные parsers:

- `q`, `page`, `limit`;
- `kind`, `status`;
- `has_video`, `needs_moderation`.

Не добавлять params, которых backend не принимает. Back/forward/share/reload обязаны восстанавливать state.

### 4.4 Dates

Одна utility с тестами для aware/naive UTC, timezone, DST, invalid input и display fallback. Запретить scattered raw parsing code review rule.

### 4.5 State

Оставить Zustand только для:

- theme;
- player volume/rate/quality/subtitle preference.

Sidebar/bulk/dialog — local state; table filters — URL; server data — RSC/Query.

## Фаза 5 — Anime Graphite

Перенести из `DESIGN_SYSTEM.md`:

- semantic colors и light/dark modes;
- typography/spacing/radii/shadows;
- status colors;
- focus ring/reduced motion.

Сначала primitives, потом pages. Запрещены feature-level raw hex, кроме data visualization palette в одном central map.

Reference catalogs использовать только как ideas. Любой borrowed pattern должен пройти license/provenance/dependency/a11y review и быть переписан на Kitsu primitives.

## Фаза 6 — route-by-route implementation

Для каждого route один и тот же цикл:

1. перечитать handler;
2. создать TypeScript read/request types;
3. создать URL/query layer;
4. реализовать loading/error/empty/success;
5. реализовать mutations по write schema;
6. добавить permissions/confirmation;
7. добавить contract/component/E2E tests;
8. проверить mobile/light/dark/keyboard;
9. обновить coverage docs.

Порядок routes:

1. overview, roles, monitoring, audit, collections;
2. anime, episodes, releases, avatars, decorations;
3. parser search/import/jobs/conflicts/moderation/blacklist/scheduler/settings;
4. comments, users, backups, site settings, notifications.

### Stop conditions по функционалу

- Episode editor пытается отправлять duration/title_en/opening/ending.
- Anime editor отправляет `year`.
- Release UI обещает server URL validation.
- Scheduler разрешает не-Kodik-incremental до backend fix.
- Job trigger принимает произвольный pair/target/note.
- Job detail выдаёт WebSocket progress за log stream или обещает несуществующий checkpoint/resume.
- Comment UI показывает reports/total.
- User detail предлагает logout-all чужого пользователя.
- Monitoring строит history из snapshot.
- Backup UI предлагает restore.
- Notification UI предлагает mark-read.
- Parser settings скрывает consumer gap.

При любом из этих признаков остановиться и исправить модель, не обходить ограничение frontend-ом.

## Фаза 7 — public template

После стабилизации admin primitives:

- вынести shared tokens/primitives без admin-specific density;
- catalog/detail в RSC;
- filters/search в URL;
- authenticated actions как small Query islands;
- Vidstack player в отдельном client boundary;
- Zustand только player/theme;
- notifications list/unread без mark-read;
- report form не делать без backend contract.

Следовать `SITE_TEMPLATE_ROADMAP.md`.

## Фаза 8 — verification

Обязательный command gate — фактические scripts проекта плюс:

```bash
pnpm exec biome check .
pnpm exec tsc --noEmit
pnpm run build
pnpm exec playwright test
```

Проверить:

- 360, 768, 1024, 1440 widths;
- light/dark/system theme;
- reduced motion;
- keyboard-only и focus return;
- 401/403/404/409/422/500 handling;
- slow network/offline/abort;
- dangerous confirmations;
- URL state/back-forward;
- job reconnect/fallback;
- date timezone boundaries;
- no horizontal overflow except intentional table scroller;
- no stale duplicated dependencies/imports.

Снять новые screenshots только с фактической production implementation. Не выдавать standalone mock screenshots за доказательство network integration.

## Итоговый отчёт Codex

В отчёте перечислить:

1. изменённые архитектурные границы;
2. реализованные routes/actions;
3. удалённые dependencies;
4. backend gaps, оставленные gated;
5. выполненные commands и результаты;
6. screenshots/preview;
7. известные ограничения;
8. следующий безопасный шаг для public template.
