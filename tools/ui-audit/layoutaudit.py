import asyncio, json, sys
from playwright.async_api import async_playwright
JS = r"""()=>{
const vw=document.documentElement.clientWidth, issues=[];
const name=el=>{let s=el.tagName.toLowerCase(); const c=(el.getAttribute('class')||'').trim().split(/\s+/).filter(Boolean).slice(0,2).join('.'); if(c)s+='.'+c; const t=(el.innerText||el.getAttribute('aria-label')||'').trim().replace(/\s+/g,' ').slice(0,28); return s+(t?' «'+t+'»':'')};
const visible=el=>{const r=el.getBoundingClientRect(); if(r.width<2||r.height<2) return false; const c=getComputedStyle(el); return c.visibility!=='hidden'&&c.display!=='none'&&parseFloat(c.opacity)>0.05};
const inScroller=el=>{for(let p=el.parentElement;p&&p!==document.body;p=p.parentElement){const c=getComputedStyle(p); if(/(auto|scroll)/.test(c.overflowX)&&p.scrollWidth>p.clientWidth+1) return true; if(c.position==='fixed') return true;} return false};
const hiddenByAncestor=el=>{if(el.closest('details:not([open]) > :not(summary)'))return true;for(let p=el.parentElement;p;p=p.parentElement){if(p.closest('[hidden],dialog:not([open]),[aria-hidden="true"]'))return true; const c=getComputedStyle(p); if(c.display==='none'||c.visibility==='hidden')return true;} return false};
if(document.documentElement.scrollWidth>vw+1) issues.push('PAGE overflow '+document.documentElement.scrollWidth);
for(const el of document.body.querySelectorAll('*')){
  if(['SCRIPT','STYLE','SVG','PATH','svg','path','circle','rect','g','defs','stop','linearGradient','radialGradient','ellipse','use','line','polyline','polygon'].includes(el.tagName))continue;
  if(!visible(el)||hiddenByAncestor(el))continue;
  const r=el.getBoundingClientRect(); const c=getComputedStyle(el);
  // off right edge
  if(r.right>vw+1 && r.left<vw && !inScroller(el) && c.position!=='fixed') issues.push('OFFSCREEN '+name(el)+' right='+Math.round(r.right));
  // text overflow (not intended ellipsis/scroll)
  const hasText=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim().length>1);
  if(hasText && el.scrollWidth>el.clientWidth+2 && c.overflowX==='visible' && c.textOverflow!=='ellipsis' && !/(auto|scroll)/.test(c.overflowX) && c.display!=='inline') issues.push('TEXT-OVERFLOW '+name(el)+' '+el.scrollWidth+'>'+el.clientWidth);
  // clipped text: overflow hidden w/o ellipsis and content larger
  if(hasText && c.overflow==='hidden' && c.textOverflow!=='ellipsis' && !c.webkitLineClamp?.match(/\d/) && (el.scrollWidth>el.clientWidth+2||el.scrollHeight>el.clientHeight+3) && !el.closest('.sr-only')) issues.push('CLIPPED '+name(el)+' '+el.scrollWidth+'x'+el.scrollHeight+' in '+el.clientWidth+'x'+el.clientHeight);
  // buttons wrapping: a single text node breaking onto 2+ lines
  if((el.tagName==='BUTTON'||el.matches('a.button,.button,[role=tab],a.section-link,.genre-links a,.hero-tags a'))){
    for(const n of el.querySelectorAll('*')) {}
    const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT); let n;
    while((n=walker.nextNode())){ if(n.textContent.trim().length<2)continue; const range=document.createRange(); range.selectNodeContents(n); const tops=new Set([...range.getClientRects()].filter(x=>x.width>1).map(x=>Math.round(x.top))); if(tops.size>1){issues.push('BTN-WRAP '+name(el)+' «'+n.textContent.trim().slice(0,24)+'» w='+Math.round(r.width)); break;} }
  }
}
// overlapping text leaves
const isFixed=el=>{for(let p=el;p&&p!==document.body;p=p.parentElement){if(getComputedStyle(p).position==='fixed')return true}return false};
const leaves=[...document.body.querySelectorAll('h1,h2,h3,h4,p,span,strong,small,b,a,button,time,label,li')].filter(el=>visible(el)&&!hiddenByAncestor(el)&&!isFixed(el)&&[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&!el.closest('.sr-only,[aria-hidden="true"]'));
const boxes=leaves.map(el=>{const range=document.createRange(); range.selectNodeContents(el); return {el,rs:[...range.getClientRects()].filter(x=>x.width>2&&x.height>2)}});
for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j]; if(a.el.contains(b.el)||b.el.contains(a.el))continue;
  for(const x of a.rs)for(const y of b.rs){const ix=Math.min(x.right,y.right)-Math.max(x.left,y.left), iy=Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top); if(ix>3&&iy>3){const fa=getComputedStyle(a.el).position, fb=getComputedStyle(b.el).position; issues.push('OVERLAP '+name(a.el)+' ⟂ '+name(b.el)); break;}}}
return [...new Set(issues)].slice(0,60)}"""
WIDTHS=[int(w) for w in sys.argv[1].split(',')] if len(sys.argv)>1 else [320,360,390,430,768,1024,1280,1440,1920]
ADMIN=['overview','catalog','episodes','releases','collections','assets','anime-editor','episode-editor','release-editor','parsers','imports','conflicts','scheduler','parser-settings','moderation','users','monitoring','settings','backups','audit']
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        for theme in ['dark']:
          for w in WIDTHS:
            pg=await b.new_page(viewport={'width':w,'height':900})
            await pg.add_init_script("localStorage.setItem('kitsu-theme','dark');localStorage.setItem('kitsu-admin-theme','dark')")
            await pg.emulate_media(reduced_motion='reduce')
            for url in ['public/','public/anime.html','public/anime.html?title=steins-gate']:
                await pg.goto('http://127.0.0.1:4173/'+url); await pg.wait_for_timeout(1200)
                res=await pg.evaluate(JS)
                if res: print(f'[{w}] {url}\n  '+'\n  '.join(res))
            await pg.goto('http://127.0.0.1:4173/admin/'); await pg.wait_for_timeout(900)
            for v in ADMIN:
                await pg.evaluate(f"location.hash='#{v}'"); await pg.wait_for_timeout(450)
                res=await pg.evaluate(JS)
                if res: print(f'[{w}] admin#{v}\n  '+'\n  '.join(res))
            await pg.close()
        await b.close()
asyncio.run(main())
