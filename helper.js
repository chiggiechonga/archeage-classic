/* Shared engine for the leveling guides: sidebar + stop detail (same layout as the
   Claude guides), ForeverGuide addon sync, "right now" list, and the potions calculator.
   Each page defines T, STOPS and CFG before loading this file. */

/* ---------- storage ---------- */
const SKEY='fg-sync-v1', TKEY=CFG.ovKey+'-trained', PKEY='fg-prices-v1';
const load=(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}};
const store=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
let ov=load(CFG.ovKey,{});   // your own taps: key -> true/false
let C=load(SKEY,null);       // last synced character (shared across guide pages)
let trainedLv=load(TKEY,0);  // highest level you've trained at
let prices=load(PKEY,{});    // your AH prices for the potions tab

/* ---------- matching synced quests to route rows ---------- */
const norm=s=>String(s).toLowerCase().replace(/[’'`]/g,'').replace(/…|\.\.\./g,'').replace(/\(.*?\)/g,'').replace(/[^a-z0-9: ]+/g,' ').replace(/\s+/g,' ').trim();
// "WANTED posters", "... chain" etc. aren't real quest names, so they don't block auto-checking
const partsOf=nm=>({chain:nm.includes(' → '),list:nm.split(/ → | · /).map(norm).filter(p=>p&&!/posters|chain$|quests$/.test(p))});
const HUBS=['Lakeshire','Darkshire','Menethil','Thelsamar','Stormwind','Ironforge','Astranaar','Auberdine','Booty Bay','Southshore','Nijel','Theramore','Gadgetzan','Feathermoon','Aerie Peak','Thorium Point','Morgan','Chillwind','Marshal','Everlook','Light\'s Hope','Talonbranch','Nethergarde'];
const nums=s=>(String(s).match(/\d+(\.\d+)?/g)||[]).map(Number);
let IX={log:new Map(),done:new Set()};
function buildIndex(){
 IX={log:new Map(),done:new Set()};
 if(!C)return;
 (C.log||[]).forEach(q=>IX.log.set(norm(q.t),q));
 (C.done||[]).forEach(d=>IX.done.add(norm(d[1])));
}
const ROUTE=new Set();STOPS.forEach(s=>s.q.forEach(x=>partsOf(x[1]).list.forEach(p=>ROUTE.add(p))));

function auto(s,i){
 const [t,nm,wh]=s.q[i];const r={done:false,badge:'',partial:''};
 if(!C)return r;
 if(t==='hearth'){const hub=HUBS.find(h=>(nm+' '+wh).includes(h));if(hub&&String(C.hs).toLowerCase().includes(hub.toLowerCase()))r.done=true;return r}
 if(t==='train'){const n=nums(nm);if(n.length){if(trainedLv>=Math.max(...n))r.done=true;else if(C.lv>=Math.min(...n))r.badge='lv'}return r}
 if(t==='book'||t==='bag')return r;
 const {chain,list}=partsOf(nm);
 if(!list.length)return r;
 const isDone=p=>IX.done.has(p),inLog=p=>IX.log.has(p),ready=p=>IX.log.get(p)?.c===1;
 if(t==='hold')r.done=list.every(p=>isDone(p)||inLog(p));
 else if(t==='turn'&&chain)r.done=list.slice(0,-1).every(isDone);
 else r.done=list.every(isDone);
 if(!r.done){if(list.some(ready))r.badge='ready';else if(list.some(inLog))r.badge='log';
  const n=list.filter(isDone).length;if(list.length>1&&n)r.partial=`${n}/${list.length} done`}
 return r;
}
const qid=(s,i)=>s.id+'-'+i;
const isDoneRow=(s,i)=>{const k=qid(s,i);return k in ov?ov[k]:auto(s,i).done};
const doneCount=s=>s.q.filter((x,i)=>isDoneRow(s,i)).length;
function hereIdx(){const i=STOPS.findIndex(s=>s.q.some((x,i)=>x[0]!=='skip'&&!isDoneRow(s,i)));return i<0?STOPS.length-1:i}

/* ---------- helpers ---------- */
let cur=null;
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const money=m=>{m=Math.round(+m||0);const neg=m<0;m=Math.abs(m);const g=Math.floor(m/1e4),s=Math.floor(m/100)%100,c=m%100;return (neg?'-':'')+((g?g+'g ':'')+(g||s?s+'s ':'')+(c||(!g&&!s)?c+'c':'')).trim()};
const cap=s=>String(s||'').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
function ago(t){if(!t)return'';const m=Math.max(0,Math.round((Date.now()/1000-t)/60));return m<1?'just now':m<60?m+' min ago':m<1440?Math.round(m/60)+' hr ago':Math.round(m/1440)+' days ago'}
const wearing=n=>C&&(C.gear||[]).some(g=>norm(g.n)===norm(n));
const STOPWORDS=new Set(['part','return','east','west','north','south','coast','between','dungeon','inside','road','city','your','first','mount','dual','spec','sleeping','training','heal','with']);

/* ---------- character card ---------- */
function charCard(){
 const el=$('charcard');if(!el)return;
 if(!C){el.innerHTML='<div class="char empty">Not synced yet. Type <b>/fg</b> in game and paste the code in the <b>🔌 Addon + sync</b> tab to see your live next steps.</div>';return}
 const pct=C.xpm?Math.min(100,C.xp/C.xpm*100):0,rpct=C.xpm?Math.min(100-pct,(C.rest||0)/C.xpm*100):0;
 const where=esc(C.zone)+(C.sub&&C.sub!==C.zone?' · '+esc(C.sub):'')+(C.x?` (${C.x}, ${C.y})`:'');
 const other=CFG.cls&&C.cls&&C.cls!==CFG.cls?`<div class="ago" style="color:var(--orange)">Synced character is a ${esc(cap(C.cls))}, this guide is for a ${esc(cap(CFG.cls))}${CFG.otherPage?`. <a href="${CFG.otherPage}" style="color:var(--frost)">Open the ${esc(cap(C.cls))} guide</a>`:''}</div>`:'';
 el.innerHTML=`<div class="char"><div class="cn">${esc(C.n)}</div><div class="cl">Lv ${C.lv} ${esc(cap(C.race))} ${esc(cap(C.cls))}${C.r?' · '+esc(C.r):''}</div>
  <div class="xpbar"><i class="xf" style="width:${pct}%"></i><i class="xr" style="left:${pct}%;width:${rpct}%"></i></div>
  <div class="cl">${Math.round(pct)}% to ${C.lv+1}${C.rest?` · ${Math.round(C.rest/(C.xpm||1)*100)}% rested`:' · no rested'}</div>
  <div class="row"><span>📍</span><span>${where}</span></div>
  <div class="row"><span>⌂</span><span>Hearth: ${esc(C.hs||'?')}</span></div>
  <div class="row"><span>💰</span><span>${money(C.money)}</span></div>
  ${C.bag>=0?`<div class="row"><span>🎒</span><span>${C.bag} bag slots free</span></div>`:''}
  <div class="row"><span>📜</span><span>${(C.log||[]).length} quests in log</span></div>
  <div class="ago">synced ${ago(C.t)}</div>${other}</div>`;
}

/* ---------- right now ---------- */
function rightNow(s){
 if(!C)return `<div class="now"><div class="now-h">▶ RIGHT NOW</div><div class="ni"><span>🔌</span><span>Sync your character to get a live to-do list here: type <span class="kbd">/fg</span> in game, copy the code, then hit <b>🔄 Sync</b> up top.</span></div></div>`;
 const first=[],next=[];
 const L=nums(s.lv),lo=Math.min(...L),hi=Math.max(...L);
 if(C.tp>0)first.push(['🌑',`Spend <b>${C.tp}</b> talent point${C.tp>1?'s':''}. Check the 🌑 Talents tab for the order.`]);
 if(C.lv>=10&&C.lv%2===0&&C.lv>trainedLv)first.push(['✦',`You're <b>Lv ${C.lv}</b>, so you have new ranks to train. ${CFG.trainer} <span class="w">Check off a TRAIN row after, so this goes away.</span>`]);
 (C.log||[]).filter(q=>q.c===1).forEach(q=>{let w='';STOPS.some(st=>st.q.some(x=>{if(partsOf(x[1]).list.includes(norm(q.t))){w=x[2];return true}}));first.push(['?',`Turn in <b>${esc(q.t)}</b>${w?` <span class="w">· ${esc(w)}</span>`:''}`])});
 const hub=HUBS.find(h=>s.hearth.includes(h));
 if(hub&&!String(C.hs).toLowerCase().includes(hub.toLowerCase()))first.push(['⌂',`Your hearth is set to <b>${esc(C.hs||'?')}</b>. This stop wants it at <b>${esc(hub)}</b>.`]);
 const words=(s.zone+' '+s.nm).toLowerCase().replace(/[^a-z' ]+/g,' ').split(' ').filter(w=>w.length>=5&&!STOPWORDS.has(w));
 const zNow=(C.zone+' '+C.sub).toLowerCase();
 if(C.zone&&words.length&&!words.some(z=>zNow.includes(z)))first.push(['🧭',`You're in <b>${esc(C.zone)}</b>. This stop is in <b>${esc(s.zone)}</b>.`]);
 if(C.lv<lo-1)first.push(['⚠️',`You're Lv ${C.lv}, and this stop is ${esc(s.lv)}. Mobs will hit hard, so grind a bit or do the easy quests first.`]);
 if(C.lv>Math.ceil(hi)+1)first.push(['⏩',`You're Lv ${C.lv}, ahead of this stop (${esc(s.lv)}). Grab the gear/dungeon quests and skip the rest.`]);
 if(C.bag>=0&&C.bag<=2)first.push(['🎒',`Only <b>${C.bag}</b> bag slots left. Vendor your grays next time you're in town.`]);
 if((C.log||[]).length>=18)first.push(['📜',`Quest log is <b>${C.log.length}/20</b>. Drop something from the "not on this route" list below.`]);
 if(!C.rest)first.push(['💤',`No rested XP. ${esc(s.rest)}`]);
 const st=STOPS.indexOf(s);
 for(let k=st;k<STOPS.length&&next.length<4;k++){const S=STOPS[k];S.q.forEach((x,i)=>{if(next.length<4&&x[0]!=='skip'&&!isDoneRow(S,i)){const tg=T[x[0]]||T.do;const a=auto(S,i);
  next.push([`<span class="${tg[2]}">${tg[0]}</span>`,`<b>${esc(x[1])}</b>${a.badge==='ready'?'<span class="st st-ready">READY</span>':a.badge==='log'?'<span class="st st-log">IN LOG</span>':''} <span class="w">· ${esc(x[2])}${k!==st?` (stop ${k+1})`:''}</span>`])}})}
 const off=(C.log||[]).filter(q=>!ROUTE.has(norm(q.t)));
 const li=a=>a.map(([i,h])=>`<div class="ni"><span>${i}</span><span>${h}</span></div>`).join('');
 return `<div class="now"><div class="now-h">▶ RIGHT NOW <small>from your sync ${ago(C.t)}</small></div>
  ${first.length?`<div class="nsub">DO THESE FIRST</div>${li(first)}`:''}
  ${next.length?`<div class="nsub">NEXT UP</div>${li(next)}`:'<div class="ni"><span>🎉</span><span>Route done!</span></div>'}
  ${off.length?`<div class="nsub">IN YOUR LOG BUT NOT ON THIS ROUTE</div><div class="ni"><span>×</span><span>${off.map(q=>esc(q.t)+(q.c?' <span class="st st-ready">READY</span>':'')).join(' · ')} <span class="w">· finish them if they're on the way, or abandon them to free up log space.</span></span></div>`:''}
 </div>`;
}

/* ---------- sidebar + detail ---------- */
function sidebar(){
 const h=hereIdx();
 const row=(s,i,cls)=>`<button class="srow ${cls} ${s.id===cur?'on':''}" data-s="${s.id}"><span class="nm"><span>${i<h?'✓':s.ic}</span>${esc(s.nm)}${(()=>{const n=s.q.filter(x=>x[4]).length+s.gear.filter(g=>g[3]).length;return n?`<span class="dn">❄${n}</span>`:''})()}</span><span class="lv">${s.lv}</span></button>`;
 let out=`<div class="grp">▾ DONE</div><button class="srow done" disabled><span class="nm"><span>✓</span>${esc(CFG.doneStub[0])}</span><span class="lv">${CFG.doneStub[1]}</span></button>`;
 STOPS.slice(0,h).forEach((s,i)=>out+=row(s,i,'done'));
 out+='<div class="grp">▾ YOU\'RE HERE</div>'+row(STOPS[h],h,'');
 if(h<STOPS.length-1){out+='<div class="grp">▾ COMING UP</div>';let br='';STOPS.slice(h+1).forEach((s,j)=>{if(CFG.decades){const lv=parseInt(s.lv);const b=lv<30?'20s':lv<40?'30s':lv<50?'40s':'50s';if(b!==br){br=b;out+=`<div class="sub2">${b}</div>`}}out+=row(s,h+1+j,'')})}
 if(CFG.nextStub)out+=`<div class="grp">▾ NEXT PART</div><button class="srow done" disabled><span class="nm"><span>🔒</span>${esc(CFG.nextStub[0])}</span><span class="lv">${CFG.nextStub[1]}</span></button>`;
 $('sidebar').innerHTML=out;
 document.querySelectorAll('.srow[data-s]').forEach(b=>b.onclick=()=>{cur=b.dataset.s;render();if(innerWidth<860)$('detail').scrollIntoView({behavior:'smooth'})});
}
function detail(){
 const s=STOPS.find(x=>x.id===cur);const n=STOPS.indexOf(s)+1;
 const bk=s.q.filter(x=>x[0]==='book'&&!x[1].includes('Turn in')).length,bag=s.q.filter(x=>x[0]==='bag').length,dng=s.q.filter(x=>x[0]==='dng').length,gearN=s.gear.length;
 let h=`<div class="head"><div><h2>${n}. ${esc(s.nm)}</h2><div class="zone">${esc(s.zone)} · <b>Level ${s.lv}</b></div></div>
  <div class="stats"><span>❗ <b>${doneCount(s)}/${s.q.length}</b> Quests</span>${gearN?`<span>🎁 <b>${gearN}</b> Gear</span>`:''}${dng?`<span>◆ <b>${dng}</b> Dungeon</span>`:''}${bag?`<span>🛏 <b>${bag}</b> Bag</span>`:''}${bk?`<span>📚 <b>${bk}</b> Book</span>`:''}</div></div>
  <div class="hearth"><span class="chip">⌂ Hearth: <b>${esc(s.hearth)}</b></span><span class="chip ${s.rdiff?'diff':''}">💤 ${esc(s.rest)}</span>${s.hdiff?`<span class="chip diff">❄ ${esc(s.hdiff)}</span>`:''}</div>`;
 if(n-1===hereIdx())h+=rightNow(s);
 h+=`<div class="sec">QUESTS <small>in order · tap to check off</small></div>`;
 s.q.forEach((x,i)=>{const[t,nm,wh,tip,df]=x;const tg=T[t]||T.do;const k=qid(s,i);const a=auto(s,i);const c=isDoneRow(s,i);
  const badge=c?(a.done&&!(k in ov)?'<span class="st st-sync">✓ SYNCED</span>':''):a.badge==='ready'?'<span class="st st-ready">READY TO TURN IN</span>':a.badge==='log'?'<span class="st st-log">IN LOG</span>':a.badge==='lv'?'<span class="st st-lv">LEVEL READY</span>':'';
  const part=!c&&a.partial?`<span class="st st-part">${a.partial}</span>`:'';
  h+=`<div class="q ${t==='bag'?'bag':''} ${df?'diff':''} ${c?'chk':''}" data-q="${k}" data-s="${s.id}" data-i="${i}"><span class="box">${c?'✓':''}</span><span class="bang ${tg[2]}">${tg[0]}</span><div><div class="n">${esc(nm)}${df?'<span class="mg">❄ MAGE</span>':''}${badge}${part}</div><div class="s">${esc(wh)}</div>${tip?`<div class="tip">💡 ${esc(tip)}</div>`:''}</div><span class="tag ${tg[2]}">${tg[1]}</span></div>`});
 if(s.gear.length){h+=`<div class="sec">GEAR FROM THIS STOP <small>★ = take this one</small></div><div class="cards">`;
  s.gear.forEach((g,i)=>{h+=`<div class="card ${g[3]?'diff':''}"><h3><span class="num">${i+1}</span>${esc(g[0])}${g[3]?'<span class="mg">❄ MAGE</span>':''}<span class="lvq">Lv ${g[1]}</span></h3>`;
   g[2].forEach(it=>{const w=wearing(it[1]);h+=`<div class="it"><div class="icon">${it[0]}</div><div><div class="nm ${it[2]}">${esc(it[1])}</div><div class="ty">${esc(it[3])}</div></div><span class="pick ${w?'wear':''}">${w?'✓ WEARING':it[4]?'★ PICK':''}</span></div>`});
   h+='</div>'});h+='</div><div class="cnote">Item stats in Forever can differ from classic, so hover the reward before picking.</div>'}
 if(s.note)h+=`<div class="box2"><b>Heads up:</b> ${esc(s.note)}</div>`;
 const d=$('detail');d.innerHTML=h;
 d.querySelectorAll('.q').forEach(r=>r.onclick=()=>{const S=STOPS.find(x=>x.id===r.dataset.s),i=+r.dataset.i,k=r.dataset.q;
  const now=!isDoneRow(S,i);
  if(now===auto(S,i).done)delete ov[k];else ov[k]=now;
  if(now&&S.q[i][0]==='train'){const n=nums(S.q[i][1]);const lv=C?C.lv:(n.length?Math.max(...n):0);if(lv>trainedLv){trainedLv=lv;store(TKEY,trainedLv)}}
  store(CFG.ovKey,ov);render()});
}

/* ---------- potions tab ---------- */
// skill = alchemy needed. pvp = shows up in PvP. src = where the recipe comes from.
const POTS=[
 {n:'Free Action Potion',sk:150,pvp:1,ef:'Immune to stuns + slows for 30 sec. The #1 PvP potion: drink it before a rogue, warrior or hunter fight.',mats:[[2,'Blackmouth Oil'],[1,'Stranglekelp'],[1,'Leaded Vial']],src:'Recipe: Soolie Berryfizz, Ironforge (limited stock, ~18s, so check every time you\'re in IF). Blackmouth Oil comes from Oily Blackmouth you fish off the Menethil coast.'},
 {n:'Swiftness Potion',sk:60,pvp:1,ef:'Big run-speed boost for 15 sec. Escaping, catching runners, flag carrying in battlegrounds.',mats:[[1,'Swiftthistle'],[1,'Briarthorn'],[1,'Empty Vial']],src:'Recipe: world drop from Lv 5-25 mobs. Check the AH too.'},
 {n:'Spellblasting Potion',sk:135,pvp:1,ef:'+14 spell damage for 30 sec (2 min cooldown). New in Forever. Burst potion for casters, so mages + shadow priests buy it.',mats:[[1,'Wild Steelbloom'],[1,'Grave Moss'],[1,'Empty Vial']],src:'Recipe: Nina Surefire at Three Corners, Redridge (trading camp, costs Merchant\'s Favor). That\'s right on your Redridge stops.'},
 {n:'Frenzy Potion',sk:140,pvp:1,ef:'+14 attack power for 30 sec (2 min cooldown). New in Forever. Burst potion for warriors, rogues, hunters.',mats:[[2,'Fadeleaf'],[1,'Briarthorn'],[1,'Leaded Vial']],src:'Recipe: Nina Surefire, Three Corners (Merchant\'s Favor).'},
 {n:'Lesser Invisibility Potion',sk:165,pvp:1,ef:'Go invisible for 15 sec. Reset fights, sneak past camps, escape gankers on a PvP realm.',mats:[[1,'Fadeleaf'],[1,'Wild Steelbloom'],[1,'Leaded Vial']],src:'Recipe: alchemy trainer. You need 15 more skill.'},
 {n:'Disorienting Smog Potion',sk:180,pvp:1,ef:'New throwable in Forever. Disorients enemies in an area. Check the tooltip for exact numbers.',mats:[],src:'Recipe: Nina Surefire, Three Corners (Merchant\'s Favor ×120). Ingredients are on the recipe.'},
 {n:'Greater Spellblasting Potion',sk:185,pvp:1,ef:'Bigger version of Spellblasting.',mats:[[2,'Kingsblood'],[1,'Fadeleaf'],[1,'Leaded Vial']],src:'Recipe: Gorhak in Desolace (you pass through on the Desolace stop).'},
 {n:'Greater Frenzy Potion',sk:190,pvp:1,ef:'Bigger version of Frenzy.',mats:[[3,'Firebloom'],[2,'Fadeleaf'],[1,'Leaded Vial']],src:'Recipe: Gorhak in Desolace.'},
 {n:'Invisibility Potion',sk:235,pvp:1,ef:'Full invisibility. Expensive and rare, so it sells high.',mats:[[1,'Ghost Mushroom'],[1,'Sungrass'],[1,'Crystal Vial']],src:'Recipe: rare drop (Lord Sakrasis in STV, Magister Hawkhelm in Azshara). Check the AH.'},
 {n:'Limited Invulnerability Potion',sk:250,pvp:1,ef:'Immune to physical damage for 6 sec. Huge vs melee, and always in demand.',mats:[[2,'Blindweed'],[1,'Ghost Mushroom'],[1,'Crystal Vial']],src:'Recipe: rare drop (Witherheart in the Hinterlands, Ravasaur Matriarch in Un\'Goro).'},
 {n:'Caustic Smog Potion',sk:265,pvp:1,ef:'New throwable in Forever. Damage cloud. Check the tooltip.',mats:[[2,'Ghost Mushroom'],[2,'Grave Moss'],[1,'Crystal Vial']],src:'Recipe: Nina Surefire, Three Corners (Merchant\'s Favor ×180).'}
];
const VENDOR={'Empty Vial':4,'Leaded Vial':40,'Crystal Vial':400}; // copper, vendor price
function parseMoney(v){v=String(v||'').trim().toLowerCase();if(!v)return null;
 if(/[gsc]/.test(v)){let t=0;const g=v.match(/(\d+(\.\d+)?)\s*g/),s=v.match(/(\d+(\.\d+)?)\s*s/),c=v.match(/(\d+)\s*c/);if(g)t+=+g[1]*1e4;if(s)t+=+s[1]*100;if(c)t+=+c[1];return Math.round(t)}
 const n=parseFloat(v);return isNaN(n)?null:Math.round(n*100)} // bare number = silver
const ahMap=()=>{const m={};((C&&C.pr)||[]).forEach(([n,v])=>{if(+v>0)m[n]=+v});return m};
// your typed price wins, then the AH price from your last sync, then the vendor price
function priceOf(item){if(item in prices)return parseMoney(prices[item]);const ah=ahMap();if(item in ah)return ah[item];return VENDOR[item]??null}
function potions(){
 const el=$('potCalc');if(!el)return;
 const skill=(()=>{const a=C&&(C.prof||[]).find(p=>/alchemy/i.test(p.n));return a?a.r:CFG.alchemy||150})();
 const groups=[['MAKE NOW',p=>p.sk<=skill],['NEXT UP AS YOU SKILL UP',p=>p.sk>skill&&p.sk<=200],['LATER (225+)',p=>p.sk>200]];
 let h='';
 groups.forEach(([title,f])=>{const list=POTS.filter(f);if(!list.length)return;
  h+=`<div class="sec">${title}</div><div class="potgrid">`;
  list.forEach(p=>{
   let cost=0,known=p.mats.length>0;p.mats.forEach(([q,m])=>{const v=priceOf(m);if(v==null)known=false;else cost+=q*v});
   const AH=ahMap();const sell='▸'+p.n in prices?parseMoney(prices['▸'+p.n]):(AH[p.n]??null);
   const profit=known&&sell!=null?Math.round(sell*0.95-cost):null;
   h+=`<div class="pot ${p.pvp?'pvp':''}"><h3>🧪 ${esc(p.n)} <span class="lock ${p.sk<=skill?'ok':'no'}">${p.sk<=skill?'YOU CAN MAKE IT':'NEEDS '+p.sk}</span><span class="sk">Alchemy ${p.sk}</span></h3>
    <div class="ef">${esc(p.ef)}</div>
    <div class="mats">${p.mats.length?p.mats.map(([q,m])=>`<span class="mat">${q}× ${esc(m)}</span>`).join(''):'<span class="mat">see recipe tooltip</span>'}</div>
    <div class="src">📜 ${esc(p.src)}</div>
    <div class="math"><label>Sells for <input class="pin" data-p="▸${esc(p.n)}" value="${esc(prices['▸'+p.n]||'')}" placeholder="${AH[p.n]?'AH '+money(AH[p.n]):'e.g. 45s'}"></label>
     <span>Mats: <b>${known?money(cost):'—'}</b></span>
     <span>Profit each: <b class="prof ${profit==null?'':profit>0?'up':'down'}">${profit==null?'add prices':money(profit)}</b></span></div></div>`});
  h+='</div>'});
 el.innerHTML=h;
 const AH0=ahMap();
 const mats=[...new Set(POTS.flatMap(p=>p.mats.map(m=>m[1])))].sort();
 $('matPrices').innerHTML=mats.map(m=>`<label>${esc(m)} <input class="pin" data-p="${esc(m)}" value="${esc(prices[m]??'')}" placeholder="${AH0[m]?'AH '+money(AH0[m]):VENDOR[m]!=null?money(VENDOR[m])+' vendor':'price'}"></label>`).join('');
 document.querySelectorAll('.pin').forEach(inp=>inp.onchange=()=>{const k=inp.dataset.p;if(inp.value.trim())prices[k]=inp.value.trim();else delete prices[k];store(PKEY,prices);potions()});
 $('alchSkill').textContent=skill;
 const n=Object.keys(AH0).length,el2=$('ahNote');
 if(el2)el2.innerHTML=n?`<b>AH prices:</b> ${n} items from ${esc(C.prs||'your AH addon')}, synced ${ago(C.t)}. Grey numbers in the boxes are those prices. Type in a box to override one.`:`<b>AH prices:</b> none synced yet. Open the auction house so Auctioneer (or Auctionator/TSM) scans, then do <span class="kbd">/fg</span> and sync. Or type prices in yourself.`;
}

/* ---------- professions (synced) ---------- */
function profSync(){
 const el=$('profSync');if(!el)return;
 if(!C||!(C.prof||[]).length){el.innerHTML='';return}
 const keep=/herbalism|alchemy|cooking|fishing|first aid|mining|skinning|tailoring|enchanting|engineering|blacksmithing|leatherworking|jewelcrafting|inscription/i;
 const p=C.prof.filter(x=>keep.test(x.n));
 el.innerHTML=p.length?`<div class="box2 frost" style="margin:0 0 10px"><b>Your skills (synced):</b> ${p.map(x=>`${esc(x.n)} ${x.r}/${x.m}`).join(' · ')}</div>`:'';
}
function syncLabel(){$('syncAgo').textContent=C?`${C.n} · Lv ${C.lv} · ${ago(C.t)}`:'not synced yet'}
function render(){buildIndex();if(!cur||!STOPS.find(s=>s.id===cur))cur=STOPS[hereIdx()].id;charCard();sidebar();detail();profSync();potions();syncLabel();const od=$('onlyDiff');$('detail').classList.toggle('hideSame',!!(od&&od.checked))}

/* ---------- tabs + sync ---------- */
function showTab(name){document.querySelectorAll('.mtab').forEach(x=>x.setAttribute('aria-selected',x.dataset.tab===name));document.querySelectorAll('[data-panel]').forEach(p=>p.hidden=p.dataset.panel!==name)}
document.querySelectorAll('.mtab').forEach(t=>t.onclick=()=>showTab(t.dataset.tab));
document.querySelectorAll('.stab').forEach(t=>t.onclick=()=>{document.querySelectorAll('.stab').forEach(x=>x.setAttribute('aria-selected',x===t));document.querySelectorAll('[data-sp]').forEach(p=>p.hidden=p.dataset.sp!==t.dataset.st)});
$('syncTop').onclick=()=>{showTab('sync');$('codeIn').focus()};
function decode(code){
 code=code.replace(/\s+/g,'');
 const at=code.indexOf('FG1:');if(at<0)throw new Error('That doesn\'t look like a ForeverGuide code. It should start with FG1:');
 const bin=atob(code.slice(at+4));const bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));
 const d=JSON.parse(new TextDecoder().decode(bytes));
 if(!d||d.v!==1||typeof d.lv!=='number')throw new Error('Code is from a different addon version.');
 return d;
}
$('codeGo').onclick=()=>{
 const m=$('codeMsg');
 try{const d=decode($('codeIn').value);
  // keep turned-in quests from older syncs too, in case the addon got reset
  const old=new Map((((C&&C.n===d.n)?C.done:null)||[]).map(x=>[x[0],x]));(d.done||[]).forEach(x=>old.set(x[0],x));d.done=[...old.values()];
  C=d;store(SKEY,C);cur=null;$('codeIn').value='';
  m.className='msg ok';m.textContent=`Synced ${d.n}, Lv ${d.lv}, in ${d.zone}. Taking you to your next steps…`;
  render();setTimeout(()=>{showTab('walk');m.textContent=''},900);
 }catch(e){m.className='msg err';m.textContent=e.message.includes('JSON')||e.name==='InvalidCharacterError'?'Code got cut off. Copy the whole thing again with Ctrl+A, Ctrl+C in the addon box.':e.message}
};
$('codeClear').onclick=()=>{C=null;try{localStorage.removeItem(SKEY)}catch(e){};cur=null;render();const m=$('codeMsg');m.className='msg ok';m.textContent='Synced data cleared.'};
if($('onlyDiff'))$('onlyDiff').onchange=render;
$('reset').onclick=()=>{ov={};store(CFG.ovKey,ov);trainedLv=0;store(TKEY,0);cur=null;render()};
render();
