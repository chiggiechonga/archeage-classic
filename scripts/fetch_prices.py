"""Hourly AH price fetch for the Alchemy page (runs in GitHub Actions).

Needs repo secrets BLIZZARD_CLIENT_ID + BLIZZARD_CLIENT_SECRET (free at develop.battle.net).
Reads data/ah-config.json and data/alchemy.json, writes:
  data/prices.json    latest prices for every potion + mat
  data/history.json   7 days of hourly prices (for trends + "might jump")
  data/item_ids.json  item IDs looked up by name (cached)
  data/realms.json    every realm the API knows about, per namespace (to pick yours)
"""
import json, os, sys, time, urllib.parse, urllib.request
from statistics import median

ROOT = os.path.join(os.path.dirname(__file__), '..', 'data')
P = lambda f: os.path.join(ROOT, f)
cfg = json.load(open(P('ah-config.json')))
REGION = cfg.get('region', 'us')
API = f'https://{REGION}.api.blizzard.com'
# WoW Forever's namespace isn't documented, so try likely ones in order
NAMESPACE_GUESSES = [cfg.get('namespace')] + [f'dynamic-{x}{REGION}' for x in
    ('forever-', 'classicforever-', 'classic1x-', 'classic-', 'classicann-', '')]


def load(f, default):
    try:
        return json.load(open(P(f)))
    except Exception:
        return default


def save(f, data):
    json.dump(data, open(P(f), 'w'), ensure_ascii=False, separators=(',', ':'))


def token():
    cid, sec = os.environ.get('BLIZZARD_CLIENT_ID'), os.environ.get('BLIZZARD_CLIENT_SECRET')
    if not cid or not sec:
        return None
    req = urllib.request.Request('https://oauth.battle.net/token', data=b'grant_type=client_credentials')
    import base64
    req.add_header('Authorization', 'Basic ' + base64.b64encode(f'{cid}:{sec}'.encode()).decode())
    return json.load(urllib.request.urlopen(req, timeout=30))['access_token']


TOKEN = None


def get(path, ns, **params):
    params.update(namespace=ns, locale='en_US')
    url = path if path.startswith('http') else API + path
    url += ('&' if '?' in url else '?') + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {TOKEN}'})
    try:
        return json.load(urllib.request.urlopen(req, timeout=60))
    except urllib.error.HTTPError as e:
        return {'_error': e.code}


def discover():
    """List every connected realm in each namespace that answers."""
    out = {}
    for ns in [n for n in NAMESPACE_GUESSES if n]:
        idx = get('/data/wow/connected-realm/index', ns)
        if '_error' in idx:
            out[ns] = {'error': idx['_error']}
            continue
        realms = []
        for cr in idx.get('connected_realms', [])[:200]:
            crid = int(cr['href'].split('/connected-realm/')[1].split('?')[0])
            d = get(f'/data/wow/connected-realm/{crid}', ns)
            for r in d.get('realms', []):
                realms.append({'connected_realm': crid, 'name': r.get('name'), 'slug': r.get('slug'),
                               'type': (r.get('type') or {}).get('name'), 'category': r.get('category')})
        out[ns] = {'realms': realms}
        print(f'{ns}: {len(realms)} realms')
    save('realms.json', out)
    return out


def pick_realm(found):
    want = (cfg.get('realm') or '').lower()
    for ns, v in found.items():
        for r in v.get('realms', []):
            if want and want in (r['name'] or '').lower() + ' ' + (r['slug'] or ''):
                return ns, r
    return None, None


def auctions(ns, crid):
    faction = cfg.get('faction', 'alliance').lower()
    idx = get(f'/data/wow/connected-realm/{crid}/auctions/index', ns)
    house = None
    for h in idx.get('auctions', []):
        if faction in (h.get('name') or '').lower():
            house = h['id']
    data = get(f'/data/wow/connected-realm/{crid}/auctions/{house}', ns) if house else get(f'/data/wow/connected-realm/{crid}/auctions', ns)
    if '_error' in data:
        sys.exit(f'Auction data not available ({data["_error"]}) for {ns} realm {crid}.')
    return data.get('auctions', [])


