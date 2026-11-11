/* Alchemy page: recipes from data/alchemy.json, hourly AH prices from data/prices.json
   + data/history.json (written by the "AH prices" GitHub Action). */
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const load=(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}};
const store=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const money=c=>{if(c==null||isNaN(c))return '—';c=Math.round(c);const neg=c<0;c=Math.abs(c);const g=Math.floor(c/1e4),s=Math.floor(c/100)%100,cc=c%100;
 return (neg?'-':'')+(g?g+'g ':'')+(g||s?s+'s':'')+(!g&&cc?(s?' ':'')+cc+'c':'')||'0c'};
const AH_CUT=0.95;
// rough vendor prices, only used until the hourly job has read the real ones
const VENDOR_FALLBACK={'Empty Vial':4,'Leaded Vial':40,'Crystal Vial':400};

let A=null,PR=null,H=null,SRC='';
const S={tab:load('alc-tab','top'),skill:load('alc-skill',null),sort:'profit',dir:-1,filters:load('alc-filters',{can:true,profit:true}),cat:'All',q:'',farm:load('alc-farm',false),
 open:null,topSort:'price',bags:load('alc-bags',{}),shop:load('alc-shop',[['Free Action Potion',5]]),bought:load('alc-bought',{})};

/* ---------- prices ---------- */
function syncedPrices(){ // fallback: prices from the ForeverGuide addon sync, if any
 let best=null;for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(!/^fg-sync-/.test(k))continue;
  const d=load(k,null);if(d&&d.pr&&d.pr.length&&(!best||d.t>best.t))best=d}
 if(!best)return null;const items={};best.pr.forEach(([n,v])=>items[n]={mkt:v,min:v,qty:null});
 return {updated:best.t,realm:best.r,items,vendor:{},synced:true};
}
const sell=n=>{const it=PR&&PR.items[n];return it?(it.mkt||it.min||null):null};
const qtyOf=n=>{const it=PR&&PR.items[n];return it?it.qty:null};
const vendor=n=>(PR&&PR.vendor&&PR.vendor[n])||VENDOR_FALLBACK[n]||null;
const RECIPE={};
// cheapest way to get a mat: vendor, AH, or crafting it yourself (e.g. Blackmouth Oil)
function matCost(n,depth=0){
 if(S.farm&&A.herbs.includes(n))return {c:0,how:'farmed'};
 const v=vendor(n);if(v!=null)return {c:v,how:'vendor'};
 const ah=sell(n);let best=ah!=null?{c:ah,how:'AH'}:null;
 const r=RECIPE[n];
 if(r&&depth<2){const cc=recipeCost(r,depth+1);if(cc.c!=null&&(!best||cc.c<best.c))best={c:cc.c,how:'craft it'}}
 return best||{c:null,how:'no price'};
}
function recipeCost(r,depth=0){let c=0,known=true;const parts=r.m.map(([q,n])=>{const m=matCost(n,depth);if(m.c==null)known=false;else c+=q*m.c;return {q,n,...m}});
 return {c:known?c:null,parts}}
function calc(r){const s=sell(r.n),cost=recipeCost(r);const profit=s!=null&&cost.c!=null?s*AH_CUT-cost.c:null;
 return {s,cost:cost.c,parts:cost.parts,profit,margin:profit!=null&&cost.c?profit/cost.c*100:null,qty:qtyOf(r.n)}}
const skill=()=>S.skill??150;
const canMake=r=>r.sk<=skill();

