/* Limited-time event spawns (NA). The game server doesn't change for daylight saving,
   so spawns are fixed in UTC: 18:00, 22:00, 02:00 and 06:00 UTC
   (11 AM / 3 PM / 7 PM / 11 PM Pacific in summer, 10 AM / 2 PM / 6 PM / 10 PM after Nov 1). */
const EVENT = {
  name: 'Halloween event spawn',
  hoursUTC: [2, 6, 18, 22],
  lastsMin: 10,                               // how long a spawn counts as "happening now"
  ends: Date.UTC(2026, 10, 4, 17, 24),        // Nov 4, 2026, 9:24 AM Pacific
};
function eventSpawns(count){                  // upcoming (or in-progress) spawns as {start, end}
  const now = Date.now(), out = [], d = new Date(now);
  for(let k = -1; k < 20 && out.length < count; k++) for(const h of EVENT.hoursUTC){
    const start = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + k, h), end = start + EVENT.lastsMin * 6e4;
    if(end > now && start < EVENT.ends && out.length < count) out.push({start, end});
  }
  return out;
}
function eventTimesLabel(){                   // e.g. "10 AM, 2 PM, 6 PM and 10 PM your time"
  const t = EVENT.hoursUTC.map(h => { const d = new Date(); d.setUTCHours(h, 0, 0, 0); return d; })
    .sort((a, b) => (a.getHours() * 60 + a.getMinutes()) - (b.getHours() * 60 + b.getMinutes()))
    .map(d => d.toLocaleTimeString([], {hour:'numeric', minute: d.getMinutes() ? '2-digit' : undefined}));
  return t.slice(0, -1).join(', ') + ' and ' + t[t.length - 1] + ' your time';
}
function eventLive(){ const s = eventSpawns(1)[0]; return s && s.start <= Date.now() ? s : null; }
