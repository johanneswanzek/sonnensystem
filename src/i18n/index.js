// i18n/index – Sprache: LANG, LOC, Übersetzung tr/fill (Schlüssel ist der deutsche Text), setLang. Wörterbücher in en.json, pl.json.
// Exporte: LANG, LANGS, LOC, fill, setLang, tr; initI18n
// Hängt ab von: core/target.js
// Erzeugt von tools/refactor/split.mjs aus src/sonnensystem.html – bis zum Ende des Umbaus nicht von Hand ändern.

import { SITE_CFG } from '../core/target.js';
import en from './en.json';
import pl from './pl.json';

// Belegt in initI18n() (Reihenfolge des Starts, siehe main.js)
let LANG, LOC, TR;

/* ---------- Sprache ---------- */
// Deutsch ist die Quellsprache: alle Texte stehen deutsch im Programm, TR liefert dazu die Übersetzung (fehlt eine, bleibt der deutsche Text).
// Die Sprache kommt aus der Adresse (?lang=en), sonst aus der letzten Wahl, sonst aus den Sprachen des Browsers; unbekannte Sprachen bekommen Englisch.
const LANGS = {de:'Deutsch', en:'English', pl:'Polski'};
const tr = s => TR[s] || s;
const fill = (s,...a) => tr(s).replace(/\{(\d)\}/g,(m,k) => a[k]);
// Sprachwechsel lädt die Seite neu: Texte, Sprecher und Zeitmarken hängen an der Sprache. Die eigene Website trägt die Sprache in der Adresse.
function setLang(l){
  if (!LANGS[l] || l === LANG) return;
  try { localStorage.setItem('sonnensystem.lang', l); } catch (e) {}
  try {
    if (SITE_CFG) { const u = new URL(location.href); u.searchParams.set('lang', l); location.replace(u.href); }
    else location.reload();
  } catch (e) { location.reload(); }
}

export function initI18n(){
LANG = (function(){
  let l = null;
  try { l = new URLSearchParams(location.search).get('lang'); } catch (e) {}
  if (!LANGS[l]) try { l = localStorage.getItem('sonnensystem.lang'); } catch (e) {}
  if (!LANGS[l]) {
    l = 'en';
    const want = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
    for (const n of want) { const k = String(n).slice(0,2).toLowerCase(); if (LANGS[k]) { l = k; break; } }
  }
  return l;
})();
LOC = {de:'de-DE', en:'en-GB', pl:'pl-PL'}[LANG];          // Zahlen und Datum
TR = {
en:en,
pl:pl
}[LANG] || {};
}

export { LANG, LANGS, LOC, fill, setLang, tr };
