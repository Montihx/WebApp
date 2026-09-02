# Anime Graphite — дизайн-система Kitsu

## Замысел

Система сохраняет компактность и расположение понравившегося dashboard. Dark строится на почти чёрном canvas и нейтральных graphite surfaces; светлая primary-кнопка создаёт ясную иерархию, а фиолетовый accent появляется только в focus, selection и identity markers (running/in-progress). Light использует тёплый нейтральный canvas, белые поверхности и почти чёрный `#1F1D20` как локальный сильный action/brand anchor.

Это собственная система Kitsu, а не копия Anixart и не набор случайных компонентов из UI-каталогов.

## Цветовые роли

Feature-компоненты используют semantic tokens. Raw hex разрешён только в token layer, poster placeholder/visualization palette и проверяемых third-party media states.

| Роль           |      Dark |     Light | Применение                         |
| -------------- | --------: | --------: | ---------------------------------- |
| Canvas         | `#0D0D0F` | `#F5F4F2` | фон приложения                     |
| Sidebar        | `#111113` | `#FBFAF9` | постоянная нейтральная навигация   |
| Surface        | `#19191C` | `#FFFFFF` | panels, tables, cards              |
| Raised         | `#212124` | `#F7F5F4` | popover, toolbar, input            |
| Hover          | `#27272B` | `#EFEDEC` | обычный hover без brand tint       |
| Active         | `#2D2D32` | `#E8E4E7` | selected surface                  |
| Border         | `#2E2E33` | `#DEDADD` | обычная граница                    |
| Strong border  | `#46464E` | `#C5BFC4` | focus/context boundary             |
| Text           | `#F3F2F4` | `#252225` | основной текст                     |
| Secondary      | `#B9B6BC` | `#5E5960` | пояснения                          |
| Muted          | `#8B8790` | `#746E74` | metadata с AA-контрастом           |
| Accent marker  | `#7242E0` | `#36255C` | focus, selection rail, running/in-progress |
| Accent text    | `#D2C3F6` | `#36255C` | малый accent text с AA-контрастом  |
| Primary fill   | `#ECEAEC` | `#1F1D20` | один главный action в контексте    |
| Primary text   | `#171719` | `#FFFFFF` | текст главного action              |
| Success        | `#56AD91` | `#166534` | только подтверждённый success      |
| Warning        | `#D0A052` | `#854D0E` | attention/partial/unknown          |
| Danger         | `#FF7A7A` | `#B91C1C` | destructive/error                  |
| Info           | `#7F9FBD` | `#1D4ED8` | редкое информационное состояние    |

Значения синхронизированы с общими custom properties в корневом `tokens.css` и проверяются автоматически контраст-чеками в `admin/tools/qa.mjs`. Источник истины — CSS-токены и `qa-results.json`, не эта таблица: при изменении токенов сначала прогонять `qa.mjs --write`, потом обновлять таблицу.

### Запреты цвета

- Accent (фиолетовый) не используется как canvas, sidebar fill, массовая заливка cards или общая тень. Его площадь должна оставаться небольшой и означать только selected/running/in-progress.
- Green не используется для brand, primary navigation или decorative glow.
- Slate-blue не является темой или CTA: он разрешён только для информационного status и всегда сопровождается иконкой/текстом.
- Red не используется для ordinary attention: warning остаётся amber.
- Primary button и danger button никогда не имеют одинаковый вес рядом.
- Status нельзя передавать только цветом: всегда label/icon/текст.
- Gradients не являются фоном canvas или каждой карточки; допустимы только poster/media placeholders.

## Индикаторы статуса в текущем статическом шаблоне

Разделы выше описывают целевую токенную систему; этот раздел — конкретный контракт для **текущего** статического HTML/CSS/JS-шаблона (`admin/index.html`, `admin/app.js`, `admin/styles.css`), не для будущего React-переноса. Читать перед тем, как добавлять новый индикатор статуса или трогать цвет существующего.

### Один источник истины для тона

