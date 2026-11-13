// Ablauf 6: Ton-Knopf und Taste M (drei Stufen, Toast); Tab im Hintergrund
const { test, expect } = require('playwright/test');
const L = require('./lib');

const MODES = [['Musik und Sprecher', 'true'], ['Nur Sprecher, ohne Musik', 'true'], ['Ton aus', 'false']];

test.describe.serial('Ton', () => {
  let s, page;
  test.beforeAll(async ({ browser }, info) => { s = await L.open(browser, info); page = s.page; await page.click('#goQuiet'); });
  test.afterAll(async () => { await s.close(); });
  const expectMode = async m => {
    const [label, pressed] = MODES[m];
    await expect(page.locator('#sound')).toHaveAttribute('aria-pressed', pressed);
    await expect(page.locator('#sound')).toHaveAttribute('aria-label', label + '. Antippen für: ' + MODES[(m + 1) % 3][0]);
    await expect.poll(async () => (await L.state(page)).soundMode).toBe(m);
  };

  test('ohne Start des Tons: Stufe "Ton aus"', async () => {
    await expectMode(2);
    expect((await L.state(page)).auStarted).toBe(false);
  });

  test('erster Druck auf M startet den Ton (Musik und Sprecher) und zeigt den Toast', async () => {
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.keyboard.press('m');
    await expectMode(0);
    await expect(page.locator('#toast')).toHaveClass(/\bon\b/);
    await expect(page.locator('#toast')).toHaveText('Musik und Sprecher');
    expect((await L.state(page)).auActive).toBe(true);
    // Toast verschwindet wieder
    await expect(page.locator('#toast')).not.toHaveClass(/\bon\b/, { timeout: 10000 });
  });

  test('Taste M schaltet weiter: nur Sprecher, aus, wieder Musik und Sprecher', async () => {
    for (const m of [1, 2, 0]) {
      await page.keyboard.press('M');
      await expectMode(m);
      await expect(page.locator('#toast')).toHaveText(MODES[m][0]);
      await expect(page.locator('#toast')).toHaveClass(/\bon\b/);
    }
    const x = await L.state(page);
    expect(x.auActive).toBe(true);
  });

  test('Ton-Knopf durchläuft dieselben drei Stufen', async () => {
    for (const m of [1, 2, 0]) {
      await page.click('#sound');
      await expectMode(m);
      expect((await L.state(page)).auActive).toBe(m !== 2);
      await expect(page.locator('#toast')).toHaveText(MODES[m][0]);
    }
    await expect(page.locator('#toast')).not.toHaveClass(/\bon\b/, { timeout: 10000 });
  });

  test('Tab im Hintergrund hält den Ton an, bei Rückkehr läuft er weiter', async () => {
    const hide = h => page.evaluate(h => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => h }); document.dispatchEvent(new Event('visibilitychange')); }, h);
    const a0 = await page.evaluate(() => ({ ...window.__audio }));
    await hide(true);
    await expect.poll(() => page.evaluate(() => window.__audio.suspend)).toBeGreaterThan(a0.suspend);
    const a1 = await page.evaluate(() => ({ ...window.__audio }));
    await hide(false);
    await expect.poll(() => page.evaluate(() => window.__audio.resume)).toBeGreaterThan(a1.resume);
    // Bei stummem Ton wird nach der Rückkehr nichts fortgesetzt
    await page.click('#sound'); await page.click('#sound'); await expectMode(2);
    const a2 = await page.evaluate(() => ({ ...window.__audio }));
    await hide(true); await hide(false);
    await page.waitForTimeout(300);
    const a3 = await page.evaluate(() => ({ ...window.__audio }));
    expect(a3.resume).toBe(a2.resume);
  });

  test('keine Fehler', async () => { expect(L.problems(s.log)).toEqual([]); });
});
