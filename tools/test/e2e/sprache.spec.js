// Ablauf 8: Sprache (Erkennung, ?lang=, gespeicherte Wahl, Menü, Texte, Sprecher-Clips, Zeitmarken)
const fs = require('fs'), path = require('path');
const { test, expect } = require('playwright/test');
const L = require('./lib');
const { ROOT } = require('../server');

const TITLE = { de: 'Sonnensystem – eine Kamerafahrt', en: 'Solar System – a camera flight', pl: 'Układ Słoneczny – lot kamery' };
const GO = { de: 'Reise starten', en: 'Start the journey', pl: 'Rozpocznij podróż' };
const QUIET = { de: 'Ohne Ton starten', en: 'Start without sound', pl: 'Rozpocznij bez dźwięku' };
const SLOWER = { de: 'Langsamer', en: 'Slower', pl: 'Wolniej' };
const FULL = { de: 'Vollbild', en: 'Full screen', pl: 'Pełny ekran' };
const LANGLBL = { de: 'Sprache', en: 'Language', pl: 'Język' };
const NATIVE = { de: 'Deutsch', en: 'English', pl: 'Polski' };

// Oberfläche ohne three.js (schnell): Sprache, Markup und Leiste stehen, bevor die 3D-Szene aufgebaut wird
const ui = (browser, info, o) => L.open(browser, info, { light: true, wait: 'ui', ...o });
const lang = page => page.evaluate(() => ({ btn: document.querySelector('#lang').textContent, html: document.documentElement.lang, app: document.querySelector('#app').lang, title: document.title }));

test.describe('Spracherkennung (Oberfläche)', () => {
  const cases = [['de-DE', 'de'], ['pl-PL', 'pl'], ['en-US', 'en'], ['fr-FR', 'en'], ['en-GB', 'en'], ['pl', 'pl']];
  for (const [locale, want] of cases) test('Browsersprache ' + locale + ' ergibt ' + want, async ({ browser }, info) => {
    const s = await ui(browser, info, { locale });
    try {
      const x = await lang(s.page);
      expect(x.btn).toBe(want.toUpperCase());
      expect(x.html).toBe(want); expect(x.app).toBe(want);
      expect(x.title).toBe(TITLE[want]);
      await expect(s.page.locator('#go')).toHaveText(GO[want]);
      await expect(s.page.locator('#goQuiet')).toHaveText(QUIET[want]);
      await expect(s.page.locator('#slower')).toHaveAttribute('aria-label', SLOWER[want]);
      await expect(s.page.locator('#full')).toHaveAttribute('aria-label', FULL[want]);
      await expect(s.page.locator('#lang')).toHaveAttribute('aria-label', LANGLBL[want]);
      await expect(s.page.locator('#chip-overview')).toHaveText(L.NAMES[want].chips[0]);
      await expect(s.page.locator('#chip-neptune')).toHaveText(L.NAMES[want].chips[10]);
    } finally { await s.close(); }
  });

  test('?lang= hat Vorrang vor Browsersprache und gespeicherter Wahl', async ({ browser }, info) => {
    const s = await ui(browser, info, { locale: 'de-DE', query: '?lang=en', storage: { 'sonnensystem.lang': 'pl' } });
    try { expect((await lang(s.page)).btn).toBe('EN'); } finally { await s.close(); }
    const s2 = await ui(browser, info, { locale: 'en-US', query: '?lang=pl' });
    try { expect((await lang(s2.page)).btn).toBe('PL'); } finally { await s2.close(); }
    const s3 = await ui(browser, info, { locale: 'en-US', query: '?lang=de' });
    try { expect((await lang(s3.page)).btn).toBe('DE'); } finally { await s3.close(); }
  });

  test('unbekanntes ?lang= wird ignoriert (gespeicherte Wahl bzw. Browsersprache)', async ({ browser }, info) => {
    const s = await ui(browser, info, { locale: 'en-US', query: '?lang=xx', storage: { 'sonnensystem.lang': 'pl' } });
    try { expect((await lang(s.page)).btn).toBe('PL'); } finally { await s.close(); }
    const s2 = await ui(browser, info, { locale: 'pl-PL', query: '?lang=fr' });
    try { expect((await lang(s2.page)).btn).toBe('PL'); } finally { await s2.close(); }
  });

  test('gespeicherte Wahl (localStorage sonnensystem.lang) wirkt beim nächsten Besuch, vor der Browsersprache', async ({ browser }, info) => {
    for (const [stored, locale] of [['pl', 'en-US'], ['de', 'pl-PL'], ['en', 'de-DE']]) {
      const s = await ui(browser, info, { locale, storage: { 'sonnensystem.lang': stored } });
      try { expect((await lang(s.page)).btn, stored + ' bei ' + locale).toBe(stored.toUpperCase()); } finally { await s.close(); }
    }
    const bad = await ui(browser, info, { locale: 'pl-PL', storage: { 'sonnensystem.lang': 'zz' } });
    try { expect((await lang(bad.page)).btn).toBe('PL'); } finally { await bad.close(); }
  });
});