Единственное место, которое решает, какой смысл (`success` / `warning` / `danger` / `info` / `accent` / `neutral`) получает статус — функции `toneForStatus(value)` и `labelForStatus(value)` в `admin/app.js`. Любой новый статус (новое значение `job.status`, `anime.status` и т.д.) добавляется ТОЛЬКО туда, одной строкой в оба объекта. Компонент, который рисует статус, обязан получать тон через `toneForStatus(...)`, а не задавать цвет литералом (`status("Текст", "info")` вручную допустим только для строк, у которых в принципе нет соответствующего status-значения — и даже тогда тон должен быть выбран по этой же таблице смыслов, а не на глаз).

### Компоненты, которые обязаны совпадать по цвету на один и тот же тон

| Класс | Где используется | Тон берётся из |
| --- | --- | --- |
| `.status-badge` + `.status-badge--{tone}` | таблицы, drawer, карточки, service-state | `toneForStatus`/`labelForStatus` |
| `.status-dot--{ok,warning,danger}` | health-ribbon, live-индикаторы | вручную, но только success/warning/danger |
| `.job-glyph--{running,success,failed}` | иконка задачи в строке таблицы | `job.status` |
| `.decision-icon--{warning,info,danger}` | очередь решений | явный тон каждой строки очереди |
| `.event-icon--{success,warning,info}` | список уведомлений (notification-popover) | явный тон каждой записи |
| `.queue-breakdown__segment--*`, `.status-strip__segment--*` | composition-полоски | тот же тон, что у соответствующего badge/label рядом |
| `.nav-badge--warning` | счётчик в сайдбаре | всегда amber, независимо от `.is-active` состояния пункта меню |

Правило простое: если два места на экране показывают один и тот же смысл («идёт выполнение», «нужна проверка», «ошибка»), они обязаны вычислять одинаковый `getComputedStyle(...).color`. Это можно проверить в браузере (DevTools → Computed) или скриптом, сравнивающим цвета всех элементов с этими классами по всем экранам — так были найдены и исправлены реальные расхождения в этом шаблоне (см. ниже).

### Известная ловушка каскада — почему цвета расходятся сами по себе

`admin/styles.css` — один большой файл, накопивший несколько поколений правок. У части классов (например `.job-glyph--running`, `.status-badge--*`, `.event-icon--info`, `.nav-badge`) в файле исторически оказалось по 2–4 объявления в разных местах. CSS не «складывает» их — при равной специфичности побеждает **последнее по тексту файла** объявление, независимо от того, где стоит правило, которое выглядит «главным». Из-за этого в шаблоне реально были случаи, когда:

1. У одного класса было 3 конфликтующих определения цвета (`.job-glyph--running`), и реально применялось не то, которое выглядело «актуальным» при чтении сверху вниз.
2. Общий селектор для подписи вида `.card span { color: var(--text-secondary); }` случайно перекрывал `.status-badge` того же тона — потому что бейдж сам является `<span>` и лежит внутри `.card`, а специфичность `.card span` (класс + тег) выше специфичности `.status-badge--success` (один класс). Так `.service-state span` и `.backup-overview > article > span` глушили цвет success/warning бейджей внутри себя.
3. Более специфичное состояние (`.nav-item.is-active .nav-badge`) перекрывало тон варианта (`.nav-badge--warning`) просто потому что специфичность выше — счётчик становился фиолетовым, когда его пункт меню активен, хотя смысл («нужно решение») не менялся.

**Перед тем как добавлять/менять цвет индикатора:**

- `grep -n "\.имя-класса" admin/styles.css` — посмотреть, сколько раз класс уже определён. Если больше одного — правь **все** вхождения или удаляй мёртвые, не добавляй ещё одно.
- Не пиши общий селектор вида `.контейнер span`/`.контейнер > *` для стилизации подписи, если внутри контейнера может оказаться `.status-badge`, `.section-kicker`, `.job-glyph`, `.event-icon` или другой тон-компонент — он тоже `<span>` и попадёт под тот же селектор. Самый надёжный вариант — `span:not([class])` (простая безымянная подпись без своего класса), а не перечислять исключения по одному через `:not(.status-badge)`: список руками легко забыть дополнить, когда рядом появится ещё один новый тон-компонент (так уже было — `:not(.status-badge)` в `.backup-overview` не спас `.section-kicker`, оказавшийся в том же контейнере).
- Состояние (`:hover`, `.is-active`, `.is-selected`) не должно менять цвет, у которого уже есть самостоятельный смысл (warning/danger/success/accent-как-running). Если нужно показать «активный пункт», меняй фон/иконку/обводку контейнера, а не перекрашивай вложенный тон-бейдж.
- После правки — проверь реальный `getComputedStyle` в паре мест, где встречается тот же тон, не только там, где ты его редактировал.

