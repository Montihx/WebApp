import asyncio
from admin_routes import ROUTES, each_overlay
from playwright.async_api import async_playwright
JS=r"""()=>{
const parse=s=>{const m=s.match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(/[ ,\/]+/).filter(Boolean).map(Number);return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}};
const lum=c=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b)};
const blend=(top,bot)=>({r:top.r*top.a+bot.r*(1-top.a),g:top.g*top.a+bot.g*(1-top.a),b:top.b*top.a+bot.b*(1-top.a),a:1});
const out=new Set();
for(const el of document.querySelectorAll('body *')){
 if(!['P','SPAN','A','BUTTON','STRONG','SMALL','B','H1','H2','H3','H4','LABEL','LI','TIME','DD','DT','TD','TH','KBD','EM','SUMMARY'].includes(el.tagName))continue;
 const own=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim().length>1); if(!own)continue;
 const r=el.getBoundingClientRect(); if(r.width<2||r.height<2)continue;
 const c=getComputedStyle(el); if(c.visibility==='hidden'||parseFloat(c.opacity)<0.3)continue;
 if(c.webkitTextFillColor==='rgba(0, 0, 0, 0)'||c.color==='rgba(0, 0, 0, 0)')continue;
 let fg=parse(c.webkitTextFillColor&&c.webkitTextFillColor!==c.color?c.webkitTextFillColor:c.color); if(!fg)continue;
 // walk up for background; stop (unknown) on images/gradients
 let bgs=[],unknown=false;
 for(let p=el;p&&p!==document.body&&p!==document.documentElement;p=p.parentElement){const pc=getComputedStyle(p); if(pc.position==='fixed'&&false)break; if(pc.backgroundImage!=='none'&&!pc.backgroundImage.startsWith('url("data:image/svg+xml')){unknown=true;break} const b=parse(pc.backgroundColor); if(b&&b.a>0){bgs.push(b); if(b.a>=0.99)break}}
 // Active tab text sits on the sliding .tab-indicator (a gradient sibling), not on its ancestors.
 if(el.closest('.tab.is-active')&&el.closest('.tab.is-active').parentElement.querySelector(':scope > .tab-indicator'))unknown=true;
 if(unknown)continue;
 const cv=getComputedStyle(document.documentElement).getPropertyValue('--canvas').trim(); const hx=cv.replace('#',''); let bg={r:parseInt(hx.slice(0,2),16),g:parseInt(hx.slice(2,4),16),b:parseInt(hx.slice(4,6),16),a:1};
 for(let i=bgs.length-1;i>=0;i--) bg=blend(bgs[i],bg);
 if(fg.a<1) fg=blend(fg,bg);
 const L1=lum(fg),L2=lum(bg); const ratio=(Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);
 const big=parseFloat(c.fontSize)>=24||(parseFloat(c.fontSize)>=18.6&&parseInt(c.fontWeight)>=700);
 if(ratio<(big?3:4.5)) out.add(ratio.toFixed(2)+' '+(el.tagName+'.'+(el.getAttribute('class')||'')).slice(0,45)+' «'+(el.innerText||'').trim().slice(0,24)+'»');
}
return [...out]}"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); seen={}
        for theme in ('dark','light'):
          for pal in ('sakura','obsidian'):
            pg=await b.new_page(viewport={'width':1440,'height':900})
            await pg.add_init_script(f"localStorage.setItem('kitsu-theme','{theme}');localStorage.setItem('kitsu-admin-theme','{theme}');localStorage.setItem('kitsu-palette','{pal}')")
            await pg.emulate_media(reduced_motion='reduce')
            for u in ['','public/','public/anime.html','public/anime.html?title=steins-gate']:
                await pg.goto('http://127.0.0.1:4173/'+u); await pg.wait_for_timeout(900)
                for x in await pg.evaluate(JS): seen.setdefault(x.split(' ',1)[1],[]).append(f'{theme}/{pal} {u or "root"} {x.split(" ")[0]}')
            await pg.goto('http://127.0.0.1:4173/admin/'); await pg.wait_for_timeout(800)
            for v in ROUTES:
                await pg.evaluate(f"location.hash='#{v}'"); await pg.wait_for_timeout(300)
                for x in await pg.evaluate(JS): seen.setdefault(x.split(' ',1)[1],[]).append(f'{theme}/{pal} admin#{v} {x.split(" ")[0]}')
            async def over(name):
                for x in await pg.evaluate(JS): seen.setdefault(x.split(' ',1)[1],[]).append(f'{theme}/{pal} admin overlay {name} {x.split(" ")[0]}')
            await each_overlay(pg, over)
            await pg.close()
        for k,v in sorted(seen.items()): print(k, '|', v[0], f'(+{len(v)-1})')
        if not seen: print('CLEAN')
        await b.close()
asyncio.run(main())
