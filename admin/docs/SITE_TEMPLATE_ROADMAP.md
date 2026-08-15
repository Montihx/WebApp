# Roadmap публичного шаблона

Публичный сайт начинается после стабилизации admin tokens/primitives. Он использует ту же Anime Graphite foundation и тот же stack, но не копирует плотность админских tables и не превращает весь сайт в client application. Dark остаётся почти чёрным с нейтральными graphite surfaces и редким mauve selection; light — тёплым нейтральным с локальным `#381932`. Это один продукт, а не два несвязанных шаблона.

## Общая foundation

Переиспользуются:

- semantic color/type/spacing/radius/motion tokens;
- Button, Badge, FormField, Dialog, Drawer, Popover, Tooltip, Tabs, Toast, Skeleton, Empty/Error states;
- API error model, date/timezone utility, permissions helpers;
- theme Zustand slice;
- Lucide/Sonner/Motion conventions.

Не переиспользуются напрямую:

- admin sidebar/table density/bulk controls;
- admin Query provider как обязательная оболочка всего public tree;
- admin-specific status language.

## Data ownership

| Public area                                                                 | Владелец данных                                     |
| --------------------------------------------------------------------------- | --------------------------------------------------- |
| Home/catalog/search/anime detail/public collections/public profiles         | Server Components + direct server fetch             |
| Catalog/search filters and page                                             | URL через nuqs; server page читает search params    |
| Favorites/watch progress/player preferences/follows/comments/my collections | Малые authenticated client islands + TanStack Query |
| Notifications                                                               | Query island: list + unread count; no mark-read     |
| Theme                                                                       | Zustand client-only                                 |
| Player volume/rate/quality/subtitle preference                              | Zustand client-only                                 |
| Dialogs/drawers/local tabs                                                  | Local React state                                   |

Server data и catalog filters не хранятся в Zustand.

## Полный route inventory для повторной проверки

Старый frontend содержит следующие public/auth/profile routes. Это список проверки, а не доказательство работающего endpoint. Перед redesign каждого route агент обязан сопоставить его с active backend, auth guard и реальным содержимым.

| Группа        | Маршруты                                                                        | Решение до повторного аудита                                                              |
| ------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Discovery     | `/`, `/catalog`, `/catalog/filter`, `/search`, `/tops`, `/seasons`, `/schedule` | сохранить route; наполнять только подтверждёнными server reads                            |
| Anime/watch   | `/anime/[slug]`, `/anime/[slug]/watch`                                          | RSC detail + изолированный Vidstack client boundary                                       |
| Collections   | `/collections`, `/collections/create`                                           | public list RSC; create/my items authenticated island и owner rules                       |
| Auth          | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`   | проверить точные handlers, cookie/token flow и resend behavior                            |
| Profile       | `/profile`, `/profile/[id]`, `/profile/settings`, `/users/[id]`, `/bookmarks`   | self/public schemas различать; чужие session controls не добавлять                        |
| Notifications | `/notifications`                                                                | list + unread count; read-only до появления mark-read endpoint                            |
| Information   | `/about`, `/contacts`, `/faq`, `/terms`, `/privacy`, `/api-docs`                | только утверждённый контент и реальные ссылки                                             |
| Report        | `/report`                                                                       | route может остаться как информационный экран; submit form запрещена без backend endpoint |

Dashboard routes остаются отдельной implementation track и не смешиваются с public shell:

- `/dashboard`;
- `/dashboard/content/anime`, `/dashboard/content/anime/new`, `/dashboard/content/anime/[slug]/edit`;
- `/dashboard/content/episodes`, `/dashboard/content/episodes/new`, `/dashboard/content/episodes/[id]/edit`;
- `/dashboard/content/releases`, `/dashboard/content/releases/new`, `/dashboard/content/releases/[id]/edit`;
- `/dashboard/content/collections`, `/dashboard/moderation`, `/dashboard/monitoring`, `/dashboard/users`;
- `/dashboard/parsers`, `/dashboard/parsers/jobs`, `/dashboard/parsers/jobs/[id]`, `/dashboard/parsers/jobs/[id]/logs`, `/dashboard/parsers/logs`;
- `/dashboard/parsers/conflicts`, `/dashboard/parsers/moderation`, `/dashboard/parsers/scheduler`, `/dashboard/parsers/settings`;
- `/dashboard/settings/audit-logs`, `/dashboard/settings/backups`.

## Маршрутные волны

### Волна 1 — shell и discovery

- public header/navigation/mobile drawer;
- search entry;
- theme bootstrap без flash;
- footer и реальные legal/info links;
- metadata/SEO/Open Graph/sitemap/robots.

### Волна 2 — каталог

- home sections только из подтверждённых endpoints;
- catalog with shareable URL search/filter/sort/page;
- search results;
- anime detail: titles, poster/cover, description, status, score, genres/studios, episodes and related data только при наличии;
- seasons/schedule/top pages добавлять только после route/endpoint re-audit.

RSC отвечает за first render/SEO. Client controls меняют URL, а не дублируют results в global state.

### Волна 3 — watch/player

- отдельный client boundary;
- Vidstack controls/state;
- HLS source selection: native where supported, otherwise hls.js;
- releases grouped by translation language/type/team/quality;
- progress/preferences endpoints;
- continue watching;
- loading/unsupported/offline/provider error states;
- opening/ending skip controls только из валидных backend ranges.

Zustand хранит только user preference, не текущую server release entity или progress history.

### Волна 4 — auth/profile

- login/register/refresh;
- forgot/reset password;
- verify/resend;
- change password;
- self profile/get/update/avatar/cover;
- self logout-all.

Не делать session/device list и logout-one-session: endpoints отсутствуют. Logout-all никогда не применяется к чужому admin user.

### Волна 5 — social/interactions

- favorites;
- watch progress/preferences;
- comments/replies/likes/edit/soft delete по permissions;
- follows/status/followers/following;
- public collections, collection detail;
- my collections CRUD/items;
- public user profile/stats.

Каждый блок — маленький Query island с server-rendered surrounding page, если это улучшает first paint/SEO.

### Волна 6 — notifications и information pages

- notifications list;
- unread count indicator;
- honest read-only state до mark-read endpoint;
- about/contacts/FAQ/terms/privacy только с утверждённым реальным контентом.

Report submission form не включать: active backend endpoint не подтверждён. Можно показать статический контактный канал только если он реально настроен владельцем.

## Catalog URL contract

Примерный набор определяется реальным public catalog handler, не копируется из admin автоматически. Общие правила:

- parsers nuqs имеют allowlist/default;
- empty/default params удаляются из URL;
- filter change сбрасывает недействительную page;
- back/forward и copied link полностью восстанавливают view;
- server page выполняет fetch по parsed params;
- no duplicate filter state in Zustand.

## Player architecture

```text
Server watch page
  └─ typed anime/episode/release payload
      └─ Player client boundary
          ├─ Vidstack UI/state
          ├─ Native HLS or hls.js provider
          ├─ Query mutations: progress/preferences
          └─ Zustand: durable player preferences only
