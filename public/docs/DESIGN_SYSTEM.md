# Design system — Anime Graphite Public

## Принцип

Anime Graphite строит иерархию контрастом нейтральных поверхностей, типографикой и плотностью. Brand accent обозначает выбор и фокус, но не окрашивает всю страницу. Публичный интерфейс получает больше постеров и воздуха, сохраняя dashboard-токены.

## Основные токены

| Роль | Dark | Light | Использование |
| --- | --- | --- | --- |
| Canvas | `#0D0D0F` | `#F5F4F2` | фон страницы |
| Sidebar/header | `#111113` | `#FBFAF9` | навигационные поверхности |
| Surface | `#19191C` | `#FFFFFF` | карточки, панели, dialogs |
| Raised | `#212124` | `#F7F5F4` | вложенные блоки |
| Hover | `#27272B` | `#EFEDEC` | интерактивный hover |
| Border | `#2E2E33` | `#DEDADD` | обычная граница |
| Text | `#F3F2F4` | `#252225` | основной текст |
| Secondary | `#B9B6BC` | `#5E5960` | подписи |
| Muted | `#8B8790` | `#746E74` | второстепенные метаданные |
| Accent | `#93658A` | `#5B344F` | selection/focus/identity |
| Primary background | `#ECEAEC` | `#381932` | главное действие |
| Primary foreground | `#171719` | `#FFFFFF` | текст primary |
| Success | `#56AD91` | `#2F7B66` | доступно/готово |
| Warning | `#D0A052` | `#99671C` | внимание |
| Danger | `#DE6D78` | `#B94155` | ошибка/удаление |
| Info | `#7F9FBD` | `#4E789C` | нейтральная информация |

Представительные contrast pairs: dark muted/surface `4.98:1`, light muted/surface `4.97:1`, dark accent-text/canvas `7.50:1`, light primary `15.52:1`.

## Типографика

- Display: Outfit 500–800 с локальным Manrope fallback для кириллицы.
- Body: Manrope 400–700, отдельные Latin/Cyrillic subsets.
- H1 public hero: fluid `clamp`, короткая строка и максимальная визуальная роль.
- Section kicker: маленький uppercase/letter-spacing label; не заменяет настоящий heading.
- Метаданные используют tabular hierarchy, но не имитируют dashboard-таблицу.

## Геометрия

- Базовые радиусы: `7`, `10`, `14`, `18`, `24 px`.
- Максимальная ширина страницы: `1440 px`.
- Page gutter: `clamp(18px, 3vw, 44px)`, на mobile `16 px`.
- Header: `68 px`, на tablet/mobile `60 px`.
- Тени используются только для menus/dialogs и отделения от overlay.

## Компонентные правила

- Primary action один на локальную задачу; secondary не конкурирует с ним.
- Статусы всегда имеют текст или icon + accessible label, а не только цвет.
- Poster cards сохраняют aspect ratio и не меняют высоту при ошибке изображения.
- Source и translation — два отдельных select controls. Quality/type/language — derived metadata.
- Empty state объясняет следующий шаг, но не утверждает, что network error равен пустому ответу.
- Dialog закрывается `Esc`, кликом по backdrop и явной кнопкой; focus остаётся внутри и возвращается вызывающему control.

## Responsive contract

| Ширина | Поведение |
| --- | --- |
| `>1180` | полная desktop navigation, 4-column catalog, двухколоночный player |
| `≤1180` | desktop nav скрыта, уплотнённые сетки |
| `≤920` | mobile drawer, каталог/расписание в одну колонку, player panel под видео |
| `≤720` | fixed bottom navigation, media hero stacked, 3-column poster grid |
| `≤460` | 2-column poster/episode grid, компактные title actions |

Минимальная поддерживаемая ширина — `320 px`. Горизонтальный скролл допустим только в явно обозначенных rails/tabs.

## Motion и доступность

- Короткие transitions `180–240 ms`, только для состояния/иерархии.
- `prefers-reduced-motion` отключает smooth scroll, animation и transition duration.
- Глобальный `:focus-visible` использует `accent-strong` и offset `3 px`.
- Tablist поддерживает arrows, Home и End.
- Icon-only buttons имеют `aria-label`; decorative Lucide icons получают `aria-hidden`.
- Кликабельные элементы не полагаются на hover как единственный способ обнаружения.
