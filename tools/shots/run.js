// Prüft die Seite in einem Chrome ohne Fenster und macht Bildschirmfotos (bisher tools/test/run.js).
//
//   npm run shots -- [--dist] [--desk] [--nobuild] [--lang=en|pl] <Breite> <Höhe> [Schritte ...]
//
// Ohne --dist wird die Testseite gebaut (vite build --mode test -> .test/, mit Prüfhaken aus src/testing/hooks.js)
// und zusammen mit public/ ausgeliefert. --nobuild nimmt die vorhandene .test/.
// Mit --dist wird dist/ unverändert geprüft (vorher npm run build); Prüfhaken gibt es dort nicht.
// --desk lässt in der Testseite die volle Desktop-Ausstattung an (VITE_DESK=1; ohne Grafikkarte sehr langsam).
// --lang=en öffnet die Seite mit ?lang=en; ohne die Angabe meldet der Browser Deutsch als Sprache, die Seite wählt dann Deutsch.
// Jede Anfrage an eine fremde Adresse wird abgebrochen und am Ende gemeldet.
//
// Schritte:  start          Reise ohne Ton starten und die Tour anhalten
//            go             Reise mit Ton starten
//            focus:N        Himmelskörper N anfahren (0 Übersicht, 1 Sonne ... 5 Mars, 6 Asteroiden ... 10 Neptun)
//            stage:N        Abschnitt N des Körpers (Erde: 1 nah, 2 Aufbau; Mars: 1 Basis)
//            seek:S         Sprecherzeit auf S Sekunden setzen
//            mbt:S          Marsbasis auf Erzählzeit S festhalten (mbt:off löst)
//            clk:S          Uhr der bewegten Dinge auf der Marsbasis festhalten
//            cam:x,y,z,lx,ly,lz   freie Kamera auf der Marsbasis (cam:off löst)
//            pr:X           Renderauflösung fest auf X Bildpunkte je CSS-Pixel
//            wait:MS  click:SELEKTOR  key:TASTE  eval:JS  shot:NAME (-> .shots/NAME.png)
//
// Umgebung:  CHROME_PATH    eigener Chrome statt des von Playwright mitgebrachten
//            SOFTWARE_GL=1  Software-Rendering (für Rechner ohne Grafikkarte)
//            DSF=2          Gerätepixel je CSS-Pixel (Vorgabe 1)
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '../..');
const argv = process.argv.slice(2);
const flag = f => { const i = argv.indexOf(f); if (i < 0) return false; argv.splice(i, 1); return true; };
const DIST = flag('--dist'), DESK = flag('--desk'), NOBUILD = flag('--nobuild');
const LANG = (argv.find(a => a.startsWith('--lang=')) || '').slice(7); if (LANG) flag('--lang=' + LANG);
const [w, h, ...steps] = argv;
if (!+w || !+h) { console.log(fs.readFileSync(__filename, 'utf8').split('\n').filter(l => l.startsWith('//')).map(l => l.slice(3)).join('\n')); process.exit(1); }

if (!DIST && !NOBUILD) {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'node_modules/vite/bin/vite.js'), 'build', '--mode', 'test', '--logLevel', 'warn'],
    { stdio: 'inherit', cwd: ROOT, env: { ...process.env, VITE_DESK: DESK ? '1' : '' } });
  if (r.status !== 0) process.exit(1);
}
// Testseite: zuerst .test/ (index.html, assets/), sonst public/
const BASES = DIST ? [path.join(ROOT, 'dist')] : [path.join(ROOT, '.test'), path.join(ROOT, 'public')];
const SHOTS = path.join(ROOT, process.env.SHOTS_DIR || '.shots');
fs.mkdirSync(SHOTS, { recursive: true });
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.mp3': 'audio/mpeg', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary' };
const srv = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  const rel = u === '/' ? '/index.html' : u;
  const f = BASES.map(b => path.join(b, rel)).find(f => f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isFile());
  if (!f) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  r.end(fs.readFileSync(f));
});

(async () => {
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok));
  const origin = 'http://127.0.0.1:' + srv.address().port;
  const args = ['--autoplay-policy=no-user-gesture-required'];
  if (process.env.SOFTWARE_GL) args.push('--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist');
  if (process.getuid && process.getuid() === 0) args.push('--no-sandbox');
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args });
  const page = await (await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: +process.env.DSF || 1, locale: process.env.LOCALE || 'de-DE' })).newPage();
  const foreign = [], failed = [];
  await page.route('**/*', r => { const u = r.request().url(); if (u.startsWith(origin) || u.startsWith('data:') || u.startsWith('blob:')) return r.continue(); foreign.push(u); return r.abort(); });
  page.on('response', r => { if (r.status() >= 400) failed.push(r.status() + ' ' + r.url().replace(origin, '')); });
  page.on('console', m => { const t = m.text(); if ((m.type() === 'error' || m.type() === 'warning') && !t.includes('GPU stall')) console.log('[' + m.type() + ']', t.slice(0, 700)); });
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  const t0 = Date.now();
  await page.goto(origin + '/' + (LANG ? '?lang=' + LANG : ''));
  await page.waitForSelector('#start:not([hidden])', { timeout: 240000 });
  console.log('geladen nach', Date.now() - t0, 'ms');
  const hook = js => { if (DIST) throw new Error('Dieser Schritt braucht die Prüfhaken und geht nicht mit --dist'); return page.evaluate(js); };
  for (const s of steps) {
    const i = s.indexOf(':'), k = i < 0 ? s : s.slice(0, i), v = i < 0 ? '' : s.slice(i + 1);
    if (k === 'start') { await page.click('#goQuiet'); await page.click('#tour'); }
    else if (k === 'go') await page.click('#go');
    else if (k === 'focus') await hook('window.__t.focus(' + (+v) + ', true)');
    else if (k === 'stage') await hook('window.__t.setStage(' + (+v) + ')');
    else if (k === 'seek') await hook('window.__t.seek(' + (+v) + ')');
    else if (k === 'pr') await hook('window.__t.pr(' + (+v) + ')');
    else if (k === 'mbt') await hook('window.__mbt = ' + (v === 'off' ? 'null' : +v));
    else if (k === 'clk') await hook('window.__clk = ' + (v === 'off' ? 'null' : +v));
    else if (k === 'cam') await hook('window.__cam = ' + (v === 'off' ? 'null' : JSON.stringify(v.split(',').map(Number))));
    else if (k === 'wait') await page.waitForTimeout(+v);
    else if (k === 'click') await page.click(v);
    else if (k === 'key') await page.keyboard.press(v);
    else if (k === 'eval') console.log('eval', JSON.stringify(await page.evaluate(v)));
    else if (k === 'shot') {
      await page.screenshot({ path: path.join(SHOTS, v + '.png') });
      const st = DIST ? '' : JSON.stringify(await page.evaluate(() => { const s = window.__t.st; for (const k in s) if (typeof s[k] === 'number') s[k] = +s[k].toFixed(2); return s; }));
      console.log('Bild', v, st);
    }
    else throw new Error('Unbekannter Schritt: ' + s);
  }
  console.log('fremde Adressen:', foreign.length ? foreign : 'keine');
  console.log('fehlgeschlagene Anfragen:', failed.length ? failed : 'keine');
  await browser.close(); srv.close();
  process.exit(foreign.length || failed.length ? 2 : 0);
})().catch(e => { console.error(e); process.exit(1); });
