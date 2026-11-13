// Ablauf 2: Start mit Ton (#go) und ohne Ton (#goQuiet)
const { test, expect } = require('playwright/test');
const L = require('./lib');

test.describe.serial('Start ohne Ton', () => {
  let s;
  test.beforeAll(async ({ browser }, info) => { s = await L.open(browser, info); });
  test.afterAll(async () => { await s.close(); });

  test('Startfläche verschwindet, Tour läuft, Ton bleibt aus', async () => {
    const { page } = s;
    await page.click('#goQuiet');
    await expect(page.locator('#start')).toBeHidden();
    await expect(page.locator('#tour')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#tour')).toHaveAttribute('aria-label', 'Tour pausieren');
    await expect(page.locator('#sound')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#sound')).toHaveAttribute('aria-label', /^Ton aus\. Antippen für: Musik und Sprecher$/);
    await expect(page.locator('#caption')).toBeVisible();
  });

  test('ohne Ton wird weder Sprecher noch Musik geladen', async () => {
    await s.page.waitForTimeout(1500);
    expect(s.log.requests.filter(u => /^\/(voice|audio)\//.test(u))).toEqual([]);
    expect(L.problems(s.log)).toEqual([]);
  });
});

test.describe.serial('Start mit Ton', () => {
  let s;
  test.beforeAll(async ({ browser }, info) => { s = await L.open(browser, info); });
  test.afterAll(async () => { await s.close(); });

  test('Startfläche verschwindet, Tour läuft, Ton ist an', async () => {
    const { page } = s;
    await page.click('#go');
    await expect(page.locator('#start')).toBeHidden();
    await expect(page.locator('#tour')).toHaveAttribute('aria-pressed', 'true');
    // Der Ton schaltet sich ein, sobald die Clips geladen und dekodiert sind
    await expect(page.locator('#sound')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#sound')).toHaveAttribute('aria-label', /^Musik und Sprecher\. Antippen für: Nur Sprecher, ohne Musik$/);
  });

  test('alle 15 Sprecher-Clips der Sprache und die Musik werden geladen', async () => {
    const got = new Set(s.log.requests);
    for (const id of L.CLIPS) expect(got.has(L.clipUrl('de', id)), L.clipUrl('de', id)).toBe(true);
    expect(got.has('/audio/music.mp3')).toBe(true);
    // keine Clips anderer Sprachen
    expect([...got].filter(u => /^\/voice\/(en|pl)\//.test(u))).toEqual([]);
  });

  test('keine Fehler', async () => { expect(L.problems(s.log)).toEqual([]); });
});
