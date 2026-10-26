import asyncio
from admin_routes import ROUTES, each_overlay
from playwright.async_api import async_playwright
JS = r"""()=>{const out=new Map();const vis=c=>c&&c!=='rgba(0, 0, 0, 0)'&&c!=='transparent';
const check=(el,pseudo)=>{const c=getComputedStyle(el,pseudo); if(pseudo&&(c.content==='none'||c.content==='normal'))return; if(c.display==='none')return;
 const r=el.getBoundingClientRect(); let w=r.width,h=r.height; if(pseudo){w=parseFloat(c.width)||0;h=parseFloat(c.height)||0;}
 if(w<4||h<4)return;
 const painted=vis(c.backgroundColor)||c.backgroundImage!=='none'||(parseFloat(c.borderTopWidth)>0&&vis(c.borderTopColor))||(c.boxShadow!=='none'&&!c.boxShadow.includes('inset')&&false);
 if(!painted)return;
 const rad=parseFloat(c.borderTopLeftRadius)||0; const rr=c.borderTopLeftRadius;
 const round = rr.includes('%')? parseFloat(rr)>=40 : rad>=Math.min(w,h)/2-1.5 && rad>=8;
 if(!round)return;
 const key=(el.tagName.toLowerCase()+'.'+(el.getAttribute('class')||'').trim().split(/\s+/).slice(0,2).join('.')+(pseudo||'')).slice(0,70);
 out.set(key, Math.round(w)+'x'+Math.round(h)+' r='+rr);};
for(const el of document.querySelectorAll('body *')){ if(el.closest('svg'))continue; check(el,null); check(el,'::before'); check(el,'::after'); }
return [...out.entries()].map(([k,v])=>k+' '+v)}"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        seen={}
        for w in (320,390,768,1024,1440,1920):
          for theme in ('dark',):
            pg=await b.new_page(viewport={'width':w,'height':900})
            await pg.add_init_script(f"localStorage.setItem('kitsu-theme','{theme}');localStorage.setItem('kitsu-admin-theme','{theme}')")
            for u in ['public/','public/anime.html','public/anime.html?title=steins-gate']:
                await pg.goto('http://127.0.0.1:4173/'+u); await pg.wait_for_timeout(1000)
                for x in await pg.evaluate(JS): seen.setdefault(x.split(' ')[0],(u,x))
            await pg.goto('http://127.0.0.1:4173/admin/'); await pg.wait_for_timeout(800)
            for v in ROUTES:
                await pg.evaluate(f"location.hash='#{v}'"); await pg.wait_for_timeout(350)
                for x in await pg.evaluate(JS): seen.setdefault(x.split(' ')[0],('admin#'+v,x))
            async def over(name):
                for x in await pg.evaluate(JS): seen.setdefault(x.split(' ')[0],('admin overlay '+name,x))
            await each_overlay(pg, over)
            await pg.close()
        for k,(u,x) in sorted(seen.items()): print(u.ljust(28), x)
        await b.close()
asyncio.run(main())
