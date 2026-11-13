// ui/dom – Elemente der Seite, Übersetzen der festen Texte (data-t, aria-label).
// Exporte: app, c2, canvas, caption, clockEl, elBlurb, elDate, elEff, elKind, elName, elSpeed, elSr, fx, hudEl, hudR, labelsEl, loader, navEl, rail, startEl, tourBtn, tourIcon; initDom
// Hängt ab von: core/util.js, data/bodies.js, i18n/index.js

import { $ } from '../core/util.js';
import { BODIES } from '../data/bodies.js';
import { LANG, tr } from '../i18n/index.js';

// Belegt in initDom() (Reihenfolge des Starts, siehe main.js)
let app, canvas, fx, rail, labelsEl, loader, elName, elKind, elBlurb, elSr, caption, startEl, hudEl, hudR, clockEl, navEl, elDate, elSpeed, elEff, tourBtn, tourIcon, c2;

export function initDom(){
/* ---------- DOM ---------- */
app = $('#app'), canvas = $('#stage'), fx = $('#fx'), rail = $('#rail'), labelsEl = $('#labels'), loader = $('#loader');
elName = $('#name'), elKind = $('#kind'), elBlurb = $('#blurb'), elSr = $('#sr'), caption = $('#caption'), startEl = $('#start');
hudEl = $('.hud'), hudR = $('.hudr'), clockEl = $('.clock'), navEl = $('.nav');
elDate = $('#date'), elSpeed = $('#speed'), elEff = $('#eff'), tourBtn = $('#tour'), tourIcon = $('#tourIcon');
c2 = fx.getContext('2d');

// Übersetzen: feste Texte im Markup (data-t), Beschriftungen für Vorleseprogramme und die Texte der Himmelskörper
app.lang = LANG;
if (LANG !== 'de') {
  app.querySelectorAll('[data-t]').forEach(e => { e.innerHTML = tr(e.innerHTML.trim()); });
  app.querySelectorAll('[aria-label]').forEach(e => e.setAttribute('aria-label', tr(e.getAttribute('aria-label'))));
  const each = o => ['name','short','label','kind','blurb','sr','day','per','n'].forEach(k => { if (typeof o[k] === 'string') o[k] = tr(o[k]); });
  BODIES.forEach(b => { each(b); (b.stages || []).forEach(each); (b.sats || []).forEach(each); if (b.facts) b.facts = b.facts.map(f => f.map(tr)); });
  // Messmarken stehen auf dem Canvas: die Zeichen des erweiterten Lateins vorab laden, sonst erscheint der erste Text in einer Ersatzschrift
  try { ['500 11px "IBM Plex Mono"','400 11px "IBM Plex Mono"'].forEach(f => document.fonts.load(f,'ĄĆĘŁŃÓŚŹŻ').catch(() => {})); } catch (e) {}
}
elName.textContent = BODIES[0].name; elName.classList.toggle('long', BODIES[0].name.length > 12); elKind.textContent = BODIES[0].kind;
}

export { app, c2, canvas, caption, clockEl, elBlurb, elDate, elEff, elKind, elName, elSpeed, elSr, fx, hudEl, hudR, labelsEl, loader, navEl, rail, startEl, tourBtn, tourIcon };
