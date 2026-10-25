import asyncio, re
from playwright.async_api import async_playwright
pat=re.compile('[\U0001F300-\U0001FAFF☀-➿⬀-⯿←-⇿⌀-⏿️★☆✓✔✖✗▶◀▲▼]')
JS="""()=>{let t=document.body.innerText; for(const el of document.querySelectorAll('*')){for(const ps of ['::before','::after']){const c=getComputedStyle(el,ps).content; if(c&&c!=='none'&&c!=='normal'&&!c.startsWith('url')) t+=' '+c}} for(const el of document.querySelectorAll('[aria-label],[title],[placeholder]')) t+=' '+(el.getAttribute('aria-label')||'')+(el.getAttribute('title')||'')+(el.getAttribute('placeholder')||''); return t}"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1440,'height':900}); found=set()
        for u in ['public/','public/anime.html','public/anime.html?title=steins-gate','index.html']:
            await pg.goto('http://127.0.0.1:4173/'+u); await pg.wait_for_timeout(900)
            for ch in pat.findall(await pg.evaluate(JS)): found.add((u,ch,hex(ord(ch))))
        await pg.goto('http://127.0.0.1:4173/admin/'); await pg.wait_for_timeout(800)
        for v in ['overview','catalog','episodes','releases','collections','assets','anime-editor','episode-editor','release-editor','parsers','imports','conflicts','scheduler','parser-settings','moderation','users','monitoring','settings','backups','audit']:
            await pg.evaluate(f"location.hash='#{v}'"); await pg.wait_for_timeout(300)
            for ch in pat.findall(await pg.evaluate(JS)): found.add(('admin#'+v,ch,hex(ord(ch))))
        print(sorted(found) or 'CLEAN'); await b.close()
asyncio.run(main())