/* ---------- history helpers ---------- */
const hist=n=>(H&&H.p&&H.p[n])||[];
function change(n,hours){const h=hist(n).filter(v=>v!=null);if(h.length<2)return null;const now=h[h.length-1],then=h[Math.max(0,h.length-1-hours)];return then?(now-then)/then*100:null}
function spark(vals,col){vals=vals.filter(v=>v!=null);if(vals.length<2)return '<div class="note">trend shows after a few hourly updates</div>';
 const w=150,h=36,mx=Math.max(...vals),mn=Math.min(...vals);
 const pts=vals.map((v,i)=>`${(i*(w/(vals.length-1))).toFixed(1)},${(h-((v-mn)/((mx-mn)||1))*h).toFixed(1)}`).join(' ');
 return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="price trend"><polyline points="${pts}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>`}
// "might jump": supply drying up, steady climb, or a weekday spike
function jumpSignals(n){
 if(!H||!H.t||H.t.length<24)return null;
 const p=hist(n),q=(H.q&&H.q[n])||[],why=[];
 const qs=q.filter(v=>v!=null),qNow=qs[qs.length-1],qAvg=qs.reduce((a,b)=>a+b,0)/(qs.length||1);
 if(qs.length>=24&&qAvg>=5&&qNow<qAvg*0.5)why.push(`Only ${qNow} on the AH (usually ~${Math.round(qAvg)})`);
 const days=[];for(let i=p.length;i>0;i-=24){const d=p.slice(Math.max(0,i-24),i).filter(v=>v!=null).sort((a,b)=>a-b);if(d.length)days.unshift(d[Math.floor(d.length/2)])}
 if(days.length>=3){const l=days.slice(-3);if(l[0]<l[1]&&l[1]<l[2])why.push('Price up 3 days in a row')}
 if(H.t.length>=24*6){const by={};H.t.forEach((t,i)=>{const v=p[i];if(v==null)return;const d=new Date(t*1000).getDay();(by[d]=by[d]||[]).push(v)});
  const avg=a=>a.reduce((x,y)=>x+y,0)/a.length,all=avg(p.filter(v=>v!=null));const tmr=(new Date().getDay()+1)%7;
  if(by[tmr]&&avg(by[tmr])>all*1.1)why.push(`Usually spikes on ${['Sundays','Mondays','Tuesdays','Wednesdays','Thursdays','Fridays','Saturdays'][tmr]}`)}
 if(!why.length)return null;
 const high=Math.max(...p.filter(v=>v!=null));return {why,high};
}

/* ---------- 1. top sellers ---------- */
function renderTop(){
 const list=A.recipes.map(r=>({r,...calc(r)})).filter(x=>x.s!=null);
 const key={price:x=>x.s,listed:x=>x.qty||0,jump:x=>change(x.r.n,24)??-1e9}[S.topSort];
 list.sort((a,b)=>key(b)-key(a));
 const cards=list.slice(0,8).map((x,i)=>{const ch=change(x.r.n,24);const col=ch==null?'#a7a0a5':ch>=0?'#7fd8a8':'#ff8f8f';
  return `<div class="card ${i===0?'first':''}"><div class="mrow"><span class="soft" style="font-weight:700">#${i+1}</span><span class="soft" style="font-size:11.5px">${x.r.pvp?'PvP':''}${x.qty!=null?` · ${x.qty} on AH`:''}</span></div>
  <div style="font-size:15.5px;font-weight:600">${esc(x.r.n)}</div>
  <div style="display:flex;align-items:baseline;gap:10px"><span class="big">${money(x.s)}</span>${ch!=null?`<span style="font-weight:700;font-size:13px;color:${col}">${ch>=0?'+':''}${ch.toFixed(0)}% 24h</span>`:''}</div>
  ${spark(hist(x.r.n).slice(-24),col)}</div>`}).join('');
 const jumps=list.map(x=>({x,j:jumpSignals(x.r.n)})).filter(o=>o.j).slice(0,3);
 const jc=jumps.map(({x,j})=>`<div class="card jump"><div class="mrow"><span style="font-size:15.5px;font-weight:600">${esc(x.r.n)}</span><span class="badge lock">MIGHT JUMP</span></div>
  <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><span class="big" style="font-size:22px">${money(x.s)}</span>${j.high>x.s*1.03?`<span class="soft" style="font-size:13px">7-day high</span><span class="up" style="font:700 18px 'Space Grotesk',Inter,sans-serif">${money(j.high)}</span>`:''}</div>
  ${spark(hist(x.r.n),'#ffb26b')}<div class="lbl" style="color:var(--soft)">WHY</div><ul style="margin:0;padding-left:18px;font-size:13px">${j.why.map(w=>`<li>${esc(w)}</li>`).join('')}</ul>
  <div class="note" style="margin-top:2px">Tip: craft or buy now, list when it peaks.</div></div>`).join('');
 const enough=H&&H.t&&H.t.length>=24;
 $('[data-p=top]').innerHTML=`<h2>Top sellers</h2><p class="sub">The priciest potions on your AH right now, and which way they're heading.</p>
 <div class="chips">${chip('Price','topSort','price')}${chip('Most listed','topSort','listed')}${chip('Biggest jump (24h)','topSort','jump')}</div>
 ${list.length?`<div class="cards">${cards}</div>`:'<div class="callout">No prices yet.</div>'}
 <div class="sec"><div><h3 style="color:var(--warn)">Might jump soon</h3><div class="sub">Guesses, not promises: supply drying up, a price that keeps climbing, or one that spikes on certain days.</div></div><span class="soft" style="font-size:12px">from the last 7 days of hourly prices</span></div>
 ${jc?`<div class="cards three" style="margin-top:12px">${jc}</div>`:`<div class="callout">${enough?'Nothing looks ready to jump right now. Check back after the next few updates.':'Needs about a day of hourly prices before it can spot anything. It fills in on its own.'}</div>`}`;
 document.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{S[b.dataset.k]=b.dataset.v;renderTop()});
}

