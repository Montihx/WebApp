# Handoff для Codex

## Цель

Перенести `Anime Graphite` в существующий Kitsu frontend, не ломая backend contracts и не меняя понравившуюся композицию на новый шаблон. После стабилизации dashboard теми же tokens, primitives и стеком переработать весь публичный сайт. Публичные страницы должны быть легче и медийнее, но визуально принадлежать одному продукту.

Начать с `docs/ROUTE_ACTION_MATRIX.md`, но каждую его строку заново подтвердить текущим кодом.

## Непереговорное правило проверки

Не доверять этому архиву, старому frontend, OpenAPI, комментариям или документации без повторной проверки фактического кода текущей ветки.

Перед каждым экраном:

1. Найти зарегистрированный route и middleware.
2. Прочитать handler целиком, включая error paths и authorization.
3. Сверить request DTO, response DTO, database model/schema, migration и SQL/query.
4. Проверить реальные frontend imports, API client, query keys, forms и consumers.
5. Найти contract/integration/E2E tests и выполнить релевантный runtime path.
6. Записать расхождение в route/action matrix до изменения UI.
7. Если код расходится с этим документом — код имеет приоритет; остановиться, обновить matrix и только затем проектировать.

Наличие поля в response не означает, что оно доступно в create/update. Наличие сохранённой настройки не означает, что runtime её читает. Наличие route не доказывает правильную ownership/cache/permission семантику без handler и теста.

## Перед началом изменений

1. Прочитать repository instructions и ownership rules.
2. Проверить dirty worktree и не перезаписывать чужие изменения.
3. Зафиксировать commit SHA, package manager, Node/pnpm versions и deployment target.
4. Переснять inventory App Router routes, backend routes и protected role requirements.
5. Прочитать `package.json`, `pnpm-lock.yaml`, Tailwind/shadcn config, import graph и текущую auth/theme/data architecture.
6. Выполнить baseline install, Biome/ESLint как есть, `tsc`, Next build, unit/integration/Playwright. Отдельно записать уже существующие failures.
7. Сделать baseline screenshots на тех же viewport/theme, которые будут использоваться после переноса.

## Подтверждённый целевой стек

| Слой             | Решение                                                                                      |
| ---------------- | -------------------------------------------------------------------------------------------- |
| Каркас           | Next.js App Router + React 19 + TypeScript strict                                            |
| Стили            | Tailwind 4 CSS-first; `tailwind.config.js` удаляется после полного переноса                  |
| Primitives       | source-owned shadcn/ui поверх Radix; после проверки unified `radix-ui` вместо split packages |
| Public reads     | Server Components + прямой server `fetch` через единый typed API client                      |
| Dashboard/client | TanStack Query v5 только для admin и интерактивных authenticated islands                     |
| URL state        | nuqs для filters/search/sort/page и shareable deep links                                     |
| Global state     | Zustand только theme и устойчивые player preferences                                         |
| Формы            | React Hook Form + Zod 4 по write contracts                                                   |
| Motion           | `motion/react`; GSAP и старые Framer imports удаляются после parity                          |
| Player           | Vidstack поверх native HLS/hls.js                                                            |
| Icons / toast    | lucide-react / Sonner                                                                        |
| Charts           | Recharts только для реально возвращаемых admin series                                        |
| Dates            | date-fns 4 + `@date-fns/tz` через одну utility                                               |
| Quality          | Biome, `tsc`, Next build, Playwright, contract tests                                         |
| Packages         | pnpm и один lockfile                                                                         |

Версии не угадывать. Перед установкой проверить фактические manifests, совместимость и release notes; зафиксировать результат lockfile.

## Design contract

