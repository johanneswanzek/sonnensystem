// render/renderer – WebGL-Renderer und Fehleranzeige, wenn WebGL fehlt.
// Exporte: fail, renderer; initRenderer
// Hängt ab von: i18n/index.js, ui/dom.js

import * as THREE from 'three';
import { tr } from '../i18n/index.js';
import { canvas, elBlurb, loader } from '../ui/dom.js';

function fail(){
  loader.hidden = true;
  elBlurb.textContent = tr('Die 3D-Ansicht konnte nicht gestartet werden. Dafür wird WebGL benötigt, das in dieser Umgebung nicht verfügbar ist.');
}
let renderer;

export function initRenderer(){
if (!THREE) { fail(); return false; }
try { renderer = new THREE.WebGLRenderer({canvas, antialias:true, powerPreference:'high-performance'}); }
catch (e) { fail(); return false; }
}

export { fail, renderer };