/* ---------- 2. profit board ---------- */
const CATS=['All','Potion','Elixir','Flask','Oil','Other'];
function renderProfit(){
 let rows=A.recipes.map(r=>({r,...calc(r)}));
 const f=S.filters,q=S.q.trim().toLowerCase();
 rows=rows.filter(x=>(!f.can||canMake(x.r))&&(!f.pvp||x.r.pvp)&&(!f.profit||(x.profit!=null&&x.profit>0))&&(S.cat==='All'||x.r.c===S.cat)
  &&(!q||x.r.n.toLowerCase().includes(q)||x.r.m.some(([,m])=>m.toLowerCase().includes(q))));
 const key={name:x=>x.r.n,skill:x=>x.r.sk,sell:x=>x.s??-1e12,cost:x=>x.cost??1e12,profit:x=>x.profit??-1e12,margin:x=>x.margin??-1e12,qty:x=>x.qty??-1}[S.sort];
 rows.sort((a,b)=>{const ka=key(a),kb=key(b);return (ka>kb?1:ka<kb?-1:0)*S.dir});
 const th=(k,t,n)=>`<th class="${n?'n':''}" data-sort="${k}">${t}${S.sort===k?(S.dir<0?' ▾':' ▴'):''}</th>`;
 const body=rows.map(x=>{const r=x.r,open=S.open===r.n,pc=x.profit==null?'soft':x.profit>0?'up':'down';
  let h=`<tr class="row ${open?'open':''}" data-r="${esc(r.n)}"><td><div class="pname">${esc(r.n)}${canMake(r)?'<span class="badge ok">CAN MAKE</span>':`<span class="badge lock">NEEDS ${r.sk}</span>`}</div><div class="psub">Alchemy ${r.sk} · ${r.c}${r.pvp?' · PvP':''}</div></td>
  <td class="n">${money(x.s)}</td><td class="n soft">${money(x.cost)}</td><td class="n ${pc}" style="font-weight:700">${money(x.profit)}</td><td class="n ${pc}">${x.margin!=null?x.margin.toFixed(0)+'%':'—'}</td><td class="n soft">${x.qty!=null?x.qty+' on AH':'—'}</td></tr>`;
  if(open){const mats=x.parts.map(p=>`<div class="mrow"><span>${p.q}× ${esc(p.n)}</span><span class="soft">${p.how}${p.c!=null?' · '+money(p.c)+' each':''}</span><span>${p.c!=null?money(p.c*p.q):'—'}</span></div>`).join('');
   h+=`<tr class="open"><td colspan="6" style="padding:0 10px 12px"><div class="detail"><div><div class="lbl">MATS (CHEAPEST WAY)</div>${mats}</div>
   <div><div class="lbl">THE MATH</div><div style="font-size:13px;line-height:1.7">Sells for <b>${money(x.s)}</b> − 5% AH cut = <b>${money(x.s!=null?x.s*AH_CUT:null)}</b><br>Mats cost <b>${money(x.cost)}</b><br>Profit each: <b class="${pc}">${money(x.profit)}</b>${x.profit!=null?` · a stack of 5 makes <b class="${pc}">${money(x.profit*5)}</b>`:''}</div>
   <div class="note">Recipe: ${esc(r.src||'unknown')}</div></div></div></td></tr>`}
  return h}).join('');
 $('[data-p=profit]').innerHTML=`<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap"><div><h2>Profit board</h2><p class="sub">Every alchemy recipe: sell price vs what the mats cost right now. Tap a row for the breakdown.</p></div>
 <label class="search"><span class="soft" style="font-size:13px">Search</span><input id="q" value="${esc(S.q)}" placeholder="potion or herb…"></label></div>
 <div class="chips">${fchip('Can make now','can')}${fchip('PvP potions','pvp')}${fchip('Profitable only','profit')}
 <select id="cat" aria-label="Category">${CATS.map(c=>`<option ${c===S.cat?'selected':''}>${c}</option>`).join('')}</select>
 <span class="r">Mats: <button class="chip" data-farm="0" aria-pressed="${!S.farm}">Buy everything</button><button class="chip" data-farm="1" aria-pressed="${S.farm}">I farm my herbs</button></span></div>
 <div class="box" style="overflow-x:auto"><table><thead><tr>${th('name','POTION')}${th('sell','SELLS FOR',1)}${th('cost','MATS COST',1)}${th('profit','PROFIT EACH',1)}${th('margin','MARGIN',1)}${th('qty','ON THE AH',1)}</tr></thead><tbody>${body||'<tr><td colspan="6" class="soft">Nothing matches those filters.</td></tr>'}</tbody></table></div>
 <div class="note">Sell price = typical price of the cheapest listings. Mat cost uses whichever is cheaper: the AH, the vendor, or crafting it yourself. Red = you'd lose money. ${rows.length} recipes shown.</div>`;
 const qi=$('#q');qi.oninput=e=>{S.q=e.target.value;renderProfit();const n=$('#q');n.focus();n.setSelectionRange(n.value.length,n.value.length)};
 $('#cat').onchange=e=>{S.cat=e.target.value;renderProfit()};
 document.querySelectorAll('[data-farm]').forEach(b=>b.onclick=()=>{S.farm=b.dataset.farm==='1';store('alc-farm',S.farm);renderAll()});
 document.querySelectorAll('th[data-sort]').forEach(t=>t.onclick=()=>{const k=t.dataset.sort;if(S.sort===k)S.dir*=-1;else{S.sort=k;S.dir=k==='name'||k==='skill'||k==='cost'?1:-1}renderProfit()});
 document.querySelectorAll('tr.row').forEach(t=>t.onclick=()=>{S.open=S.open===t.dataset.r?null:t.dataset.r;renderProfit()});
 document.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{S.filters[b.dataset.f]=!S.filters[b.dataset.f];store('alc-filters',S.filters);renderProfit()});
}
function fchip(t,k){return `<button class="chip" data-f="${k}" aria-pressed="${!!S.filters[k]}">${t}</button>`}
function chip(t,k,v){return `<button class="chip" data-k="${k}" data-v="${v}" aria-pressed="${S[k]===v}">${t}</button>`}

