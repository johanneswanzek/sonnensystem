// Ablauf 10: Abschnitte der Erde (0 Planet, 1 Kontinente, 2 Aufbau) und des Mars (0 Planet, 1 Basis auf der Oberfläche)
const { test, expect } = require('playwright/test');
const L = require('./lib');

test.describe.serial('Erde und Mars', () => {
  let s, page;
  test.beforeAll(async ({ browser }, info) => { s = await L.open(browser, info); page = s.page; await page.click('#goQuiet'); });
  test.afterAll(async () => { await s.close(); });
  const at = async (c, st) => expect.poll(async () => { const x = await L.state(page); return [x.cur, x.stage]; }, { timeout: 60000 }).toEqual([c, st]);

  test('Erde: Klick auf den aktiven Chip schaltet die Abschnitte 0, 1, 2 und wieder 0', async () => {
    await L.chip(page, 'earth').click(); await at(4, 0);
    await expect(page.locator('#kind')).toHaveText('Gesteinsplanet · 3. Planet');
    await L.chip(page, 'earth').click(); await at(4, 1);
    await expect(page.locator('#kind')).toHaveText('Erde · Kontinente und Ozeane');
    await expect(page.locator('#blurb')).toContainText('71 %');
    await L.chip(page, 'earth').click(); await at(4, 2);
    await expect(page.locator('#kind')).toHaveText('Erde · Aufbau');
    await expect(page.locator('#blurb')).toContainText('6.371 km');
    await expect(page.locator('#name')).toHaveText('Erde');
    await L.chip(page, 'earth').click(); await at(4, 0);
    await expect(page.locator('#kind')).toHaveText('Gesteinsplanet · 3. Planet');
  });

  test('Erde: setStage über den Haken; Sprecher-Kapitel wechselt mit', async () => {
    for (const [n, id] of [[1, 'earth_geo'], [2, 'earth_core'], [0, 'earth']]) {
      await page.evaluate(n => window.__t.setStage(n), n);
      await at(4, n);
      expect((await L.state(page)).narId).toBe(id);
    }
  });

  test('Erde: kein Wechsel in die Oberflächenszene', async () => {
    await page.evaluate('window.__t.setStage(2)'); await at(4, 2);
    expect((await L.state(page)).surfOn).toBe(false);
    await expect(page.locator('#app')).not.toHaveClass(/\bsurf\b/);
  });

  test('Weiter von der Erde setzt den Abschnitt zurück', async () => {
    await page.click('#next'); await at(5, 0);
    await L.chip(page, 'earth').click(); await at(4, 0);
  });

  test('Mars: Abschnitt 1 schaltet auf die Oberfläche (surfOn, Klasse surf)', async () => {
    test.setTimeout(600000);
    await L.chip(page, 'mars').click(); await at(5, 0);
    await expect(page.locator('#kind')).toHaveText('Gesteinsplanet · 4. Planet');
    expect((await L.state(page)).surfOn).toBe(false);
    await L.chip(page, 'mars').click(); await at(5, 1);
    await expect(page.locator('#kind')).toHaveText('Mars · Eine mögliche Kolonie');
    await expect(page.locator('#blurb')).toContainText('Entwurf nach Studien');
    expect((await L.state(page)).narId).toBe('mars_base');
    await expect.poll(async () => (await L.state(page)).surfOn, { timeout: 300000, intervals: [1000] }).toBe(true);
    await expect(page.locator('#app')).toHaveClass(/\bsurf\b/);
  });

  test('Mars: Rückweg in den Weltraum (zweiter Klick auf den Chip)', async () => {
    test.setTimeout(600000);
    await L.chip(page, 'mars').click(); await at(5, 0);
    await expect.poll(async () => (await L.state(page)).surfOn, { timeout: 300000, intervals: [1000] }).toBe(false);
    await expect(page.locator('#app')).not.toHaveClass(/\bsurf\b/);
    await expect(page.locator('#kind')).toHaveText('Gesteinsplanet · 4. Planet');
  });

  test('Mars: von der Oberfläche mit Weiter zum nächsten Halt, Oberfläche wird verlassen', async () => {
    test.setTimeout(600000);
    await page.evaluate('window.__t.setStage(1)'); await at(5, 1);
    await expect.poll(async () => (await L.state(page)).surfOn, { timeout: 300000, intervals: [1000] }).toBe(true);
    await page.click('#next'); await at(6, 0);
    await expect.poll(async () => (await L.state(page)).surfOn, { timeout: 300000, intervals: [1000] }).toBe(false);
    await expect(page.locator('#app')).not.toHaveClass(/\bsurf\b/);
    await expect(page.locator('#name')).toHaveText('Asteroidengürtel');
  });

  test('keine Fehler', async () => { expect(L.problems(s.log)).toEqual([]); });
});
