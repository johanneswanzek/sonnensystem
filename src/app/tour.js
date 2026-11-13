// app/tour – Tour: Erzählzeit (narT, cue), focus, setStage, narrate, showInfo, Schritte, Zeitraffer, Beginn.
// Exporte: BELT, EARTH, MARS, begin, cue, cur, cutS, durCur, dwell, focus, narT, rollDir, setSpeed, setStage, setTour, speedIdx, stage, stageCount, step, tour, travel; initTour
// Hängt ab von: app/camera.js, audio/engine.js, core/util.js, data/bodies.js, data/voice.js, i18n/index.js, mars/base.js, render/scene/minor.js, ui/dom.js, ui/layout.js, ui/sound.js, core/state.js
// Erzeugt von tools/refactor/split.mjs aus src/sonnensystem.html – bis zum Ende des Umbaus nicht von Hand ändern.

import { S } from '../core/state.js';
import { fromOff, fromTgt, pos, tgt, tmp, user } from './camera.js';
import { AU } from '../audio/engine.js';
import { clamp, reduced } from '../core/util.js';
import { BODIES, DWELL0, SPEEDS } from '../data/bodies.js';
import { VOICE } from '../data/voice.js';
import { LOC, fill, tr } from '../i18n/index.js';
import { MB } from '../mars/base.js';
import { flightRocks, scatterFlight } from '../render/scene/minor.js';
import { caption, elBlurb, elKind, elName, elSpeed, elSr, rail, startEl, tourBtn, tourIcon } from '../ui/dom.js';
import { measure } from '../ui/layout.js';
import { showSound } from '../ui/sound.js';

// Belegt in initTour() (Reihenfolge des Starts, siehe main.js)
let speedIdx, cur, tour, travel, dwell, EARTH, MARS, BELT;

// Kapitel innerhalb eines Halts (nur die Erde hat mehrere) und die Uhr des Sprechers, nach der sich die Einblendungen richten
let stage = 0, narId = 'overview';
const cutS = {open:0, c:0, set:false, fired:{}};
const narT = () => (performance.now()-S.narStart)/1000;
const cue = k => { const v = VOICE[narId], c = v && v.cues[k]; return c == null ? 1e9 : c; };
// Kamerafahrt: Dauer der laufenden Fahrt, Schräglage, Zeit seit Kapitelbeginn; seitlicher Bildversatz für den Querschnitt
let durCur = 4.2, rollDir = 0;
// Mars-Oberfläche: welche Szene gezeichnet wird, Staubschleier für den Wechsel, Uhr der Kamerafahrt durch die Basis  /* → S (core/state.js): surfOn, veil, mbT */
// Datengruppen der Messmarken: Nummer, Deckkraft, Zeit seit dem Wechsel  /* → S (core/state.js): grp, grpA, grpT */
const stageCount = b => b.stages ? (b.id === 'mars' && !MB.ready ? 1 : b.stages.length) : 1;

