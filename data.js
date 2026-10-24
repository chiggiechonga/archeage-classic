/* Shared helpers for pages that read the price sheet (homepage, Prices, Money Makers). */
const SHEET = 'https://docs.google.com/spreadsheets/d/1QNb9ZcPpL7aUDqfHYb3LAqpGgFNS6X3NZxcK0bo3ob8/gviz/tq?tqx=out:csv&headers=1';
const DATE_URL = 'https://docs.google.com/spreadsheets/d/1QNb9ZcPpL7aUDqfHYb3LAqpGgFNS6X3NZxcK0bo3ob8/gviz/tq?tqx=out:csv&headers=0&sheet=AH%20Source&range=K1';
async function priceDate(){
  try{
    const r = await fetch(DATE_URL, {cache:'no-store'}); if(!r.ok) return null;
    const t = (await r.text()).replace(/"/g,'').trim();
    const d = new Date(t + 'T12:00:00');
    return isNaN(d) ? null : d.toLocaleDateString('en-US', {month:'short', day:'numeric'});
  }catch(e){ return null; }
}

const url = (sheet, q) => SHEET + '&sheet=' + encodeURIComponent(sheet) + (q ? '&tq=' + encodeURIComponent(q) : '');

function parseCSV(t){const rows=[];let r=[],f='',q=false;for(let i=0;i<t.length;i++){const c=t[i];
  if(q){if(c=='"'){if(t[i+1]=='"'){f+='"';i++}else q=false}else f+=c}
  else if(c=='"')q=true;else if(c==','){r.push(f);f=''}else if(c=='\n'){r.push(f);rows.push(r);r=[];f=''}else if(c!='\r')f+=c}
  if(f||r.length){r.push(f);rows.push(r)}return rows}
const num = v => { const n = parseFloat(String(v ?? '').replace(/,/g,'')); return isFinite(n) ? n : null; };
async function getCSV(sheet, q){ const r = await fetch(url(sheet,q), {cache:'no-store'}); if(!r.ok) throw new Error(r.status); return parseCSV(await r.text()).slice(1); }
async function getRange(sheet, range){ const r = await fetch(SHEET + '&sheet=' + encodeURIComponent(sheet) + '&range=' + range, {cache:'no-store'}); if(!r.ok) throw new Error(r.status); return parseCSV(await r.text()).slice(1); }
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function gold(v){
  if(v==null || !isFinite(v)) return '—';
  const neg = v < 0; const total = Math.round(Math.abs(v) * 10000);
  const g = Math.floor(total / 10000), sv = Math.floor((total % 10000) / 100), c = total % 100;
  const parts = [];
  if(g) parts.push(g.toLocaleString('en-US') + ' g');
  if(g || sv) parts.push(sv + ' s');
  parts.push(c + ' c');
  return (neg ? '−' : '') + parts.join(' ');
}
function change(now, avg){ if(now==null||avg==null||avg<=0) return null; return (now-avg)/avg*100; }
function chgHTML(p){ if(p==null) return '<span class="chg flat">No weekly average yet</span>';
  if(Math.abs(p)<1) return '<span class="chg flat">About the same as last week</span>';
  return `<span class="chg ${p>0?'up':'down'}">${p>0?'▲':'▼'} ${Math.abs(p).toFixed(0)}% vs last week</span>`; }
const fail = '<li><span>Couldn’t load right now</span></li>';

/* ---------- Item price lookup (Prices tab) ----------
   initLookup(maxResults) wires #q, #results and #lookupNote and resolves with the price list. */
let PRICES = [];
async function initLookup(max = 4){
  const q = document.getElementById('q'), results = document.getElementById('results'), lnote = document.getElementById('lookupNote');
  function search(){
    const term = q.value.trim().toLowerCase();
    if(term.length < 2){ results.innerHTML = ''; return; }
    const words = term.split(/\s+/);
    const hits = PRICES.filter(r => words.every(w => r.key.includes(w)))
      .sort((a,b) => (b.vol7||0)-(a.vol7||0)).slice(0, max);
    results.innerHTML = hits.length ? hits.map(r => {
      const sub = [r.avg7!=null ? '7-day average '+gold(r.avg7) : null, r.vol7 ? r.vol7.toLocaleString()+' sold this week' : (r.vol30 ? r.vol30.toLocaleString()+' sold this month' : null)].filter(Boolean).join(' · ');
      return `<div class="res"><div><div class="nm">${esc(r.name)}</div><div class="sub">${esc(sub||'Few recent sales')}</div></div>
        <div class="px"><b>${gold(r.now)}</b>${chgHTML(change(r.now, r.avg7))}</div></div>`;
    }).join('') : '<p class="note">No items match that name.</p>';
  }
  q.addEventListener('input', search);
  try{
    const rows = await getCSV('Prices', 'select B,C,F,D,K');
    PRICES = rows.map(([name,now,avg7,vol7,vol30]) => ({name, key:name.toLowerCase(), now:num(now), avg7:num(avg7), vol7:num(vol7), vol30:num(vol30)})).filter(r => r.name);
    if(!PRICES.length) throw new Error('empty');
    q.disabled = false;
    const when = await priceDate();
    lnote.textContent = PRICES.length.toLocaleString() + ' items · ' + (when ? 'auction house prices from ' + when : 'auction house prices, updated daily');
    if(!q.value) q.value = 'Celestial Starfish';
    search();
  }catch(e){
    lnote.textContent = 'Prices couldn’t be loaded right now. Please try again later.';
  }
  return PRICES;
}
