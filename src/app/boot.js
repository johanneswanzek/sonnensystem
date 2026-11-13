// app/boot – Start: Karten und Oberflächen vorbereiten, Szene bauen, Modelle nachladen.
// Exporte: initBoot
// Hängt ab von: app/camera.js, app/loop.js, app/tour.js, core/device.js, core/target.js, data/bodies.js, i18n/index.js, mars/base.js, orbit/kepler.js, render/bake.js, render/renderer.js, render/scene.js, render/surfaces.js, testing/hooks.js, ui/dom.js, ui/layout.js, ui/sound.js, core/state.js
// Erzeugt von tools/refactor/split.mjs aus src/sonnensystem.html – bis zum Ende des Umbaus nicht von Hand ändern.

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { S } from '../core/state.js';
import { dPos, dTgt, desired, fromOff, pos, tgt } from './camera.js';
import { frame } from './loop.js';
import { setSpeed, setTour, speedIdx } from './tour.js';
import { DESKTOP } from '../core/device.js';
import { MODEL_EXT } from '../core/target.js';
import { BODIES } from '../data/bodies.js';
import { tr } from '../i18n/index.js';
import { MB } from '../mars/base.js';
import { place, solve } from '../orbit/kepler.js';
import { bake, bakeFlat, nextFrame } from '../render/bake.js';
import { fail, renderer } from '../render/renderer.js';
import { buildBackdrop, buildExtras, buildMinor, buildPlanet, buildSun, camera, setVesta } from '../render/scene.js';
import { SURF } from '../render/surfaces.js';
import { installTestHooks } from '../testing/hooks.js';
import { elSr, loader, startEl } from '../ui/dom.js';
import { measure, shiftTarget } from '../ui/layout.js';
import { showSound } from '../ui/sound.js';

/* ---------- Start ---------- */
// NASA-Modelle nachladen (glTF als JSON mit eingebetteten Daten), eines nach dem anderen; die Reise läuft auch ohne sie
function loadModels(){
  if (!GLTFLoader) return;
  const L = new GLTFLoader(), parse = L.parse.bind(L);
  // Texturen über gewöhnliche Bildelemente laden: das verhält sich in allen Browsern gleich
  L.parse = (d,p,ok,err) => {
    const c = window.createImageBitmap;
    try { window.createImageBitmap = undefined; } catch (e) {}
    try { parse(d,p,ok,err); } finally { try { window.createImageBitmap = c; } catch (e) {} }
  };
  const get = n => new Promise((res,rej) => L.load('models/' + n + MODEL_EXT, g => res(g.scene), undefined, rej));
  get('vesta').then(setVesta).catch(() => {});
  ['hdu1','sev','dish','astronaut','rover','heli'].reduce((p,n) => p.then(() => get(n)).then(o => MB.addModel(n,o)).catch(() => {}), Promise.resolve());
}
async function boot(){
  setSpeed(speedIdx); setTour(false); showSound();
  BODIES[0].chip.setAttribute('aria-current','true');
  elSr.textContent = BODIES[0].sr;
  measure();
  await nextFrame();
  // Karten der NASA: Erde (Blue Marble, Nachtlichter; Höhe, Wasser und Wolken in einer Hilfstextur), Mars und Jupiter. Fehlt eine, wird der Planet wie die übrigen berechnet.
  const loadTex = url => new Promise((res,rej) => new THREE.TextureLoader().load(url, t => { t.anisotropy = Math.min(8,renderer.capabilities.getMaxAnisotropy()); t.wrapS = THREE.RepeatWrapping; res(t); }, undefined, rej));
  const maps = await Promise.all(['img/earth-day.jpg','img/earth-night.jpg','img/earth-aux.jpg','img/mars.jpg','img/jupiter.jpg'].map(u => loadTex(u).catch(() => null)));
  const real = maps[0] && maps[1] && maps[2] ? maps : null;
  loader.textContent = tr('Oberflächen werden berechnet …');
  S.moonTex = await bake(512,SURF.moon);
  for (let i = 2; i < BODIES.length; i++) {
    const b = BODIES[i];
    if (b.minor) continue;
    if (b.id === 'earth' && real) { b.map = real[0]; b.map.texelStep = new THREE.Vector2(1.5/2048,1.5/1024); b.ntex = real[1]; b.aux = real[2]; b.ctex = real[2]; b.bump = 10; continue; }
    if (b.id === 'mars' && maps[3]) b.map = await bake(2048,SURF.marsReal,maps[3]);
    else if (b.id === 'jupiter' && maps[4]) b.map = await bake(2048,SURF.jupiterReal,maps[4]);
    else b.map = await bake(b.tex,SURF[b.id]);
    if (b.id === 'earth') { b.ntex = await bake(1024,SURF.earthNight); b.ctex = await bake(2048,SURF.earthClouds); }
  }
  buildBackdrop(); buildSun(BODIES[1]);
  for (let i = 2; i < BODIES.length; i++) (BODIES[i].minor ? buildMinor : buildPlanet)(BODIES[i]);
  buildExtras();
  loader.textContent = tr('Marsbasis wird aufgebaut …');
  await nextFrame();
  try { MB.build(await bakeFlat(DESKTOP ? 2048 : 1024,SURF.ground)); } catch (e) { console.warn('Marsbasis:', e); }
  for (let i = 2; i < BODIES.length; i++) place(BODIES[i], solve(BODIES[i],S.simDays), BODIES[i].pos);
  loader.hidden = true; startEl.hidden = false;
  measure();
  desired(0); pos.copy(dPos); tgt.copy(dTgt); fromOff.subVectors(pos,tgt); S.shiftCur = shiftTarget;
  camera.position.copy(pos); camera.lookAt(tgt);
  S.last = performance.now();
  requestAnimationFrame(frame);
  loadModels();
}

export function initBoot(){
if (import.meta.env.MODE === 'test') installTestHooks();
boot().catch(err => { console.error(err); fail(); });
}
