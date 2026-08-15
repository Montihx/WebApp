# Целевой стек Kitsu

Дата решения: 2026-08-13. Стек применяется и к админ-панели, и к следующему публичному шаблону. Patch-версии фиксируются lockfile в момент миграции после проверки release notes; этот документ фиксирует архитектуру и major-линии, а не быстро устаревающие номера.

## Решение по слоям

| Слой                | Решение                                           | Правило внедрения                                                                                                                                                  |
| ------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Каркас              | Next.js App Router + React 19 + TypeScript strict | Сохранить App Router. Major Next обновлять отдельным контролируемым шагом после baseline build/test.                                                               |
| Стили               | Tailwind 4                                        | CSS-first tokens и `@theme`; удалить `tailwind.config.js` только после переноса plugins, content sources, animations и visual parity.                              |
| Компоненты          | shadcn/ui source components + Radix               | Использовать Radix base намеренно. После официальной миграции primitives импортируются из unified `radix-ui`; компоненты остаются кодом проекта в `components/ui`. |
| Public server data  | Server Components + direct server `fetch`         | Read-heavy публичные страницы. Один server API client с typed errors, request ID, auth forwarding и cache policy.                                                  |
| Admin/client data   | TanStack Query v5                                 | Админка, mutations, polling, optimistic transitions и интерактивные authenticated islands. Не оборачивать весь public site в Query без причины.                    |
| URL state           | nuqs                                              | Каталог, search, filters, sort, pagination и открываемые deep links. URL является источником истины для shareable state.                                           |
| Global client state | Zustand                                           | Только тема и настройки плеера. Sidebar, dialog и selection — local component state; server data — не Zustand.                                                     |
| Формы               | React Hook Form + Zod 4                           | Схемы строятся по write contract, ошибки backend маппятся в поля и form-level alert.                                                                               |
| Анимация            | Motion из `motion/react`                          | GSAP удаляется после parity. Простые hover/focus/layout transitions остаются CSS; обязательно `prefers-reduced-motion`.                                            |
| Плеер               | Vidstack + hls.js                                 | Vidstack — UI/state/provider orchestration; hls.js — HLS engine там, где нет native HLS.                                                                           |
| Иконки              | lucide-react                                      | Один набор, consistent stroke и размеры.                                                                                                                           |
| Toast               | Sonner                                            | Radix Toast и локальные конкурирующие toast systems удалить после замены всех call sites.                                                                          |
| Графики             | Recharts                                          | Только admin metrics, реально возвращаемые backend. Не генерировать тренды из одной snapshot-точки.                                                                |
| Даты                | date-fns 4 + `@date-fns/tz`                       | Одна allowlisted UTC/timezone utility; raw parsing по всему UI запрещён.                                                                                           |
| Проверки            | Playwright + `tsc` + Next build                   | E2E не заменяет typecheck/build; visual, accessibility и contract tests идут отдельными gates.                                                                     |
| Линтер/формат       | Biome                                             | ESLint/Prettier удаляются только после эквивалентной конфигурации, CI и editor setup.                                                                              |
| Пакеты              | pnpm                                              | Один lockfile; `pnpm install --frozen-lockfile` в CI.                                                                                                              |

## shadcn и unified Radix

Фраза «одна зависимость вместо 17 `@radix-ui/react-*`» теперь достижима через официальный unified package `radix-ui`, но это не означает, что shadcn становится закрытой runtime-библиотекой. shadcn по-прежнему добавляет source-owned components, а Radix предоставляет primitives.

Для существующего проекта:

```bash
pnpm dlx shadcn@latest migrate radix
```

После миграции нужно проверить import graph, bundle, SSR/hydration, Dialog/Popover/Select/Tooltip/DropdownMenu и удалить отдельные Radix packages только когда `rg` больше не находит imports. Для новых components явно сохранять Radix base; актуальный shadcn CLI может предлагать другой default, поэтому инициализация должна указывать `-b radix`.

## Ownership данных

| Данные                                                 | Владелец                                                                          |
| ------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Публичный каталог, anime detail, SEO content           | Server Component + server `fetch`                                                 |
| Authenticated favorites/progress/follows/notifications | Малые client islands + TanStack Query                                             |
| Админские таблицы и detail                             | TanStack Query; filters/page в nuqs                                               |
| Parser jobs/logs                                       | Query + отдельная live transport boundary; REST остаётся fallback/source of truth |
| Формы и validation state                               | React Hook Form                                                                   |
| Theme                                                  | Zustand client-only + hydration-safe bootstrap                                    |
| Player volume/rate/quality/subtitle preference         | Zustand client-only                                                               |
| Sidebar, selected rows, open dialog                    | Локальный React state                                                             |

Нельзя хранить server entities в Zustand, дублировать один list одновременно в RSC и Query без владельца или превращать query params в глобальный store.

## UI catalogs

Magic UI, HyperUI, daisyUI, 21st.dev и Aceternity просмотрены, но не устанавливаются как пять параллельных systems.

- разрешено переносить небольшой pattern после проверки accessibility, dependency graph, license/provenance, responsive behavior и reduced motion;
- перенесённый pattern переписывается на Kitsu tokens и `components/ui`;
- запрещены чужие global styles, второй theme engine, второй icon/toast/form runtime;
- эффекты не применяются к dense tables, destructive flows и monitoring; там приоритет — скорость чтения.

## Порядок технической миграции

1. Зафиксировать baseline: install, typecheck, build, текущие E2E, bundle и screenshots.
2. Обновить security patches текущей Next-линии.
3. В отдельном change set выполнить целевой Next major и React compatibility fixes.
4. Перевести Tailwind на v4 CSS-first; сохранить visual parity, затем удалить config.
5. Обновить shadcn source components и выполнить unified Radix migration.
6. Ввести server API client, Query provider только для нужных client zones и nuqs adapter в App Router.
7. Ограничить Zustand двумя slices: theme и player preferences.
8. Мигрировать Framer imports на `motion/react`, удалить GSAP после parity.
9. Ввести Vidstack/hls.js через изолированный player boundary.
10. Мигрировать Zod 4 и формы по route-by-route schemas.
11. Перевести даты на одну utility.
12. Мигрировать Biome; затем удалить ESLint/Prettier и неиспользуемые packages.
13. Пройти все gates из `QA_CHECKLIST.md`.

## Блокирующие правила

- Не использовать `latest` в `package.json`; только проверенные exact/range versions и lockfile.
- Не совмещать visual rewrite и несколько major migrations в один неделимый commit.
- Не удалять старую dependency до нулевого import graph и зелёных tests.
- Не показывать метрику, если backend не отдаёт её или её нельзя честно вывести из response.
- Не включать public caching для user-specific data.
- Не читать client Zustand store из Server Components.
