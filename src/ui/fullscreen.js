// ui/fullscreen – Vollbild und Kinoansicht.
// Exporte: cine, fullBtn; initFullscreen
// Hängt ab von: app/tour.js, core/util.js, i18n/index.js, ui/dom.js, ui/layout.js, core/state.js

import { S } from '../core/state.js';
import { setSpeed, setTour, speedIdx, tour } from '../app/tour.js';
import { $ } from '../core/util.js';
import { tr } from '../i18n/index.js';
import { app } from './dom.js';
import { measure } from './layout.js';

// Belegt in initFullscreen() (Reihenfolge des Starts, siehe main.js)
let fullBtn, fullIcon;

let cine = false,
  fsEntered = false;
function setCine(on) {
  cine = on;
  app.classList.toggle('cine', on);
  fullBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  fullBtn.setAttribute('aria-label', tr(on ? 'Vollbild verlassen' : 'Vollbild'));
  fullIcon.setAttribute('d', on ? 'M4 1v3H1M11 4H8V1M8 11V8h3M1 8h3v3' : 'M1 4V1h3M8 1h3v3M11 8v3H8M4 11H1V8');
  if (on && !tour && S.begun) setTour(true);
  measure();
}
const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement;
const onFs = () => {
  if (!fsElement() && fsEntered) {
    fsEntered = false;
    if (cine) setCine(false);
  }
  measure();
};

export function initFullscreen() {
  // Vollbild: blendet die Bedienelemente aus und nutzt echtes Browser-Vollbild, wo das Gerät es erlaubt
  ((fullBtn = $('#full')), (fullIcon = $('#fullIcon')));
  fullBtn.addEventListener('click', () => {
    const on = !cine;
    setCine(on);
    try {
      if (on) {
        const req = app.requestFullscreen || app.webkitRequestFullscreen;
        if (req) {
          const p = req.call(app);
          fsEntered = true;
          if (p && p.catch)
            p.catch(() => {
              fsEntered = false;
            });
        }
      } else if (fsElement()) {
        const ex = document.exitFullscreen || document.webkitExitFullscreen;
        if (ex) {
          const p = ex.call(document);
          if (p && p.catch) p.catch(() => {});
        }
      }
    } catch (err) {
      fsEntered = false;
    }
  });
  document.addEventListener('fullscreenchange', onFs);
  document.addEventListener('webkitfullscreenchange', onFs);
  $('#slower').addEventListener('click', () => setSpeed(speedIdx - 1));
  $('#faster').addEventListener('click', () => setSpeed(speedIdx + 1));
}

export { cine, fullBtn };
