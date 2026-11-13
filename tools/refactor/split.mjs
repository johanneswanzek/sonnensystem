#!/usr/bin/env node
// Zerlegt den Monolithen src/sonnensystem.html in ES-Module, Stil-Dateien, JSON-Daten und index.html.
//
//   node tools/refactor/split.mjs [--auto-state] [--src src/sonnensystem.html] [--dry]
//
// Arbeitsweise (AST-basiert, keine Namensersetzung über den Text, weil GLSL-Zeichenketten dieselben Wörter enthalten):
//  1. Textstellen aus map.mjs `swaps` ersetzen (Prüfhaken, Ziel-Konstanten), je genau ein Vorkommen.
//  2. Skript mit acorn parsen, Gültigkeitsbereiche mit eslint-scope auflösen. Die oberste Ebene der IIFE ist der
//     gemeinsame Namensraum; jede Anweisung bekommt nach Abschnitt und map.mjs ein Modul.
//  3. Verweise über Modulgrenzen werden zu import/export. Variablen, die ein fremdes Modul schreibt, wandern ins
//     Zustandsobjekt S (core/state.js); jede Nennung wird zu S.<name>.
//  4. Reihenfolge: Funktionen und „statische“ Konstanten (Literale, Funktionen, Mathe-Objekte von three.js) bleiben
//     auf oberster Ebene. Alles andere (Anweisungen und Anfangswerte, die andere Module oder das DOM brauchen)
//     wandert in init…()-Funktionen, die src/main.js in der ursprünglichen Reihenfolge aufruft. Eine Anweisung
//     `return` auf oberster Ebene der IIFE wird zu `return false` und beendet den Start.
//  5. Daten (Übersetzungen, Zeitmarken) werden als JSON geschrieben, der Stil nach Kommentaren in Dateien geteilt,
//     das Markup kommt nach index.html.
// Das Ergebnis wird vollständig neu geschrieben: src/{core,i18n,data,ui,audio,orbit,render,mars,hud,app,testing}/,
// src/styles/, src/main.js, index.html. Handarbeit an diesen Dateien geht beim nächsten Lauf verloren – Änderungen
// gehören bis zum Ende des Umbaus in den Monolithen oder in map.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import * as eslintScope from 'eslint-scope';
import MagicString from 'magic-string';
import * as MAP from './map.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const opt = k => { const i = argv.indexOf(k); return i < 0 ? null : (argv[i + 1] || true); };
const AUTO_STATE = argv.includes('--auto-state');
const DRY = argv.includes('--dry');
const SRC = path.resolve(ROOT, opt('--src') || 'src/sonnensystem.html');
const OUT = path.join(ROOT, 'src');

const die = msg => { console.error('split: ' + msg); process.exit(1); };

// ---------- 1. Quelle lesen, Textstellen ersetzen ----------
let html = fs.readFileSync(SRC, 'utf8');
const sOpen = html.indexOf('<script>\n'), sClose = html.lastIndexOf('</script>');
if (sOpen < 0 || sClose < 0) die('kein <script>-Block gefunden');
let js = html.slice(sOpen + 9, sClose);
for (const [a, b] of MAP.swaps) {
  const n = js.split(a).length - 1;
  if (n !== 1) die(`erwartet genau ein Vorkommen von ${JSON.stringify(a.slice(0, 70))}, gefunden ${n} (map.mjs swaps anpassen)`);
  js = js.replace(a, () => b);
}

// ---------- 2. Parsen, Gültigkeitsbereiche ----------
let ast;
try {
  ast = acorn.parse(js, { ecmaVersion: 'latest', sourceType: 'module', allowReturnOutsideFunction: true, locations: true, ranges: true });
} catch (e) { die('Syntaxfehler im Skript: ' + e.message); }
const iife = ast.body.find(s => s.type === 'ExpressionStatement' && s.expression.type === 'CallExpression' && /Function/.test(s.expression.callee.type));
if (!iife) die('die IIFE (function(){ … })() wurde nicht gefunden');
const fnNode = iife.expression.callee;
const body = fnNode.body.body;
const sm = eslintScope.analyze(ast, { ecmaVersion: 2022, sourceType: 'module' });
const fscope = sm.acquire(fnNode);
const topVars = new Map(fscope.variables.filter(v => v.name !== 'arguments').map(v => [v.name, v]));

