/* Shared header, footer, phone menu, header search, prices-updated badge and number formatting.
   Put <header class="site"></header><script src="site.js"></script> at the top of <body>
   and <footer class="site">page note</footer> at the bottom (the note shows in the footer).
   Everything lives under window.AA so it never clashes with a page's own variables. */
(function(){
  const SHEET_ID = '1QNb9ZcPpL7aUDqfHYb3LAqpGgFNS6X3NZxcK0bo3ob8';
  const CSV = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/gviz/tq?tqx=out:csv';
  const PAGES = [
    {href:'prices.html',     name:'Prices',       sub:'Lookup and price trends'},
    {href:'money.html',      name:'Money Makers', sub:'Planting, make or buy, shop points'},
    {href:'wisps.html',      name:'Mana Wisps',   sub:'Salvage paths, step by step', craft:true},
    {href:'regrade.html',    name:'Regrade',      sub:'Max AH price per grade', craft:true},
    {href:'dailies.html',    name:'Dailies',      sub:'Checklist for main and alts'},
    {href:'taming-map.html', name:'Taming Map',   sub:'Every tameable beast spawn'}
  ];
  const here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const cur = href => href === here ? ' aria-current="page"' : '';

  /* ---------- formatting ---------- */
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const num = v => { const n = parseFloat(String(v ?? '').replace(/[,g%\s]/g, '')); return isFinite(n) ? n : null; };
  function parseCSV(t){const rows=[];let r=[],f='',q=false;for(let i=0;i<t.length;i++){const c=t[i];
    if(q){if(c=='"'){if(t[i+1]=='"'){f+='"';i++}else q=false}else f+=c}
    else if(c=='"')q=true;else if(c==','){r.push(f);f=''}else if(c=='\n'){r.push(f);rows.push(r);r=[];f=''}else if(c!='\r')f+=c}
    if(f||r.length){r.push(f);rows.push(r)}return rows}
  // Split a gold amount into [gold, silver, copper]. Copper is dropped (rounded into silver) once there's at least 1 gold;
  // with whole=true silver goes too for amounts of 100g or more.
  function split(v, whole){
    const t = Math.round(Math.abs(v) * 10000);
    let g = Math.floor(t / 10000), s, c = null;
    if(g > 0){
      if(whole && g >= 100){ g = Math.round(t / 10000); s = 0; }
      else { s = Math.round((t % 10000) / 100); if(s === 100){ g++; s = 0; } }
    }else{ s = Math.floor(t / 100); c = t % 100; }
    return [g, s, c];
  }
  function gold(v, whole){                       // plain text: 1,499g 50s · 50s 20c · 3,293g
    if(v == null || !isFinite(v)) return '—';
    const [g, s, c] = split(v, whole), out = [];
    if(g) out.push(g.toLocaleString('en-US') + 'g');
    if(s) out.push(s + 's');
    if(c && !g) out.push(c + 'c');
    if(!out.length) out.push('0g');
    return (v < 0 ? '−' : '') + out.join(' ');
  }
  function money(v, whole){                      // same, as HTML with tinted g / s / c
    if(v == null || !isFinite(v)) return '—';
    const [g, s, c] = split(v, whole), out = [];
    if(g) out.push(g.toLocaleString('en-US') + '<u class="g">g</u>');
    if(s) out.push(s + '<u class="s">s</u>');
    if(c && !g) out.push(c + '<u class="c">c</u>');
    if(!out.length) out.push('0<u class="g">g</u>');
    return `<span class="coin">${v < 0 ? '−' : ''}${out.join(' ')}</span>`;
  }
  const signed = (v, whole) => v == null || !isFinite(v) ? '—' : (v < 0 ? '−' : '+') + money(Math.abs(v), whole);
  const slClass = (sl, profit) => profit != null && profit <= 0 ? 'bad' : sl == null ? '' : sl <= 0 ? 'bad' : sl < 30 ? 'meh' : 'good';
  const skel = (n, cls='rows') => Array.from({length:n}, () => '<li class="skr" aria-hidden="true"><span class="sk"></span><span class="sk"></span></li>').join('');

  async function csv(sheet, opts = {}){
    let u = CSV + '&headers=' + (opts.headers ?? 1) + '&sheet=' + encodeURIComponent(sheet);
    if(opts.range) u += '&range=' + opts.range;
    if(opts.tq) u += '&tq=' + encodeURIComponent(opts.tq);
    const r = await fetch(u, {cache:'no-store'}); if(!r.ok) throw new Error(r.status);
    return parseCSV(await r.text());
  }

  /* ---------- prices-updated date (shared by the badge and pages) ---------- */
  let dateP = null;
  function priceDay(){                            // resolves to a Date at noon on the sheet's price day, or null
    return dateP ??= csv('AH Source', {headers:0, range:'K1'}).then(rows => {
      const t = (rows[0] && rows[0][0] || '').trim(); const d = new Date(t + 'T12:00:00');
      return isNaN(d) ? null : d;
    }).catch(() => null);
  }
  const short = d => d.toLocaleDateString('en-US', {month:'short', day:'numeric'});
  function daysOld(d){
    const pt = new Date(new Date().toLocaleString('en-US', {timeZone:'America/Los_Angeles'}));
    pt.setHours(12, 0, 0, 0);
    return Math.round((pt - d) / 864e5);
  }

  /* ---------- price list for the header search ---------- */
  let listP = null;
  const priceList = () => listP ??= csv('Prices', {tq:'select B,C,D'}).then(rows => {
    const seen = new Set();
    return rows.slice(1).map(([name, now, vol]) => ({name, key:(name||'').toLowerCase(), now:num(now), vol:num(vol) || 0}))
      .filter(r => r.name && !seen.has(r.key) && seen.add(r.key));
  }).catch(() => []);

  /* ---------- header ---------- */
  const chev = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
  const searchBox = id => `<div class="hsearch" role="search">
      <div class="box"><svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#8b9490" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <input id="${id}" type="search" placeholder="Search item prices" autocomplete="off" aria-label="Search item prices" aria-autocomplete="list" aria-controls="${id}-res" aria-expanded="false">${id === 'hs' ? '<kbd aria-hidden="true">/</kbd>' : ''}</div>
      <div class="hres" id="${id}-res" role="listbox" hidden></div></div>`;
  function renderHeader(){
    const h = document.querySelector('header.site'); if(!h || h.dataset.done) return; h.dataset.done = 1;
    const main = PAGES.filter(p => !p.craft), craft = PAGES.filter(p => p.craft), craftCur = craft.some(p => p.href === here);
    h.innerHTML = `<div class="wrap top">
      <a class="brand" href="./" aria-label="Archeage Classic home">
        <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9db3e6" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 6 6 .9-4.5 4.4 1 6.2L12 16.6 6.5 19.5l1-6.2L3 8.9 9 8z"/></svg>
        <span><b>Archeage Classic</b><span class="fresh" id="fresh"><i></i><span>Checking prices…</span></span></span>
      </a>
      ${searchBox('hs')}
      <nav class="main" aria-label="Main">
        ${main.slice(0, 2).map(p => `<a href="${p.href}"${cur(p.href)}>${p.name}</a>`).join('')}
        <details class="dd${craftCur ? ' cur' : ''}"><summary>Crafting ${chev}</summary>
          <div class="menu">${craft.map(p => `<a href="${p.href}"${cur(p.href)}>${p.name}<small>${p.sub}</small></a>`).join('')}</div></details>
        ${main.slice(2).map(p => `<a href="${p.href}"${cur(p.href)}>${p.name}</a>`).join('')}
      </nav>
      <button class="menubtn" type="button" aria-expanded="false" aria-controls="mpanel" aria-label="Menu">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
    </div>
    <div class="wrap mpanel" id="mpanel" hidden>
      ${searchBox('ms')}
      <nav class="mnav" aria-label="Main">
        <a href="./"${cur('index.html')}>Home<small>Today and all tools</small></a>
        ${PAGES.map(p => `<a href="${p.href}"${cur(p.href)}>${p.name}<small>${p.sub}</small></a>`).join('')}
      </nav>
    </div>`;
    const btn = h.querySelector('.menubtn'), panel = h.querySelector('#mpanel');
    btn.addEventListener('click', () => { const open = panel.hidden; panel.hidden = !open; btn.setAttribute('aria-expanded', open); });
    wireSearch(h.querySelector('#hs')); wireSearch(h.querySelector('#ms'));
    document.addEventListener('keydown', e => {
      if(e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)){ const i = h.querySelector('#hs'); if(i.offsetParent){ e.preventDefault(); i.focus(); } }
      if(e.key === 'Escape') h.querySelectorAll('details.dd[open]').forEach(d => d.open = false);
    });
    document.addEventListener('click', e => h.querySelectorAll('details.dd[open]').forEach(d => { if(!d.contains(e.target)) d.open = false; }));
    showFresh();
  }

  async function showFresh(){
    const el = document.getElementById('fresh'); if(!el) return;
    const d = await priceDay();
    if(!d){ el.lastElementChild.textContent = 'Prices update daily'; return; }
    const old = daysOld(d);
    el.classList.add(old >= 2 ? 'old' : 'ok');
    el.lastElementChild.textContent = 'Prices from ' + short(d) + (old >= 2 ? ` · ${old} days old` : '');
    el.title = old >= 2 ? 'The price sheet hasn’t updated in a while, so numbers may be stale.' : 'Auction house prices, updated daily.';
  }

  function wireSearch(input){
    const res = document.getElementById(input.id + '-res'); let hits = [], on = -1;
    const go = name => { location.href = 'prices.html?q=' + encodeURIComponent(name); };
    const close = () => { res.hidden = true; input.setAttribute('aria-expanded', 'false'); on = -1; };
    async function update(){
      const term = input.value.trim().toLowerCase();
      if(term.length < 2){ close(); return; }
      const list = await priceList(); const words = term.split(/\s+/);
      hits = list.filter(r => words.every(w => r.key.includes(w))).sort((a,b) => b.vol - a.vol).slice(0, 6); on = -1;
      res.innerHTML = (hits.length ? hits.map((r, i) => `<a href="prices.html?q=${encodeURIComponent(r.name)}" role="option" id="${input.id}-o${i}"><span>${esc(r.name)}</span><b>${money(r.now)}</b></a>`).join('')
        : `<div class="empty">${list.length ? 'No items match that name.' : 'Prices couldn’t load right now.'}</div>`)
        + (hits.length ? `<a class="all" href="prices.html?q=${encodeURIComponent(input.value.trim())}"><span>See all results</span><b>↵</b></a>` : '');
      res.hidden = false; input.setAttribute('aria-expanded', 'true');
    }
    input.addEventListener('focus', () => { priceList(); if(input.value.trim().length >= 2) update(); });
    input.addEventListener('input', update);
    input.addEventListener('keydown', e => {
      const opts = [...res.querySelectorAll('a')];
      if(e.key === 'ArrowDown' || e.key === 'ArrowUp'){
        if(res.hidden || !opts.length) return; e.preventDefault();
        on = (on + (e.key === 'ArrowDown' ? 1 : -1) + opts.length) % opts.length;
        opts.forEach((o, i) => o.classList.toggle('on', i === on)); input.setAttribute('aria-activedescendant', opts[on].id || '');
      }else if(e.key === 'Enter'){
        e.preventDefault();
        if(on >= 0 && opts[on]) opts[on].click(); else if(input.value.trim()) go(input.value.trim());
      }else if(e.key === 'Escape'){ close(); input.blur(); }
    });
    input.addEventListener('blur', () => setTimeout(close, 150));
  }

  /* ---------- footer ---------- */
  function renderFooter(){
    const f = document.querySelector('footer.site'); if(!f || f.dataset.done) return; f.dataset.done = 1;
    const inner = f.innerHTML.trim(), note = inner ? `<p>${inner}</p>` : '';
    f.innerHTML = `<div class="wrap cols">
      <div class="about"><a class="brand" href="./"><b>Archeage Classic</b></a>
        <p>Prices, money makers and guides for AA Classic, from daily auction house data.</p>${note}</div>
      <div><h3>Tools</h3><ul><li><a href="./">Home</a></li>${PAGES.map(p => `<li><a href="${p.href}">${p.name}</a></li>`).join('')}</ul></div>
      <div><h3>Data from</h3><ul>
        <li><a href="https://docs.google.com/spreadsheets/d/1VezKZkoRFzTnB0hLpTroTRFG40NH5vEpfMjWtWCCXIc" target="_blank" rel="noopener">Michael’s AH Prices sheet</a></li>
        <li><a href="https://wiki.aa-classic.com/" target="_blank" rel="noopener">AA Classic wiki</a></li>
        <li><a href="https://www.sermeatball.com/tools" target="_blank" rel="noopener">Ser Meatball’s tools</a></li>
        <li><a href="https://discord.gg/aaclassic" target="_blank" rel="noopener">AA Classic Discord</a></li></ul></div>
    </div>
    <div class="wrap legal">Fan-made site. Not affiliated with AA Classic or XLGAMES.</div>`;
  }

  window.AA = {esc, num, parseCSV, gold, money, signed, slClass, skel, csv, priceDay, short, daysOld, priceList};
  renderHeader();
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { renderHeader(); renderFooter(); });
  else renderFooter();
})();
