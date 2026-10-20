/* Limited-time event spawns (NA). Times are Pacific wall-clock times. */
const EVENT = {
  name: 'Halloween event spawn',
  hours: [11, 15, 19, 23],                    // 11 AM, 3 PM, 7 PM, 11 PM Pacific
  lastsMin: 30,                               // how long a spawn counts as "happening now"
  ends: Date.UTC(2026, 10, 4, 17, 24),        // Nov 4, 2026, 9:24 AM Pacific (15d 13h from Oct 19, 8:24 PM)
};
function ptOffset(ms){                        // minutes Pacific is behind UTC at that moment
  const p = new Intl.DateTimeFormat('en-US', {timeZone:'America/Los_Angeles', hour12:false, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit'}).formatToParts(new Date(ms));
  const g = t => +p.find(x => x.type === t).value;
  return (ms - Date.UTC(g('year'), g('month') - 1, g('day'), g('hour') % 24, g('minute'))) / 6e4;
}
function eventSpawns(count){                  // upcoming (or in-progress) spawns as {start, end}
  const now = Date.now(), out = [];
  const d0 = new Date(now - ptOffset(now) * 6e4);           // today's Pacific date
  for(let k = -1; k < 20 && out.length < count; k++) for(const h of EVENT.hours){
    const wall = Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth(), d0.getUTCDate() + k, h);
    const start = wall + ptOffset(wall) * 6e4, end = start + EVENT.lastsMin * 6e4;
    if(end > now && start < EVENT.ends && out.length < count) out.push({start, end});
  }
  return out;
}
function eventLive(){ const s = eventSpawns(1)[0]; return s && s.start <= Date.now() ? s : null; }
