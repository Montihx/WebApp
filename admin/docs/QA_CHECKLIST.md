# QA checklist

## 1. Build и статический анализ

- [ ] `pnpm install --frozen-lockfile` проходит.
- [ ] Biome check проходит без ignored legacy folders, если они входят в runtime.
- [ ] `tsc --noEmit` проходит.
- [ ] Next production build проходит.
- [ ] Unit/contract tests проходят.
- [ ] Playwright проходит на поддержанных browsers.
- [ ] Нет imports split Radix packages после unified migration.
- [ ] Нет Framer Motion/GSAP/old toast/ESLint/Prettier imports после соответствующего cleanup gate.
- [ ] Нет второй React/Query/date library в bundle.

## 2. Contract fidelity

- [ ] Каждый control сопоставлен method/path/auth/request/response.
- [ ] Для каждого control проверены route registration, handler, model/query/migration и релевантный test; документации одной недостаточно.
- [ ] Read-only поля не попадают в mutation payload.
- [ ] Anime не отправляет `year`; фильтры только search/kind/status/has_video/needs_moderation.
- [ ] Anime bulk поддерживает только delete/update_status и allowlisted statuses.
- [ ] Episode editor не отправляет duration/title_en/opening/ending; bulk только delete.
- [ ] Release UI не обещает server URL validation/test stream.
- [ ] Asset upload требует существующий entity id, допустимый MIME и ≤5 MB.
- [ ] Collections admin list read-only.
- [ ] Job trigger принимает только parser_name/job_type и safe pairs.
- [ ] Scheduler разрешает create/enable/run только Kodik incremental до backend fix.
- [ ] Moderation правильно показывает approved/skipped/skipped_ids.
- [ ] Blacklist использует только Shikimori ID/Kodik ID/slug.
- [ ] Comments не показывают reports/total/review metrics.
- [ ] User detail не предлагает target logout-all/session list.
- [ ] Monitoring не строит history; cache `not probed`.
- [ ] Backup trigger создаёт DB+media; restore отсутствует; audit не обещан.
- [ ] Site settings содержат ровно пять keys.
- [ ] Parser settings показывают consumer/support gap.
- [ ] Audit не обещает total/server filters/diff/user join.
- [ ] Notifications не предлагают mark-read.

## 3. Data states

Для каждого query/detail/form:

- [ ] initial/loading;
- [ ] slow loading без layout shift;
- [ ] empty с полезным next action только если он существует;
- [ ] success;
- [ ] 401 → auth flow;
- [ ] 403 → permission state без скрытия server decision;
- [ ] 404 → not found;
- [ ] 409/422 → field/form errors;
- [ ] 429 → retry guidance без auto storm;
- [ ] 500/network/offline → error + safe retry;
- [ ] aborted navigation не показывает stale toast.

Ошибка не преобразуется в empty list.

## 4. Forms и mutations

- [ ] RHF default values обновляются при смене entity без stale state.
- [ ] Zod schema совпадает с create/update request, nullable/optional semantics проверены.
- [ ] Backend field errors маппятся в конкретные fields.
- [ ] Submit блокируется только на время active mutation.
- [ ] Double submit не создаёт дубль.
- [ ] Success использует фактический response и минимальную invalidation.
- [ ] Failed mutation сохраняет введённые данные.
- [ ] Closing dirty form предупреждает при реальном риске потери.
- [ ] Maintenance/superuser/bulk delete/ban/stop/delete backup/schedule confirmations содержат impact.
- [ ] Superuser невозможно банить; backend error показан понятно.
- [ ] Direct parser refresh явно отличим от queued job.

## 5. URL state

- [ ] Search/filter/sort/page сериализуются nuqs parsers.
- [ ] Reload восстанавливает состояние.
- [ ] Back/forward работают.
- [ ] Скопированный URL открывает тот же список.
- [ ] Invalid values нормализуются.
- [ ] Page сбрасывается при изменении filter, если текущая страница недействительна.
- [ ] URL не содержит секреты/form drafts.
- [ ] Catalog filter state не дублируется в Zustand.

## 6. Query/live behavior

