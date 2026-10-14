/**
 * Daily History snapshot for the "craft profit" sheet.
 *
 * Copies today's numbers from the Website tab into the History tab as fixed
 * values, so the website can draw price and silver-per-labor trends over time.
 *
 * Setup (one time):
 *   1. In the sheet: Extensions > Apps Script.
 *   2. Paste this whole file in, replacing what's there, and click Save.
 *   3. Pick "installDailyTrigger" in the function menu at the top and click Run.
 *      Approve the permission prompt. It will now run every morning on its own.
 */

const SNAPSHOT_HOUR = 6; // 24h clock, in the sheet's time zone. Set it after your daily price update.

function snapshotHistory() {
  const ss = SpreadsheetApp.getActive();
  const site = ss.getSheetByName('Website');
  const hist = ss.getSheetByName('History');
  const tz = ss.getSpreadsheetTimeZone() || Session.getScriptTimeZone() || 'America/Los_Angeles';
  const today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');

  // Skip if today is already recorded (safe to run twice).
  const last = hist.getLastRow();
  if (last > 1) {
    const lastDate = hist.getRange(last, 1).getDisplayValue();
    if (lastDate === today) return;
  }

  const rows = [];
  const date = new Date(today + 'T12:00:00');

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
  ScriptApp.newTrigger('snapshotHistory').timeBased().everyDays(1).atHour(SNAPSHOT_HOUR).create();
}