test.describe.serial('Sprachmenü', () => {
  let s, page;
  test.beforeAll(async ({ browser }, info) => { s = await ui(browser, info, { locale: 'de-DE' }); page = s.page; });
  test.afterAll(async () => { await s.close(); });
  const open = async on => {
    await expect(page.locator('#langMenu')).toBeVisible({ visible: on });
    await expect(page.locator('#lang')).toHaveAttribute('aria-expanded', on ? 'true' : 'false');
  };

  test('zu Beginn geschlossen, Knopf mit ARIA-Attributen', async () => {
    await open(false);
    await expect(page.locator('#lang')).toHaveAttribute('aria-haspopup', 'true');
    await expect(page.locator('#lang')).toHaveAttribute('aria-controls', 'langMenu');
    await expect(page.locator('#langMenu')).toHaveAttribute('role', 'menu');
  });

  test('Klick öffnet, zweiter Klick schließt; drei Einträge, aktueller ist aria-checked', async () => {
    await page.click('#lang'); await open(true);
    const items = page.locator('#langMenu [role=menuitemradio]');
    await expect(items).toHaveCount(3);
    await expect(items).toHaveText(['Deutsch', 'English', 'Polski']);
    await expect(items.nth(0)).toHaveAttribute('aria-checked', 'true');
    await expect(items.nth(1)).toHaveAttribute('aria-checked', 'false');
    for (const [i, l] of ['de', 'en', 'pl'].entries()) await expect(items.nth(i)).toHaveAttribute('lang', l);
    await page.click('#lang'); await open(false);
  });

  test('Klick daneben schließt', async () => {
    await page.click('#lang'); await open(true);
    await page.mouse.click(5, 300);
    await open(false);
  });

  test('Klick auf die aktuelle Sprache lädt nicht neu', async () => {
    await page.click('#lang');
    await page.evaluate(() => { window.__marker = 1; });
    await page.locator('#langMenu [lang=de]').click();
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => window.__marker)).toBe(1);
    await open(false);
  });

  test('Auswahl English lädt mit ?lang=en neu, Oberfläche und Dokument wechseln die Sprache', async () => {
    await page.click('#lang');
    await Promise.all([page.waitForURL(/[?&]lang=en\b/), page.locator('#langMenu [lang=en]').click()]);
    await page.waitForSelector('#lang');
    expect((await lang(page)).btn).toBe('EN');
    const x = await lang(page);
    expect(x.html).toBe('en'); expect(x.title).toBe(TITLE.en);
    await expect(page.locator('#go')).toHaveText(GO.en);
    await expect(page.locator('#chip-earth')).toHaveText('Earth');
    expect(await page.evaluate(() => localStorage.getItem('sonnensystem.lang'))).toBe('en');
    // Meta-Beschreibung folgt der Sprache
    expect(await page.evaluate(() => document.querySelector('meta[name=description]').content)).toMatch(/^Animated 3D journey/);
  });

  test('Auswahl Polski und zurück zu Deutsch', async () => {
    await page.click('#lang');
    await Promise.all([page.waitForURL(/[?&]lang=pl\b/), page.locator('#langMenu [lang=pl]').click()]);
    await page.waitForSelector('#lang');
    const x = await lang(page);
    expect(x.btn).toBe('PL'); expect(x.html).toBe('pl'); expect(x.title).toBe(TITLE.pl);
    await expect(page.locator('#go')).toHaveText(GO.pl);
    expect(await page.evaluate(() => document.querySelector('meta[name=description]').content)).toMatch(/^Animowana podróż 3D/);
    await page.click('#lang');
    await Promise.all([page.waitForURL(/[?&]lang=de\b/), page.locator('#langMenu [lang=de]').click()]);
    await page.waitForSelector('#lang');
    expect((await lang(page)).btn).toBe('DE');
    await expect(page.locator('#go')).toHaveText(GO.de);
  });

  test('Die Wahl bleibt beim erneuten Besuch ohne ?lang= erhalten', async () => {
    const origin = s.origin;
    await page.goto(origin + '/');
    await page.waitForSelector('#lang');
    expect((await lang(page)).btn).toBe('DE');       // Browser meldet de-DE, gespeichert ist de
  });

  // (keine Prüfung auf Konsolenfehler: three.js ist hier gesperrt, die Seite meldet das absichtlich)
});

