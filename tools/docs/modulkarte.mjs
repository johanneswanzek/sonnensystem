// Erzeugt docs/modulkarte.md aus den echten Quelldateien: je Modul Zweck (erste Kopfkommentarzeile der Form
// "// ordner/name – Zweck"), Exporte und Abhängigkeiten (aus den import-Zeilen), dazu eine Abhängigkeitskarte der
// Ordner als Mermaid-Diagramm.
//
//   node tools/docs/modulkarte.mjs          schreibt docs/modulkarte.md
//   node tools/docs/modulkarte.mjs --check  Exit 1, wenn docs/modulkarte.md nicht dem Quelltext entspricht
//
// Läuft ohne Abhängigkeiten (nur Node). Ein Eintrag in package.json (docs:map) steht noch aus; bis dahin per node aufrufen.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'docs/modulkarte.md');

const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const rel = f => path.relative(SRC, f).split(path.sep).join('/');
const files = walk(SRC).filter(f => /\.(js|json|css)$/.test(f)).map(rel).sort();

function head(src) {
  for (const line of src.split('\n').slice(0, 12)) {
    const m = line.match(/^\/\/ ([\w/.\-]+) [–-] (.+)$/);
    if (m) return m[2].replace(/\.$/, '').trim();
  }
  return '';
}
function exportsOf(src) {
  const out = new Set();
  for (const m of src.matchAll(/^export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([\w$]+)/gm)) out.add(m[1]);
  for (const m of src.matchAll(/^export\s*\{([^}]*)\}/gm)) for (const p of m[1].split(',')) { const n = p.trim().split(/\s+as\s+/).pop(); if (n) out.add(n); }
  if (/^export\s+default\b/m.test(src)) out.add('default');
  return [...out];
}
function importsOf(file, src) {
  const out = new Set();
  for (const m of src.matchAll(/^import\s+(?:[^'"]*?from\s+)?['"](\.[^'"]+)['"]/gm)) {
    const t = path.posix.normalize(path.posix.join(path.posix.dirname(file), m[1]));
    out.add(t);
  }
  return [...out];
}

const mods = files.filter(f => f.endsWith('.js')).map(f => {
  const src = fs.readFileSync(path.join(SRC, f), 'utf8');
  return { f, dir: f.includes('/') ? f.split('/').slice(0, -1).join('/') : '.', lines: src.split('\n').length - (src.endsWith('\n') ? 1 : 0), purpose: head(src), exp: exportsOf(src), imp: importsOf(f, src) };
});

const top = f => f.split('/')[0];
const dirs = [...new Set(mods.map(m => m.dir))].sort((a, b) => (a === '.' ? -1 : b === '.' ? 1 : a.localeCompare(b)));

const edges = new Map();
for (const m of mods) for (const i of m.imp) {
  const a = top(m.f), b = top(i);
  if (!i.includes('/') || a === b || !fs.existsSync(path.join(SRC, i))) continue;
  const k = a + '>' + b; edges.set(k, (edges.get(k) || 0) + 1);
}

const L = [];
L.push('# Modulkarte von `src/`', '');
L.push('Diese Datei wird von `tools/docs/modulkarte.mjs` aus dem Quelltext erzeugt (`node tools/docs/modulkarte.mjs`); nicht von Hand ändern.');
L.push('Zweck = erste Kopfkommentarzeile jedes Moduls, Exporte und Abhängigkeiten stammen aus den `export`- und `import`-Zeilen.');
L.push('Die Erklärung der Schichten und des Datenflusses steht in `docs/architecture.md`, Begriffe in `docs/glossar.md`.', '');
L.push(`Stand: ${mods.length} Module, ${mods.reduce((s, m) => s + m.lines, 0)} Zeilen JavaScript.`, '');

L.push('## Abhängigkeiten zwischen den Ordnern', '');
L.push('Pfeil A → B: Ein Modul in A importiert aus B (die Zahl ist die Anzahl der Importe). Zyklen laufen nur über Funktionen, die erst zur Laufzeit aufgerufen werden.', '');
L.push('```mermaid', 'flowchart LR');
const id = s => s.replace(/\W/g, '_');
const ends = [...new Set([...edges.keys()].flatMap(k => k.split('>')))].sort();
for (const t of ends) L.push(`  ${id(t)}["${t.endsWith('.js') ? t : t + '/'}"]`);
for (const [k, n] of [...edges].sort()) { const [a, b] = k.split('>'); L.push(`  ${id(a)} -->|${n}| ${id(b)}`); }
L.push('```', '');

L.push('## Module', '');
for (const d of dirs) {
  L.push(`### ${d === '.' ? 'src/' : 'src/' + d + '/'}`, '');
  L.push('| Modul | Zweck | Exporte | Zeilen |', '| --- | --- | --- | --- |');
  for (const m of mods.filter(x => x.dir === d)) {
    const e = m.exp.length ? m.exp.map(x => '`' + x + '`').join(', ') : '–';
    L.push(`| \`${m.f}\` | ${m.purpose.replace(/\|/g, '/') || '(Kopfkommentar fehlt)'} | ${e} | ${m.lines} |`);
  }
  L.push('');
}

const others = files.filter(f => !f.endsWith('.js'));
L.push('## Daten und Stile', '');
L.push('| Datei | Inhalt |', '| --- | --- |');
const note = f => f.endsWith('.css') ? 'Stil' : f.startsWith('data/voice.') ? 'Sprecher: Dauer und Zeitmarken je Clip, `geo`: Einblendzeiten der Ozeane und Kontinente (geschrieben von `tools/audio/finalize.py`)' : f.startsWith('i18n/') ? 'Wörterbuch (deutscher Text → Übersetzung)' : 'Daten';
for (const f of others) L.push(`| \`${f}\` | ${note(f)} |`);
L.push('');

const text = L.join('\n');
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (cur !== text) { console.error('docs/modulkarte.md ist veraltet: node tools/docs/modulkarte.mjs'); process.exit(1); }
} else { fs.writeFileSync(OUT, text); console.log('docs/modulkarte.md geschrieben (' + mods.length + ' Module)'); }
