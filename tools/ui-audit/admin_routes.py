"""Экраны и наложения админки v4 для UI-аудитов."""
ROUTES = ['/pult', '/catalog/titles', '/catalog/import', '/catalog/episodes', '/catalog/collections',
          '/queues/moderation', '/queues/conflicts', '/queues/comments',
          '/parser/run', '/parser/jobs', '/parser/schedule', '/parser/logs', '/parser/blacklist',
          '/stand/checks', '/stand/resources', '/stand/backups', '/stand/audit',
          '/people/users', '/people/access', '/people/cosmetics', '/settings']

# (маршрут, селектор кнопки, имя): открывает панель или диалог.
OVERLAYS = [
    ('/catalog/titles', "[data-action='edit-title']", 'title-editor'),
    ('/catalog/titles', "[data-action='new-title']", 'title-new'),
    ('/catalog/episodes', "[data-action='open-episode']", 'episode'),
    ('/parser/jobs', "[data-action='open-job']", 'job'),
    ('/parser/schedule', "[data-action='new-schedule']", 'schedule'),
    ('/people/users', "[data-action='open-user']", 'user'),
    ('/people/cosmetics', "[data-action='edit-cosmetic']", 'cosmetic'),
    ('/parser/run', "[data-op='kodik:full_sync']", 'confirm'),
    ('/pult', "[data-action='cmdk']", 'cmdk'),
]


async def each_overlay(pg, fn):
    """Открывает каждое наложение по очереди и вызывает fn(name)."""
    for route, selector, name in OVERLAYS:
        await pg.evaluate(f"location.hash='#{route}'")
        await pg.wait_for_timeout(350)
        await pg.locator(selector).first.click()
        await pg.wait_for_timeout(400)
        await fn(name)
        await pg.keyboard.press('Escape')
        await pg.wait_for_timeout(300)
