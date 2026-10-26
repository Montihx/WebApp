"""Экраны и состояния админки v5 для UI-аудитов.

Выезжающих панелей нет: записи открываются отдельными страницами, серии, источники
и расписание правятся раскрытием строки, аватары и рамки — в диалоге по центру."""
ROUTES = ['/pult', '/catalog/titles', '/catalog/import', '/catalog/episodes', '/catalog/collections',
          '/queues/moderation', '/queues/conflicts', '/queues/comments',
          '/parser/run', '/parser/jobs', '/parser/schedule', '/parser/logs', '/parser/blacklist',
          '/stand/checks', '/stand/resources', '/stand/backups', '/stand/audit',
          '/people/users', '/people/access', '/people/cosmetics',
          '/settings', '/settings/site', '/settings/import', '/settings/updates', '/settings/images',
          '/settings/texts', '/settings/taxonomy', '/settings/stopwords', '/settings/player',
          '/settings/notify', '/settings/network',
          # Страницы записей: обычный тайтл, тайтл на модерации без постера, новый, идущая задача, пользователь.
          '/catalog/titles/monster', '/catalog/titles/ghost-in-the-shell-2026', '/catalog/titles/new',
          '/parser/jobs/7c2e9a41-6d08-4b3f-a2c5-1e9f0b7d3a90', '/parser/jobs/e5c8a0d4-9f3b-4cb4-85e7-0a9f4b6d2f45',
          '/people/users/u-1', '/people/users/u-3']

# (маршрут, селектор, имя): раскрывает правку на месте или открывает диалог.
OVERLAYS = [
    ('/catalog/titles/dandadan-2', "[data-action='toggle-episode'][data-id='e-1']", 'episode-inline'),
    ('/catalog/titles/dandadan-2?ep=e-1', "[data-action='toggle-release']", 'release-inline'),
    ('/catalog/titles/monster', "[data-action='toggle-episode'][data-id='new']", 'episode-new'),
    ('/parser/schedule', "[data-action='toggle-schedule'][data-id='new']", 'schedule-new'),
    ('/parser/schedule', "[data-action='toggle-schedule'][data-id='s-2']", 'schedule-edit'),
    ('/people/cosmetics', "[data-action='edit-cosmetic']", 'cosmetic'),
    ('/settings/import', "[data-action='apply-preset']", 'preset-savebar'),
    ('/parser/run', "[data-op='kodik:full_sync']", 'confirm'),
    ('/pult', "[data-action='cmdk']", 'cmdk'),
]


async def each_overlay(pg, fn):
    """Открывает каждое состояние по очереди и вызывает fn(name)."""
    for route, selector, name in OVERLAYS:
        await pg.evaluate("window.KitsuAdmin && (window.KitsuAdmin.state.dirty = false)")
        await pg.evaluate(f"location.hash='#{route}'")
        await pg.wait_for_timeout(400)
        await pg.locator(selector).first.click()
        await pg.wait_for_timeout(400)
        await fn(name)
        await pg.keyboard.press('Escape')
        await pg.wait_for_timeout(300)
