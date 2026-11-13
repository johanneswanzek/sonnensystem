// ui/credits – Dialog „Quellen“, Impressum und Datenschutz (nur Website), Titel und Beschreibung je Sprache.
// Exporte: creditsEl; initCredits
// Hängt ab von: core/target.js, core/util.js, i18n/index.js, ui/dom.js

import { SITE_CFG } from '../core/target.js';
import { $ } from '../core/util.js';
import { LANG, tr } from '../i18n/index.js';
import { rail } from './dom.js';

// Belegt in initCredits() (Reihenfolge des Starts, siehe main.js)
let creditsEl, SITE;

export function initCredits(){
// Quellenangaben: der letzte Knopf der Leiste öffnet den Dialog. Auf einer eigenen Website kann window.SITE Verweise auf Impressum und Datenschutz liefern.
creditsEl = $('#credits'), SITE = SITE_CFG || {};
{
  const c = document.createElement('button');
  c.type = 'button'; c.className = 'chip more'; c.textContent = tr('Quellen');
  c.addEventListener('click', () => { if (creditsEl.showModal) creditsEl.showModal(); else creditsEl.setAttribute('open',''); });
  rail.appendChild(c);
  const legal = $('#legal');
  [['impressum','Impressum'],['datenschutz','Datenschutz']].forEach(p => {
    if (typeof SITE[p[0]] !== 'string' || !SITE[p[0]]) return;
    const a = document.createElement('a'); a.href = SITE[p[0]]; a.textContent = tr(p[1]);
    if (legal.childNodes.length) legal.appendChild(document.createTextNode(' · '));
    legal.appendChild(a); legal.hidden = false;
  });
  // Eigene Website: Sprache, Titel und Beschreibung des Dokuments nachziehen (im Artefakt gehört das Dokument dem Rahmen)
  if (SITE_CFG) {
    document.documentElement.lang = LANG;
    const m = SITE.i18n && SITE.i18n[LANG], d = document.querySelector('meta[name="description"]');
    if (m && m.title) document.title = m.title;
    if (m && m.description && d) d.content = m.description;
  }
}
}

export { creditsEl };
