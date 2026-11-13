// Baut die claude.ai-Artefakt-Fassung: dist-artifact/sonnensystem.html
//
//   npm run build:artifact
//
// Ergebnis ist ein Fragment ohne <html>/<head>/<body> (so erwartet es claude.ai): Meta-Angabe für den Rand,
// Titel, Schriften von Google Fonts, Stil und gebündeltes Skript (three.js eingeschlossen) eingebettet, danach das
// Markup aus index.html. Die Modelle heißen dort models/<name>.json (glTF mit eingebetteten Daten, erzeugt von
// tools/models/embed.mjs nach .artifact/models/). Die Liste der Begleitdateien steht in dist-artifact/begleitdateien.txt.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TMP = path.join(ROOT, '.artifact/build');
const OUT = path.join(ROOT, 'dist-artifact');
const FONTS = 'https://fonts.googleapis.com/css2?family=Instrument+Serif&family=IBM+Plex+Sans:wght@400;500&family=IBM+Plex+Mono:wght@400;500&display=swap';

await build({
  root: ROOT,
  mode: 'artifact',
  logLevel: 'warn',
  build: {
    outDir: TMP,
    emptyOutDir: true,
    copyPublicDir: false,
    cssCodeSplit: false,
    rollupOptions: {
      input: path.join(ROOT, 'src/main.js'),
      output: { format: 'iife', inlineDynamicImports: true, entryFileNames: 'app.js', assetFileNames: '[name][extname]' },
    },
  },
});

const files = fs.readdirSync(TMP);
const jsFile = files.find(f => f.endsWith('.js')), cssFile = files.find(f => f.endsWith('.css'));
if (!jsFile || !cssFile) throw new Error('build:artifact: Skript oder Stil fehlt im Ergebnis: ' + files.join(', '));
const script = fs.readFileSync(path.join(TMP, jsFile), 'utf8').replace(/<\/(script)/gi, '<\\/$1');
const style = fs.readFileSync(path.join(TMP, cssFile), 'utf8').trim();
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const a = index.indexOf('<div id="app"'), b = index.indexOf('<script', a);
if (a < 0 || b < 0) throw new Error('build:artifact: Markup in index.html nicht gefunden');
const markup = index.slice(a, b).trim();

const html = `<meta name="claude:viewport-fit-sides" content="cover">
<title>Sonnensystem Kamerafahrt</title>
<link rel="stylesheet" href="${FONTS}">
<style>
${style}
</style>

${markup}

<script>
${script}</script>
`;
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'sonnensystem.html'), html);

// Begleitdateien: aus public/ voice/, audio/, img/; Modelle als JSON aus .artifact/models/
const list = [];
const walk = (base, dir) => {
  const full = path.join(base, dir);
  if (!fs.existsSync(full)) return;
  for (const e of fs.readdirSync(full, { withFileTypes: true })) {
    const rel = path.posix.join(dir, e.name);
    if (e.isDirectory()) walk(base, rel); else list.push(rel + '  <-  ' + path.relative(ROOT, path.join(base, rel)));
  }
};
for (const d of ['voice', 'audio', 'img']) walk(path.join(ROOT, 'public'), d);
const models = path.join(ROOT, '.artifact');
if (fs.existsSync(path.join(models, 'models'))) walk(models, 'models');
else list.push('models/*.json  <-  fehlen: cd tools/models && npm install && node embed.mjs');
fs.writeFileSync(path.join(OUT, 'begleitdateien.txt'), list.join('\n') + '\n');
const kb = (fs.statSync(path.join(OUT, 'sonnensystem.html')).size / 1024).toFixed(0);
console.log(`dist-artifact/sonnensystem.html: ${kb} KB, ${list.length} Begleitdateien (begleitdateien.txt)`);
