// Ablauf 5: Zeitraffer
const { test, expect } = require('playwright/test');
const L = require('./lib');

test.describe.serial('Zeitraffer', () => {
  let s, page;
  test.beforeAll(async ({ browser }, info) => {
    s = await L.open(browser, info);
    page = s.page;
    await page.click('#goQuiet');
  });
  test.afterAll(async () => {
    await s.close();
  });
  const speed = t => expect(page.locator('#speed')).toHaveText(t);
  const days = () => page.evaluate(() => window.__t.ex.simDays);

  test('Vorgabe 20 Tage/s, das Datum läuft', async () => {
    await speed('20 Tage/s');
    const a = await days();
    const d0 = await page.locator('#date').textContent();
    await expect.poll(days, { timeout: 30000 }).toBeGreaterThan(a + 5);
    await expect(page.locator('#date')).not.toHaveText(d0, { timeout: 30000 });
  });

  test('Langsamer durchläuft 5, 1, Pause und bleibt an der Grenze', async () => {
    const s0 = page.locator('#slower');
    await s0.click();
    await speed('5 Tage/s');
    await s0.click();
    await speed('1 Tag/s');
    await s0.click();
    await speed('Pause');
    await s0.click();
    await speed('Pause');
    expect((await L.state(page)).speedIdx).toBe(0);
  });

  test('bei Pause steht das Datum still', async () => {
    // Die Geschwindigkeit läuft weich aus: warten, bis sich die Zeit nicht mehr bewegt
    await expect
      .poll(
        async () => {
          const a = await days();
          await page.waitForTimeout(700);
          return (await days()) - a;
        },
        { timeout: 60000 },
      )
      .toBe(0);
    const a = await days(),
      d = await page.locator('#date').textContent();
    await page.waitForTimeout(2500);
    expect(await days()).toBe(a);
    await expect(page.locator('#date')).toHaveText(d);
  });

  test('Schneller durchläuft alle Stufen bis 730 Tage/s und bleibt an der Grenze', async () => {
    const f = page.locator('#faster');
    for (const t of ['1 Tag/s', '5 Tage/s', '20 Tage/s', '60 Tage/s', '200 Tage/s', '730 Tage/s', '730 Tage/s']) {
      await f.click();
      await speed(t);
    }
    expect((await L.state(page)).speedIdx).toBe(6);
    const a = await days();
    await expect.poll(days, { timeout: 30000 }).toBeGreaterThan(a + 100);
  });

  test('in der Nahansicht zeigt #eff das gebremste Tempo', async () => {
    await L.chip(page, 'mars').click();
    await expect(page.locator('#eff')).toHaveText(/^Nahansicht: /, { timeout: 30000 });
    await expect(page.locator('#eff')).toHaveText(/Tage\/s$/);
    await L.chip(page, 'overview').click();
    await expect(page.locator('#eff')).toHaveText('', { timeout: 30000 });
  });

  test('Tasten des Steppers haben Beschriftungen', async () => {
    await expect(page.locator('#slower')).toHaveAttribute('aria-label', 'Langsamer');
    await expect(page.locator('#faster')).toHaveAttribute('aria-label', 'Schneller');
    await expect(page.locator('.stepper')).toHaveAttribute('aria-label', 'Zeitraffer');
  });

  test('keine Fehler', async () => {
    expect(L.problems(s.log)).toEqual([]);
  });
});
