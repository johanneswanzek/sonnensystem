// Gemeinsame Hilfen der E2E-Tests.
const { delivered } = require('./server');

const SOFT = !!process.env.SOFTWARE_GL;
const LOAD_TIMEOUT = SOFT ? 300000 : 90000;

const isDist = info => info.project.name === 'dist';
const originOf = info => process.env['E2E_ORIGIN_' + info.project.name.toUpperCase()];
// Quelltext der gelieferten Seite: index.html samt gebündelten Skripten und Stilen (für Prüfungen ohne Browser)
const indexHtml = info => delivered(isDist(info) ? 'dist' : '.test');

const IGNORE = t => /GPU stall|swiftshader|GroupMarkerNotSet|Automatic fallback to software WebGL/i.test(t);

// Öffnet die Seite in einem frischen Kontext. Fremde Adressen werden abgebrochen und gesammelt, ebenso Konsolenfehler,
// Seitenfehler, fehlgeschlagene Anfragen (Status >= 400) und alle Anfragen (für Netzprüfungen).
//   opts: viewport, locale, query ('?lang=en'), init (Skript vor dem Laden), light (three.js sperren: nur Oberfläche, schnell),
//         (light: WebGL wird verweigert, die Seite zeigt nur die Oberfläche – wie früher das Sperren von three.min.js)
//         wait ('ready' = Startknöpfe sichtbar, 'ui' = Oberfläche aufgebaut, sonst nichts), storage ({key: value} in localStorage vor dem Laden),
//         block (RegExp: weitere Anfragen abbrechen)
async function open(browser, info, opts = {}) {
  const origin = originOf(info);
  const ctx = await browser.newContext({
    viewport: opts.viewport || { width: 390, height: 760 },
    locale: opts.locale || 'de-DE',
    deviceScaleFactor: 1,
    ...(opts.context || {}),
  });
  const log = { console: [], errors: [], foreign: [], failed: [], requests: [], origin };
  await ctx.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith(origin) || u.startsWith('data:') || u.startsWith('blob:')) {
      if (opts.block && opts.block.test(u)) return r.abort();
      return r.continue();
    }
    log.foreign.push(u);
    return r.abort();
  });
  await ctx.addInitScript(() => {
    // Zähler für Audio: wie oft wurde der AudioContext angehalten und fortgesetzt?
    window.__audio = { suspend: 0, resume: 0, created: 0 };
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) {
      const s = AC.prototype.suspend,
        r = AC.prototype.resume;
      AC.prototype.suspend = function () {
        window.__audio.suspend++;
        return s.apply(this, arguments);
      };
      AC.prototype.resume = function () {
        window.__audio.resume++;
        return r.apply(this, arguments);
      };
    }
  });
  if (opts.light)
    await ctx.addInitScript(() => {
      const g = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (t) {
        return /webgl/i.test(String(t)) ? null : g.apply(this, arguments);
      };
    });
  if (opts.storage)
    await ctx.addInitScript(s => {
      for (const k in s)
        try {
          localStorage.setItem(k, s[k]);
        } catch (e) {}
    }, opts.storage);
  if (opts.init) await ctx.addInitScript(opts.init);
  const page = await ctx.newPage();
  page.on('response', r => {
    if (r.status() >= 400) log.failed.push(r.status() + ' ' + r.url().replace(origin, ''));
  });
  page.on('requestfailed', r => {
    const u = r.url();
    if (!u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:')) return;
    if (opts.block && opts.block.test(u)) return;
    log.failed.push('fehlgeschlagen ' + u.replace(origin, '') + ' ' + (r.failure() || {}).errorText);
  });
  page.on('request', r => log.requests.push(r.url().replace(origin, '')));
  page.on('console', m => {
    const t = m.text();
    if (!IGNORE(t) && (m.type() === 'error' || m.type() === 'warning'))
      log.errors.push('[' + m.type() + '] ' + t.slice(0, 500));
  });
  page.on('pageerror', e => log.errors.push('[pageerror] ' + e.message));
  await page.goto(origin + '/' + (opts.query || ''), { waitUntil: 'domcontentloaded' });
  if (opts.wait === 'ui') await page.waitForSelector('#lang', { state: 'attached' });
  else if (opts.wait !== 'none') await page.waitForSelector('#start:not([hidden])', { timeout: LOAD_TIMEOUT });
  const out = { page, ctx, log, origin, close: () => ctx.close() };
  if (!opts.light && opts.wait !== 'ui' && opts.wait !== 'none' && !isDist(info) && opts.pr !== false)
    await page.evaluate('window.__t.pr(.25)');
  return out;
}

