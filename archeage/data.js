/* Sheet helpers for pages that read the price sheet (homepage, Prices, Money Makers).
   Formatting lives in site.js (window.AA) so every page shows numbers the same way. */
const SHEET = 'https://docs.google.com/spreadsheets/d/1QNb9ZcPpL7aUDqfHYb3LAqpGgFNS6X3NZxcK0bo3ob8/gviz/tq?tqx=out:csv&headers=1';
const url = (sheet, q) => SHEET + '&sheet=' + encodeURIComponent(sheet) + (q ? '&tq=' + encodeURIComponent(q) : '');
const parseCSV = AA.parseCSV, num = AA.num, esc = AA.esc, gold = AA.gold, money = AA.money;
async function getCSV(sheet, q){ const r = await fetch(url(sheet,q), {cache:'no-store'}); if(!r.ok) throw new Error(r.status); return parseCSV(await r.text()).slice(1); }
async function getRange(sheet, range){ const r = await fetch(SHEET + '&sheet=' + encodeURIComponent(sheet) + '&range=' + range, {cache:'no-store'}); if(!r.ok) throw new Error(r.status); return parseCSV(await r.text()).slice(1); }
async function priceDate(){ const d = await AA.priceDay(); return d ? AA.short(d) : null; }
function change(now, avg){ if(now==null||avg==null||avg<=0) return null; return (now-avg)/avg*100; }
function chgHTML(p){ if(p==null) return '<span class="chg flat">No weekly average yet</span>';
  if(Math.abs(p)<1) return '<span class="chg flat">About the same as last week</span>';
  return `<span class="chg ${p>0?'up':'down'}">${p>0?'▲':'▼'} ${Math.abs(p).toFixed(0)}% vs last week</span>`; }
const fail = '<li><div class="l dim">Couldn’t load right now</div></li>';

/* ---------- Item price lookup (Prices tab) ----------
   initLookup(maxResults) wires #q, #results and #lookupNote and resolves with the price list.
   A ?q=... in the address (from the header search) fills the box. */
let PRICES = [];
async function initLookup(max = 4){
  const q = document.getElementById('q'), results = document.getElementById('results'), lnote = document.getElementById('lookupNote');
  const asked = new URLSearchParams(location.search).get('q');
  function search(){
    const term = q.value.trim().toLowerCase();
    if(term.length < 2){ results.innerHTML = ''; return; }
    const words = term.split(/\s+/);
    const hits = PRICES.filter(r => words.every(w => r.key.includes(w)))
      .sort((a,b) => (b.vol7||0)-(a.vol7||0)).slice(0, max);
    results.innerHTML = hits.length ? hits.map(r => {
      const sub = [r.avg7!=null ? '7-day average ' + money(r.avg7) : null, r.vol7 ? r.vol7.toLocaleString()+' sold this week' : (r.vol30 ? r.vol30.toLocaleString()+' sold this month' : null)].filter(Boolean).join(' · ');
      return `<div class="res"><div><div class="nm">${esc(r.name)}</div><div class="sub">${sub || 'Few recent sales'}</div></div>
        <div class="px"><b>${money(r.now)}</b>${chgHTML(change(r.now, r.avg7))}</div></div>`;
    }).join('') : '<p class="note">No items match that name.</p>';
  }
  q.addEventListener('input', search);
  if(asked) q.value = asked;
  results.innerHTML = '<div class="res" aria-hidden="true"><div style="flex:1"><span class="sk t"></span><span class="sk w60" style="margin-top:8px"></span></div><span class="sk w30" style="height:22px"></span></div>';
  try{
    const rows = await getCSV('Prices', 'select B,C,F,D,K');
    const seen = new Set();
    PRICES = rows.map(([name,now,avg7,vol7,vol30]) => ({name, key:(name||'').toLowerCase(), now:num(now), avg7:num(avg7), vol7:num(vol7), vol30:num(vol30)}))
      .filter(r => r.name && !seen.has(r.key) && seen.add(r.key));
    if(!PRICES.length) throw new Error('empty');
    q.disabled = false;
    const when = await priceDate();
    lnote.textContent = PRICES.length.toLocaleString() + ' items · ' + (when ? 'auction house prices from ' + when : 'auction house prices, updated daily');
    if(!q.value) q.value = 'Celestial Starfish';
    search();
    if(asked) q.focus();
  }catch(e){
    results.innerHTML = '';
    lnote.textContent = 'Prices couldn’t be loaded right now. Try again in a bit.';
  }
  return PRICES;
}
