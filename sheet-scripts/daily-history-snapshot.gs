/**
 * Daily snapshots for the "craft profit" sheet.
 *
 * Every hour, checks the date Michael's AH price sheet was last updated
 * (AH Source!K1) and saves that day's numbers as fixed values:
 *   - History:   your crafts and beasts (from the Website tab), for the price trends chart.
 *   - Daily Log: every item selling 100+ a day (700+ a week), with its 24-hour price and
 *                24-hour amount sold, for working out which day of the week sells best.
 * Each run replaces that day's rows, so every day keeps one set holding its latest numbers.
 *
 * If Michael's sheet gets a new date but the numbers didn't actually change (his update
 * didn't pull new prices), nothing is saved for that day, so stale copies don't skew the averages.
 *
 * Setup (one time):
 *   1. In the sheet: Extensions > Apps Script.
 *   2. Select everything in the editor, delete it, paste this whole file in, and click Save.
 *   3. Pick "installDailyTrigger" in the function menu at the top and click Run.
 */

const MIN_WEEKLY_SOLD = 700;   // Daily Log only keeps items that sell at least this many a week

function priceDate_(ss, tz) {
  const cell = ss.getSheetByName('AH Source').getRange('K1');
  const v = cell.getValue();
  if (v instanceof Date) return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  const s = String(cell.getDisplayValue()).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  return isNaN(d) ? null : Utilities.formatDate(d, tz, 'yyyy-MM-dd');
}

function num_(v) {
  const n = parseFloat(String(v).replace(/[g,\s]/g, ''));
  return isFinite(n) ? n : '';
}

// Reads the last `look` rows of a sheet's date column (A) as yyyy-MM-dd strings.
function tailDates_(sheet, look) {
  const last = sheet.getLastRow();
  if (last < 2) return {first: 2, dates: []};
  const first = Math.max(2, last - look + 1);
  const dates = sheet.getRange(first, 1, last - first + 1, 1).getDisplayValues().map(r => r[0]);
  return {first, dates};
}

// Removes the rows for `day` if they are the last rows in the sheet.
function clearDay_(sheet, day, look) {
  const {first, dates} = tailDates_(sheet, look);
  const i = dates.indexOf(day);
  if (i < 0) return;
  sheet.getRange(first + i, 1, dates.length - i, sheet.getLastColumn()).clearContent();
}

function snapshotHistory() {
  const ss = SpreadsheetApp.getActive();
  const tz = ss.getSpreadsheetTimeZone() || Session.getScriptTimeZone() || 'America/Los_Angeles';
  const day = priceDate_(ss, tz);
  if (!day) return; // can't tell when prices were updated

  SpreadsheetApp.flush();
  const date = new Date(day + 'T12:00:00');

  // ---- Daily Log: today's 24h numbers for every item that sells well ----
  const log = ss.getSheetByName('Daily Log');
  const src = ss.getSheetByName('AH Source');
  const raw = src.getRange(2, 1, src.getLastRow() - 1, 6).getDisplayValues();
  const seen = new Set(), rows = [];
  raw.forEach(([id, name, avg24, sold24, avg7, sold7]) => {
    if (!id || !name || seen.has(id)) return;
    const s7 = num_(sold7);
    if (s7 === '' || s7 < MIN_WEEKLY_SOLD) return;
    seen.add(id);
    rows.push([date, String(id), name, num_(avg24), num_(sold24), num_(avg7), s7]);
  });
  rows.sort((a, b) => b[6] - a[6]);

  const look = 3000;
  const {first, dates} = tailDates_(log, look);
  const lastDate = dates[dates.length - 1] || '';
  if (lastDate > day) return; // a later day is already saved

  // Compare with the most recent earlier day in the log. If almost every item's
  // 24h and 7d sold numbers are identical, Michael's update didn't bring new prices.
  const prevDate = [...dates].reverse().find(d => d && d < day);
  if (prevDate) {
    const start = dates.indexOf(prevDate), end = dates.lastIndexOf(prevDate);
    const prev = log.getRange(first + start, 2, end - start + 1, 6).getDisplayValues();
    const was = new Map(prev.map(r => [r[0], num_(r[3]) + '|' + num_(r[5])]));
    let same = 0, both = 0;
    rows.forEach(r => { if (was.has(r[1])) { both++; if (was.get(r[1]) === r[4] + '|' + r[6]) same++; } });
    if (both > 20 && same / both >= 0.95) {
      clearDay_(log, day, look);                               // stale: drop anything saved under this date
      clearDay_(ss.getSheetByName('History'), day, 400);
      return;
    }
  }
  if (lastDate === day) clearDay_(log, day, look);
  if (rows.length) {
    log.getRange(log.getLastRow() + 1, 1, rows.length, 7).setValues(rows);
    log.getRange(2, 1, log.getLastRow() - 1, 1).setNumberFormat('yyyy-mm-dd');
  }

  // ---- History: crafts and beasts for the price trends chart ----
  const site = ss.getSheetByName('Website');
  const hist = ss.getSheetByName('History');
  const h = tailDates_(hist, 400);
  if ((h.dates[h.dates.length - 1] || '') === day) clearDay_(hist, day, 400);

  const out = [];
  // Crafts: Website!I:L = Product, Silver per labor, Sold 7d, Price (g)
  site.getRange('I2:L' + site.getLastRow()).getValues().forEach(([name, sl, sold, price]) => {
    if (name) out.push([date, 'Craft', name, price, sl, sold]);
  });
  // Beasts: Website!A:F = Beast, Celestial sold 30d, Cel 7d, Arc 7d, Celestial today, Arcane today
  const beasts = site.getRange('A2:F20').getValues();
  beasts.forEach(([name, celSold, , , celNow]) => { if (name) out.push([date, 'Beast: Celestial', name, celNow, '', celSold]); });
  beasts.forEach(([name, , , , , arcNow]) => { if (name) out.push([date, 'Beast: Arcane', name, arcNow, '', '']); });

  if (!out.length) return;
  hist.getRange(hist.getLastRow() + 1, 1, out.length, 6).setValues(out);
  hist.getRange(2, 1, hist.getLastRow() - 1, 1).setNumberFormat('yyyy-mm-dd');
}

function installDailyTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'snapshotHistory')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('snapshotHistory').timeBased().everyHours(1).create();
}