// Sprecher-Clips und Zeitmarken: ohne Browser
test.describe('Sprecher-Clips und VOICE', () => {
  const voice = html => {
    const o = {};
    for (const l of ['DE', 'EN', 'PL']) {
      const m = html.match(new RegExp('const VOICE_' + l + ' = (\\{.*\\});'));
      expect(m, 'VOICE_' + l + ' im Quelltext').not.toBeNull();
      o[l.toLowerCase()] = JSON.parse(m[1]);
    }
    return o;
  };

  test('in jeder Sprache existieren alle 15 Clips (HEAD und GET)', async ({ request }, info) => {
    const origin = L.originOf(info);
    for (const lang of ['de', 'en', 'pl']) for (const id of L.CLIPS) {
      const u = origin + L.clipUrl(lang, id);
      const h = await request.head(u);
      expect(h.status(), 'HEAD ' + u).toBe(200);
      const g = await request.get(u);
      expect(g.status(), 'GET ' + u).toBe(200);
      expect(g.headers()['content-type'], u).toMatch(/audio\/mpeg/);
      const b = await g.body();
      expect(b.length, u + ' Größe').toBeGreaterThan(5000);
      expect(b.subarray(0, 3).toString('latin1') === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0), u + ' ist MP3').toBe(true);
    }
  });

  test('VOICE hat für alle Clips Dauer und aufsteigende Zeitmarken, in allen Sprachen dieselben Marker', async ({}, info) => {
    const v = voice(L.indexHtml(info));
    for (const lang of ['de', 'en', 'pl']) {
      expect(Object.keys(v[lang]).sort(), lang + ': Clips').toEqual([...L.CLIPS].sort());
      for (const id of L.CLIPS) {
        const c = v[lang][id];
        expect(c.d, lang + '/' + id + ' Dauer').toBeGreaterThan(3);
        let prev = 0;
        for (const [k, t] of Object.entries(c.cues)) {
          expect(t, lang + '/' + id + '/' + k + ' aufsteigend').toBeGreaterThan(prev);
          expect(t, lang + '/' + id + '/' + k + ' innerhalb des Clips').toBeLessThan(c.d);
          prev = t;
        }
      }
    }
    for (const id of L.CLIPS) {
      const k = lang => Object.keys(v[lang][id].cues).join(',');
      expect(k('en'), id + ' en').toBe(k('de')); expect(k('pl'), id + ' pl').toBe(k('de'));
    }
  });

  test('Dauer in VOICE passt grob zur Dateigröße des Clips (Bitrate zwischen 32 und 320 kbit/s)', async ({}, info) => {
    const v = voice(L.indexHtml(info));
    const dir = path.join(ROOT, 'public/voice');
    for (const lang of ['de', 'en', 'pl']) for (const id of L.CLIPS) {
      const kbps = fs.statSync(path.join(dir, lang === 'de' ? '' : lang, id + '.mp3')).size * 8 / v[lang][id].d / 1000;
      expect(kbps, lang + '/' + id).toBeGreaterThan(32); expect(kbps, lang + '/' + id).toBeLessThan(320);
    }
  });
});

// Ganze Seite je Sprache: Sprecher-Clips, Texte aller Körper, Zahlen- und Datumsformat
const GERMAN = /\b(und|der|die|das|ist|sind|nicht|mit|von|ein|eine|auf|für|Tage)\b/i;
const SPEED_PAUSE = { en: 'Paused', pl: 'Pauza' }, SPEED_1 = { en: '1 day/s', pl: '1 dzień/s' }, SPEED_20 = { en: '20 days/s', pl: '20 dni/s' };
const DATE = { de: /^\d{2}\. \S+ \d{4}$/, en: /^\d{2} [A-Za-z]{3,4} \d{4}$/, pl: /^\d{2} \p{L}{3} \d{4}$/u };

