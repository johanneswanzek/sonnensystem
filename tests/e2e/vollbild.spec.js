// Ablauf 7: Vollbild-Knopf und Taste F
const { test, expect } = require('playwright/test');
const L = require('./lib');

test.describe.serial('Vollbild', () => {
  let s, page;
  test.beforeAll(async ({ browser }, info) => {
    s = await L.open(browser, info);
    page = s.page;
    await page.click('#goQuiet');
  });
  test.afterAll(async () => {
    await s.close();
  });
  const hiddenInCine = ['.clock', '#tour', '.langbox', '#blurb', '#rail'];
  const expectCine = async on => {
    const f = page.locator('#full');
    await expect(page.locator('#app')).toHaveClass(on ? /\bcine\b/ : /^(?!.*\bcine\b)/);
    await expect(f).toHaveAttribute('aria-pressed', on ? 'true' : 'false');
    await expect(f).toHaveAttribute('aria-label', on ? 'Vollbild verlassen' : 'Vollbild');
    for (const sel of hiddenInCine)
      await (on ? expect(page.locator(sel)).toBeHidden() : expect(page.locator(sel)).toBeVisible());
    for (const sel of ['#name', '#kind', '#sound', '#full', '#prev', '#next'])
      await expect(page.locator(sel)).toBeVisible();
    expect((await L.state(page)).cine).toBe(on);
  };

  test('Ausgangszustand', async () => {
    await expectCine(false);
  });

  test('Knopf: Klasse cine, Bedienelemente ausgeblendet; zweiter Klick stellt alles wieder her', async () => {
    await page.click('#full');
    await expectCine(true);
    await page.click('#full');
    // Beim Verlassen über den Knopf auch das echte Vollbild beenden
    await expectCine(false);
    await expect.poll(() => page.evaluate(() => !document.fullscreenElement)).toBe(true);
  });

  test('Taste F schaltet um', async () => {
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.keyboard.press('f');
    await expectCine(true);
    await page.keyboard.press('F');
    await expectCine(false);
  });

  test('Vollbild setzt eine angehaltene Tour fort', async () => {
    await page.click('#tour');
    await expect(page.locator('#tour')).toHaveAttribute('aria-pressed', 'false');
    await page.keyboard.press('f');
    await expectCine(true);
    expect((await L.state(page)).tour).toBe(true);
    await page.keyboard.press('f');
    await expectCine(false);
    await expect(page.locator('#tour')).toHaveAttribute('aria-pressed', 'true');
  });

  test('Verlassen des echten Vollbilds (z. B. mit Esc) stellt die Oberfläche wieder her', async () => {
    await page.keyboard.press('f');
    await expectCine(true);
    const real = await page.evaluate(() => !!document.fullscreenElement);
    test.skip(!real, 'Der Browser hat das echte Vollbild nicht gewährt (kommt in Umgebungen ohne Fenster vor)');
    await page.evaluate(() => document.exitFullscreen());
    await expectCine(false);
  });

  test('keine Fehler', async () => {
    expect(L.problems(s.log)).toEqual([]);
  });
});
