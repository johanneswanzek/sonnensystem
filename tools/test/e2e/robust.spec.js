// Ablauf 12: Robustheit
const { test, expect } = require('playwright/test');
const L = require('./lib');

const NO_WEBGL = () => {
  const g = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (t) { return /webgl/i.test(String(t)) ? null : g.apply(this, arguments); };
};
const HINT = { de: 'Die 3D-Ansicht konnte nicht gestartet werden. Dafür wird WebGL benötigt', en: 'The 3D view could not be started. It requires WebGL', pl: 'Nie udało się uruchomić widoku 3D. Wymaga on WebGL' };

for (const [lang, locale] of [['de', 'de-DE'], ['en', 'en-US'], ['pl', 'pl-PL']]) {
  test('ohne WebGL erscheint der Hinweistext statt eines Absturzes (' + lang + ')', async ({ browser }, info) => {
    const s = await L.open(browser, info, { locale, init: NO_WEBGL, wait: 'none' });
    try {
      await expect(s.page.locator('#blurb')).toContainText(HINT[lang], { timeout: 30000 });
      await expect(s.page.locator('#loader')).toBeHidden();
      // Die Oberfläche bleibt benutzbar genug: Titel und Leiste stehen, kein Skriptfehler
      await expect(s.page.locator('#name')).toHaveText(L.NAMES[lang].names[0]);
      await expect(s.page.locator('#rail .chip')).toHaveCount(12);
      const errs = s.log.errors.filter(e => !/WebGL/i.test(e));
      expect(errs, 'Konsole/Seitenfehler außer der Meldung zu WebGL').toEqual([]);
      expect(s.log.foreign).toEqual([]);
      expect(s.log.failed).toEqual([]);
    } finally { await s.close(); }
  });
}

test('ohne WebGL: Startfläche und Tour-Knopf lösen keinen Fehler aus', async ({ browser }, info) => {
  const s = await L.open(browser, info, { init: NO_WEBGL, wait: 'none' });
  try {
    await expect(s.page.locator('#blurb')).toContainText('WebGL', { timeout: 30000 });
    await s.page.keyboard.press('ArrowRight'); await s.page.keyboard.press(' '); await s.page.keyboard.press('m');
    await s.page.waitForTimeout(500);
    expect(s.log.errors.filter(e => !/WebGL/i.test(e))).toEqual([]);
  } finally { await s.close(); }
});