/* ---------- 3. craft or sell raw ---------- */
function herbBest(h){ // best recipe you can make that uses this herb, value per herb
 let best=null;
 A.recipes.forEach(r=>{if(!canMake(r))return;const use=r.m.find(([,m])=>m===h);if(!use)return;const s=sell(r.n);if(s==null)return;
  let other=0,ok=true;r.m.forEach(([q,m])=>{if(m===h)return;const c=matCost(m);if(c.c==null)ok=false;else other+=q*c.c});if(!ok)return;
  const per=(s*AH_CUT-other)/use[0];if(!best||per>best.per)best={r,per,uses:use[0]}});
 return best;
}
function renderRaw(){
 const herbs=A.herbs.map(h=>({h,raw:sell(h),best:herbBest(h)})).filter(x=>x.raw!=null||x.best);
 const rows=herbs.map(x=>{const craft=x.best&&(x.raw==null||x.best.per>x.raw*AH_CUT);
  return `<tr><td style="font-size:15px">${esc(x.h)}</td><td class="n">${money(x.raw)}</td><td class="soft">${x.best?esc(x.best.r.n):'none you can make'}</td><td class="n" style="font-weight:700">${x.best?money(x.best.per):'—'}</td>
  <td class="n"><span class="verdict ${craft?'up':'pvp'}" style="border-color:currentColor">${craft?'CRAFT':'SELL RAW'}</span></td></tr>`}).join('');
 let plan=[],craftTotal=0,rawTotal=0;
 Object.entries(S.bags).forEach(([h,n])=>{n=+n||0;if(!n)return;const raw=sell(h),b=herbBest(h);const rv=raw!=null?raw*AH_CUT*n:0;rawTotal+=rv;
  if(b&&(raw==null||b.per>raw*AH_CUT)){const k=Math.floor(n/b.uses);plan.push(`Craft <b>${k} ${esc(b.r.n)}</b> (uses ${k*b.uses} ${esc(h)})`);craftTotal+=k*b.uses*b.per+(n-k*b.uses)*(raw||0)*AH_CUT}
  else{plan.push(`Sell <b>${n} ${esc(h)}</b> raw`);craftTotal+=rv}});
 $('[data-p=raw]').innerHTML=`<h2>Craft or sell raw?</h2><p class="sub">For each herb: is it worth more sold as-is, or turned into a potion you can make? "Per herb as a potion" = the potion's profit after its other mats, split across the herbs it uses.</p>
 <div class="grid2"><div class="box" style="overflow-x:auto"><table><thead><tr><th>HERB</th><th class="n">SELL RAW</th><th>BEST POTION</th><th class="n">PER HERB AS A POTION</th><th class="n">DO THIS</th></tr></thead><tbody>${rows||'<tr><td colspan="5" class="soft">No prices yet.</td></tr>'}</tbody></table></div>
 <div style="display:flex;flex-direction:column;gap:12px"><div class="side hl"><div class="lbl">MY BAGS</div><p class="sub" style="margin-bottom:8px">Type how many of each you're carrying.</p>
  <div class="bag">${A.herbs.map(h=>`<label for="b-${esc(h)}">${esc(h)}</label><input id="b-${esc(h)}" data-bag="${esc(h)}" type="number" min="0" value="${S.bags[h]||''}" placeholder="0">`).join('')}</div></div>
  <div class="side" style="font-size:14px;line-height:1.7"><div class="lbl">BEST PLAN FOR THOSE</div>${plan.length?plan.join('<br>')+`<div style="margin-top:6px">Total: <b class="up">${money(craftTotal)}</b> vs <b>${money(rawTotal)}</b> selling everything raw</div>`:'<span class="soft">Fill in your bags above.</span>'}</div></div></div>`;
 document.querySelectorAll('[data-bag]').forEach(i=>i.onchange=()=>{const v=+i.value||0;if(v)S.bags[i.dataset.bag]=v;else delete S.bags[i.dataset.bag];store('alc-bags',S.bags);renderRaw()});
}

