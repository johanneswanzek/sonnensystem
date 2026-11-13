// Vollständigkeit der Übersetzungen: jeder deutsche Text, den die Seite über tr()/fill() nachschlägt, jeder Text im
// Markup mit data-t, jedes aria-label und die Texte der Himmelskörper haben einen Eintrag in en.json und pl.json –
// außer Wörtern, die in der Sprache gleich lauten (Liste SAME unten; dort fällt tr() auf den deutschen Text zurück).
import fs from 'node:fs';
import path from 'node:path';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import { describe, expect, it } from 'vitest';
import en from '../../src/i18n/en.json';
import pl from '../../src/i18n/pl.json';
import { BODIES } from '../../src/data/bodies.js';

const ROOT = path.resolve(import.meta.dirname, '../..');
const SAME = {
  en: [
    'Tour',
    'Venus',
    'Mars',
    'Vesta',
    'Jupiter',
    'Saturn',
    'Uranus',
    'Phobos',
    'Deimos',
    'Io',
    'Europa',
    'Rhea',
    'Titan',
    'Titania',
    'Oberon',
    'Triton',
    'ROTATION',
    '23 H 56 MIN',
    '24 H 37 MIN',
    '5 H 21 MIN',
    '9 H 56 MIN',
    '10 H 33 MIN',
    '17 H 14 MIN',
    '16 H 6 MIN',
    'Übersicht',
  ],
  pl: [
    'Mars',
    'Saturn',
    'Neptun',
    'Deimos',
    'Io',
    'Europa',
    'Kallisto',
    'Oberon',
    '23 H 56 MIN',
    '24 H 37 MIN',
    '5 H 21 MIN',
    '9 H 56 MIN',
    '10 H 33 MIN',
    '17 H 14 MIN',
    '16 H 6 MIN',
    'EUROPA',
  ],
};

function keys() {
  const out = new Set();
  const files = fs.readdirSync(path.join(ROOT, 'src'), { recursive: true }).filter(f => String(f).endsWith('.js'));
  for (const f of files) {
    const src = fs.readFileSync(path.join(ROOT, 'src', String(f)), 'utf8');
    const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module' });
    walk.simple(ast, {
      CallExpression(n) {
        if (n.callee.type !== 'Identifier' || !['tr', 'fill'].includes(n.callee.name)) return;
        const a = n.arguments[0];
        if (a && a.type === 'Literal' && typeof a.value === 'string') out.add(a.value);
      },
    });
  }
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  for (const m of html.matchAll(/<(\w+)[^>]*\sdata-t[^>]*>([\s\S]*?)<\/\1>/g)) out.add(m[2].trim());
  for (const m of html.matchAll(/aria-label="([^"]+)"/g)) out.add(m[1]);
  const each = o =>
    ['name', 'short', 'label', 'kind', 'blurb', 'sr', 'day', 'per', 'n'].forEach(k => {
      if (typeof o[k] === 'string') out.add(o[k]);
    });
  for (const b of BODIES) {
    each(b);
    (b.stages || []).forEach(each);
    (b.sats || []).forEach(each);
    (b.facts || []).flat().forEach(s => out.add(s));
  }
  return out;
}

describe('Übersetzungen vollständig', () => {
  const all = keys();
  for (const [lang, dict] of Object.entries({ en, pl })) {
    it(`${lang}: jeder Schlüssel übersetzt`, () => {
      const missing = [...all].filter(k => !(k in dict) && !SAME[lang].includes(k));
      if (process.env.I18N_DEBUG)
        console.log(
          lang,
          all.size,
          [...all].filter(k => !(k in dict)),
        );
      expect(missing).toEqual([]);
    });
  }
});
