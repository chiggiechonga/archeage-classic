/* Reads the profession tabs of the price sheet and turns every craft box into a craft record.
   A box is a craft name with its ingredients under it, then labelled rows ("Makes (avg)", "Labor",
   "Gold per craft", "Profit", "S/L to AH", "Sold per week (7d)"), and optionally a "Best route" block
   whose numbers win when present. New boxes on these tabs show up on the site automatically.
   Needs site.js (window.AA). */
(function(){
  const TABS = ['Alchemy', 'Cooking', 'Metalworking', 'Masonry', 'Husbandry', 'Lunagem'];   // sheet tabs we read
  // crafts that sit on one tab but belong to another profession on the site
  const MOVE = {'mysterious glittery charcoal milk': 'Larceny'};
  const PROFESSIONS = [...TABS, ...new Set(Object.values(MOVE))];
  const METRIC = new Set(['Makes (avg)','Makes', 'Recipe lists', 'Labor (listed)', 'Labor', 'Price each (AH)', 'Gold per craft',
    'Profit', 'S/L to AH', 'Sold per week (7d)', 'Main item sold per week (7d)', 'Labor (incl. route)', 'S/L, best route',
    'Animal price (g)', 'Animal price (vocation badges)', 'Best route', 'Best Lunarite route',
    'Sell or process? (per animal, after AH tax)']);
  const ROUTE = new Set(['Best route', 'Best Lunarite route']);
  const num = AA.num;
  const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const cell = (g, r, c) => ((g[r] || [])[c] || '').trim();

  // A box title: text with an empty cell above, something right below, and "Gold per craft" within 18 rows below.
  // Find each box by its first "Gold per craft" row, then walk up past the stats and
  // ingredients to the title. Doesn't depend on blank rows (the CSV export drops them).
  const isNote = t => /→|^no (sales|ah price|processing|craftable)|^missing|^fill in/i.test(t);
  const isHeader = t => /[A-Z]/.test(t) && !/[a-z]/.test(t);   // "FIRE GEMS"
  function findTitles(g, c){
    const titles = [];
    for(let k = 0; k < g.length; k++){
      if(cell(g, k, c) !== 'Gold per craft') continue;
      if(ROUTE.has(cell(g, k - 1, c)) || ROUTE.has(cell(g, k - 2, c))) continue;   // the route's own numbers
      let r = k - 1, top = -1;
      // stats zone: labelled rows, blanks, and the feed row under the badges row
      while(r >= 0){
        const t = cell(g, r, c);
        if(!t || METRIC.has(t) || cell(g, r - 1, c) === 'Animal price (vocation badges)'){ r--; continue; }
        break;
      }
      // ingredient zone, ending at the title
      while(r >= 0){
        const t = cell(g, r, c);
        if(!t || METRIC.has(t) || isNote(t) || isHeader(t) || ROUTE.has(cell(g, r - 1, c))) break;
        top = r; r--;
      }
      if(top >= 0 && top < k - 1 && !titles.includes(top)) titles.push(top);
    }
    return titles.sort((a, b) => a - b);
  }

  function parseTab(prof, grid, prices){
    // overrides: an item name in column A with a price in column B (vendor or your own prices)
    const over = new Map();
    grid.forEach(row => { const a = (row[0] || '').trim(), raw = (row[1] || '').trim(), b = num(raw); if(a && b != null && !/%$/.test(raw)) over.set(a.toLowerCase(), b); });
    const unit = name => { const k = name.toLowerCase(); if(over.has(k)) return {v: over.get(k), src: 'yours'}; const p = prices.get(k); return p && p.now != null ? {v: p.now, src: 'ah'} : {v: null, src: 'none'}; };

    const out = [], width = Math.max(0, ...grid.map(r => r.length));
    for(let c = 1; c < width; c++){
      const titles = findTitles(grid, c);
      titles.forEach((r, i) => {
        const title = cell(grid, r, c);
        const end = Math.min(grid.length, titles[i + 1] ?? Infinity, r + 45);

        const m = {}, route = {}, items = [], notes = [];
        let phase = 'items', inRoute = false, routeText = '', feed = null, feedNext = false;
        for(let k = r + 1; k < end; k++){
          const label = cell(grid, k, c), val = num(cell(grid, k, c + 1));
          if(!label){ if(phase === 'items' && items.length) phase = 'metrics'; continue; }
          if(METRIC.has(label)){
            phase = 'metrics';
            if(ROUTE.has(label)){
              inRoute = true;
              const nxt = cell(grid, k + 1, c);
              if(nxt && !METRIC.has(nxt)){ routeText = /^no craftable/i.test(nxt) ? '' : nxt; k++; }
              continue;
            }
            if(label === 'Animal price (vocation badges)'){ feedNext = true; m.badges = val || 0; continue; }
            (inRoute ? route : m)[label] = val;
            continue;
          }
          if(feedNext){ feedNext = false; feed = {name: label, qty: val || 0}; continue; }
          if(phase === 'items'){ items.push({name: label, qty: val || 0}); continue; }
          if(/→|no processing recipe/i.test(label)) notes.push(label.replace(/\s+/g, ' '));
          else if(/^(no sales|no ah price|missing)/i.test(label)) notes.push(label);
        }
        if(m['Gold per craft'] == null && route['Gold per craft'] == null && m['Profit'] == null) return;

        // Husbandry boxes list what the animal drops; the ingredients are the animal and its feed.
        const husbandry = m['Animal price (g)'] !== undefined;
        let inputs = items, outputs = [];
        if(husbandry){
          outputs = items;
          inputs = [{name: title + ' (animal)', qty: 1, fixed: m['Animal price (g)'] ?? 0}];
          if(feed) inputs.push(feed);
        }
        const p = prices.get(title.toLowerCase());
        out.push({
          id: slug(title), prof, name: title, husbandry,
          makes: m['Makes (avg)'] || m['Makes'] || 1,
          labor: route['Labor (incl. route)'] ?? m['Labor'] ?? null,
          cost: route['Gold per craft'] ?? m['Gold per craft'] ?? null,
          profit: route['Profit'] ?? m['Profit'] ?? null,
          sl: route['S/L to AH'] ?? m['S/L to AH'] ?? m['S/L, best route'] ?? null,
          slBest: husbandry ? (m['S/L, best route'] ?? null) : null,
          price: m['Price each (AH)'] ?? (p ? p.now : null),
          sold: m['Sold per week (7d)'] ?? m['Main item sold per week (7d)'] ?? (p ? p.vol : 0) ?? 0,
          badges: m.badges || 0,
          route: routeText, notes,
          inputs: inputs.filter(x => x.name).map(x => {
            const u = x.fixed != null ? {v: x.fixed, src: 'animal'} : unit(x.name);
            return {name: x.name, qty: x.qty, unit: u.v, src: u.src, line: u.v != null ? u.v * x.qty : null};
          }),
          outputs: outputs.filter(x => x.name).map(x => ({name: x.name, qty: x.qty, unit: unit(x.name).v}))
        });
      });
    }
    return out;
  }

  let loading = null;
  function load(){
    return loading ??= (async () => {
      const [list, ...tabs] = await Promise.all([AA.priceList(), ...TABS.map(p => AA.csv(p, {headers: 0}).catch(() => null))]);
      const prices = new Map(list.map(r => [r.key, r]));
      const crafts = [];
      tabs.forEach((grid, i) => { if(grid) crafts.push(...parseTab(TABS[i], grid, prices)); });
      const ids = new Set();
      crafts.forEach(c => { c.prof = MOVE[c.name.toLowerCase()] || c.prof; });
      crafts.forEach(c => { if(ids.has(c.id)) c.id = slug(c.prof + '-' + c.name); ids.add(c.id); });
      if(!crafts.length) throw new Error('no crafts');
      return crafts;
    })();
  }
  window.Crafts = {load, parseTab, PROFESSIONS};
})();
