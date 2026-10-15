/**
 * Daily History snapshot for the "craft profit" sheet.
 *
 * Every hour, checks the date Michael's AH price sheet was last updated
 * (AH Source!K1) and copies that day's numbers from the Website tab into History
 * as fixed values. Each run replaces that day's rows, so every day keeps one set
 * of rows holding its latest numbers.
 *
 * Setup (one time):
 *   1. In the sheet: Extensions > Apps Script.
 *   2. Select everything in the editor, delete it, paste this whole file in, and click Save.
 *   3. Pick "installDailyTrigger" in the function menu at the top and click Run.
 */

function priceDate_(ss, tz) {
  const cell = ss.getSheetByName('AH Source').getRange('K1');
  const v = cell.getValue();
  if (v instanceof Date) return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  const s = String(cell.getDisplayValue()).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  return isNaN(d) ? null : Utilities.formatDate(d, tz, 'yyyy-MM-dd');
}

function snapshotHistory() {
  const ss = SpreadsheetApp.getActive();
  const tz = ss.getSpreadsheetTimeZone() || Session.getScriptTimeZone() || 'America/Los_Angeles';
  const site = ss.getSheetByName('Website');
  const hist = ss.getSheetByName('History');

  const day = priceDate_(ss, tz);
  if (!day) return; // can't tell when prices were updated

  // Skip if a later day is already saved. If this same day is already saved,
  // remove those rows and save them again, so the day ends up with its final numbers
  // (the craft calculations can take a while to catch up after new prices arrive).
  let last = hist.getLastRow();
  if (last > 1) {
    const dates = hist.getRange(2, 1, last - 1, 1).getDisplayValues().map(r => r[0]);
    const lastDate = dates[dates.length - 1];
    if (lastDate > day) return;
    if (lastDate === day) {
      const first = dates.indexOf(day) + 2;
      hist.getRange(first, 1, last - first + 1, hist.getLastColumn()).clearContent();
    }
  }

  SpreadsheetApp.flush();
  const rows = [];
  const date = new Date(day + 'T12:00:00');

  // Crafts: Website!I:L = Product, Silver per labor, Sold 7d, Price (g)
  const crafts = site.getRange('I2:L' + site.getLastRow()).getValues();
  crafts.forEach(([name, sl, sold, price]) => {
    if (name) rows.push([date, 'Craft', name, price, sl, sold]);
  });

  // Beasts: Website!A:F = Beast, Celestial sold 30d, Cel 7d, Arc 7d, Celestial today, Arcane today
  const beasts = site.getRange('A2:F20').getValues();
  beasts.forEach(([name, celSold, , , celNow]) => {
    if (name) rows.push([date, 'Beast: Celestial', name, celNow, '', celSold]);
  });
  beasts.forEach(([name, , , , , arcNow]) => {
    if (name) rows.push([date, 'Beast: Arcane', name, arcNow, '', '']);
  });

  if (!rows.length) return;
  hist.getRange(hist.getLastRow() + 1, 1, rows.length, 6).setValues(rows);
  hist.getRange(2, 1, hist.getLastRow() - 1, 1).setNumberFormat('yyyy-mm-dd');
}

function installDailyTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'snapshotHistory')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('snapshotHistory').timeBased().everyHours(1).create();
}
