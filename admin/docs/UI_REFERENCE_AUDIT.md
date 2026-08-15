# Аудит UI-источников

Проверены официальные каталоги Magic UI, HyperUI, daisyUI, 21st.dev и Aceternity UI. Решение — использовать их как библиотеки приёмов, а не устанавливать пять параллельных design systems.

## Архитектурное решение

Единственная production foundation:

- semantic Kitsu tokens;
- source-owned shadcn/ui components;
- Radix primitives, после подтверждённой миграции — unified `radix-ui`;
- Lucide, Sonner и Motion по отдельным ролям.

Внешний snippet допускается только после копирования в код проекта, удаления чужих theme assumptions и прохождения review gate. Он не получает права вводить второй Button/Dialog/Form/Toast/theme engine.

## Роли источников

| Источник      | Сильная сторона                                                        | Разрешённое применение                                                                        | Не применять                                                                            |
| ------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Magic UI      | copy-paste React/Tailwind/Motion effects и micro-interactions          | один лёгкий number/list/reveal pattern на public home/auth или предметный indeterminate state | marquee, particles, animated borders и glow на каждом admin block                       |
| HyperUI       | спокойная структура application UI, forms, filters, tables, pagination | информационная архитектура плотных admin screens и public catalog controls                    | чужая palette, необработанный markup без a11y, параллельный primitive layer             |
| daisyUI       | semantic component/theme naming                                        | сверка названий roles/states и completeness theme matrix                                      | установка plugin/runtime поверх shadcn, использование готовых classes как второй system |
| 21st.dev      | широкий registry source components и compositions                      | выборочный sidebar/command/empty-state pattern после полной проверки source                   | blind copy, неизвестные dependencies/licenses, AI-generic bento compositions            |
| Aceternity UI | выразительные React/Next/Tailwind/Motion backgrounds и reveals         | максимум один cinematic public hero/auth/empty moment                                         | 3D/glare/beams в tables, forms, destructive flows или monitoring                        |

## Что фактически использовано в prototype

Использованы принципы, а не зависимости:

- HyperUI: чистая hierarchy toolbar → table → pagination, form grouping и адаптивная структура;
- 21st.dev: command palette, collapsible shell и source-owned composition approach;
- daisyUI: semantic roles `primary/success/warning/danger/info`;
- Magic UI: короткая входная/indeterminate motion с reduced-motion fallback;
- Aceternity: изучена граница cinematic-приёмов; в admin финально не перенесён даже ambient effect, чтобы canvas оставался нейтральным.

Ни один внешний пакет из этих пяти не нужен автономному шаблону. Это намеренно снижает dependency drift и сохраняет единый Kitsu visual language.

## Review gate для snippet

Перед production-включением агент обязан ответить и сохранить решение в PR:

1. Какую конкретную пользовательскую задачу pattern улучшает?
2. Почему текущих Kitsu primitives недостаточно?
3. Каков license/provenance исходника на дату копирования?
4. Какие transitive dependencies добавляются и зачем?
5. Работает ли SSR/RSC/hydration без browser-only side effect?
6. Есть ли keyboard navigation, focus management, names, announcements и touch behavior?
7. Работает ли light/dark/high contrast/reduced motion?
8. Что происходит на 360 px, 200% zoom, long Russian text и slow device?
9. Есть ли animation loop, layout shift или заметный bundle cost?
10. Кто владеет forked source и как он будет обновляться?

Если хотя бы один ответ неизвестен, pattern не входит в production PR.

## Визуальный фильтр Kitsu

Pattern отклоняется, если он:

- меняет neutral graphite/white основу на сплошную mauve, lime, cyan или blue theme;
- делает dashboard похожим на generic AI-generated SaaS;
- вводит одинаковые округлые bento cards без информационной причины;
- использует gradient text, sparkles или grid background вместо бренда;
- делает decorative motion заметнее содержания;
- скрывает labels ради icon-only minimalism;
- ухудшает scan speed tables/forms;
- не может объяснить loading/error/empty/partial/unknown states;
- генерирует fake activity, trend или live state.

## Motion budget

- Dashboard: presence/focus/indeterminate only; ноль decorative loops.
- Public home/auth: максимум один заметный effect в первом viewport.
- Card hover: color/border; transform только если не нарушает pointer/focus geometry.
- Duration: преимущественно 120–220 ms.
- Reduced motion: content остаётся полностью понятным без transitions.

## Ссылки для повторной проверки

- Magic UI: https://magicui.design/docs/components
- HyperUI: https://hyperui.dev/
- daisyUI: https://daisyui.com/
- 21st.dev: https://21st.dev/
- Aceternity UI: https://ui.aceternity.com/components

Каталоги и лицензии меняются. Перед копированием открыть конкретную component page заново; этот аудит не заменяет актуальную проверку.