## Правила иерархии из UX-референсов

- Destructive confirmation всегда красный; brand/accent не маскирует удаление, stop или ban.
- Иконка сопровождается подписью, если действие нельзя однозначно распознать без контекста. Icon-only control обязан иметь accessible name и tooltip.
- Radio применяется для одного выбора, checkbox — для независимого множественного выбора; switch — только для непосредственного boolean state.
- Поле всегда имеет видимый label. Placeholder показывает пример, но не объясняет назначение поля.
- Длинная form разделяется смысловыми headings, а не плоским набором inputs.
- Название действия короткое и конкретное: `Удалить`, `Заменить связь`, `Остановить`, а не абстрактное `Продолжить`.
- В одном контексте есть один визуально главный action; secondary и danger не конкурируют с ним.

## Контраст и состояния

Минимальные цели:

- body text — WCAG AA 4.5:1;
- large text/icons/controls — 3:1;
- focus ring — видим на canvas, surface и sidebar;
- disabled — контраст снижается, но label остаётся читаемым;
- placeholder не заменяет label;
- hover не является единственным признаком интерактивности.

Проверять контраст автоматикой и вручную после каждого изменения токенов. Не считать вычисленный token contrast доказательством для текста поверх media/gradient.

## Типографика

- `Manrope` — body, controls, tables и длинный русский текст.
- `Outfit` — page title, крупные числа и короткие product headings.
- `Space Grotesk` — IDs, timestamps, API fields и telemetry, но не абзацы.
- Production подключает шрифты через `next/font`; standalone хранит лицензированные woff2 локально.

Рекомендуемые production размеры:

| Уровень       | Размер / line-height | Правило                       |
| ------------- | -------------------- | ----------------------------- |
| Page title    | 28–34 / 1.1          | максимум две строки на mobile |
| Section title | 18–22 / 1.2          | один смысловой блок           |
| Card title    | 14–16 / 1.3          | не uppercase                  |
| Body          | 14–16 / 1.5          | основной текст                |
| Table         | 13–14 / 1.35         | плотный, но доступный         |
| Metadata      | 11–12 / 1.4          | не ниже 11 px в production    |

Standalone-прототип визуально уменьшен для обзорных screenshots; при переносе не копировать его пиксельные размеры вслепую — использовать production scale и проверить информационную плотность.

## Геометрия и ритм

- base spacing: 4 px; рабочие интервалы 8/12/16/24/32;
- controls: 36–40 px desktop, минимум 44 px touch target на mobile;
- table row: 48–56 px desktop;
- radius: 4/8/12 px из общего `tokens.css`;
- border: 1 px; elevation создаётся сочетанием границы и мягкой тени;
- sidebar остаётся спокойным и постоянным, active item отмечается left rail + background, а не яркой pill;
- page heading не превращается в marketing hero внутри admin.

## Компоненты

Единственная foundation — source-owned shadcn/UI components на Radix:

- Button, IconButton, Badge/Status, Input, Textarea, Select, Checkbox, Switch;
- FormField/FormMessage, Dialog/AlertDialog, Drawer/Sheet;
- Popover, DropdownMenu, Tooltip, Tabs, Command;
- Table/DataGrid shell, Pagination, Skeleton, EmptyState, ErrorState;
- Toast через Sonner;
- charts через Recharts только в admin и только для реальных series.

Все variants используют semantic tokens, единый focus contract и consistent icon sizes. Feature code не создаёт собственные dialog/toast/button systems.

## Information architecture dashboard

