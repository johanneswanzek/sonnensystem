// Neue Tonmodule: Musik je Ort (Hauptstück, Erde, Mars) und Effekte unter audio/sfx/ (nur Testseite, Haken window.__au.st)
const fs = require('fs'),
  path = require('path');
const { test, expect } = require('playwright/test');
const L = require('./lib');
const { ROOT } = require('./server');

test.describe.serial('Musik und Effekte', () => {
  let s, page;
  test.beforeAll(async ({ browser }, info) => {
    s = await L.open(browser, info);
    page = s.page;
    await page.click('#go');
    await expect(page.locator('#sound')).toHaveAttribute('aria-pressed', 'true');
  });
  test.afterAll(async () => {
    await s.close();
  });
  const au = () => page.evaluate(() => window.__au.st);
  const want = w => expect.poll(async () => (await au()).want, { timeout: 60000 }).toBe(w);

  test('Hauptstück läuft nach dem Start', async () => {
    await expect.poll(async () => (await au()).buf.main, { timeout: 120000 }).toBe(true);
    expect((await au()).want).toBe('main');
  });

  test('Fokus Erde wählt das Erdstück, Mars das Marsstück, Verlassen das Hauptstück', async () => {
    await L.chip(page, 'earth').click();
    await want('earth');
    await page.evaluate('window.__t.setStage(1)');
    await want('earth');
    await L.chip(page, 'mars').click();
    await want('mars');
    await expect.poll(async () => (await au()).shown, { timeout: 120000 }).toBe('mars');
    await L.chip(page, 'jupiter').click();
    await want('main');
    await expect.poll(async () => (await au()).shown, { timeout: 120000 }).toBe('main');
  });

  test('alle Dateien unter audio/sfx/ werden geladen', async () => {
    const files = fs.readdirSync(path.join(ROOT, 'public/audio/sfx')).filter(f => f.endsWith('.mp3'));
    expect(files.length).toBeGreaterThanOrEqual(13);
    await expect
      .poll(() => s.log.requests.filter(u => u.startsWith('/audio/sfx/')).length, { timeout: 120000 })
      .toBeGreaterThanOrEqual(files.length);
    for (const f of files) expect(s.log.requests, f).toContain('/audio/sfx/' + f);
    expect(L.problems(s.log)).toEqual([]);
  });
});

test('alle Musik- und Effektdateien sind vorhanden und lieferbar', async ({ request }, info) => {
  const o = L.originOf(info);
  const files = ['audio/music.mp3', 'audio/music-earth.mp3', 'audio/music-mars.mp3'].concat(
    fs.readdirSync(path.join(ROOT, 'public/audio/sfx')).map(f => 'audio/sfx/' + f),
  );
  for (const f of files) {
    const r = await request.get(o + '/' + f);
    expect(r.status(), f).toBe(200);
    expect((await r.body()).length, f).toBeGreaterThan(1000);
  }
});