- Сохранить геометрию, плотность и информационную иерархию этого шаблона.
- Dark: `#0d0d0f` canvas, `#111113` sidebar, `#19191c` surface; primary action светлый, фиолетовый accent `#7242e0` используется только как marker/focus/selection/running.
- Light: `#f5f4f2` canvas, `#fbfaf9` sidebar, `#ffffff` surface; `#1f1d20` остаётся сильным primary/brand anchor, но не заливает навигацию и карточки.
- Green никогда не является брендовым акцентом: только success. Slate-blue допустим только для info. Amber — warning, red — destructive/error. Все состояния имеют текст или иконку, а не только цвет.
- Danger — `#b91c1c` в light и `#ff7a7a` в dark; опасные действия не конкурируют с primary.
- Не копировать Anixart буквально: перенести нейтральную иерархию black/graphite surfaces и сдержанную selected-state логику, а не чужие assets/layout.
- Не возвращать фиолетовые page backgrounds, sidebar fills, тени и gradients одновременно. Accent обязан занимать малую площадь экрана.
- Не делать AI-generic UI: нет одинаковых огромных карточек, бессмысленного bento, gradient text, случайных sparkles, neon glow, фальшивых live dots и декоративных charts.
- Любая иконка без текста имеет accessible name и tooltip; focus ring видим в обеих темах.
- Motion короткий, функциональный, без background loops; `prefers-reduced-motion` обязателен.

## Внешние UI-каталоги

Не устанавливать Magic UI, HyperUI, daisyUI, 21st.dev и Aceternity одновременно.

- shadcn/Radix — единственная component foundation;
- HyperUI — источник структур tables/forms/filter bars;
- Magic UI и Aceternity — максимум один сдержанный effect на public hero/auth/empty state;
- daisyUI — только ориентир semantic naming/theme roles, без второго runtime/theme engine;
- 21st.dev — source catalog; каждый snippet проверять на license, provenance, dependencies, SSR, accessibility и reduced motion.

Скопированный pattern становится кодом Kitsu, использует Kitsu tokens и проходит те же tests.

## Функциональные запреты

- Не добавлять endpoint, metric, status, report, action, history или filter, которого нет в активном backend.
- Не показывать success до успешного response; не менять row оптимистично для опасной mutation без согласованной rollback strategy.
- Не превращать network error в empty state.
- Не подменять unknown/unprobed значением `0` или healthy.
- Не обещать URL/stream health: отдельного probe endpoint нет.
- Не добавлять retry/duplicate parser job, checkpoint/resume или live percentage full sync.
- Не добавлять backup restore или signed download URL.
- Не добавлять notification mark-read, report form или target-user session controls без нового backend contract.
- Не разрешать admin edit чужой Collection: list доступен superuser, update/delete owner-gated.
- Не считать parser settings применёнными: active Go worker consumer не подтверждён.
- Cache monitoring маркировать `not probed`, пока backend реально его не измеряет.
- Audit не имеет total/server filters и не гарантирует before/after diff.

## Порядок реализации

1. Contract inventory и baseline.
2. Tokens, typography, themes и accessible primitives без изменения data flow.
3. Stack migration малыми reversible change sets.
4. Typed API client, error model, date utility, permissions, query key factory.
5. Read-only dashboard routes.
6. Forms/mutations строго по write DTO.
7. Parser jobs/import/conflicts/scheduler с runtime gaps.
8. Users/system/community routes.
9. Admin regression + visual acceptance.
10. Public shell/catalog/detail/player/auth/social по `SITE_TEMPLATE_ROADMAP.md`.
11. Dependency cleanup только после нулевого import graph и зелёных gates.

## Definition of done

- все routes/actions заново сверены с текущим кодом и отмечены evidence paths;
- `pnpm` install frozen, Biome, `tsc`, Next production build и Playwright зелёные;
- нет split Radix/old toast/GSAP/Framer/ESLint/Prettier imports после соответствующего migration gate;
- нет fake metrics, fake success, placeholder handlers, TODO buttons или dead navigation;
- loading/error/empty/partial/stale/success состояния предметные и проверяемые;
- keyboard, focus return, Escape, screen-reader names, contrast и reduced motion проверены;
- 360, 390, 768, 1024 и 1440 px; light/dark/system; long Russian text; empty/large/error datasets проверены;
- public/admin используют один versioned token/primitives contract, но правильных data owners;
- screenshots и документация обновлены по фактической реализации, а не по намерениям.
