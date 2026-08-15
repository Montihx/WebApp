# Implementation plan

## Этап 0 — подтверждение текущей ветки

- repository instructions, dirty state, baseline tests/screenshots;
- route/DTO/query inventory;
- согласование hybrid owner boundaries.

Выход: обновлённая matrix и список существующих failures.

## Этап 1 — foundations

- Anime Graphite tokens;
- Outfit/Manrope typography;
- Button, IconButton, Surface, Badge, Tabs, Select, Dialog, Popover, Toast;
- theme, focus, reduced motion.

Выход: Storybook/test route или изолированные primitives в обеих темах.

## Этап 2 — public shell

- responsive header;
- search overlay с URL navigation;
- notification popover через существующие queries;
- mobile drawer и bottom navigation.

Выход: shell без fixture data и без изменения route ownership.

## Этап 3 — главная

- Hero;
- ContinueWatching;
- catalog tabs/rails;
- schedule/history merge;
- season и public collections;
- полная loading/error/empty matrix.

Выход: `/` visual parity и production data parity.

## Этап 4 — title information/actions

- SSR hero/details;
- names dialog;
- favorite categories;
- anime notification preferences;
- share and comments anchor.

Выход: `/anime/{slug}` без player regression.

## Этап 5 — player/episodes

- shell вокруг существующего HLS/Kodik runtime;
- source vs translation separation;
- season/episode browser;
- skip, auto-next, speed/quality, fullscreen, progress and error overlays.

Выход: existing player E2E + новые interaction tests зелёные.

## Этап 6 — comments/related/catalog continuation

- comments auth/empty/error/thread states;
- related только из `anime.related`;
- score-sorted catalog fallback имеет собственную подпись и query.

Выход: нет фиктивных recommendations и social data.

## Этап 7 — acceptance

- `360/390/768/1024/1440`, dark/light/system;
- keyboard/screen reader/contrast/reduced motion;
- real empty/error/partial/large datasets;
- build, contract, integration, Playwright and visual diff;
- docs/screenshots updated from actual implementation.
