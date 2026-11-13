// Ablauf 4: Navigation (Weiter/Zurück, Pfeiltasten, Chips, Beschriftungen im Bild, Umlauf)
const { test, expect } = require('playwright/test');
const L = require('./lib');

// Art (#kind) je Halt in der Quellsprache
const KIND = ['Übersicht', 'Stern · Zentrum des Systems', 'Gesteinsplanet · 1. Planet', 'Gesteinsplanet · 2. Planet', 'Gesteinsplanet · 3. Planet',
  'Gesteinsplanet · 4. Planet', 'Kleinkörper · zwischen Mars und Jupiter', 'Gasriese · 5. Planet', 'Gasriese · 6. Planet', 'Eisriese · 7. Planet', 'Eisriese · 8. Planet'];

test.describe.serial('Navigation', () => {
  let s, page;
  test.beforeAll(async ({ browser }, info) => { s = await L.open(browser, info); page = s.page; await page.click('#goQuiet'); });
  test.afterAll(async () => { await s.close(); });

  const expectBody = async i => {
    await expect(page.locator('#name')).toHaveText(L.NAMES.de.names[i]);
    await expect(page.locator('#kind')).toHaveText(KIND[i]);
    await expect(page.locator('#blurb')).not.toHaveText('');
    await expect(page.locator('#sr')).not.toHaveText('');
    await expect(page.locator('#rail [aria-current="true"]')).toHaveCount(1);
    await expect(L.chip(page, L.IDS[i])).toHaveAttribute('aria-current', 'true');
    expect((await L.state(page)).cur).toBe(i);
  };

  test('Weiter und Zurück springen zum Nachbarn, die Tour bleibt an', async () => {
    await expectBody(0);
    await page.click('#next'); await expectBody(1);
    await page.click('#next'); await expectBody(2);
    await page.click('#prev'); await expectBody(1);
    expect((await L.state(page)).tour).toBe(true);
    await expect(page.locator('#tour')).toHaveAttribute('aria-pressed', 'true');
  });

  test('Pfeiltasten wirken wie Weiter und Zurück', async () => {
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.keyboard.press('ArrowRight'); await expectBody(2);
    await page.keyboard.press('ArrowRight'); await expectBody(3);
    await page.keyboard.press('ArrowLeft'); await expectBody(2);
  });

  test('jeder Chip setzt Halt, aria-current, Titel, Art, Text und Vorlesetext', async () => {
    const seen = { blurb: new Set(), sr: new Set() };
    for (const i of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 0]) {
      await L.chip(page, L.IDS[i]).click();
      await expectBody(i);
      seen.blurb.add(await page.locator('#blurb').textContent());
      seen.sr.add(await page.locator('#sr').textContent());
    }
    expect(seen.blurb.size).toBe(11);
    expect(seen.sr.size).toBe(11);
    // Ein Klick auf einen Chip ist Nutzereingriff: die Tour hält an
    await expect(page.locator('#tour')).toHaveAttribute('aria-pressed', 'false');
  });

  test('Vorlesetext enthält Kennzahlen des Körpers', async () => {
    await L.chip(page, 'mercury').click();
    await expect(page.locator('#sr')).toContainText('4.879 km');
    await L.chip(page, 'sun').click();
    await expect(page.locator('#sr')).toContainText('1.392.700 km');
  });

  test('Chip der Leiste bleibt in der sichtbaren Leiste (scrollt mit)', async () => {
    await L.chip(page, 'neptune').click();
    await expect.poll(async () => {
      const r = await page.locator('#rail').boundingBox(), c = await L.chip(page, 'neptune').boundingBox();
      return c.x >= r.x - 2 && c.x + c.width <= r.x + r.width + 2;
    }).toBe(true);
  });

  test('Klick auf ein Etikett im Bild fokussiert den Körper', async () => {
    await L.chip(page, 'overview').click();
    await expectBody(0);
    // Etiketten werden von den Messmarken sichtbar geschaltet und positioniert
    await expect.poll(() => page.evaluate(() => [...document.querySelectorAll('#labels .lbl')].filter(l => l.style.visibility === 'visible').length), { timeout: 60000 }).toBeGreaterThan(2);
    const pick = await page.evaluate(() => {
      const ls = [...document.querySelectorAll('#labels .lbl')].map((l, k) => ({ k, v: l.style.visibility === 'visible', t: l.textContent }));
      const v = ls.filter(x => x.v); return v[v.length - 1];
    });
    await page.locator('#labels .lbl').nth(pick.k).click({ force: true });
    await expectBody(pick.k + 1);
    await expect(page.locator('#name')).toContainText(pick.t.trim().slice(0, 4));
  });

  test('Umlauf über das Ende: Zurück von der Übersicht geht zu Neptun, Weiter von Neptun zur Übersicht', async () => {
    await L.chip(page, 'overview').click();
    await page.click('#prev'); await expectBody(10);
    const loops0 = (await L.state(page)).loops;
    await page.click('#next'); await expectBody(0);
    expect((await L.state(page)).loops).toBe(loops0 + 1);
    // nach einem vollen Umlauf spricht der Sprecher den Schluss (outro)
    expect((await L.state(page)).narId).toBe('outro');
    await page.keyboard.press('ArrowLeft'); await expectBody(10);
    await page.keyboard.press('ArrowRight'); await expectBody(0);
  });

  test('Sprachmenü: Escape schließt und gibt dem Knopf den Fokus zurück', async () => {
    await page.click('#lang');
    await expect(page.locator('#langMenu')).toBeVisible();
    await expect(page.locator('#lang')).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(page.locator('#langMenu')).toBeHidden();
    await expect(page.locator('#lang')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#lang')).toBeFocused();
  });

  test('keine Fehler', async () => { expect(L.problems(s.log)).toEqual([]); });
});