// Sprechertext für den Halt; die Verweildauer richtet sich nach seiner Länge
function narrate(i,delay){
  const b = BODIES[i];
  narId = i === 0 ? (S.loops > 0 ? 'outro' : 'overview') : b.stages ? b.stages[stage].id : b.id;
  S.narStart = performance.now()+delay*1000; cutS.fired = {};
  const len = AU.say(narId,delay), v = VOICE[narId];
  // Ohne Ton läuft ein Kapitel mit Markern trotzdem in voller Länge ab
  dwell = len ? Math.max(DWELL0,len+2.5) : v && Object.keys(v.cues).length ? v.d+delay+2.5 : DWELL0;
}
// Nächstes Kapitel desselben Körpers: neue Kamerafahrt, neuer Text, neue Einblendungen
function setStage(n){
  fromTgt.copy(tgt); fromOff.subVectors(pos,tgt);
  user.az = 0; user.el = 0; user.zoom = 1;
  stage = n; S.tourT = 0; S.tStage = 0; S.trans = reduced ? 1 : 0; travel = 0; rollDir = 0;
  const base = cur === MARS && n === 1;
  durCur = base ? 3 : cur === EARTH && n === 1 ? 4.6 : 3.6;
  if (!reduced) AU.flight(durCur, base || cur === EARTH && n === 1 ? 'dive' : 'stage');
  narrate(cur, base ? (reduced ? 1.2 : durCur+.8) : reduced ? .3 : 1.7);      // auf dem Mars beginnt der Text erst nach der Landung
  showInfo(true);
}
function focus(i, byUser){
  if (byUser) setTour(false);
  if (i === cur) { const n = stageCount(BODIES[i]); if (byUser && n > 1) setStage((stage+1)%n); else S.tourT = 0; return; }
  fromTgt.copy(tgt); fromOff.subVectors(pos,tgt); stage = 0;
  user.az = 0; user.el = 0; user.zoom = 1;
  if (BODIES[cur].orbit) BODIES[cur].orbit.material.uniforms.base.value = BODIES[cur].minor ? .14 : .2;
  BODIES[cur].chip.removeAttribute('aria-current'); BODIES[cur].chip.style.setProperty('--p',0);
  cur = i; S.tFocus = 0; S.tStage = 0; S.tourT = 0; S.trans = reduced ? 1 : 0;
  travel = fromTgt.distanceTo(BODIES[i].pos);
  tmp.subVectors(BODIES[i].pos,fromTgt); rollDir = Math.sign(tmp.x*fromOff.z-tmp.z*fromOff.x);      // liegt das Ziel links oder rechts der Blickrichtung
  // Dauer nach der Strecke; durch den Asteroidengürtel geht es langsam, der Sprecher beginnt unterwegs
  durCur = i === BELT ? 8.5 : clamp(3.3+.07*travel,3.6,6.2);
  AU.place(i);
  if (!reduced) { if (i === BELT && flightRocks) scatterFlight(); AU.flight(durCur); }
  narrate(i, reduced ? .3 : i === BELT ? 1.2 : durCur-2.5);
  showInfo(true);
}
function showInfo(animate){
  const b = BODIES[cur];
  const st = b.stages && b.stages[stage];
  elName.textContent = b.name; elName.classList.toggle('long', b.name.length > 12);
  elKind.textContent = (st && st.kind) || b.kind; elBlurb.textContent = (st && st.blurb) || b.blurb;
  elSr.textContent = b.sr || fill('Durchmesser {0} km. Mittlerer Sonnenabstand {1} AE. Umlaufzeit {2}. Achsneigung {3} Grad. Rotation {4}. Bekannte Monde: {5}.',
    b.diam.toLocaleString(LOC), b.el.a.toLocaleString(LOC,{maximumFractionDigits:2}), b.per, b.tilt.toLocaleString(LOC,{maximumFractionDigits:1}), b.day.toLowerCase(), b.moons);
  b.chip.setAttribute('aria-current','true');
  if (b.orbit) b.orbit.material.uniforms.base.value = .5;
  rail.scrollTo({left:b.chip.offsetLeft-rail.clientWidth/2+b.chip.offsetWidth/2, behavior:reduced ? 'auto' : 'smooth'});
  if (animate) { caption.classList.remove('in'); void caption.offsetWidth; caption.classList.add('in'); }
  measure();
}
// Weiter und Zurück: springt zum Nachbarn, eine laufende Tour geht von dort weiter
function step(d){
  if (!S.begun) { S.begun = true; startEl.hidden = true; }
  const n = BODIES.length, nx = (cur+d+n)%n;
  if (d > 0 && nx === 0) S.loops++;
  focus(nx,false);
}
function setTour(on){
  tour = on; S.tourT = 0;
  tourBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  tourBtn.setAttribute('aria-label', tr(on ? 'Tour pausieren' : 'Tour starten'));
  tourIcon.setAttribute('d', on ? 'M2 1h3v10H2zM7 1h3v10H7z' : 'M2.5 1l8 5-8 5z');
  if (!on) BODIES[cur].chip.style.setProperty('--p',0);
}
function setSpeed(i){
  speedIdx = clamp(i,0,SPEEDS.length-1);
  const s = SPEEDS[speedIdx];
  elSpeed.textContent = s === 0 ? tr('Pause') : s === 1 ? tr('1 Tag/s') : s + tr(' Tage/s');
}
// Die Reise beginnt mit einem Tipp; nur so darf der Browser Ton abspielen
function begin(withSound){
  if (S.begun) return;
  S.begun = true; startEl.hidden = true; measure();
  setTour(true); S.tourT = 0;
  if (withSound) AU.start().then(ok => { S.soundMode = ok ? 0 : 2; showSound(); if (ok && cur === 0) { narrate(0,.2); S.tourT = 0; } });
}

export function initTour(){
S.simDays = Date.now()/864e5-10957.5;          // Tage seit J2000
speedIdx = reduced ? 0 : 3, S.effSpeed = SPEEDS[speedIdx];
cur = 0, S.trans = 1, S.tFocus = 0, tour = false, S.tourT = 0, travel = 0, S.lastDay = null, S.clock = 0, dwell = DWELL0, S.loops = 0, S.begun = false;
S.hudKey = 0, S.hudVis = 0, S.hudT = reduced ? 10 : 0, S.camLen = 200, S.blipI = 0;
EARTH = 4, MARS = BODIES.findIndex(b => b.id === 'mars'), BELT = BODIES.findIndex(b => b.id === 'belt');
}

export { BELT, EARTH, MARS, begin, cue, cur, cutS, durCur, dwell, focus, narT, rollDir, setSpeed, setStage, setTour, speedIdx, stage, stageCount, step, tour, travel };
