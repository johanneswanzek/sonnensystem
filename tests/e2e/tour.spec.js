// Ablauf 3: Tour-Knopf, Leertaste, selbstständiges Weiterschalten, Abschnitte von Erde und Mars
const { test, expect } = require('playwright/test');
const L = require('./lib');

test.describe.serial('Tour', () => {
  let s, page;
  test.beforeAll(async ({ browser }, info) => {
    s = await L.open(browser, info);
    page = s.page;
    await page.click('#goQuiet');
  });
  test.afterAll(async () => {
    await s.close();
  });

  test('Tour-Knopf hält an und setzt fort, aria-label wechselt', async () => {
    const t = page.locator('#tour');
    await expect(t).toHaveAttribute('aria-pressed', 'true');
    await expect(t).toHaveAttribute('aria-label', 'Tour pausieren');
    await t.click();
    await expect(t).toHaveAttribute('aria-pressed', 'false');
    await expect(t).toHaveAttribute('aria-label', 'Tour starten');
    expect((await L.state(page)).tour).toBe(false);
    await t.click();
    await expect(t).toHaveAttribute('aria-pressed', 'true');
    await expect(t).toHaveAttribute('aria-label', 'Tour pausieren');
  });

  test('Leertaste schaltet die Tour um (einmal, auch wenn der Knopf den Fokus hat)', async () => {
    const t = page.locator('#tour');
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.keyboard.press(' ');
    await expect(t).toHaveAttribute('aria-pressed', 'false');
    await page.keyboard.press(' ');
    await expect(t).toHaveAttribute('aria-pressed', 'true');
    await t.focus();
    await page.keyboard.press(' '); // Knopf: der Browser löst den Klick aus, die Taste selbst wird übergangen
    await expect(t).toHaveAttribute('aria-pressed', 'false');
    await page.waitForTimeout(300);
    await expect(t).toHaveAttribute('aria-pressed', 'false');
    await page.evaluate(() => document.activeElement.blur());
    await page.keyboard.press(' ');
    await expect(t).toHaveAttribute('aria-pressed', 'true');
  });

  test('bei angehaltener Tour bleibt der Halt stehen', async () => {
    await page.click('#tour');
    const before = (await L.state(page)).cur;
    await page.evaluate('window.__t.tourEnd()');
    await page.waitForTimeout(1500);
    expect((await L.state(page)).cur).toBe(before);
    await page.click('#tour');
  });

  test('Tour schaltet von selbst weiter (ohne Eingriff, nach der Verweildauer)', async () => {
    test.setTimeout(420000);
    // Übersicht: Verweildauer 12 s Erzählzeit
    expect((await L.state(page)).cur).toBe(0);
    await expect.poll(() => L.cur(page), { timeout: 360000, intervals: [1000] }).toBe(1);
    await expect(page.locator('#name')).toHaveText('Sonne');
    await expect(page.locator('#chip-sun')).toHaveAttribute('aria-current', 'true');
  });

  test('Tour durchläuft alle Halte und Abschnitte von Erde und Mars der Reihe nach', async () => {
    test.setTimeout(900000);
    await page.evaluate('window.__t.focus(3, false)'); // Venus, Tour bleibt an
    expect((await L.state(page)).tour).toBe(true);
    const seq = [
      [4, 0],
      [4, 1],
      [4, 2],
      [5, 0],
      [5, 1],
      [6, 0],
      [7, 0],
      [8, 0],
      [9, 0],
      [10, 0],
      [0, 0],
      [1, 0],
    ];
    for (const [c, st] of seq) {
      await page.evaluate('window.__t.tourEnd()');
      await expect
        .poll(
          async () => {
            const x = await L.state(page);
            return [x.cur, x.stage];
          },
          { message: 'Halt ' + c + '/' + st, timeout: 120000 },
        )
        .toEqual([c, st]);
      if (c === 4 && st === 1) await expect(page.locator('#kind')).toHaveText('Erde · Kontinente und Ozeane');
      if (c === 4 && st === 2) await expect(page.locator('#kind')).toHaveText('Erde · Aufbau');
      if (c === 5 && st === 1) {
        await expect(page.locator('#kind')).toHaveText('Mars · Eine mögliche Kolonie');
        await expect.poll(async () => (await L.state(page)).surfOn, { timeout: 240000 }).toBe(true);
        await expect(page.locator('#app')).toHaveClass(/\bsurf\b/);
      }
      if (c === 6) {
        await expect.poll(async () => (await L.state(page)).surfOn, { timeout: 120000 }).toBe(false);
        await expect(page.locator('#app')).not.toHaveClass(/\bsurf\b/);
      }
    }
    const x = await L.state(page);
    expect(x.loops).toBe(1);
    expect(x.tour).toBe(true);
  });

  test('keine Fehler', async () => {
    expect(L.problems(s.log)).toEqual([]);
  });
});
