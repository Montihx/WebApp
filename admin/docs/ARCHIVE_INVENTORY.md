# Контроль полноты архива

Этот ZIP — полный автономный проект, а не набор отдельных правок. Он открывается через `index.html` без сборки и сети.

## Исполняемые файлы

- `index.html` — shell, overlays, theme metadata и локальные подключения.
- `styles.css` — обе темы, component states, responsive и reduced-motion rules.
- `app.js` — 20 маршрутов, навигация, drawers, dialogs, forms и проверяемые interaction contracts.
- `vendor/lucide.min.js` — локальный bundle иконок; рядом находится лицензия.

## Локальные ресурсы

- `fonts/` — Manrope Cyrillic/Latin, Outfit и Space Grotesk в `woff2`.
- `fonts/*-LICENSE.txt` — лицензии всех семейств.
- `vendor/LUCIDE-LICENSE.txt` — лицензия Lucide.

## Проверка и эталоны

- `qa-results.json` — машинный результат 80 route checks и 184 interaction checks.
- `screenshots/` — 18 dark/light desktop/mobile эталонов ключевых экранов.
- `MANIFEST.sha256` — хэши каждого файла архива, кроме самого manifest.

## Документация для переноса

- `AGENT_HANDOFF.md` — обязательные правила проверки кода и Definition of Done.
- `docs/CODEX_MIGRATION_RUNBOOK.md` — последовательность production-переноса.
- `docs/ROUTE_ACTION_MATRIX.md` — backend methods, paths, gates и ограничения.
- `docs/FUNCTIONAL_COVERAGE.md` — что подтверждено и чего в backend нет.
- `docs/REPOSITORY_AUDIT.md`, `docs/PROJECT_ALIGNMENT.md` — evidence проекта.
- `docs/DESIGN_SYSTEM.md`, `docs/VISUAL_REFERENCE_ANALYSIS.md`, `docs/UI_REFERENCE_AUDIT.md` — визуальные правила и provenance решений.
- `docs/STACK_DECISION.md`, `docs/IMPLEMENTATION_PLAN.md` — целевой стек и фазы.
- `docs/SITE_TEMPLATE_ROADMAP.md` — перенос единой системы на публичный сайт.
- `docs/QA_CHECKLIST.md`, `docs/QA_REPORT.md` — gates и выполненная проверка.

## Защита от неполного архива

Перед передачей:

1. Сверить число файлов в каталоге и ZIP.
2. Убедиться, что ZIP содержит `app.js`, `styles.css`, все fonts/vendor assets, docs, QA JSON и screenshots.
3. Запустить `sha256sum -c MANIFEST.sha256` из корня распакованного проекта.
4. Запустить `node --check app.js`.
5. Открыть `index.html` и повторить route/interaction QA.

Нулевые файлы, symlinks, временные заглушки, `TODO` handlers и внешние runtime-зависимости в финальный ZIP не допускаются.