- [ ] Query keys стабильны и включают normalized params.
- [ ] Mutation invalidation scoped.
- [ ] Polling останавливается на hidden tab и terminal status.
- [ ] WebSocket reconnect имеет bounded exponential backoff.
- [ ] REST refetch восстанавливает state после live disconnect.
- [ ] WebSocket используется для progress/stats; логи загружаются из GET endpoints.
- [ ] Stop job предупреждает о partial writes и не обещает checkpoint/resume, которых нет.
- [ ] Full sync не показывает fake percent.
- [ ] Duplicate toasts/events не появляются после reconnect.

## 7. Permissions и security UX

- [ ] Nav/action visibility соответствует permissions, но server 403 обрабатывается.
- [ ] Permission downgrade во время открытой страницы не оставляет активную dangerous action.
- [ ] Secrets не попадают в DOM после save, logs, audit meta, URL, toast или analytics.
- [ ] HTML/provider payload не вставляется без sanitization.
- [ ] External URLs получают корректные protocol/rel policies.
- [ ] CSV export защищён от formula injection, если содержит user text.
- [ ] Upload filename/MIME/size проверены server-side и client-side UX согласован.
- [ ] Clipboard/download failures имеют fallback.

## 8. Accessibility

- [ ] Все controls имеют accessible name.
- [ ] Heading order логичен.
- [ ] Dialog focus trap/return/Escape работают.
- [ ] Popover/Dropdown/Command доступны клавиатурой.
- [ ] Tabs имеют role/aria-selected/aria-controls.
- [ ] Table headers/scopes и captions/labels понятны screen reader.
- [ ] Status не передаётся только цветом.
- [ ] Focus ring заметен в light/dark.
- [ ] Contrast WCAG AA для текста/controls/status badges.
- [ ] Toast не единственный источник критической ошибки.
- [ ] Reduced motion отключает non-essential animation.
- [ ] Touch targets достаточного размера.

## 9. Responsive/visual

Проверить 360, 390, 768, 1024, 1280, 1440+:

- [ ] sidebar → drawer/mobile dock без потери маршрутов;
- [ ] scrim/focus/scroll lock;
- [ ] header actions wrap без overlap;
- [ ] tables scroll только внутри table container;
- [ ] bulk bar не закрывает критические controls;
- [ ] dialogs не выходят за viewport и имеют scrollable body;
- [ ] long Russian/English titles, UUID, URLs, errors не ломают layout;
- [ ] light/dark/system theme без flash;
- [ ] Dark использует near-black/graphite и светлый primary; light — neutral/white с локальным `#1f1d20`; фиолетовый accent только focus/selection, green только success, slate-blue только info;
- [ ] Нет generic AI bento, neon/glass/gradient-text, fake live indicators и декоративных charts;
- [ ] empty/error/loading heights не вызывают сильный shift;
- [ ] zoom 200% остаётся usable.

## 10. Dates/timezones

- [ ] aware timestamp не получает второй `Z`.
- [ ] allowlisted naive UTC обрабатывается одинаково server/client.
- [ ] midnight/date-only не сдвигается случайно.
- [ ] DST boundary покрыта тестом.
- [ ] Scheduler UI не выдаёт client cron preview за backend truth.
- [ ] SSR/client formatted output не вызывает hydration mismatch.

## 11. Player/public continuation

- [ ] Vidstack keyboard/a11y controls.
- [ ] native HLS vs hls.js provider selection.
- [ ] source/translation/quality changes сохраняют progress.
- [ ] errors/unsupported/autoplay restrictions понятны.
- [ ] opening/ending skip ranges только read/validated backend data.
- [ ] theme/player preferences — единственные Zustand stores.
- [ ] public RSC не кэширует user-specific data.
- [ ] notifications только list/unread до появления mark-read contract.
- [ ] report form отсутствует до backend endpoint.

## 12. Release evidence

- [ ] Сохранены command outputs/build/test summary.
- [ ] Сняты фактические light/dark/mobile screenshots после финального build.
- [ ] Записаны browser/version/viewport.
- [ ] Известные backend gaps перечислены как gaps, не скрыты.
- [ ] Docs обновлены по фактическому коду.
- [ ] Нет placeholder copy, TODO buttons, fake success, `#` links или локальной имитации, выданной за server response.
- [ ] Rollback/change-set boundaries понятны.
