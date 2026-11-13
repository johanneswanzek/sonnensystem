// main – Einstieg: Stil laden und die Module in der Reihenfolge des früheren Skripts starten.
// Funktionen und Konstanten stehen in den Modulen bereit; die init…()-Funktionen erledigen, was vom DOM, vom
// Renderer oder von anderen Modulen abhängt. Ein init, das false liefert, beendet den Start (kein WebGL).
// Erzeugt von tools/refactor/split.mjs – bis zum Ende des Umbaus nicht von Hand ändern.

import './styles/base.css';
import './styles/hud.css';
import './styles/language-menu.css';
import './styles/rail.css';
import './styles/start.css';
import './styles/fullscreen.css';
import './styles/nav.css';
import './styles/layout-wide.css';
import './styles/dialog.css';
import { initUtil } from './core/util.js';
import { initI18n } from './i18n/index.js';
import { initVoice } from './data/voice.js';
import { initDom } from './ui/dom.js';
import { initLanguageMenu } from './ui/language-menu.js';
import { initRail } from './ui/rail.js';
import { initCredits } from './ui/credits.js';
import { initRenderer } from './render/renderer.js';
import { initEngine } from './audio/engine.js';
import { initSurfaces } from './render/surfaces.js';
import { initBake } from './render/bake.js';
import { initScene } from './render/scene.js';
import { initDevice } from './core/device.js';
import { initBase } from './mars/base.js';
import { initTour } from './app/tour.js';
import { initCamera } from './app/camera.js';
import { initSound } from './ui/sound.js';
import { initControls, initControls2 } from './ui/controls.js';
import { initFullscreen } from './ui/fullscreen.js';
import { initDraw } from './hud/draw.js';
import { initEarth } from './hud/earth.js';
import { initLoop } from './app/loop.js';
import { initBoot } from './app/boot.js';

function start(){
  initUtil();
  initI18n();
  initVoice();
  initDom();
  initLanguageMenu();
  initRail();
  initCredits();
  if (initRenderer() === false) return;
  initEngine();
  initSurfaces();
  initBake();
  initScene();
  initDevice();
  initBase();
  initTour();
  initCamera();
  initSound();
  initControls();
  initFullscreen();
  initControls2();
  initDraw();
  initEarth();
  initLoop();
  initBoot();
}
start();
