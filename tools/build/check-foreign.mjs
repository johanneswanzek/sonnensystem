// Sucht im gebauten Ergebnis nach Adressen fremder Server. Die Website lädt nichts von außen; der Bau bricht ab,
// wenn hier etwas gefunden wird. Erlaubt sind nur Namensräume (w3.org) und Texte, die nie geladen werden.
//   node tools/build/check-foreign.mjs dist
import fs from 'node:fs';
import path from 'node:path';

// Adressen, die im Ergebnis stehen dürfen, weil nichts von dort geladen wird
const ALLOWED = [
  /^https?:\/\/www\.w3\.org\//,                       // XML-/SVG-Namensräume
  /^https:\/\/sonnensystem\.johannes-wanzek\.de\//,   // eigene Adresse (canonical, og:*)
  /^https:\/\/github\.com\/mrdoob\/three\.js\//,      // Hinweistexte in three.js-Warnungen
  /^https:\/\/threejs\.org\//,                       // dito
  /^https?:\/\/elevenlabs\.io/,                       // Quellenangabe als Text im Dialog
];
const TEXT = new Set(['.html', '.js', '.css', '.json', '.svg', '.txt', '.htaccess', '']);

export function foreignUrls(dir) {
  const bad = [];
  const visit = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) { visit(f); continue; }
      if (!TEXT.has(path.extname(e.name))) continue;
      if (/^(LIZENZEN\.txt)$/.test(e.name)) continue;            // Lizenztexte nennen Quellen, laden nichts
      const s = fs.readFileSync(f, 'utf8');
      for (const m of s.matchAll(/https?:\/\/[^\s"'`)<>\\]+/g)) {
        if (!ALLOWED.some(r => r.test(m[0]))) bad.push(path.relative(dir, f) + ': ' + m[0]);
      }
    }
  };
  visit(dir);
  return [...new Set(bad)];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const bad = foreignUrls(process.argv[2] || 'dist');
  if (bad.length) { console.error('Fremde Adressen:\n' + bad.join('\n')); process.exit(1); }
  console.log('keine fremden Adressen');
}