for (const lang of ['en', 'pl']) test.describe.serial('Ganze Seite auf ' + NATIVE[lang], () => {
  let s, page;
  test.beforeAll(async ({ browser }, info) => {
    test.skip(L.isDist(info), 'Die Texte aller Halte werden nur in der Testseite geprüft');
    s = await L.open(browser, info, { locale: lang === 'en' ? 'en-US' : 'pl-PL' });
    page = s.page;
  });
  test.afterAll(async () => { if (s) await s.close(); });

  test('Start mit Ton lädt die Clips voice/' + lang + '/ und die Musik', async () => {
    await page.click('#go');
    await expect(page.locator('#sound')).toHaveAttribute('aria-pressed', 'true');
    const got = new Set(s.log.requests);
    for (const id of L.CLIPS) expect(got.has(L.clipUrl(lang, id)), L.clipUrl(lang, id)).toBe(true);
    expect(got.has('/audio/music.mp3')).toBe(true);
    // keine deutschen Clips (voice/<id>.mp3 direkt) und keine Clips der anderen Sprache
    expect([...got].filter(u => /^\/voice\/[^/]+\.mp3$/.test(u))).toEqual([]);
    expect([...got].filter(u => u.startsWith('/voice/') && !u.startsWith('/voice/' + lang + '/'))).toEqual([]);
  });

  test('Oberfläche: Titel, Chips, aria-labels, html[lang], document.title', async () => {
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    expect(await page.title()).toBe(TITLE[lang]);
    await expect(page.locator('#rail .chip:not(.more)')).toHaveText(L.NAMES[lang].chips);
    await expect(page.locator('#slower')).toHaveAttribute('aria-label', SLOWER[lang]);
    await expect(page.locator('#next')).toHaveAttribute('aria-label', lang === 'en' ? 'Next stop' : 'Następny przystanek');
    await expect(page.locator('#tour')).toHaveAttribute('aria-label', lang === 'en' ? 'Pause the tour' : 'Wstrzymaj podróż');
    await expect(page.locator('#sound')).toHaveAttribute('aria-label', lang === 'en' ? /^Music and narrator\./ : /^Muzyka i lektor\./);
    await expect(page.locator('#rail')).toHaveAttribute('aria-label', lang === 'en' ? 'Celestial bodies' : 'Ciała niebieskie');
  });

  test('Stichprobe über alle Körper: Titel, Art, Text und Vorlesetext sind übersetzt', async () => {
    for (const [i, id] of L.IDS.entries()) {
      await L.chip(page, id).click();
      await expect(page.locator('#name')).toHaveText(L.NAMES[lang].names[i]);
      const kind = await page.locator('#kind').textContent(), blurb = await page.locator('#blurb').textContent(), sr = await page.locator('#sr').textContent();
      for (const [what, t] of [['kind', kind], ['blurb', blurb], ['sr', sr]]) {
        expect(t.length, id + ' ' + what).toBeGreaterThan(5);
        expect(t, id + ' ' + what + ' enthält deutschen Text').not.toMatch(GERMAN);
      }
    }
  });

  test('Kapitel von Erde und Mars sind übersetzt', async () => {
    await L.chip(page, 'earth').click();
    for (let n = 0; n < 2; n++) {
      await L.chip(page, 'earth').click();
      for (const q of ['#kind', '#blurb']) expect(await page.locator(q).textContent(), 'Erde Kapitel ' + (n + 1) + ' ' + q).not.toMatch(GERMAN);
    }
    await L.chip(page, 'mars').click(); await L.chip(page, 'mars').click();
    for (const q of ['#kind', '#blurb']) expect(await page.locator(q).textContent(), 'Mars Basis ' + q).not.toMatch(GERMAN);
    await L.chip(page, 'overview').click();
  });

  test('Zeitraffer-Text, Datum und Zahlenformat in der Sprache', async () => {
    await expect(page.locator('#speed')).toHaveText(SPEED_20[lang]);
    await page.click('#slower'); await page.click('#slower');
    await expect(page.locator('#speed')).toHaveText(SPEED_1[lang]);
    await page.click('#slower');
    await expect(page.locator('#speed')).toHaveText(SPEED_PAUSE[lang]);
    await expect(page.locator('#date')).toHaveText(DATE[lang]);
    await L.chip(page, 'sun').click();
    // Zahlen im Vorlesetext: en gruppiert mit Komma, pl mit geschütztem Leerzeichen
    const sr = await (async () => { await L.chip(page, 'mercury').click(); return page.locator('#sr').textContent(); })();
    expect(sr).not.toMatch(/4\.879/);
    expect(sr).toMatch(lang === 'en' ? /4,879/ : /4[\s  ]?879/);
  });

  test('keine Fehler', async () => { expect(L.problems(s.log)).toEqual([]); });
});