```

В player boundary должны быть:

- explicit source/translation/quality controls;
- captions/audio labels;
- progress resume confirmation при неоднозначном state;
- keyboard shortcuts с help;
- autoplay restriction feedback;
- retry/provider fallback без бесконечного loop;
- cleanup HLS instance on source/unmount;
- reduced motion.

## Visual adaptation

Anime Graphite сохраняется, но публичный сайт легче:

- больше воздуха и editorial typography;
- poster/cover imagery становится главным контентом;
- `#381932` остаётся light primary/brand anchor, mauve — focus/selection; green — только подтверждённый success, slate-blue — только info;
- cards имеют меньше borders и metadata density;
- operational warning/danger language используется только там, где нужно пользователю.

Magic UI/Aceternity patterns допустимы для hero/discovery, но только один заметный effect на viewport и без тяжёлых animation loops. HyperUI structure полезна для catalog/filter/form. daisyUI остаётся ориентиром semantic naming, 21st.dev — проверяемым source catalog.

## Public acceptance gates

- Server Components дают полноценный first response без client waterfall.
- User-specific data не попадает в public cache.
- Auth refresh не создаёт duplicate requests/loops.
- Catalog URL share/reload/back-forward работает.
- Player keyboard/a11y/error/fallback/progress проверены.
- 360–1440, light/dark/system/reduced-motion проверены.
- No hydration flash/mismatch for theme/date/player shell.
- Нет mark-read/report/session controls без backend.
- Admin и public используют одни tokens/primitives/package versions.
- Ни один старый route не потерян: каждый реализован, намеренно redirect/removed с доказательством или помечен backend-blocked без fake form.
- Нет placeholder copy, lorem ipsum, fake counters, недействующих кнопок или временных `#` links.
- Lighthouse/performance budgets утверждены и измерены на production build.

## Порядок handoff после админки

1. Заморозить versioned token/primitives contract.
2. Опубликовать component usage examples и forbidden patterns.
3. Подготовить public route/endpoint matrix по активному backend.
4. Реализовать shell/catalog/detail.
5. Реализовать isolated player.
6. Добавить authenticated islands.
7. Пройти public QA gates.
8. Только затем удалять старый public template и legacy dependencies.