/* ---------- 4. shopping list ---------- */
function renderShop(){
 const picks=S.shop.filter(([n])=>RECIPE[n]);const need={};let cost=0,rev=0,ok=true;
 picks.forEach(([n,k])=>{const x=calc(RECIPE[n]);if(x.s!=null)rev+=x.s*AH_CUT*k;else ok=false;
  RECIPE[n].m.forEach(([q,m])=>{need[m]=(need[m]||0)+q*k})});
 const matRows=Object.entries(need).sort((a,b)=>a[0].localeCompare(b[0])).map(([m,q])=>{const c=matCost(m);if(c.c!=null)cost+=c.c*q;else ok=false;const done=S.bought[m];
  return `<div class="mats ${done?'done':''}"><input type="checkbox" data-bought="${esc(m)}" ${done?'checked':''} aria-label="Bought ${esc(m)}"><span>${esc(m)}</span><span class="n" style="text-align:right">×${q}</span><span class="soft" style="text-align:right">${c.c!=null?money(c.c)+(c.how==='vendor'?' (vendor)':''):'no price'}</span><span style="text-align:right">${c.c!=null?money(c.c*q):'—'}</span></div>`}).join('');
 const opts=A.recipes.filter(r=>!picks.some(([n])=>n===r.n)).map(r=>`<option>${esc(r.n)}</option>`).join('');
 $('[data-p=shop]').innerHTML=`<h2>Shopping list</h2><p class="sub">Pick what you want to craft and how many. It adds up the mats, what they cost right now, and what you'll make.</p>
 <div class="grid2b"><div class="side"><div class="lbl" style="padding-top:2px">I WANT TO CRAFT</div>
 ${picks.map(([n,k],i)=>{const x=calc(RECIPE[n]);return `<div class="pick"><div><div style="font-size:15px">${esc(n)}</div><div class="psub">profit ${money(x.profit)} each</div></div>
  <div class="step"><button data-dq="${i}" data-d="-1" aria-label="Fewer">−</button><span>${k}</span><button data-dq="${i}" data-d="1" aria-label="More">+</button></div><button class="ghostbtn" data-rm="${i}">Remove</button></div>`}).join('')}
 <label class="fld" style="margin-top:12px"><select id="add" style="flex:1"><option value="">+ Add a potion…</option>${opts}</select></label>
 <div class="tot"><div><small>MATS COST</small><b>${money(cost)}</b></div><div><small>SELLS FOR</small><b>${money(rev)}</b></div><div class="hl"><small>PROFIT</small><b class="${rev-cost>=0?'up':'down'}">${money(rev-cost)}</b></div></div>
 ${ok?'':'<div class="note">Some prices are missing, so the totals are incomplete.</div>'}</div>
 <div class="side"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><span class="lbl">MATS TO BUY</span><button class="btn" id="copy">Copy list</button></div>
 <div class="mats h"><span></span><span>ITEM</span><span style="text-align:right">QTY</span><span style="text-align:right">EACH</span><span style="text-align:right">TOTAL</span></div>${matRows||'<div class="note">Add a potion to see what to buy.</div>'}
 <div class="note">Tick things off as you buy them. "Copy list" copies it as text you can paste anywhere.</div></div></div>`;
 document.querySelectorAll('[data-dq]').forEach(b=>b.onclick=()=>{const p=S.shop[+b.dataset.dq];p[1]=Math.max(1,p[1]+ +b.dataset.d);store('alc-shop',S.shop);renderShop()});
 document.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{S.shop.splice(+b.dataset.rm,1);store('alc-shop',S.shop);renderShop()});
 $('#add').onchange=e=>{if(e.target.value){S.shop.push([e.target.value,1]);store('alc-shop',S.shop);renderShop()}};
 document.querySelectorAll('[data-bought]').forEach(c=>c.onchange=()=>{if(c.checked)S.bought[c.dataset.bought]=1;else delete S.bought[c.dataset.bought];store('alc-bought',S.bought);renderShop()});
 $('#copy').onclick=()=>{const txt=Object.entries(need).map(([m,q])=>`${m} x${q}`).join('\n');navigator.clipboard&&navigator.clipboard.writeText(txt).then(()=>{$('#copy').textContent='Copied!';setTimeout(()=>{const b=$('#copy');if(b)b.textContent='Copy list'},1200)})};
}

