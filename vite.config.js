// Vite: Entwicklungsserver und Bau der Website (dist/), der Testseite (.test/, --mode test) und – über
// tools/artifact/build.mjs – der Artefakt-Fassung (--mode artifact).
// Kopfangaben der Website kommen aus site.json; der Bau bricht ab, wenn im Ergebnis eine fremde Adresse steht.
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import { foreignUrls } from './tools/build/check-foreign.mjs';

const site = JSON.parse(fs.readFileSync(new URL('./site.json', import.meta.url), 'utf8'));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Kopf der Website (bisher tools/build.py): Titel, Beschreibung, canonical, hreflang, og:*, Favicon, lokale Schriften
function siteHead() {
  const url = site.url.replace(/\/$/, '') + '/';
  const langs = ['de', ...Object.keys(site.i18n || {}).sort()];
  return {
    name: 'sonnensystem-kopf',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const head = [
          `<title>${esc(site.title)}</title>`,
          `<meta name="description" content="${esc(site.description)}">`,
          `<meta name="theme-color" content="#04060c">`,
          `<link rel="canonical" href="${esc(url)}">`,
          ...langs.map(l => `<link rel="alternate" hreflang="${l}" href="${esc(url)}?lang=${l}">`),
          `<link rel="alternate" hreflang="x-default" href="${esc(url)}">`,
          `<meta property="og:type" content="website">`,
          `<meta property="og:url" content="${esc(url)}">`,
          `<meta property="og:title" content="${esc(site.title)}">`,
          `<meta property="og:description" content="${esc(site.description)}">`,
          `<meta property="og:image" content="${esc(url)}vorschau.jpg">`,
          `<meta name="twitter:card" content="summary_large_image">`,
          `<link rel="icon" href="favicon.svg" type="image/svg+xml">`,
          `<link rel="stylesheet" href="vendor/fonts/fonts.css">`,
          `<style>\nhtml,body{margin:0}\n[hidden]{display:none !important}\n</style>`,
        ].join('\n');
        return html.replace(/<!-- Kopfangaben[^>]*-->\n/, head + '\n');
      },
    },
  };
}

// Prüfung „keine fremde Adresse“ und Aufräumen der alten Bibliotheken aus public/vendor (bis Phase B entfernt)
function checkOutput(outDir) {
  return {
    name: 'sonnensystem-pruefung',
    apply: 'build',
    closeBundle() {
      for (const f of ['vendor/three.min.js', 'vendor/GLTFLoader.js']) fs.rmSync(path.join(outDir, f), { force: true });
      const bad = foreignUrls(outDir);
      if (bad.length) throw new Error('Die Seite verweist auf fremde Adressen:\n' + bad.join('\n'));
    },
  };
}

export default defineConfig(({ mode }) => {
  const target = mode === 'artifact' ? 'artifact' : 'site';
  const test = mode === 'test';
  const outDir = test ? '.test' : 'dist';
  const siteCfg = { impressum: site.impressum || '', datenschutz: site.datenschutz || '', i18n: site.i18n || {} };
  return {
    base: './',
    publicDir: 'public',
    define: {
      __TARGET__: JSON.stringify(target),
      __SITE__: target === 'site' ? JSON.stringify(siteCfg) : 'undefined',
    },
    plugins: target === 'site' ? [siteHead(), ...(test ? [] : [checkOutput(outDir)])] : [],
    build: {
      outDir,
      emptyOutDir: true,
      // Testseite: public/ liefert tools/shots/run.js direkt aus; schneller ohne Kopieren und Verkleinern
      copyPublicDir: !test,
      minify: !test,
      target: 'es2020',
      assetsInlineLimit: 0,
      chunkSizeWarningLimit: 1200,
    },
    server: { port: 8080 },
    test: { include: ['tests/unit/**/*.test.js'] },
  };
});
