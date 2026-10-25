import asyncio
from playwright.async_api import async_playwright
JS=r"""()=>{const out=new Set();const vis=c=>c&&c!=='rgba(0, 0, 0, 0)'&&c!=='transparent';
for(const el of document.querySelectorAll('button,a')){const r=el.getBoundingClientRect(); if(r.width<8)continue; const c=getComputedStyle(el); if(c.display==='none'||c.visibility==='hidden')continue;
 const txt=(el.innerText||'').trim(); if(txt.length>0)continue; if(!el.querySelector('svg'))continue;
 const painted=vis(c.backgroundColor)||c.backgroundImage!=='none'||(parseFloat(c.borderTopWidth)>0&&vis(c.borderTopColor));
 if(painted) out.add((el.tagName+'.'+(el.getAttribute('class')||'')).slice(0,60))}
return [...out]}"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        for w in (320,390,768,1024,1440,1920):
            pg=await b.new_page(viewport={'width':w,'height':900})
            await pg.add_init_script("localStorage.setItem('kitsu-theme','dark');localStorage.setItem('kitsu-admin-theme','dark')")
            for u in ['public/','public/anime.html','admin/','admin/#catalog','admin/#parsers','admin/#users']:
                await pg.goto('http://127.0.0.1:4173/'+u); await pg.wait_for_timeout(1000)
                r=await pg.evaluate(JS)
                if r: print(w,u,r)
            await pg.close()
        await b.close()
asyncio.run(main())