// Abschnitte
const markers = [...js.matchAll(/\/\* ---------- (.*?) ---------- \*\//g)].map(m => ({ at: m.index, name: m[1] }));
const sectionOf = pos => { let s = 'Kopf'; for (const m of markers) if (m.at < pos) s = m.name; return s; };
const sectionModule = name => {
  const k = Object.keys(MAP.sections).filter(k => name === k || name.startsWith(k)).sort((a, b) => b.length - a.length)[0];
  if (!k) die(`Abschnitt „${name}“ hat kein Modul. In tools/refactor/map.mjs unter sections eintragen.`);
  return MAP.sections[k];
};

// Elternknoten (für Kurzschreibweise {cur} und Mitgliederzugriffe)
const parent = new Map();
walk.fullAncestor(ast, (node, _st, anc) => { if (anc.length > 1) parent.set(node, anc[anc.length - 2]); });

// ---------- Anweisungen: Bereiche und Module ----------
const declNames = s => {
  if (s.type === 'VariableDeclaration') return s.declarations.map(d => {
    if (d.id.type !== 'Identifier') die(`Zeile ${s.loc.start.line}: Destrukturierung auf oberster Ebene wird nicht unterstützt`);
    return d.id.name;
  });
  if (s.type === 'FunctionDeclaration' || s.type === 'ClassDeclaration') return [s.id.name];
  return [];
};
const stmts = [];
let prevEnd = fnNode.body.start + 1;
for (const s of body) {
  if (s.type === 'ExpressionStatement' && s.directive) { prevEnd = s.end; continue; }    // 'use strict'
  // Bereich: vom Ende der vorigen Anweisung (führende Kommentare gehören dazu) bis Zeilenende, wenn dort nur ein Kommentar steht
  let end = s.end; const nl = js.indexOf('\n', end); const rest = js.slice(end, nl < 0 ? js.length : nl);
  if (/^\s*(\/\/.*)?$/.test(rest)) end = nl < 0 ? js.length : nl;
  const start = prevEnd;
  stmts.push({ node: s, start, end, names: declNames(s), section: sectionOf(s.start) });
  prevEnd = end;
}
const used = new Set();
let cur = null, curSec = null;
for (const st of stmts) {
  const def = sectionModule(st.section);
  if (st.section !== curSec) { cur = def; curSec = st.section; }
  const src = js.slice(st.node.start, st.node.end);
  const key = st.names.find(n => MAP.decls[n]) || Object.keys(MAP.decls).find(k => k.startsWith('@') && src.startsWith(k.slice(1)));
  if (key) { st.module = MAP.decls[key]; used.add(key); }
  else if (st.names.length) st.module = def;
  else st.module = cur;
  cur = st.module;
}
for (const k of Object.keys(MAP.decls)) if (!used.has(k)) console.warn(`split: Hinweis – Eintrag ${k} in map.mjs decls passt auf keine Anweisung`);
const stmtAt = pos => { for (const st of stmts) if (st.node.start <= pos && pos < st.node.end) return st; return null; };
const owner = new Map();             // Name -> Anweisung
for (const st of stmts) for (const n of st.names) owner.set(n, st);

// ---------- 3. Zustand: Schreibzugriffe über Modulgrenzen ----------
const stateSet = new Set(MAP.state);
const foreignWrites = new Map();
for (const [name, v] of topVars) {
  const own = owner.get(name); if (!own) continue;
  for (const r of v.references) {
    if (!r.isWrite()) continue;
    const st = stmtAt(r.identifier.start);
    if (st && st.module !== own.module && !stateSet.has(name)) {
      if (!foreignWrites.has(name)) foreignWrites.set(name, []);
      foreignWrites.get(name).push(`${st.module} Zeile ${r.identifier.loc.start.line}`);
    }
  }
}
if (foreignWrites.size) {
  const list = [...foreignWrites].map(([n, w]) => `  ${n} (gehört ${owner.get(n).module}): ${w.slice(0, 3).join(', ')}`).join('\n');
  if (!AUTO_STATE) die(`Schreibzugriffe über Modulgrenzen ohne Eintrag in map.mjs state:\n${list}\n` +
    `Entweder die Variable in state aufnehmen (wird zu S.<name>) oder die Deklaration per decls ins schreibende Modul legen.\n` +
    `Mit --auto-state werden sie automatisch aufgenommen.`);
  console.warn('split: --auto-state nimmt auf:\n' + list);
  for (const n of foreignWrites.keys()) stateSet.add(n);
}
for (const n of stateSet) {
  if (!owner.has(n)) { console.warn(`split: Hinweis – state-Eintrag ${n} ist keine Variable auf oberster Ebene`); stateSet.delete(n); continue; }
  if (owner.get(n).node.type !== 'VariableDeclaration') die(`${n} ist eine Funktion/Klasse und kann nicht ins Zustandsobjekt`);
}

// ---------- 4. statisch oder in init ----------
const SAFE_GLOBALS = new Set(['Math', 'Infinity', 'NaN', 'undefined', 'Number', 'String', 'Object', 'Array', 'JSON', 'Map', 'Set', 'WeakMap',
  'Float32Array', 'Float64Array', 'Uint8Array', 'Uint16Array', 'Uint32Array', 'Int16Array', 'Int32Array', 'Uint8ClampedArray']);
// Reine Mathe-Objekte von three.js: haben keine fortlaufende id, ihr Erzeugungszeitpunkt ändert nichts am Bild
const THREE_MATH = new Set(['Vector2', 'Vector3', 'Vector4', 'Matrix3', 'Matrix4', 'Quaternion', 'Euler', 'Color', 'Box3', 'Sphere', 'Ray', 'Plane', 'Spherical', 'Frustum', 'Line3', 'Triangle']);
const jsonIdents = new Set(MAP.extract.filter(e => !e.prop).map(e => e.ident));
const staticNames = new Set();       // statische Bindungen je Modul (Name)
function isStatic(n, mod) {
  if (!n) return true;
  switch (n.type) {
    case 'Literal': case 'ArrowFunctionExpression': case 'FunctionExpression': return true;
    case 'TemplateLiteral': return n.expressions.every(e => isStatic(e, mod));
    case 'ArrayExpression': return n.elements.every(e => e && e.type !== 'SpreadElement' && isStatic(e, mod));
    case 'ObjectExpression': return n.properties.every(p => p.type === 'Property' && (!p.computed || isStatic(p.key, mod)) && isStatic(p.value, mod));
    case 'UnaryExpression': return n.operator !== 'delete' && isStatic(n.argument, mod);
    case 'BinaryExpression': case 'LogicalExpression': return isStatic(n.left, mod) && isStatic(n.right, mod);
    case 'ConditionalExpression': return isStatic(n.test, mod) && isStatic(n.consequent, mod) && isStatic(n.alternate, mod);
    case 'Identifier': {
      if (stateSet.has(n.name)) return false;
      const o = owner.get(n.name);
      if (o) return o.module === mod && staticNames.has(n.name);
      return SAFE_GLOBALS.has(n.name) || n.name === 'THREE';
    }
    case 'MemberExpression': {
      if (n.object.type === 'Identifier' && jsonIdents.has(n.object.name)) return true;
      return isStatic(n.object, mod) && (!n.computed || isStatic(n.property, mod)) && n.object.type !== 'ThisExpression';
    }
    case 'NewExpression': case 'CallExpression': {
      const c = n.callee;
      const ok = (c.type === 'MemberExpression' && c.object.type === 'Identifier' && !c.computed &&
          ((c.object.name === 'THREE' && THREE_MATH.has(c.property.name)) || (c.object.name === 'Math'))) ||
        (n.type === 'NewExpression' && c.type === 'Identifier' && SAFE_GLOBALS.has(c.name) && !owner.has(c.name));
      return ok && n.arguments.every(a => a.type !== 'SpreadElement' && isStatic(a, mod));
    }
    default: return false;
  }
}
const extractByDecl = new Map();
for (const e of MAP.extract) { if (!extractByDecl.has(e.decl)) extractByDecl.set(e.decl, []); extractByDecl.get(e.decl).push(e); }
for (const st of stmts) {
  const s = st.node;
  if (s.type === 'FunctionDeclaration') { st.kind = 'fn'; continue; }
  if (s.type === 'VariableDeclaration') {
    // Anfangswerte für S stehen in core/state.js: dort nur reine Literale ohne Bezeichner
    const pureLit = d => { let ok = true; if (d.init) walk.full(d.init, n => { if (n.type === 'Identifier' && !SAFE_GLOBALS.has(n.name) && parent.get(n)?.type !== 'Property' && !(parent.get(n)?.type === 'MemberExpression' && parent.get(n).property === n)) ok = false; }); return ok; };
    if (s.declarations.some(d => stateSet.has(d.id.name) && !pureLit(d))) { st.kind = 'dyn'; continue; }
    st.kind = s.declarations.every(d => (extractByDecl.has(d.id.name) && !extractByDecl.get(d.id.name)[0].prop) || isStatic(d.init, st.module)) ? 'static' : 'dyn';
    if (st.kind === 'static') st.names.forEach(n => staticNames.add(n));
    continue;
  }
  st.kind = 'dyn';
}

// ---------- Umschreiben im Text ----------
const ms = new MagicString(js);
// Mitgliederzugriffe window.THREE usw.
walk.full(ast, n => {
  if (n.type !== 'MemberExpression' || n.computed || n.object.type !== 'Identifier') return;
  const k = n.object.name + '.' + n.property.name;
  if (MAP.members[k] && !topVars.has(n.object.name)) ms.overwrite(n.start, n.end, MAP.members[k]);
});
// Zustandsvariablen -> S.name
for (const n of stateSet) {
  for (const r of topVars.get(n).references) {
    const id = r.identifier, p = parent.get(id);
    if (p && p.type === 'Property' && p.shorthand && p.value === id) ms.overwrite(id.start, id.end, `${n}: S.${n}`);
    else ms.overwrite(id.start, id.end, 'S.' + n);
  }
}
// Herausgelöste Daten
const jsonFiles = new Map();       // Datei -> Objekt
const evalLit = src => Function('"use strict"; return (' + src + ');')();
const extraImports = new Map();    // Modul -> Set(Importzeilen)
const addImport = (mod, line) => { if (!extraImports.has(mod)) extraImports.set(mod, new Set()); extraImports.get(mod).add(line); };
const relPath = (from, to) => { let r = path.posix.relative(path.posix.dirname(from), to); if (!r.startsWith('.')) r = './' + r; return r; };
for (const [decl, list] of extractByDecl) {
  const st = owner.get(decl);
  if (!st) { console.warn(`split: Hinweis – ${decl} (extract) nicht gefunden`); continue; }
  const d = st.node.declarations.find(x => x.id.name === decl);
  for (const e of list) {
    let valueNode;
    if (e.prop) {
      walk.simple(d.init, { Property(p) { if (!valueNode && !p.computed && (p.key.name || p.key.value) === e.prop && p.value.type === 'ObjectExpression') valueNode = p.value; } });
      if (!valueNode) die(`${decl}: Eigenschaft ${e.prop} nicht gefunden`);
      jsonFiles.set(e.file, evalLit(js.slice(valueNode.start, valueNode.end)));
      ms.overwrite(valueNode.start, valueNode.end, e.ident);
    } else {
      valueNode = d.init;
      const o = jsonFiles.get(e.file) || {}; o[e.key] = evalLit(js.slice(valueNode.start, valueNode.end)); jsonFiles.set(e.file, o);
      ms.overwrite(valueNode.start, valueNode.end, e.ident + '.' + e.key);
    }
    addImport(st.module, `import ${e.ident} from '${relPath(st.module, e.file)}';`);
  }
}
// return auf oberster Ebene der IIFE -> return false
const earlyExit = new Set();
for (const st of stmts) {
  if (st.kind !== 'dyn') continue;
  walk.recursive(st.node, null, {
    Function() {},                                             // nicht in verschachtelte Funktionen
    ReturnStatement(n) { if (n.argument) die(`Zeile ${n.loc.start.line}: return mit Wert auf oberster Ebene`); ms.overwrite(n.start, n.end, 'return false;'); earlyExit.add(st); },
  });
}


// ---------- Konstanten aus IIFE-Modulen (AU, MB, POST …) herauslösen ----------
// map.mjs `inner`: { Besitzer: { Zielmodul: [Namen] } }. Herausgelöst wird nur eine const-Anweisung der obersten Ebene
// der IIFE, deren Anfangswert nichts aus der IIFE braucht außer anderen herausgelösten Namen (Literale, Tabellen, GLSL).
// Der Name bleibt gleich und wird ins Besitzer-Modul importiert; die IIFE sieht ihn wie vorher.
const innerMoves = [];
for (const [ownerName, targets] of Object.entries(MAP.inner || {})) {
  const ost = owner.get(ownerName);
  if (!ost) { console.warn(`split: Hinweis – inner: ${ownerName} nicht gefunden`); continue; }
  const d = ost.node.declarations.find(x => x.id.name === ownerName);
  const fn = d && d.init && d.init.type === 'CallExpression' && /Function/.test(d.init.callee.type) ? d.init.callee : null;
  if (!fn) die(`inner: ${ownerName} ist keine IIFE`);
  const iscope = sm.acquire(fn);
  const want = new Map();
  for (const [to, names] of Object.entries(targets)) for (const n of names) want.set(n, to);
  const moved = new Set();
  let prev = fn.body.start + 1;
  for (const t of fn.body.body) {
    const tStart = prev; prev = t.end;
    { const nl = js.indexOf('\n', t.end); if (/^\s*(\/\/.*)?$/.test(js.slice(t.end, nl))) prev = nl; }
    if (t.type !== 'VariableDeclaration') continue;
    const ns = t.declarations.map(x => x.id.name);
    const hit = ns.filter(n => want.has(n));
    if (!hit.length) continue;
    if (hit.length !== ns.length) die(`inner: ${ownerName} Zeile ${t.loc.start.line}: ${ns.join(', ')} nur teilweise in map.mjs inner`);
    const to = want.get(ns[0]);
    if (ns.some(n => want.get(n) !== to)) die(`inner: ${ns.join(', ')} sollen in verschiedene Module`);
    if (t.kind !== 'const') die(`inner: ${ns.join(', ')} ist nicht const`);
    for (const n of ns) {
      if (topVars.has(n)) die(`inner: ${n} kollidiert mit einem Namen auf oberster Ebene`);
      const v = iscope.set.get(n);
      if (v.references.some(r => r.isWrite() && !r.init)) die(`inner: ${n} wird neu zugewiesen`);
    }
    // Anfangswerte dürfen nur Globale (Math …) und bereits herausgelöste Namen nennen
    for (const x of t.declarations) walk.full(x.init, n => {
      if (n.type !== 'Identifier') return;
      const p = parent.get(n);
      if (p && p.type === 'MemberExpression' && p.property === n && !p.computed) return;
      if (p && p.type === 'Property' && p.key === n && !p.computed && !p.shorthand) return;
      if (moved.has(n.name) || ns.includes(n.name) || SAFE_GLOBALS.has(n.name)) return;
      if (topVars.has(n.name) && owner.get(n.name) && staticNames.has(n.name)) { innerMoves.push({ dep: n.name, to }); return; }
      die(`inner: ${ns.join(', ')} (${ownerName} Zeile ${t.loc.start.line}) braucht ${n.name} – nicht herauslösbar`);
    });
    ns.forEach(n => moved.add(n));
    const text = ms.slice(tStart, prev).replace(/^\n+/, '').replace(/^ {2}/gm, '');
    ms.remove(tStart, prev);
    innerMoves.push({ owner: ost.module, to, names: ns, text });
  }
  for (const n of want.keys()) if (!moved.has(n)) console.warn(`split: Hinweis – inner: ${n} in ${ownerName} nicht gefunden`);
}

// ---------- Module zusammenstellen ----------
const modules = new Map();
const M = name => { if (!modules.has(name)) modules.set(name, { name, top: [], hoist: [], inits: [], imports: new Map(), exports: new Set(), usesS: false, ext: new Set() }); return modules.get(name); };
// Abschnitte, die nacheinander zum selben Modul gehören, bilden eine init-Funktion
const segments = [];
for (const st of stmts) {
  const m = M(st.module);
  if (st.kind === 'fn') { m.top.push(ms.slice(st.start, st.end)); continue; }
  if (st.kind === 'static') {
    const s = st.node, keep = s.declarations.filter(d => !stateSet.has(d.id.name));
    const sInit = s.declarations.filter(d => stateSet.has(d.id.name));
    for (const d of sInit) { M('core/state.js').top.push(`\n  ${d.id.name}: ${d.init ? ms.slice(d.init.start, d.init.end) : 'undefined'},`); }
    if (!sInit.length) m.top.push(ms.slice(st.start, st.end));
    else {
      const lead = ms.slice(st.start, s.start);
      if (keep.length) m.top.push(lead + s.kind + ' ' + keep.map(d => ms.slice(d.start, d.end)).join(', ') + ';');
      else if (lead.trim()) m.top.push(lead.replace(/\s+$/, '') + `  /* → S (core/state.js): ${sInit.map(d => d.id.name).join(', ')} */`);
    }
    continue;
  }
  // dynamisch: Deklaration aufteilen in „let name;“ oben und Zuweisung in init
  let text;
  const s = st.node;
  if (s.type === 'VariableDeclaration') {
    s.declarations.filter(d => !stateSet.has(d.id.name)).forEach(d => m.hoist.push(d.id.name));
    s.declarations.filter(d => stateSet.has(d.id.name) && !d.init).forEach(d => M('core/state.js').top.push(`\n  ${d.id.name}: undefined,`));
    const withInit = s.declarations.filter(d => d.init);
    const lead = ms.slice(st.start, s.start), tail = ms.slice(s.end, st.end);
    if (!withInit.length) text = lead.trim() ? lead.replace(/\s+$/, '') : '';
    else if (withInit.length === s.declarations.length) { ms.remove(s.start, s.declarations[0].start); text = ms.slice(st.start, st.end); }
    else text = lead + withInit.map(d => ms.slice(d.start, d.end)).join(', ') + ';' + tail;
  } else text = ms.slice(st.start, st.end);
  const last = segments[segments.length - 1];
  if (last && last.module === st.module) { last.parts.push(text); if (earlyExit.has(st)) last.exit = true; }
  else segments.push({ module: st.module, parts: [text], exit: earlyExit.has(st) });
}
const pascal = s => s.replace(/(^|[-_/.])(\w)/g, (_, __, c) => c.toUpperCase());
for (const seg of segments) {
  const m = M(seg.module);
  const bn = path.posix.basename(seg.module, '.js'), base = 'init' + pascal(bn === 'index' ? path.posix.basename(path.posix.dirname(seg.module)) : bn);
  seg.fn = m.inits.length ? base + (m.inits.length + 1) : base;
  m.inits.push(seg);
}

// Herausgelöste IIFE-Konstanten einhängen
for (const mv of innerMoves) {
  if (mv.dep) { const o = owner.get(mv.dep); if (o.module !== mv.to) { M(mv.to).imports.set(mv.dep, o.module); M(o.module).exports.add(mv.dep); } continue; }
  const t = M(mv.to);
  t.top.push('\n' + mv.text);
  mv.names.forEach(n => { t.exports.add(n); M(mv.owner).imports.set(n, mv.to); });
}
// Verweise: Importe und Exporte
for (const [name, v] of topVars) {
  const own = owner.get(name); if (!own || stateSet.has(name)) continue;
  for (const r of v.references) {
    const st = stmtAt(r.identifier.start); if (!st || st.module === own.module) continue;
    if (r.isWrite()) die(`${name}: Schreibzugriff aus ${st.module} (Zeile ${r.identifier.loc.start.line}) auf ${own.module}`);
    M(st.module).imports.set(name, own.module); M(own.module).exports.add(name);
  }
}
for (const st of stmts) {
  const m = M(st.module);
  walk.full(st.node, n => {
    if (n.type === 'Identifier' && stateSet.has(n.name) && topVars.get(n.name).references.some(r => r.identifier === n && !r.init)) m.usesS = true;
  });
}
// Bezeichner von außen (three.js, Ziel-Konstanten): nach dem Umschreiben im Ergebnistext suchen wäre unsauber –
// stattdessen nach freien Verweisen (through) und den Ersetzungen der Mitgliederzugriffe
const extUse = (mod, name) => M(mod).ext.add(name);
for (const r of sm.globalScope.through) {
  const n = r.identifier.name; if (!MAP.externals[n]) continue;
  const st = stmtAt(r.identifier.start); if (st) extUse(st.module, n);
}
walk.full(ast, n => {
  if (n.type !== 'MemberExpression' || n.computed || n.object.type !== 'Identifier') return;
  const k = n.object.name + '.' + n.property.name, to = MAP.members[k];
  if (to && MAP.externals[to]) { const st = stmtAt(n.start); if (st) extUse(st.module, to); }
});

// ---------- Ausgabe ----------
const files = new Map();
const header = (m) => {
  const purpose = (MAP.purpose[m.name] || 'Modul aus dem Abschnitt des Monolithen.');
  const exp = [...m.exports].sort(), deps = [...new Set([...m.imports.values()])].sort();
  const lines = [`// ${m.name.replace(/\.js$/, '')} – ${purpose}`];
  if (exp.length) lines.push(`// Exporte: ${exp.join(', ')}${m.inits.length ? '; ' + m.inits.map(s => s.fn).join(', ') : ''}`);
  else if (m.inits.length) lines.push(`// Exporte: ${m.inits.map(s => s.fn).join(', ')}`);
  if (deps.length || m.usesS) lines.push(`// Hängt ab von: ${[...deps, ...(m.usesS ? ['core/state.js'] : [])].join(', ')}`);
  lines.push('// Erzeugt von tools/refactor/split.mjs aus src/sonnensystem.html – bis zum Ende des Umbaus nicht von Hand ändern.');
  return lines.join('\n') + '\n';
};
for (const m of modules.values()) {
  if (m.name === 'core/state.js') continue;
  const imp = [];
  for (const n of [...m.ext].sort()) {
    const e = MAP.externals[n];
    if (typeof e === 'string') imp.push(e);
    else { m.imports.set(n, e.module); }
  }
  if (m.usesS) imp.push(`import { S } from '${relPath(m.name, 'core/state.js')}';`);
  const byMod = new Map();
  for (const [n, from] of m.imports) { if (!byMod.has(from)) byMod.set(from, []); byMod.get(from).push(n); }
  for (const [from, names] of [...byMod].sort((a, b) => a[0].localeCompare(b[0]))) imp.push(`import { ${names.sort().join(', ')} } from '${relPath(m.name, from)}';`);
  for (const l of extraImports.get(m.name) || []) imp.push(l);
  let out = header(m) + '\n' + [...new Set(imp)].join('\n') + '\n\n';
  if (m.hoist.length) out += `// Belegt in ${m.inits.map(s => s.fn).join('/')}() (Reihenfolge des Starts, siehe main.js)\nlet ${m.hoist.join(', ')};\n\n`;
  out += m.top.join('').replace(/^\n+/, '') + (m.top.length ? '\n' : '');
  for (const seg of m.inits) {
    const bodyText = seg.parts.join('').replace(/^\n+/, '');
    out += `\nexport function ${seg.fn}(){\n${bodyText}\n}\n`;
  }
  const exp = [...m.exports].sort();
  if (exp.length) out += `\nexport { ${exp.join(', ')} };\n`;
  files.set(m.name, out.replace(/\n{3,}/g, '\n\n'));
}
// Zustandsobjekt
{
  const st = M('core/state.js');
  files.set('core/state.js', `// @ts-check\n// core/state – Gemeinsamer veränderlicher Zustand: Variablen, die mehrere Module schreiben (ES-Module erlauben\n` +
    `// Zuweisungen nur im eigenen Modul). Liste in tools/refactor/map.mjs (state); Anfangswerte aus dem Monolithen,\n` +
    `// Werte, die erst beim Start feststehen, setzen die init…()-Funktionen der Besitzer-Module.\n` +
    `// Erzeugt von tools/refactor/split.mjs – bis zum Ende des Umbaus nicht von Hand ändern.\n\n` +
    `/** @type {Record<string, any>} */\nexport const S = {${[...new Set(st.top)].join('')}\n};\n`);
}
// main.js
{
  const cssFiles = splitStyles();
  const imp = cssFiles.map(f => `import './styles/${f}';`);
  const byMod = new Map();
  for (const seg of segments) { if (!byMod.has(seg.module)) byMod.set(seg.module, []); byMod.get(seg.module).push(seg.fn); }
  for (const [mod, fns] of byMod) imp.push(`import { ${fns.join(', ')} } from './${mod}';`);
  const calls = segments.map(s => s.exit ? `  if (${s.fn}() === false) return;` : `  ${s.fn}();`);
  files.set('main.js', `// main – Einstieg: Stil laden und die Module in der Reihenfolge des früheren Skripts starten.\n` +
    `// Funktionen und Konstanten stehen in den Modulen bereit; die init…()-Funktionen erledigen, was vom DOM, vom\n` +
    `// Renderer oder von anderen Modulen abhängt. Ein init, das false liefert, beendet den Start (kein WebGL).\n` +
    `// Erzeugt von tools/refactor/split.mjs – bis zum Ende des Umbaus nicht von Hand ändern.\n\n` +
    imp.join('\n') + `\n\nfunction start(){\n${calls.join('\n')}\n}\nstart();\n`);
}
function splitStyles(){
  const a = html.indexOf('<style>\n'), b = html.indexOf('</style>');
  const css = html.slice(a + 8, b);
  const out = []; let curF = null, buf = [];
  const flush = () => { if (curF && buf.join('').trim()) { if (out.find(o => o.f === curF)) die(`Stil: ${curF} käme zweimal vor (Reihenfolge)`); out.push({ f: curF, text: buf.join('\n') }); } buf = []; };
  for (const line of css.split('\n')) {
    const hit = MAP.styles.find(([p]) => line.startsWith(p));
    if (hit && hit[1] !== curF) { flush(); curF = hit[1]; }
    if (!curF) die('Stil beginnt nicht mit einem bekannten Kommentar (map.mjs styles)');
    buf.push(line);
  }
  flush();
  for (const o of out) files.set('styles/' + o.f, `/* Erzeugt von tools/refactor/split.mjs aus src/sonnensystem.html */\n` + o.text.replace(/\n*$/, '\n'));
  return out.map(o => o.f);
}
// index.html
{
  const a = html.indexOf('<div id="app"'), b = html.indexOf('<script', a);
  const markup = html.slice(a, b).trim();
  files.set('../index.html', `<!doctype html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n` +
    `<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n` +
    `<!-- Kopfangaben (Titel, Beschreibung, canonical, hreflang, og:*, Favicon, Schriften) setzt vite.config.js aus site.json -->\n` +
    `</head>\n<body>\n<noscript><p style="margin:24px;font:16px system-ui;color:#ece8dc">Diese Seite braucht JavaScript und WebGL.</p></noscript>\n` +
    markup + `\n<script type="module" src="/src/main.js"></script>\n</body>\n</html>\n`);
}
for (const [f, o] of jsonFiles) files.set(f, (f.startsWith('i18n/') ? JSON.stringify(o, null, 1).replace(/^ /gm, '  ') : jsonPretty(o)) + '\n');
function jsonPretty(o){
  // Zeitmarken: je Clip eine Zeile, damit Diffs von finalize.py lesbar bleiben
  const parts = [];
  for (const [k, v] of Object.entries(o)) {
    if (Array.isArray(v)) parts.push(`  ${JSON.stringify(k)}: ${JSON.stringify(v)}`);
    else parts.push(`  ${JSON.stringify(k)}: {\n${Object.entries(v).map(([c, x]) => `    ${JSON.stringify(c)}: ${JSON.stringify(x)}`).join(',\n')}\n  }`);
  }
  return '{\n' + parts.join(',\n') + '\n}';
}

// ---------- Schreiben ----------
const GENERATED_DIRS = ['core', 'i18n', 'data', 'ui', 'audio', 'orbit', 'render', 'mars', 'hud', 'app', 'testing', 'styles'];
const KEEP = new Set(['core/target.js']);       // von Hand gepflegt, nicht erzeugt
if (DRY) { for (const [f, t] of files) console.log(f, t.split('\n').length); process.exit(0); }
for (const d of GENERATED_DIRS) {
  const dir = path.join(OUT, d);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir, { recursive: true })) {
    const rel = path.posix.join(d, String(f).split(path.sep).join('/'));
    const full = path.join(OUT, rel);
    if (fs.statSync(full).isFile() && !KEEP.has(rel)) fs.rmSync(full);
  }
}
let total = 0;
for (const [f, t] of files) {
  const full = path.join(OUT, f);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, t);
  total += t.split('\n').length;
}
const big = [...files].filter(([f, t]) => f.endsWith('.js') && t.split('\n').length > 500).map(([f, t]) => `${f} (${t.split('\n').length})`);
console.log(`split: ${files.size} Dateien, ${total} Zeilen, ${segments.length} init-Schritte, Zustand S: ${[...stateSet].sort().join(', ')}`);
if (big.length) console.log('split: über 500 Zeilen: ' + big.join(', '));
