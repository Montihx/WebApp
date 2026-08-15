# Анализ финальных визуальных референсов

## Что взято из Anixart

Референсы используются как проверка цветовой иерархии, а не как макет для копирования.

- Основная площадь dark состоит из почти чёрного canvas, нейтральных graphite surfaces и тонких серых borders.
- Выбранный пункт навигации получает локальный muted-purple marker/pill; остальные поверхности не окрашиваются в фиолетовый.
- Главный play/action в dark — светлый и высококонтрастный. Brand color не обязан заливать primary-кнопку.
- Изображения и постеры дают интерфейсу естественное цветовое разнообразие; chrome остаётся спокойным.
- Labels, metadata и outlines формируют три уровня контраста без glow и без цветного page background.

При выборочном измерении нейтральных участков референсов доминировали значения около `#0C0C0C–#111111`, `#252525–#2D2D2D`, `#454545`, `#8A8A8A` и `#CDCDCD`. Purple встречался в selected navigation, а не как основная поверхность.

## Что взято из UX/UI e-book

| Наблюдение | Решение в шаблоне |
| --- | --- |
| Destructive action нельзя маскировать brand color | delete, stop, ban и destructive replace используют `button--danger`, красный token и явный глагол |
| Иконке нужен контекст | обычные действия содержат icon + label; icon-only controls имеют `aria-label` и tooltip contract |
| Radio — один выбор, checkbox — несколько | table selection/column picker используют checkbox; boolean settings используют switch; single select остаётся select/radio semantics при переносе |
| Placeholder не заменяет label | все формы и dialog inputs имеют видимые labels; placeholder используется только как пример/search hint |
| Формам нужна иерархия | editors разделены headings и domain sections, а короткие решения остаются в dialog |
| Текст действий должен быть конкретным | `Удалить задачу`, `Заменить связь`, `Остановить задачу`, `Создать расписание` вместо абстрактного `Продолжить` |
| Один главный action | primary, secondary и danger визуально разведены; destructive не окрашен в mauve |

## Что намеренно не переносится

- Чужие assets, логотипы, poster art, bottom-navigation geometry и точная компоновка Anixart.
- Lime headline style из e-book: это оформление обучающего carousel, а не product palette Kitsu.
- Purple/blue gradients как основа light theme.
- Декоративная сетка, glow, glassmorphism и насыщенный brand tint на каждой карточке.

## Финальная цветовая логика

Dark: нейтральные `#0D0D0F → #111113 → #19191C → #212124 → #2D2D32`, светлый primary `#ECEAEC`, mauve marker `#93658A` и контрастный mauve text `#C392B7`.

Light: `#F5F4F2 → #FBFAF9 → #FFFFFF`, нейтральные hover/borders, локальный primary `#381932` и менее тяжёлый marker `#5B344F`.

Semantic palette применяется только по значению: green success, amber warning/unknown, red danger/error, slate-blue info. Ни один status не передаётся только цветом.

## Проверка дальнейших изменений

Перед правкой агент обязан сравнить screenshot с этими критериями:

1. На dark нейтральные pixels визуально доминируют над mauve.
2. На light sidebar и cards не становятся сплошными фиолетовыми блоками.
3. Primary заметен один раз в локальном контексте; danger остаётся красным.
4. Media может быть цветным, но UI chrome не конкурирует с контентом.
5. Малый текст использует text/secondary/muted/accent-text, а не декоративный marker token.
6. Любое отличие сначала проверяется по текущему коду и backend contract, затем обновляется документация.
