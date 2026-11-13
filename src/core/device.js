// core/device – Geräteklasse: DESKTOP schaltet die teure Ausstattung frei (Maus, große Texturen).
// Exporte: DESKTOP; initDevice
// Hängt ab von: render/renderer.js

import { renderer } from '../render/renderer.js';

// Belegt in initDevice() (Reihenfolge des Starts, siehe main.js)
let DESKTOP;

export function initDevice() {
  // Rechner mit Maus und großem Texturspeicher bekommen schärfere Schatten und eine feinere Bodentextur
  DESKTOP =
    (!(import.meta.env.MODE === 'test') || import.meta.env.VITE_DESK === '1') &&
    !!(window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches) &&
    renderer.capabilities.maxTextureSize >= 8192;
}

export { DESKTOP };
