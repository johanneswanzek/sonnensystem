// ui/language-menu – Sprachwahl oben rechts.
// Exporte: langBtn, langMenu, openLang; initLanguageMenu
// Hängt ab von: core/util.js, i18n/index.js

import { $ } from '../core/util.js';
import { LANG, LANGS, setLang } from '../i18n/index.js';

// Belegt in initLanguageMenu() (Reihenfolge des Starts, siehe main.js)
let langBtn, langMenu;

const openLang = on => { langMenu.hidden = !on; langBtn.setAttribute('aria-expanded', on ? 'true' : 'false'); };

export function initLanguageMenu(){
// Sprachwahl oben rechts
langBtn = $('#lang'), langMenu = $('#langMenu');
langBtn.textContent = LANG.toUpperCase();
Object.keys(LANGS).forEach(l => {
  const b = document.createElement('button');
  b.type = 'button'; b.lang = l; b.textContent = LANGS[l]; b.setAttribute('role','menuitemradio'); b.setAttribute('aria-checked', l === LANG ? 'true' : 'false');
  b.addEventListener('click', () => { openLang(false); setLang(l); });
  langMenu.appendChild(b);
});
langBtn.addEventListener('click', () => openLang(langMenu.hidden));
document.addEventListener('click', e => { if (!langMenu.hidden && !e.target.closest('.langbox')) openLang(false); });
}

export { langBtn, langMenu, openLang };
