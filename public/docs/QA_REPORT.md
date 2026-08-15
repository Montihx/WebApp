# QA report — Kitsu Public Anime Graphite

Дата финальной локальной проверки: 14 августа 2026 года.

## Итог

- `24/24` автоматических статических checks — pass;
- `2/2` HTML documents разобраны без parser errors;
- `0` duplicate IDs;
- `0` unresolved `aria-controls`, `aria-labelledby` и label `for` references;
- `0` отсутствующих локальных HTML/CSS assets;
- `0` buttons без явного `type`;
- `0` images без `alt`;
- `0` bare `href="#"`/`javascript:` links;
- CSS: `631` сбалансированный block, `5` media sections;
- responsive gates: `1180`, `920`, `720`, `460 px`, минимальная ширина `320 px`;
- `node --check app.js` — pass;
- `12` локальных font references разрешены;
- `11` ключевых JS interaction families обнаружены QA-script;
- `10` представительных contrast pairs: минимум `4.97:1`.

Полный machine-readable результат: `qa-results.json`. Повторный запуск:

```bash
node --check app.js
node tools/qa.mjs --write
```

## Проверенные сценарии по коду и разметке

- theme persistence и синхронизация `theme-color`;
- global search, keyboard navigation и empty result;
- menus/popovers, outside click и mobile drawer focus;
- catalog/schedule roving tabs;
- bookmark/list/subscription local states;
- dialogs, backdrop/Escape close и focus trap;
- source/translation summary и player controls;
- episode selection, incremental load и grid/list view;
- remote image failure state;
- `prefers-reduced-motion`.

## Контраст

| Pair | Ratio |
| --- | ---: |
| Dark text / canvas | `17.40:1` |
| Dark secondary / surface | `8.75:1` |
| Dark muted / surface | `4.98:1` |
| Dark primary | `14.96:1` |
| Dark accent text / canvas | `7.50:1` |
| Light text / canvas | `14.32:1` |
| Light secondary / surface | `6.83:1` |
| Light muted / surface | `4.97:1` |
| Light primary | `15.52:1` |
| Light accent / canvas | `9.32:1` |

## Ограничение среды

Внутренний browser preview server запустился, но browser runtime не получил к нему доступ. Поэтому в архив намеренно не добавлены неподтверждённые screenshots и не заявлен полноценный visual/interaction browser pass. Это инфраструктурное ограничение, а не обнаруженная ошибка шаблона.

Перед production merge обязательны Chromium/Firefox/WebKit или проектный Playwright на реальном frontend. Минимальная matrix: `360×800`, `390×844`, `768×1024`, `1024×768`, `1440×900`; обе темы; search, drawer, tabs, list/subscription, player, episodes, dialogs, comments; horizontal overflow и console errors.

## Граница результата

Автономный HTML проверяет дизайн, responsive contracts и локальные interaction states. Он не подтверждает production API, auth, HLS/Kodik playback, caching, SSR hydration или mutation rollback. Эти gates выполняются только после переноса в фактическую ветку.
