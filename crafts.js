/* Reads the profession tabs of the price sheet and turns every craft box into a craft record.
   A box is a craft name with its ingredients under it, then labelled rows ("Makes (avg)", "Labor",
   "Gold per craft", "Profit", "S/L to AH", "Sold per week (7d)"), and optionally a "Best route" block
   whose numbers win when present. New boxes on these tabs show up on the site automatically.
   Needs site.js (window.AA). */
(function(){
  const PROFESSIONS = ['Alchemy', 'Cooking', 'Metalworking', 'Masonry', 'Husbandry', 'Lunagem'];
  const METRIC = new Set(['Makes (avg)', 'Recipe lists', 'Labor (listed)', 'Labor', 'Price each (AH)', 'Gold per craft',
    'Profit', 'S/L to AH', 'Sold per week (7d)', 'Main item sold per week (7d)', 'Labor (incl. route)', 'S/L, best route',
    'Animal price (g)', 'Animal price (vocation badges)', 'Best route', 'Best Lunarite route',
    'Sell or process? (per animal, after AH tax)']);
  const ROUTE = new Set(['Best route', 'Best Lunarite route']);
  const num = AA.num;
  const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const cell = (g, r, c) => ((g[r] || [])[c] || '').trim();

  // A box title: text with an empty cell above, something right below, and "Gold per craft" within 18 rows below.
  function isTitle(g, r, c){
    const t = cell(g, r, c);
    if(!t || METRIC.has(t) || (r > 0 && cell(g, r - 1, c)) || !cell(g, r + 1, c)) return false;
    for(let k = r + 1; k < Math.min(g.length, r + 19); k++) if(cell(g, k, c) === 'Gold per craft') return true;
    return false;
  }

  function parseTab(prof, grid, prices){
    // overrides: an item name in column A with a price in column B (vendor or your own prices)
    const over = new Map();
    grid.forEach(row => { const a = (row[0] || '').trim(), raw = (row[1] || '').trim(), b = num(raw); if(a && b != null && !/%$/.test(raw)) over.set(a.toLowerCase(), b); });
    const unit = name => { const k = name.toLowerCase(); if(over.has(k)) return {v: over.get(k), src: 'yours'}; const p = prices.get(k); return p && p.now != null ? {v: p.now, src: 'ah'} : {v: null, src: 'none'}; };

    const out = [], width = Math.max(0, ...grid.map(r => r.length));
    for(let c = 1; c < width; c++){
      for(let r = 0; r < grid.length; r++){
        if(!isTitle(grid, r, c)) continue;
        const title = cell(grid, r, c);
        let end = Math.min(grid.length, r + 45);
        for(let k = r + 2; k < end; k++) if(isTitle(grid, k, c)){ end = k; break; }

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
        if(m['Gold per craft'] == null && route['Gold per craft'] == null && m['Profit'] == null) continue;

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
          makes: m['Makes (avg)'] || 1,
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
      }
    }
    return out;
  }

  let loading = null;
  function load(){
    return loading ??= (async () => {
      const [list, ...tabs] = await Promise.all([AA.priceList(), ...PROFESSIONS.map(p => AA.csv(p, {headers: 0}).catch(() => null))]);
      const prices = new Map(list.map(r => [r.key, r]));
      const crafts = [];
      tabs.forEach((grid, i) => { if(grid) crafts.push(...parseTab(PROFESSIONS[i], grid, prices)); });
      const ids = new Set();
      crafts.forEach(c => { if(ids.has(c.id)) c.id = slug(c.prof + '-' + c.name); ids.add(c.id); });
      if(!crafts.length) throw new Error('no crafts');
      return crafts;
    })();
  }
  window.Crafts = {load, parseTab, PROFESSIONS};
})();
