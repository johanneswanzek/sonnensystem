// ui/sound – Tonknopf, Hinweise (toast), Tonmodus.
// Exporte: setSound, showSound, soundBtn; initSound
// Hängt ab von: audio/engine.js, core/util.js, i18n/index.js, core/state.js

import { S } from '../core/state.js';
import { AU } from '../audio/engine.js';
import { $ } from '../core/util.js';
import { tr } from '../i18n/index.js';

// Belegt in initSound() (Reihenfolge des Starts, siehe main.js)
let soundBtn, soundIcon, toastEl;

// Ton in drei Stufen: Musik und Sprecher, nur Sprecher, aus
const SND = [
  ['Musik und Sprecher', 'M1.5 4.5h2l3-2.5v8l-3-2.5h-2zM9 4c.9 1 .9 3 0 4M10.8 2.6c1.8 1.8 1.8 5 0 6.8'],
  ['Nur Sprecher, ohne Musik', 'M1.5 4.5h2l3-2.5v8l-3-2.5h-2zM9 4c.9 1 .9 3 0 4'],
  ['Ton aus', 'M1.5 4.5h2l3-2.5v8l-3-2.5h-2zM9.5 4.5l3 3M12.5 4.5l-3 3'],
];
let toastTimer = 0;
function toast(t) {
  toastEl.textContent = t;
  toastEl.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('on'), 2200);
}
function showSound(say) {
  soundBtn.setAttribute('aria-pressed', S.soundMode < 2 ? 'true' : 'false');
  soundBtn.setAttribute('aria-label', SND[S.soundMode][0] + tr('. Antippen für: ') + SND[(S.soundMode + 1) % 3][0]);
  soundIcon.setAttribute('d', SND[S.soundMode][1]);
  if (say) toast(SND[S.soundMode][0]);
}
function setSound(m) {
  S.soundMode = m;
  AU.music(m === 0);
  AU.mute(m === 2);
  showSound(true);
}

export function initSound() {
  ((soundBtn = $('#sound')), (soundIcon = $('#soundIcon')), (toastEl = $('#toast')));
  SND.forEach(m => {
    m[0] = tr(m[0]);
  });
}

export { setSound, showSound, soundBtn };
