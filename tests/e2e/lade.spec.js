// Ablauf 1: Laden der Seite
const { test, expect } = require('playwright/test');
const L = require('./lib');

test.describe.serial('Laden', () => {
  let s, info;
  test.beforeAll(async ({ browser }, testInfo) => { info = testInfo; s = await L.open(browser, testInfo); });
  test.afterAll(async () => { await s.close(); });

  test('Loader verschwindet, Startknöpfe erscheinen', async () => {
    const { page } = s;
    await expect(page.locator('#loader')).toBeHidden();
    await expect(page.locator('#start')).toBeVisible();
    await expect(page.locator('#go')).toBeVisible();
    await expect(page.locator('#goQuiet')).toBeVisible();
    await expect(page.locator('#go')).toHaveText('Reise starten');
    await expect(page.locator('#goQuiet')).toHaveText('Ohne Ton starten');
    // Vor dem Start läuft keine Tour, Ton ist aus
    await expect(page.locator('#tour')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#sound')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#name')).toHaveText('Sonnensystem');
    await expect(page.locator('#chip-overview')).toHaveAttribute('aria-current', 'true');
  });

  test('Leiste hat 11 Körper-Chips plus Quellen, Beschriftungen für 10 Körper', async () => {
    const { page } = s;
    await expect(page.locator('#rail .chip')).toHaveCount(12);
    await expect(page.locator('#rail .chip.more')).toHaveText('Quellen');
    await expect(page.locator('#labels .lbl')).toHaveCount(10);
    await expect(page.locator('canvas#stage')).toHaveAttribute('aria-label', /Sonnensystem/);
  });

  test('Datum und Zeitraffer sind gesetzt', async () => {
    const { page } = s;
    await expect(page.locator('#date')).toHaveText(/\d{2}\.? \S+\.? \d{4}/);
    await expect(page.locator('#speed')).toHaveText('20 Tage/s');
  });

  test('Canvas ist gezeichnet (nicht leer)', async () => {
    const { page } = s;
    const dim = await page.evaluate(() => { const c = document.querySelector('#stage'); const r = c.getBoundingClientRect(); return [r.width, r.height]; });
    expect(dim[0]).toBeGreaterThan(100); expect(dim[1]).toBeGreaterThan(100);
  });

  test('keine Konsolenfehler, keine fremden Adressen, keine fehlgeschlagenen Anfragen', async () => {
    await s.page.waitForTimeout(1500);       // Modelle laden nach dem Start nach
    expect(L.problems(s.log)).toEqual([]);
    expect(s.log.requests.some(u => /^\/assets\/index-[\w-]+\.js/.test(u)), 'gebündeltes Programm samt three.js geladen').toBe(true);
  });
});
