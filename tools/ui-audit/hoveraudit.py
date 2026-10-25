import asyncio
from playwright.async_api import async_playwright
GET = r"""()=>{const out=[];let i=0;for(const el of document.querySelectorAll('button,a,[role=button],summary')){const r=el.getBoundingClientRect();if(r.width<8||r.height<8||r.bottom<0||r.top>innerHeight||r.left>innerWidth)continue;const c=getComputedStyle(el);if(c.visibility==='hidden'||c.display==='none')continue;if((el.innerText||'').trim().length)continue;if(!el.querySelector('svg,i,span'))continue;el.dataset.kzA=String(i);out.push(i++)}return out}"""
CHECK = r"""(i)=>{const el=document.querySelector(`[data-kz-a="${i}"]`);if(!el)return null;const c=getComputedStyle(el);const vis=x=>x&&x!=='rgba(0, 0, 0, 0)'&&x!=='transparent';const p=vis(c.backgroundColor)||c.backgroundImage!=='none'||(parseFloat(c.borderTopWidth)>0&&vis(c.borderTopColor))||(c.boxShadow!=='none');return p?(el.tagName+'.'+(el.getAttribute('class')||'')).slice(0,60)+(el.getAttribute('aria-label')?' «'+el.getAttribute('aria-label').slice(0,30)+'»':''):null}"""
async def run(pg,url,seen):
    await pg.goto('http://127.0.0.1:4173/'+url); await pg.wait_for_timeout(900)
    ids=await pg.evaluate(GET)
    for i in ids:
        loc=pg.locator(f'[data-kz-a="{i}"]')
        try:
            await loc.hover(timeout=800); await pg.wait_for_timeout(120)
            r=await pg.evaluate(CHECK,i)
            if r: seen.add(url.split('#')[0]+' HOVER '+r)
        except Exception: pass
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); seen=set()
        for w in (390,768,1024,1440):
            pg=await b.new_page(viewport={'width':w,'height':900})
            await pg.add_init_script("localStorage.setItem('kitsu-theme','dark');localStorage.setItem('kitsu-admin-theme','dark')")
            for u in ['public/','public/anime.html','admin/','admin/#/catalog/titles','admin/#/parser/run','admin/#/people/users','admin/#/queues/moderation','admin/#/stand/backups','admin/#/parser/schedule','admin/#/settings']:
                await run(pg,u,seen)
            await pg.close()
        print('\n'.join(sorted(seen)) or 'CLEAN')
        await b.close()
asyncio.run(main())