1. Page heading объясняет объект и даёт максимум два primary-level actions.
2. Summary показывает только реально доступные totals/snapshots/series.
3. Filter toolbar отделяет query state от mutations.
4. Table/card list сохраняет сравнимость ключевых полей.
5. Drawer — inspect/read context; Dialog — short decision/confirmation; отдельная page — длинная form/workflow.
6. Bulk bar появляется только после selection и показывает impact/count.
7. Unsupported/gap не прячется: `Not probed`, `Read-only`, `Backend gap`, `Unknown`.

## Формы

- Form schema строится по create/update DTO, не по list/detail response.
- Label, description и error имеют стабильные IDs/association.
- Backend field errors маппятся в конкретные поля; form-level error содержит request ID.
- Save button не сообщает success до успешного response.
- Dirty navigation guard используется для длинных editors.
- URL format validation не называется stream/availability check.
- Dangerous changes показывают точный target, impact и необратимость.

## Data/request states

| State   | Требование                                                      |
| ------- | --------------------------------------------------------------- |
| Loading | skeleton сохраняет геометрию; controls корректно disabled       |
| Empty   | предметная причина и только поддерживаемое следующее действие   |
| Error   | сообщение, retry при допустимости, request ID; не пустой список |
| Stale   | старые данные явно помечены; mutation risk ограничен            |
| Partial | отсутствующий provider/field отделён от успешной части          |
| Unknown | не заменяется `0`, green или synthetic score                    |
| Success | только после подтверждённого response                           |

## Motion

- CSS — hover/focus/short layout transitions.
- Motion (`motion/react`) — dialog/drawer presence, один public hero reveal, intentional list transition.
- Duration обычно 120–220 ms; easing consistency важнее эффектности.
- Никаких background animation loops в dashboard.
- Indeterminate animation применяется только при реально неизвестном progress.
- `prefers-reduced-motion` отключает transforms, loops и nonessential reveals.

## Responsive

- 1440+: полный sidebar и широкие tables.
- 1024–1439: collapsible sidebar, сохранение ключевых columns.
- 768–1023: off-canvas navigation, grids в 1–2 колонки.
- 360–767: mobile dock/drawer, forms в один столбец, dialogs как sheet при необходимости.
- Таблица становится domain cards только если сравнительная структура не теряется; иначе — доступный horizontal scroll с явным контекстом.
- Проверять long Russian labels, 200% zoom, software keyboard и safe areas.

## Public adaptation

Public site использует те же colors, typography, controls, overlays и states, но:

- media/posters получают больше площади;
- borders и operational metadata становятся спокойнее;
- Server Components обеспечивают полноценный first response;
- authenticated interactions остаются малыми islands;
- один выразительный visual moment допустим на home/auth, но не повторяется на каждом viewport;
- player имеет отдельный high-contrast control layer, не зависит от surface palette страницы.

## Анти-паттерны

- generic AI dashboard с одинаковыми bento cards;
- огромный hero в admin;
- glassmorphism поверх таблиц;
- gradient text и sparkles как brand substitute;
- synthetic trend/chart из одной точки;
- live indicator без реального live source;
- hidden destructive action в icon-only menu без label/confirmation;
- перенос hardcoded sample values в production;
- второй theme engine или component runtime из внешнего каталога.


## Уточнение оформления · 2 сентября 2026

Общие цвета, шрифты, радиусы и интервалы находятся в корневом `tokens.css`. Оба интерфейса импортируют этот файл; при переносе сохраняйте структуру каталогов. Секции различаются заголовками, отступами и разделителями. Самостоятельные рамки остаются у интерактивных карточек, таблиц, форм и диалогов. Не добавляйте декоративные панели вокруг текста или каждого показателя. Метаданные — от 12 px; обычные управляющие подписи — 14 px. Разделы главной разделены интервалом 64 px, заголовок и содержимое — 24 px.

Без размытого стекла и декоративных теней на карточках. Градиенты допустимы над изображением для читаемости текста. Контент не скрывается до анимации прокрутки. Технические пояснения для разработчика размещайте в документации; в интерфейсе оставляйте сведения, нужные для действия пользователя.