/* ---------- shell ---------- */
function ago(t){const m=Math.round((Date.now()/1000-t)/60);return m<1?'just now':m<60?m+' min ago':m<1440?Math.round(m/60)+' hr ago':Math.round(m/1440)+' days ago'}
function header(){
 const f=$('#freshness'),w=$('#waiting');
 if(!PR){f.innerHTML='<span class="dot none"></span>No prices yet';w.hidden=false;
  w.innerHTML='<b>Waiting for the first hourly price update.</b> Once the Blizzard keys are added to the site, prices fill in every hour on their own. Recipes and mats already work below.';return}
 const age=(Date.now()/1000-PR.updated)/60;
 f.innerHTML=`<span class="dot ${age>130?'old':''}"></span>${PR.synced?'Prices from your addon sync':'Prices updated'} ${ago(PR.updated)}${PR.synced?'':' · every hour'}${PR.realm?' · '+esc(PR.realm)+(PR.faction?' '+esc(PR.faction):''):''}`;
 w.hidden=!PR.synced;if(PR.synced)w.innerHTML='<b>Using prices from your last addon sync</b> until the hourly prices are set up.';
}
function renderAll(){header();renderTop();renderProfit();renderRaw();renderShop()}
function showTab(t){S.tab=t;store('alc-tab',t);document.querySelectorAll('.tab').forEach(b=>b.setAttribute('aria-selected',b.dataset.t===t));document.querySelectorAll('[data-p]').forEach(p=>p.hidden=p.dataset.p!==t)}
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>showTab(b.dataset.t));
const getJSON=u=>fetch(u+'?v='+Date.now()).then(r=>r.ok?r.json():null).catch(()=>null);
Promise.all([getJSON('data/alchemy.json'),getJSON('data/prices.json'),getJSON('data/history.json')]).then(([a,p,h])=>{
 A=a;A.recipes.forEach(r=>RECIPE[r.n]=r);PR=p||syncedPrices();H=h;
 if(S.skill==null){const sync=[...Array(localStorage.length).keys()].map(i=>localStorage.key(i)).filter(k=>/^fg-sync-/.test(k)).map(k=>load(k,null)).filter(Boolean);
  const al=sync.flatMap(d=>d.prof||[]).find(x=>/alchemy/i.test(x.n));S.skill=al?al.r:150}
 const sk=$('#skill');sk.value=S.skill;sk.onchange=()=>{S.skill=+sk.value||1;store('alc-skill',S.skill);renderAll()};
 renderAll();showTab(S.tab);
});
