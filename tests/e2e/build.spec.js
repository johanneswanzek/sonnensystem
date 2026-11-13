// Ablauf 13: Build (dist/): keine fremden Adressen, hreflang, Angaben aus site.json, alle referenzierten Dateien vorhanden.
// Geprüft wird index.html samt den gebündelten Skripten unter assets/ (Vite).
const fs = require('fs'), path = require('path');
const { test, expect } = require('playwright/test');
const { ROOT, delivered } = require('./server');
const L = require('./lib');

const DIST = path.join(ROOT, 'dist');
const html = () => fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const all = () => delivered('dist');
const cfg = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'site.json'), 'utf8'));
const exists = f => fs.existsSync(path.join(DIST, f));

test.describe('Build dist/', () => {
  test('keine fremden Adressen: nur die eigene Domain (Kopfzeilen) und der XML-Namensraum', () => {
    const own = cfg().url.replace(/\/$/, '');
    const urls = all().match(/https?:\/\/[^\s"'`<>)\\]+/g) || [];
    // three.js nennt in Warntexten seine Projektseiten; geladen wird von dort nichts (Netzprüfung in lade.spec.js)
    const foreign = urls.filter(u => !u.startsWith(own) && !u.startsWith('http://www.w3.org/') && !/^https:\/\/(threejs\.org|github\.com\/mrdoob)\//.test(u));
    expect(foreign).toEqual([]);
    // Geladen wird nichts von der eigenen Adresse: Skripte, Stile und Medien sind relativ
    const loads = html().match(/<(script|link|img|audio|source)\b[^>]*\b(src|href)="[^"]+"/g) || [];
    for (const l of loads) if (!/rel="(canonical|alternate)"/.test(l)) expect(l, 'Ressource ist relativ').not.toMatch(/(src|href)="(https?:)?\/\//);
  });

  test('Kopf: lang, viewport, Titel, Beschreibung, canonical, Open Graph', () => {
    const h = html(), c = cfg();
    expect(h).toMatch(/<html lang="de">/);
    expect(h).toMatch(/<meta name="viewport" content="[^"]*width=device-width/);
    expect(h).toContain('<title>' + c.title + '</title>');
    expect(h).toMatch(/<meta name="description" content="[^"]{40,}"/);
    expect(h).toContain('<link rel="canonical" href="' + c.url + '">');
    for (const p of ['og:title', 'og:description', 'og:image', 'og:url']) expect(h).toContain('property="' + p + '"');
  });

  test('hreflang-Verweise für de, en, pl und x-default', () => {
    const h = html(), c = cfg();
    for (const l of ['de', 'en', 'pl']) expect(h).toContain('<link rel="alternate" hreflang="' + l + '" href="' + c.url + '?lang=' + l + '">');
    expect(h).toContain('<link rel="alternate" hreflang="x-default" href="' + c.url + '">');
    expect(Object.keys(c.i18n).sort()).toEqual(['en', 'pl']);
  });

  test('Angaben aus site.json (Impressum, Datenschutz, Titel und Beschreibung je Sprache) sind eingebaut', () => {
    const a = all(), c = cfg();
    // vite.config.js setzt sie als Bauzeit-Konstante (__SITE__ -> SITE_CFG in src/core/target.js)
    expect(a).toContain(JSON.stringify(c.i18n.en.title));
    expect(a).toContain(JSON.stringify(c.i18n.pl.description));
    expect(a).toMatch(/impressum:/); expect(a).toMatch(/datenschutz:/);
  });

  test('dist/ enthält keine Prüfhaken und keine Artefakt-Reste', () => {
    const a = all();
    for (const k of ['__t', '__mbt', '__clk', '__cam', '__au']) expect(a, k).not.toMatch(new RegExp('window\\.' + k + '\\b|\\b' + k + '='));
    expect(a).not.toContain('claude:viewport-fit-sides');
    expect(a).not.toContain('fonts.googleapis.com');
    expect(a).toMatch(/["']\.glb["']/);
    expect(a).not.toMatch(/["']\.json["']/);
  });

  test('alle im Dokument referenzierten Dateien (script, link, icon) existieren', () => {
    const refs = [...html().matchAll(/\b(?:src|href)="([^"#?]+)"/g)].map(m => m[1]).filter(u => !/^(https?:|data:|mailto:)/.test(u));
    expect(refs.length).toBeGreaterThan(2);
    for (const r of refs) expect(exists(r), r).toBe(true);
  });

  test('alle im Programm genannten Dateien (img, voice, audio, vendor, models) existieren', () => {
    const h = all();
    const lits = new Set([...h.matchAll(/['"`]((?:img|audio|vendor|voice)\/[\w\-./]+\.\w{2,5})['"`]/g)].map(m => m[1]));
    expect(lits.size).toBeGreaterThan(4);
    for (const f of lits) expect(exists(f), f).toBe(true);
    // Modelle: Namen aus loadModels()
    const src = fs.readFileSync(path.join(ROOT, 'src/app/boot.js'), 'utf8');
    const lm = src.slice(src.indexOf('function loadModels'), src.indexOf('async function boot'));
    const names = new Set([...lm.matchAll(/(?:get\(|\[)\s*'(\w+)'/g), ...[...lm.matchAll(/\[((?:'\w+',?\s*)+)\]/g)].flatMap(m => [...m[1].matchAll(/'(\w+)'/g)])].map(m => m[1]));
    expect(names.size).toBeGreaterThanOrEqual(7);
    for (const n of names) expect(exists('models/' + n + '.glb'), 'models/' + n + '.glb').toBe(true);
    // Sprecher: 15 Clips je Sprache, Musik
    for (const l of ['de', 'en', 'pl']) for (const id of L.CLIPS) expect(exists('voice/' + (l === 'de' ? '' : l + '/') + id + '.mp3'), l + '/' + id).toBe(true);
    expect(exists('audio/music.mp3')).toBe(true);
  });

  test('Schriften aus vendor/fonts/fonts.css existieren lokal', () => {
    const css = fs.readFileSync(path.join(DIST, 'vendor/fonts/fonts.css'), 'utf8');
    const urls = [...css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)].map(m => m[1]);
    expect(urls.length).toBeGreaterThan(0);
    for (const u of urls) { expect(u, 'Schrift lokal').not.toMatch(/^(https?:)?\/\//); expect(exists('vendor/fonts/' + u.replace(/^\.\//, '')), u).toBe(true); }
  });

  test('Vorschaubild, Favicon und Lizenzdatei sind dabei', () => {
    for (const f of ['vorschau.jpg', 'favicon.svg', 'LIZENZEN.txt', '.htaccess']) expect(exists(f), f).toBe(true);
    // three.js und GLTFLoader sind gebündelt
    for (const f of ['vendor/three.min.js', 'vendor/GLTFLoader.js']) expect(exists(f), f).toBe(false);
  });
});
