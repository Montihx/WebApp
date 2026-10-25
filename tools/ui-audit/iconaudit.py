import asyncio
from admin_routes import ROUTES, each_overlay
from playwright.async_api import async_playwright
JS = r"""()=>{const out=[];const vis=c=>c&&c!=='rgba(0, 0, 0, 0)'&&c!=='transparent';
for(const svg of document.querySelectorAll('svg')){
  for(const el of [svg, svg.parentElement]){
    if(!el||el.offsetParent===null&&getComputedStyle(el).position!=='fixed')continue;
    const r=el.getBoundingClientRect(); if(r.width<8||r.width>64||r.height>64)continue;
    const txt=(el.textContent||'').trim(); if(el!==svg&&txt.length>3)continue;
    const c=getComputedStyle(el);
    const bg=vis(c.backgroundColor)||c.backgroundImage!=='none'; const bd=parseFloat(c.borderTopWidth)>0&&vis(c.borderTopColor); const sh=c.boxShadow!=='none';
    if(bg||bd||sh){out.push((el.tagName+'.'+(el.getAttribute('class')||'')).slice(0,60)+' '+Math.round(r.width)+'x'+Math.round(r.height)+(bg?' bg':'')+(bd?' border':'')+(sh?' shadow':''));}
  }}
return [...new Set(out)]}"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1440,'height':900})
        await pg.add_init_script("localStorage.setItem('kitsu-theme','dark');localStorage.setItem('kitsu-admin-theme','dark')")
        for url in ['public/','public/anime.html?title=steins-gate']:
            await pg.goto('http://127.0.0.1:4173/'+url); await pg.wait_for_timeout(1500)
            print(url, await pg.evaluate(JS))
        await pg.goto('http://127.0.0.1:4173/admin/'); await pg.wait_for_timeout(1000)
        allv=set()
        for v in ROUTES:
            await pg.evaluate(f"location.hash='#{v}'"); await pg.wait_for_timeout(500)
            for x in await pg.evaluate(JS): allv.add(v+': '+x)
        async def over(name):
            for x in await pg.evaluate(JS): allv.add('overlay '+name+': '+x)
        await each_overlay(pg, over)
        print('\n'.join(sorted(allv)))
        await b.close()
asyncio.run(main())