def resolve_ids(alch, ns):
    """Find item IDs for names QuestieDB didn't have, via the item search API."""
    cache = load('item_ids.json', {})
    static = ns.replace('dynamic-', 'static-')
    for name, iid in alch['items'].items():
        if iid or name in cache:
            continue
        res = get('/data/wow/search/item', static, **{'name.en_US': name, 'orderby': 'id', '_page': 1})
        hit = None
        for r in res.get('results', []):
            if ((r.get('data') or {}).get('name') or {}).get('en_US', '').lower() == name.lower():
                hit = r['data']['id']
        cache[name] = hit
        time.sleep(0.05)
    save('item_ids.json', cache)
    return {n: (i or cache.get(n)) for n, i in alch['items'].items()}


def vendor_prices(ids, ns):
    static = ns.replace('dynamic-', 'static-')
    out = {}
    for name in ('Empty Vial', 'Leaded Vial', 'Crystal Vial', 'Imbued Vial'):
        if ids.get(name):
            d = get(f'/data/wow/item/{ids[name]}', static)
            if d.get('purchase_price'):
                out[name] = d['purchase_price'] // max(1, d.get('purchase_quantity', 1))
    return out


def main():
    global TOKEN
    TOKEN = token()
    if not TOKEN:
        print('No Blizzard API keys yet (BLIZZARD_CLIENT_ID / BLIZZARD_CLIENT_SECRET). Skipping.')
        return
    # only re-scan the realm list when we can't find the configured realm in the saved one
    ns, realm = pick_realm(load('realms.json', {}))
    if not realm:
        ns, realm = pick_realm(discover())
    if not realm:
        print('No realm picked yet. Set "realm" in data/ah-config.json to one listed in data/realms.json.')
        return
    print('Using', ns, realm)
    alch = json.load(open(P('alchemy.json')))
    ids = resolve_ids(alch, ns)
    by_id = {}
    for a in auctions(ns, realm['connected_realm']):
        iid = a['item']['id']
        qty = a.get('quantity', 1)
        unit = a.get('unit_price') or (a.get('buyout') or 0) // max(1, qty)
        if unit:
            by_id.setdefault(iid, []).append((unit, qty))
    items, now = {}, int(time.time())
    for name, iid in ids.items():
        rows = sorted(by_id.get(iid, []))
        if not rows:
            items[name] = {'id': iid, 'qty': 0}
            continue
        total = sum(q for _, q in rows)
        # "market" = median unit price of the cheapest 15% of stock, so one cheap auction doesn't skew it
        cut, seen, pool = max(1, total * 0.15), 0, []
        for u, q in rows:
            pool.append(u); seen += q
            if seen >= cut:
                break
        items[name] = {'id': iid, 'min': rows[0][0], 'mkt': int(median(pool)), 'qty': total, 'n': len(rows)}
    prices = {'updated': now, 'realm': realm['name'], 'faction': cfg.get('faction'), 'namespace': ns,
              'vendor': vendor_prices(ids, ns), 'items': items}
    save('prices.json', prices)
    hist = load('history.json', {'t': [], 'p': {}, 'q': {}})
    hist['t'].append(now)
    pad = [None] * (len(hist['t']) - 1)
    for name, v in items.items():
        hist['p'].setdefault(name, list(pad)).append(v.get('mkt'))
        hist['q'].setdefault(name, list(pad)).append(v.get('qty', 0))
    keep = 24 * 7
    hist['t'] = hist['t'][-keep:]
    for k in ('p', 'q'):
        for name in list(hist[k]):
            hist[k][name] = hist[k][name][-keep:]
    save('history.json', hist)
    print(f'Saved prices for {sum(1 for v in items.values() if v.get("min"))} items.')


if __name__ == '__main__':
    main()