// Zustand der Testseite (nur testseite)
const state = page =>
  page.evaluate(() => {
    const s = window.__t.st,
      e = window.__t.ex;
    const o = {};
    for (const k in s) o[k] = s[k];
    for (const k in e) o[k] = e[k];
    return o;
  });
const cur = page => page.evaluate(() => window.__t.st.cur);

// Wartet, bis die Kamerafahrt zum Halt beendet ist
const settled = page => page.waitForFunction(() => window.__t.st.trans >= 1);

// BoundingBox eines Selektors oder null
const box = async (page, sel) => {
  const l = page.locator(sel);
  if (!(await l.count()) || !(await l.first().isVisible())) return null;
  return l.first().boundingBox();
};
const overlap = (a, b) =>
  a && b && a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

// Alle Fehler eines Laufs als Text (für expect(...).toEqual([]))
const problems = log =>
  [].concat(
    log.errors,
    log.foreign.map(u => 'fremde Adresse: ' + u),
    log.failed.map(u => 'fehlgeschlagen: ' + u),
  );

// Erwartete Texte je Sprache (Chip-Beschriftung, Titel, Art) in der Reihenfolge von BODIES
const NAMES = {
  de: {
    chips: [
      'Übersicht',
      'Sonne',
      'Merkur',
      'Venus',
      'Erde',
      'Mars',
      'Asteroiden',
      'Jupiter',
      'Saturn',
      'Uranus',
      'Neptun',
    ],
    names: [
      'Sonnensystem',
      'Sonne',
      'Merkur',
      'Venus',
      'Erde',
      'Mars',
      'Asteroidengürtel',
      'Jupiter',
      'Saturn',
      'Uranus',
      'Neptun',
    ],
  },
  en: {
    chips: [
      'Overview',
      'Sun',
      'Mercury',
      'Venus',
      'Earth',
      'Mars',
      'Asteroids',
      'Jupiter',
      'Saturn',
      'Uranus',
      'Neptune',
    ],
    names: [
      'Solar System',
      'Sun',
      'Mercury',
      'Venus',
      'Earth',
      'Mars',
      'Asteroid belt',
      'Jupiter',
      'Saturn',
      'Uranus',
      'Neptune',
    ],
  },
  pl: {
    chips: [
      'Przegląd',
      'Słońce',
      'Merkury',
      'Wenus',
      'Ziemia',
      'Mars',
      'Planetoidy',
      'Jowisz',
      'Saturn',
      'Uran',
      'Neptun',
    ],
    names: [
      'Układ Słoneczny',
      'Słońce',
      'Merkury',
      'Wenus',
      'Ziemia',
      'Mars',
      'Pas planetoid',
      'Jowisz',
      'Saturn',
      'Uran',
      'Neptun',
    ],
  },
};
const IDS = ['overview', 'sun', 'mercury', 'venus', 'earth', 'mars', 'belt', 'jupiter', 'saturn', 'uranus', 'neptune'];
// Alle Clips, die der Sprecher je Sprache braucht (Dateien voice/<id>.mp3, voice/en/<id>.mp3, ...)
const CLIPS = [
  'overview',
  'sun',
  'mercury',
  'venus',
  'earth',
  'earth_geo',
  'earth_core',
  'mars',
  'mars_base',
  'belt',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'outro',
];
const clipUrl = (lang, id) => '/voice/' + (lang === 'de' ? '' : lang + '/') + id + '.mp3';
// Klickt einen Chip und wartet, bis der Halt angezeigt wird
const chip = (page, id) => page.locator('#chip-' + id);

module.exports = {
  NAMES,
  IDS,
  CLIPS,
  clipUrl,
  chip,
  SOFT,
  LOAD_TIMEOUT,
  isDist,
  originOf,
  indexHtml,
  open,
  state,
  cur,
  settled,
  box,
  overlap,
  problems,
};
