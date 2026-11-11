# WoW Forever leveling helper

- `index.html`: Dwarf Priest 21-60 route (main page)
- `mage.html`: Gnome Frost Mage 21-60 route (built from the priest route, mage rows marked ❄)
- `helper.js` / `helper.css`: shared engine (addon sync, "right now" list, potions calculator)
- `alchemy.html` / `alchemy.js`: alchemy profit page (top sellers, profit board, craft or sell raw, shopping list)
- `data/alchemy.json`: every Forever alchemy recipe + mats + item IDs
- `data/prices.json`, `data/history.json`: AH prices, refreshed hourly by `.github/workflows/ah-prices.yml` (`scripts/fetch_prices.py`, needs `BLIZZARD_CLIENT_ID` + `BLIZZARD_CLIENT_SECRET` secrets; realm in `data/ah-config.json`)
- `addon/ForeverGuide/`: the in-game addon (`/fg` makes a sync code). `addon/ForeverGuide.zip` is the download
- `archeage/`: the old ArcheAge Classic site, parked for later
