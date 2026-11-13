// Ablauf 11: Layout in vier Formaten
const { test, expect } = require('playwright/test');
const L = require('./lib');

const VIEWS = [
  { name: 'Handy hoch 390x760', w: 390, h: 760, wide: false, short: false },
  { name: 'Handy klein 320x568', w: 320, h: 568, wide: false, short: false },
  { name: 'Monitor 1920x1080', w: 1920, h: 1080, wide: true, short: false },
  { name: 'Handy quer 740x360', w: 740, h: 360, wide: true, short: true },
];

test.describe.serial('Layout', () => {
  let s, page;
  test.beforeAll(async ({ browser }, info) => {
    s = await L.open(browser, info);
    page = s.page;
  });
  test.afterAll(async () => {
    await s.close();
  });

  const resize = async v => {
    await page.setViewportSize({ width: v.w, height: v.h });
    await expect(page.locator('#app')).toHaveClass(v.wide ? /\bwide\b/ : /^(?!.*\bwide\b)/);
    await expect(page.locator('#app')).toHaveClass(v.short ? /\bshort\b/ : /^(?!.*\bshort\b)/);
    await page.waitForTimeout(500);
  };
  const inside = (b, v, what) => {
    expect(b, what + ' sichtbar').not.toBeNull();
    expect(b.x, what + ' links').toBeGreaterThanOrEqual(-0.5);
    expect(b.y, what + ' oben').toBeGreaterThanOrEqual(-0.5);
    expect(b.x + b.width, what + ' rechts').toBeLessThanOrEqual(v.w + 0.5);
    expect(b.y + b.height, what + ' unten').toBeLessThanOrEqual(v.h + 0.5);
  };
  const noHScroll = async v => {
    const m = await page.evaluate(() => ({
      iw: innerWidth,
      de: document.documentElement.scrollWidth,
      bo: document.body.scrollWidth,
      ap: document.querySelector('#app').scrollWidth,
    }));
    expect(m.de, 'documentElement.scrollWidth').toBeLessThanOrEqual(m.iw);
    expect(m.bo, 'body.scrollWidth').toBeLessThanOrEqual(m.iw);
    expect(m.ap, '#app.scrollWidth').toBeLessThanOrEqual(m.iw);
  };
  const hud = async v => {
    const sel = ['#tour', '#sound', '#full', '#lang'],
      bx = {};
    for (const q of sel) {
      bx[q] = await L.box(page, q);
      inside(bx[q], v, q);
    }
    bx.clock = await L.box(page, '.clock');
    inside(bx.clock, v, 'Uhr');
    const names = Object.keys(bx);
    for (let i = 0; i < names.length; i++)
      for (let j = i + 1; j < names.length; j++)
        expect(L.overlap(bx[names[i]], bx[names[j]]), names[i] + ' überlappt ' + names[j]).toBeFalsy();
  };

  for (const v of VIEWS)
    test('vor dem Start: ' + v.name, async () => {
      await resize(v);
      inside(await L.box(page, '#go'), v, '#go');
      inside(await L.box(page, '#goQuiet'), v, '#goQuiet');
      await hud(v);
      await noHScroll(v);
    });

  test('Reise ohne Ton starten', async () => {
    await page.click('#goQuiet');
    await expect(page.locator('#start')).toBeHidden();
  });

  for (const v of VIEWS)
    test('nach dem Start: ' + v.name, async () => {
      await resize(v);
      await hud(v);
      await noHScroll(v);
      for (const id of ['overview', 'earth', 'belt']) {
        // "Asteroidengürtel" ist der längste Titel
        await L.chip(page, id).click();
        await page.waitForTimeout(300);
        for (const q of ['#name', '#prev', '#next', '#kind']) inside(await L.box(page, q), v, id + ' ' + q);
        expect(
          L.overlap(await L.box(page, '#name'), await L.box(page, '.nav')),
          id + ': Titel überlappt Navigation',
        ).toBeFalsy();
        if (!v.short) inside(await L.box(page, '#blurb'), v, id + ' #blurb');
        inside(await L.box(page, '#rail'), v, 'Leiste');
        await hud(v);
        await noHScroll(v);
      }
    });

  for (const v of VIEWS)
    test('Leiste: ' + v.name, async () => {
      await resize(v);
      const r = await page
        .locator('#rail')
        .evaluate(n => ({ sw: n.scrollWidth, cw: n.clientWidth, ox: getComputedStyle(n).overflowX }));
      if (v.w < 800) {
        expect(r.sw, 'Leiste ist breiter als sichtbar').toBeGreaterThan(r.cw);
        expect(['auto', 'scroll']).toContain(r.ox);
        const x = await page.locator('#rail').evaluate(n => {
          n.scrollTo({ left: 0 });
          const a = n.scrollLeft;
          n.scrollTo({ left: 99999 });
          return [a, n.scrollLeft];
        });
        await expect.poll(() => page.locator('#rail').evaluate(n => n.scrollLeft)).toBeGreaterThan(x[0]);
        // Der letzte Chip (Quellen) ist ganz ans Ende gerollt erreichbar
        const last = await L.box(page, '#rail > *:last-child'),
          rb = await L.box(page, '#rail');
        expect(last.x + last.width).toBeLessThanOrEqual(rb.x + rb.width + 2);
        await page.locator('#rail').evaluate(n => n.scrollTo({ left: 0 }));
      }
      inside(await L.box(page, '#rail'), v, 'Leiste');
      await noHScroll(v);
    });

  for (const v of VIEWS)
    test('Sprachmenü bleibt im Bild: ' + v.name, async () => {
      await resize(v);
      await page.click('#lang');
      await expect(page.locator('#langMenu')).toBeVisible();
      inside(await L.box(page, '#langMenu'), v, 'Sprachmenü');
      expect(
        L.overlap(await L.box(page, '#langMenu'), await L.box(page, '#lang')),
        'Menü verdeckt den Knopf',
      ).toBeFalsy();
      await page.keyboard.press('Escape');
      await expect(page.locator('#langMenu')).toBeHidden();
    });

  test('keine Fehler', async () => {
    expect(L.problems(s.log)).toEqual([]);
  });
});
