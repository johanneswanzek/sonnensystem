// Ablauf 9: Dialog "Quellen"
const { test, expect } = require('playwright/test');
const L = require('./lib');

test.describe.serial('Dialog Quellen', () => {
  let s, page;
  test.beforeAll(async ({ browser }, info) => {
    s = await L.open(browser, info);
    page = s.page;
    await page.click('#goQuiet');
  });
  test.afterAll(async () => {
    await s.close();
  });
  const dlg = () => page.locator('#credits');
  const modal = () => page.evaluate(() => document.querySelector('#credits').matches(':modal'));

  test('der letzte Chip der Leiste öffnet den modalen Dialog', async () => {
    const last = page.locator('#rail > *').last();
    await expect(last).toHaveText('Quellen');
    await expect(dlg()).toBeHidden();
    await last.click();
    await expect(dlg()).toBeVisible();
    expect(await dlg().evaluate(d => d.open)).toBe(true);
    expect(await modal()).toBe(true);
    await expect(page.locator('#creditsT')).toHaveText('Quellen und Lizenzen');
    await expect(dlg()).toHaveAttribute('aria-labelledby', 'creditsT');
    await expect(dlg().getByRole('button', { name: 'Schließen' })).toBeVisible();
  });

  test('Tastenkürzel sind bei offenem Dialog aus', async () => {
    const before = await L.state(page);
    // (Leertaste und Eingabe betätigen den fokussierten Schließen-Knopf und gehören nicht zu den Tastenkürzeln der Seite)
    for (const k of ['ArrowRight', 'ArrowLeft', 'f', 'F', 'm', 'M']) await page.keyboard.press(k);
    await page.waitForTimeout(400);
    const after = await L.state(page);
    for (const k of ['cur', 'tour', 'cine', 'soundMode']) expect(after[k], k).toBe(before[k]);
    await expect(dlg()).toBeVisible();
  });

  test('"Schließen" schließt den Dialog', async () => {
    await dlg().getByRole('button', { name: 'Schließen' }).click();
    await expect(dlg()).toBeHidden();
    expect(await dlg().evaluate(d => d.open)).toBe(false);
  });

  test('Escape schließt den Dialog, danach gehen die Tastenkürzel wieder', async () => {
    await page.locator('#rail > *').last().click();
    await expect(dlg()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dlg()).toBeHidden();
    const c = (await L.state(page)).cur;
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => L.cur(page)).toBe((c + 1) % 11);
  });

  test('Impressum und Datenschutz bleiben aus, solange site.json sie nicht nennt', async () => {
    await expect(page.locator('#legal')).toBeHidden();
  });

  test('keine Fehler', async () => {
    expect(L.problems(s.log)).toEqual([]);
  });
});
