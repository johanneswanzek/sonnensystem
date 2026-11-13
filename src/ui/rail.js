// ui/rail – Leiste der Himmelskörper und Beschriftungen in der Szene.
// Exporte: initRail
// Hängt ab von: app/tour.js, data/bodies.js, i18n/index.js, ui/dom.js

import { focus } from '../app/tour.js';
import { BODIES } from '../data/bodies.js';
import { tr } from '../i18n/index.js';
import { elBlurb, labelsEl, rail } from './dom.js';

export function initRail(){
BODIES.forEach((b,i) => {
  const c = document.createElement('button');
  c.type = 'button'; c.className = 'chip'; c.id = 'chip-' + b.id;
  c.innerHTML = '<span class="dot" style="--c:' + b.color + '"></span><span>' + (i === 0 ? tr('Übersicht') : b.short || b.name) + '</span>';
  c.addEventListener('click', () => focus(i, true));
  rail.appendChild(c); b.chip = c;
  if (i > 0) {
    const l = document.createElement('button');
    l.type = 'button'; l.className = 'lbl'; l.tabIndex = -1; l.innerHTML = '<span>' + (b.label || b.name) + '</span><i></i>';
    l.style.visibility = 'hidden';
    l.addEventListener('click', () => focus(i, true));
    labelsEl.appendChild(l); b.lbl = l; b.lblSub = l.lastChild;
  }
});
elBlurb.textContent = BODIES[0].blurb;
}
